const STORAGE_KEY = "turtle-soup-seen-v2";
const HOLD_MS = 600;

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const liveStatus = document.querySelector("#live-status");

const state = {
  screen: "home",
  currentSoupSlug: null,
  activeFilter: "all",
  searchQuery: "",
  visibleCount: 24,
  revealedHintIndexes: [],
  seenSoupSlugs: readSeenSoups(),
  isAnswerVisible: false
};

let holdTimer = null;
let routeNotice = "";
let dialogConfirm = null;
const homeOrderRanks = new Map();

function escapeHtml(value) { return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readSeenSoups() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveSeenSoups() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.seenSoupSlugs));
  } catch {
    // Storage can be blocked; the game still works without persistence.
  }
}

function markSeen(slug) {
  if (!slug) return;
  state.seenSoupSlugs = [...new Set([...state.seenSoupSlugs, slug])];
  saveSeenSoups();
}

function currentSoup() { return SoupData.getSoupBySlug(state.currentSoupSlug); }

function resetHomeOrder() {
  homeOrderRanks.clear();
  SoupData.shuffle(SoupData.getAllSoups()).forEach((soup, index) => {
    homeOrderRanks.set(soup.slug, index);
  });
}

function getHomeSoups() {
  const query = state.searchQuery.trim().toLowerCase();
  return SoupData.getSoupsByFilter(state.activeFilter)
    .filter((soup) => {
      if (!query) return true;
      const haystack = [soup.title, soup.surface, soup.answer, ...(soup.tags || []), soup.source || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .slice()
    .sort((a, b) => {
      const aSeen = state.seenSoupSlugs.includes(a.slug);
      const bSeen = state.seenSoupSlugs.includes(b.slug);
      if (aSeen !== bSeen) return aSeen ? 1 : -1;
      return (homeOrderRanks.get(a.slug) ?? 0) - (homeOrderRanks.get(b.slug) ?? 0);
    });
}

function setHash(hash) {
  const next = hash || "home";
  if (location.hash.slice(1) !== next) location.hash = next;
}

function updateTitle() {
  const soup = currentSoup();
  const labels = {
    home: "海龟汤",
    host: soup ? `${soup.title} | 主持人` : "海龟汤",
    players: soup ? `${soup.title} | 玩家题面` : "海龟汤",
    reveal: soup ? `${soup.title} | 答案揭晓` : "海龟汤"
  };
  document.title = `${labels[state.screen]} | WhatAmI.today`;
}

function announce(message) {
  if (liveStatus) liveStatus.textContent = message;
}

function brandIcon() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"/><path d="M8 9h8M8 15h8M12 5v14"/></svg>`;
}

function aboutIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>`;
}

function arrowIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
}

function render() {
  stopAnswerHold();
  app.setAttribute("aria-busy", "true");
  if (state.screen === "host") renderHost();
  else if (state.screen === "players") renderPlayers();
  else if (state.screen === "reveal") renderReveal();
  else renderHome();
  updateTitle();
  app.setAttribute("aria-busy", "false");
}

function renderHome() {
  const list = getHomeSoups();
  const visibleList = list.slice(0, state.visibleCount);
  const allSoups = SoupData.getAllSoups();
  const categoryCounts = Object.fromEntries(
    Object.keys(categoryMeta).map((key) => [
      key,
      key === "all" ? allSoups.length : allSoups.filter((soup) => soup.category === key).length
    ])
  );
  app.className = "home-screen";
  app.innerHTML = `
    <header class="topbar">
      <button class="brand" type="button" data-action="go-home" aria-label="返回首页">
        <span class="brand-mark" aria-hidden="true">${brandIcon()}</span>
        <span>WhatAmI.today</span>
      </button>
      <a class="about-link" href="./about.html" aria-label="关于这个网站" title="关于这个网站">
        ${aboutIcon()}
        <span>关于</span>
      </a>
    </header>

    <section class="hero">
      <div>
        <p class="eyebrow">朋友聚会主持工具</p>
        <h1 tabindex="-1" data-screen-title>海龟汤</h1>
        <p class="hero-copy">${allSoups.length} 道反转故事，按类型挑选。主持人先看答案，其他人只负责提问。</p>
        <button class="primary-button hero-action" type="button" data-action="random-soup">随机来一题</button>
      </div>
    </section>

    ${routeNotice ? `<p class="notice" role="status">${escapeHtml(routeNotice)}</p>` : ""}

    <section class="library-tools" aria-label="搜索题库">
      <label class="search-box">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input type="search" data-soup-search value="${escapeHtml(state.searchQuery)}" placeholder="搜索标题、题面或关键词" autocomplete="off" />
      </label>
      <p class="library-summary"><strong>${list.length}</strong> 道结果${state.searchQuery ? ` · “${escapeHtml(state.searchQuery)}”` : ""}</p>
    </section>

    <nav class="filters" aria-label="题目分类">
      ${Object.entries(categoryMeta)
        .map(([key, meta]) => {
          const active = state.activeFilter === key;
          return `<button class="filter-chip ${active ? "is-active" : ""}" type="button" data-action="set-filter" data-filter="${key}" aria-pressed="${active}">${SoupData.getCategoryIcon(key)}<span>${escapeHtml(meta.label)}</span><small>${categoryCounts[key]}</small></button>`;
        })
        .join("")}
    </nav>

    <section class="soup-grid" aria-label="海龟汤题库">
      ${visibleList.map((soup) => renderSoupCard(soup)).join("") || '<div class="empty">没有找到符合条件的题目，换个关键词试试。</div>'}
    </section>
    ${visibleList.length < list.length ? `<div class="load-more-wrap"><button class="ghost-button load-more-button" type="button" data-action="load-more">再看 24 题 <span>${visibleList.length} / ${list.length}</span></button></div>` : ""}
  `;
  routeNotice = "";
}

function renderSoupCard(soup, compact = false) {
  const tags = soup.tags
    .slice(0, compact ? 0 : 5)
    .map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`)
    .join("");
  const seen = state.seenSoupSlugs.includes(soup.slug) && !compact ? " · 已玩" : "";
  return `
    <button class="soup-card ${compact ? "is-compact" : ""}" type="button" data-action="open-soup" data-slug="${escapeHtml(soup.slug)}">
      <span class="card-icon" aria-hidden="true">${escapeHtml(soup.icon || "?")}</span>
      <span class="card-body">
        <strong>${escapeHtml(soup.title)}</strong>
        <span class="surface-preview">${escapeHtml(SoupData.getSoupPreview(soup))}</span>
        <span class="card-meta">${escapeHtml(SoupData.getCategoryLabel(soup.category))} · ${escapeHtml(SoupData.getDifficultyLabel(soup.difficulty))} · ${Number(soup.minutes)} 分钟${seen}</span>
        ${compact ? "" : `<span class="tag-row">${tags}</span>`}
      </span>
      <span class="card-arrow" aria-hidden="true">${arrowIcon()}</span>
    </button>
  `;
}

