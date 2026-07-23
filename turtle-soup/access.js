(() => {
  const STORAGE_KEY = "turtle-soup-access-v1";
  const ACCESS_MARKER = "private-library-657";
  const TOKEN_HASH = "c8d66e338267e11c2d85152414fd8c33f8dd84e94be89a503a3a7ab544d525e0";

  const gate = document.querySelector("#access-gate");
  const shell = document.querySelector("#site-shell");
  const form = document.querySelector("#access-form");
  const input = document.querySelector("#access-token");
  const error = document.querySelector("#access-error");
  const submit = document.querySelector("#access-submit");
  const toggle = document.querySelector("#access-toggle");

  function readAccess() {
    try {
      return localStorage.getItem(STORAGE_KEY) === ACCESS_MARKER;
    } catch {
      return false;
    }
  }

  function saveAccess() {
    try {
      localStorage.setItem(STORAGE_KEY, ACCESS_MARKER);
    } catch {
      // Private browsing can block storage; access still works for this page view.
    }
  }

  function unlock() {
    document.body.classList.remove("access-pending", "access-locked");
    document.body.classList.add("access-granted");
    if (gate) gate.hidden = true;
    if (shell) shell.hidden = false;
  }

  function showGate() {
    document.body.classList.remove("access-pending", "access-granted");
    document.body.classList.add("access-locked");
    if (gate) gate.hidden = false;
    if (shell) shell.hidden = true;
    requestAnimationFrame(() => input?.focus());
  }

  function setError(message) {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
    form?.classList.remove("is-shaking");
    if (message) requestAnimationFrame(() => form?.classList.add("is-shaking"));
  }

  async function hashToken(value) {
    if (!globalThis.crypto?.subtle) throw new Error("secure_context_required");
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  if (!gate || !shell || !form || !input || !submit) {
    console.error("Access gate failed to start: required elements are missing.");
    return;
  }

  if (readAccess()) {
    unlock();
    return;
  }

  showGate();

  input.addEventListener("input", () => setError(""));
  toggle?.addEventListener("click", () => {
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    toggle.textContent = reveal ? "隐藏" : "显示";
    toggle.setAttribute("aria-pressed", String(reveal));
    input.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = input.value.trim().toUpperCase().replaceAll(" ", "");
    if (!token) {
      setError("请输入购买后获得的访问码");
      input.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = "正在验证…";
    setError("");

    try {
      const isValid = (await hashToken(token)) === TOKEN_HASH;
      if (!isValid) {
        setError("访问码不正确，请检查后重新输入");
        input.select();
        return;
      }
      saveAccess();
      unlock();
    } catch {
      setError("当前打开方式无法验证，请使用网站链接访问");
    } finally {
      submit.disabled = false;
      submit.textContent = "进入私享题库";
    }
  });
})();
