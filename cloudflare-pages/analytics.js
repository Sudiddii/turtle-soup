(function () {
  const API_BASE_URL = "https://whatami-api.18600241181djh.workers.dev";
  const QUIZ_ID = "turtlesoup";
  const QUIZ_VERSION = "turtlesoup.2026.07.13";
  const INTERACTION_VERSION = "interaction.v1";
  const CONSENT_VERSION = "analytics-v1";
  const ANONYMOUS_ID_KEY = "whatami-anonymous-id";
  const QUEUE_KEY = "turtlesoup-analytics-queue-v1";
  const MAX_QUEUE_ITEMS = 80;
  const REQUEST_TIMEOUT_MS = 4500;

  let currentSession = null;
  let flushInFlight = false;

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Analytics must not block the game. */ }
  }

  function createUuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => (
      (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
    ));
  }

  function getAnonymousId() {
    const existing = storageGet(ANONYMOUS_ID_KEY);
    if (/^[0-9a-f-]{36}$/i.test(existing || "")) return existing;
    const id = createUuid();
    storageSet(ANONYMOUS_ID_KEY, id);
    return id;
  }

  function getUtm() {
    const params = new URLSearchParams(location.search);
    return {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      term: params.get("utm_term"),
      content: params.get("utm_content")
    };
  }

  function readQueue() {
    try {
      const queue = JSON.parse(storageGet(QUEUE_KEY) || "[]");
      return Array.isArray(queue) ? queue : [];
    } catch {
      return [];
    }
  }

  function writeQueue(queue) {
    storageSet(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_ITEMS)));
  }

  function enqueue(path, payload, dedupeKey) {
    const queue = readQueue().filter((item) => !dedupeKey || item.dedupeKey !== dedupeKey);
    queue.push({ id: createUuid(), path, payload, dedupeKey, attempts: 0, nextAttemptAt: 0 });
    writeQueue(queue);
    flush();
  }

  async function post(item) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}${item.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
        signal: controller.signal
      });
      if (!response.ok && (response.status >= 500 || response.status === 429)) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async function flush() {
    if (flushInFlight) return;
    flushInFlight = true;
    try {
      let queue = readQueue();
      for (const item of [...queue]) {
        if (item.nextAttemptAt > Date.now()) continue;
        try {
          await post(item);
          queue = readQueue().filter((queued) => queued.id !== item.id);
        } catch {
          queue = readQueue();
          const failed = queue.find((queued) => queued.id === item.id);
          if (!failed) continue;
          failed.attempts += 1;
          if (failed.attempts >= 6) queue = queue.filter((queued) => queued.id !== item.id);
          else failed.nextAttemptAt = Date.now() + Math.min(60000, 1000 * 2 ** failed.attempts);
          writeQueue(queue);
          break;
        }
        writeQueue(queue);
      }
    } finally {
      flushInFlight = false;
      if (readQueue().some((item) => !item.nextAttemptAt || item.nextAttemptAt <= Date.now())) {
        setTimeout(flush, 0);
      }
    }
  }

  function startSoup(slug, entry = "card") {
    if (!slug || currentSession?.slug === slug) return;
    const now = new Date().toISOString();
    currentSession = { id: createUuid(), slug, startedAt: now, order: 0, events: new Set() };
    enqueue("/api/quiz/sessions", {
      session_id: currentSession.id,
      quiz_id: QUIZ_ID,
      quiz_version: QUIZ_VERSION,
      anonymous_id: getAnonymousId(),
      landing_page: location.href,
      utm: getUtm(),
      consent_version: CONSENT_VERSION,
      consent_granted: true
    }, `session:${currentSession.id}`);
    track("entry", entry);
    track("story", slug);
  }

  function track(questionId, answerId) {
    if (!currentSession || currentSession.events.has(questionId)) return;
    currentSession.events.add(questionId);
    currentSession.order += 1;
    const now = new Date().toISOString();
    enqueue("/api/quiz/answers", {
      session_id: currentSession.id,
      question_id: questionId,
      question_version: INTERACTION_VERSION,
      answer_id: answerId,
      question_order: currentSession.order,
      viewed_at: currentSession.startedAt,
      answered_at: now,
      time_spent_ms: Math.min(30 * 60 * 1000, Math.max(0, Date.parse(now) - Date.parse(currentSession.startedAt)))
    }, `event:${currentSession.id}:${questionId}`);
  }

  function complete(slug) {
    if (!currentSession || currentSession.slug !== slug) return;
    enqueue(`/api/quiz/sessions/${encodeURIComponent(currentSession.id)}/complete`, {
      result_id: slug,
      scoring_version: "hosted.v1",
      result_copy_version: "soups.2026.07.13",
      completed_at: new Date().toISOString()
    }, `complete:${currentSession.id}`);
  }

  function end() { currentSession = null; }

  window.TurtleAnalytics = { startSoup, track, complete, end, flush };
  window.addEventListener("online", flush);
  window.addEventListener("pageshow", flush);
})();