function renderHost() {
  const soup = currentSoup();
  if (!soup) return goHome("这碗汤暂时找不到。");
  app.className = "host-screen";
  app.innerHTML = `
    <header class="host-top">
      <button class="quiet-button" type="button" data-action="go-home">← 返回题库</button>
      <span class="story-meta">${SoupData.getCategoryIcon(soup.category)}<span>${escapeHtml(SoupData.getCategoryLabel(soup.category))} · ${escapeHtml(SoupData.getDifficultyLabel(soup.difficulty))} · ${Number(soup.minutes)} 分钟</span></span>
    </header>

    <article class="host-hero">
      <span class="story-icon" aria-hidden="true">${escapeHtml(soup.icon || "?")}</span>
      <h1 tabindex="-1" data-screen-title>${escapeHtml(soup.title)}</h1>
      <p class="host-surface">${escapeHtml(soup.surface)}</p>
      <button class="primary-button wide-button" type="button" data-action="show-players">给大家看题面</button>
    </article>

    <section class="host-grid">
      <article class="panel answer-panel">
        <h2>汤底</h2>
        <button class="hold-answer-button" type="button" data-hold-answer aria-pressed="false" aria-describedby="hold-help">按住查看汤底</button>
        <p class="helper-text">松手立即隐藏</p>
        <p id="hold-help" class="sr-only">按住 0.6 秒显示汤底。键盘用户按住 Enter 或 Space 查看。</p>
        <div class="answer-box" aria-hidden="true">汤底已隐藏</div>
      </article>
      ${renderListPanel("必须猜到", soup.keyPoints)}
      ${renderListPanel("主持提醒", soup.hostNotes.slice(0, 3))}
      <article class="panel hints-panel">
        <h2>卡住了吗？</h2>
        <div class="hint-list">
          ${soup.hints
            .map((hint, index) => {
              const open = state.revealedHintIndexes.includes(index);
              return `<button class="hint-button ${open ? "is-open" : ""}" type="button" data-action="toggle-hint" data-index="${index}" aria-expanded="${open}"><span>提示 ${index + 1}</span>${open ? `<strong>${escapeHtml(hint)}</strong>` : ""}</button>`;
            })
            .join("")}
        </div>
      </article>
    </section>

    <footer class="action-bar">
      <button class="ghost-button" type="button" data-action="reveal-answer">揭晓答案</button>
    </footer>
  `;
}

function renderListPanel(title, items) {
  return `
    <article class="panel">
      <h2>${escapeHtml(title)}</h2>
      <ul class="host-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

function renderPlayers() {
  const soup = currentSoup();
  if (!soup) return goHome("这碗汤暂时找不到。");
  state.isAnswerVisible = false;
  app.className = "players-screen";
  app.innerHTML = `
    <section class="players-card">
      <h1 tabindex="-1" data-screen-title>${escapeHtml(soup.title)}</h1>
      <p class="players-surface">${escapeHtml(soup.surface)}</p>
    </section>
    <footer class="players-footer">
      <button class="ghost-button wide-button" type="button" data-action="confirm-host">回到主持人</button>
    </footer>
  `;
  requestAnimationFrame(() => app.querySelector("[data-screen-title]")?.focus({ preventScroll: true }));
}

function renderReveal() {
  const soup = currentSoup();
  if (!soup) return goHome("这碗汤暂时找不到。");
  const related = SoupData.getRelatedSoups(soup, state.seenSoupSlugs, 3);
  app.className = "reveal-screen";
  app.innerHTML = `
    <article class="reveal-panel">
      <p class="eyebrow">答案揭晓</p>
      <h1 tabindex="-1" data-screen-title>${escapeHtml(soup.title)}</h1>
      <section class="reveal-section"><h2>汤面</h2><p>${escapeHtml(soup.surface)}</p></section>
      <section class="reveal-section"><h2>汤底</h2><p class="answer-text">${escapeHtml(soup.answer)}</p></section>
      ${renderListPanel("核心推理点", soup.keyPoints)}
      <div class="button-row">
        <button class="primary-button" type="button" data-action="next-soup" data-mode="same">同类型下一题</button>
        <button class="ghost-button" type="button" data-action="next-soup" data-mode="random">随机下一题</button>
        <button class="text-button" type="button" data-action="go-home">返回题库</button>
      </div>
    </article>
    <section class="related-section">
      <h2>下一碗推荐</h2>
      <div class="related-grid">${related.map((item) => renderSoupCard(item, true)).join("")}</div>
    </section>
  `;
}

function openSoup(slug, fromRoute = false, entry = "card") {
  const soup = SoupData.getSoupBySlug(slug);
  if (!soup) return goHome("这碗汤暂时找不到。", fromRoute);
  state.screen = "host";
  state.currentSoupSlug = soup.slug;
  state.revealedHintIndexes = [];
  state.isAnswerVisible = false;
  window.TurtleAnalytics?.startSoup(soup.slug, fromRoute ? "direct" : entry);
  if (!fromRoute) setHash(`soup/${soup.slug}`);
  render();
  announce(`已打开${soup.title}`);
}

function openRandomSoup() {
  let soup = SoupData.getRandomSoup(
    SoupData.getSoupsByFilter(state.activeFilter),
    state.currentSoupSlug,
    state.seenSoupSlugs
  );
  if (!soup && state.seenSoupSlugs.length) {
    state.seenSoupSlugs = [];
    saveSeenSoups();
    soup = SoupData.getRandomSoup(SoupData.getSoupsByFilter(state.activeFilter), state.currentSoupSlug, []);
  }
  if (!soup) soup = SoupData.getRandomSoup(SoupData.getAllSoups(), state.currentSoupSlug, []);
  if (soup) openSoup(soup.slug, false, "random");
}

function openNextSoup(mode) {
  const soup = SoupData.getNextSoup(currentSoup(), state.seenSoupSlugs, mode);
  if (soup) openSoup(soup.slug, false, `next_${mode}`);
}

function goHome(message = "", fromRoute = false) {
  state.screen = "home";
  state.currentSoupSlug = null;
  state.revealedHintIndexes = [];
  state.isAnswerVisible = false;
  window.TurtleAnalytics?.end();
  routeNotice = message;
  if (!fromRoute) setHash("home");
  render();
  announce("已返回题库");
}

function handleRoute() {
  const hash = location.hash.slice(1) || "home";
  if (hash === "home") return goHome("", true);
  if (hash.startsWith("soup/")) return openSoup(decodeURIComponent(hash.slice(5)), true);
  goHome("这碗汤暂时找不到。", true);
}

function showDialog() {
  stopAnswerHold();
  modalRoot.hidden = false;
  modalRoot.innerHTML = `
    <div class="dialog-backdrop" data-dialog="cancel"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
      <h2 id="dialog-title">回到主持人视角？</h2>
      <p id="dialog-message">其他玩家可能看到答案。</p>
      <div class="button-row">
        <button class="quiet-button" type="button" data-dialog="cancel">取消</button>
        <button class="danger-button" type="button" data-dialog="confirm">回到主持人</button>
      </div>
    </div>
  `;
  dialogConfirm = () => {
    state.screen = "host";
    render();
  };
  modalRoot.querySelector("[data-dialog='cancel']").focus();
}

function closeDialog(confirm = false) {
  if (modalRoot.hidden) return;
  const handler = dialogConfirm;
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
  dialogConfirm = null;
  if (confirm && handler) handler();
}

function startAnswerHold() {
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    const soup = currentSoup();
    const box = app.querySelector(".answer-box");
    const button = app.querySelector("[data-hold-answer]");
    if (!soup || !box) return;
    state.isAnswerVisible = true;
    window.TurtleAnalytics?.track("answer_hold", "shown");
    box.textContent = soup.answer;
    box.classList.add("is-visible");
    box.setAttribute("aria-hidden", "false");
    button?.setAttribute("aria-pressed", "true");
  }, HOLD_MS);
}

function stopAnswerHold() {
  clearTimeout(holdTimer);
  holdTimer = null;
  if (!state.isAnswerVisible) return;
  state.isAnswerVisible = false;
  const box = app.querySelector(".answer-box");
  const button = app.querySelector("[data-hold-answer]");
  if (box) {
    box.textContent = "汤底已隐藏";
    box.classList.remove("is-visible");
    box.setAttribute("aria-hidden", "true");
  }
  button?.setAttribute("aria-pressed", "false");
}

function handleAppClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, slug, index, filter, mode } = target.dataset;
  if (action === "open-soup") openSoup(slug, false, "card");
  if (action === "random-soup") openRandomSoup();
  if (action === "set-filter") {
    state.activeFilter = filter;
    state.visibleCount = 24;
    render();
    announce(`已切换到${SoupData.getCategoryLabel(filter)}`);
  }
  if (action === "load-more") {
    state.visibleCount += 24;
    render();
    announce(`已显示 ${Math.min(state.visibleCount, getHomeSoups().length)} 道题目`);
  }
  if (action === "show-players") {
    window.TurtleAnalytics?.track("players_view", "shown");
    state.screen = "players";
    render();
  }
  if (action === "reveal-answer") {
    window.TurtleAnalytics?.track("reveal", "shown");
    window.TurtleAnalytics?.complete(state.currentSoupSlug);
    markSeen(state.currentSoupSlug);
    state.screen = "reveal";
    render();
  }
  if (action === "toggle-hint") {
    const hintIndex = Number(index);
    if (!state.revealedHintIndexes.includes(hintIndex)) {
      state.revealedHintIndexes = [...state.revealedHintIndexes, hintIndex];
      window.TurtleAnalytics?.track(`hint_${hintIndex + 1}`, "opened");
    }
    render();
    announce(`提示 ${hintIndex + 1} 已展开`);
  }
  if (action === "confirm-host") showDialog();
  if (action === "go-home") goHome();
  if (action === "next-soup") openNextSoup(mode);
}

function handleKeyDown(event) {
  if (event.key === "Escape") {
    closeDialog(false);
    stopAnswerHold();
  }
  if (event.target.closest("[data-hold-answer]") && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    startAnswerHold();
  }
}

function handleAppInput(event) {
  const input = event.target.closest("[data-soup-search]");
  if (!input) return;
  state.searchQuery = input.value;
  state.visibleCount = 24;
  renderSearchResults();
}

function renderSearchResults() {
  const list = getHomeSoups();
  const visibleList = list.slice(0, state.visibleCount);
  const summary = app.querySelector(".library-summary");
  const grid = app.querySelector(".soup-grid");
  const existingLoadMore = app.querySelector(".load-more-wrap");
  if (!summary || !grid) return;

  summary.innerHTML = `<strong>${list.length}</strong> 道结果${state.searchQuery ? ` · “${escapeHtml(state.searchQuery)}”` : ""}`;
  grid.innerHTML = visibleList.map((soup) => renderSoupCard(soup)).join("") || '<div class="empty">没有找到符合条件的题目，换个关键词试试。</div>';

  const loadMoreHtml = visibleList.length < list.length
    ? `<div class="load-more-wrap"><button class="ghost-button load-more-button" type="button" data-action="load-more">再看 24 题 <span>${visibleList.length} / ${list.length}</span></button></div>`
    : "";
  if (existingLoadMore) {
    if (loadMoreHtml) existingLoadMore.outerHTML = loadMoreHtml;
    else existingLoadMore.remove();
  } else if (loadMoreHtml) {
    grid.insertAdjacentHTML("afterend", loadMoreHtml);
  }
}

function handleKeyUp(event) {
  if (event.target.closest("[data-hold-answer]") && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    stopAnswerHold();
  }
}

function renderStartupError(title, message) {
  if (!app) return;
  app.className = "home-screen";
  app.innerHTML = `
    <section class="empty-state">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

function init() {
  try {
    if (!app) throw new Error("#app container not found");
    if (!modalRoot) throw new Error("#modal-root container not found");

    const initializedSoups = SoupData.init();
    if (!initializedSoups.length) {
      renderStartupError("题库暂时无法加载", "请检查 soups.js 的数据格式。");
      return;
    }

    resetHomeOrder();
    app.addEventListener("click", handleAppClick);
    app.addEventListener("input", handleAppInput);
    app.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-hold-answer]")) {
        event.preventDefault();
        startAnswerHold();
      }
    });
    app.addEventListener("pointerup", stopAnswerHold);
    app.addEventListener("pointercancel", stopAnswerHold);
    app.addEventListener("pointerleave", stopAnswerHold);
    app.addEventListener("keydown", handleKeyDown);
    app.addEventListener("keyup", handleKeyUp);
    modalRoot.addEventListener("click", (event) => {
      const action = event.target.closest("[data-dialog]")?.dataset.dialog;
      if (action) closeDialog(action === "confirm");
    });
    window.addEventListener("blur", stopAnswerHold);
    window.addEventListener("hashchange", handleRoute);
    if (!location.hash) setHash("home");
    handleRoute();
  } catch (error) {
    console.error("Turtle Soup failed to start:", error);
    renderStartupError("页面加载失败", "题库或脚本存在错误，请查看浏览器控制台。");
  }
}

init();
