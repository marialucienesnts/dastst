(function() {
  const USER_SESSION_KEY = "pgmeiAuthenticatedSession";
  const VISITOR_SESSION_KEY = "pgmeiVisitorSession";
  const LOCAL_STATE_KEY = "pgmeiSharedAppState";
  const TRACKING_SESSION_KEY = "pgmeiTrackingSession";
  const DEFAULT_STATE = {
    admin: {
      username: "macaco",
      password: "macaquinhoronald"
    },
    analytics: {
      visits: 0,
      uniqueVisitors: 0,
      totalClicks: 0,
      cnpjLogins: 0,
      pixGenerated: 0,
      paymentsConfirmed: 0,
      activePage: "primary",
      primaryDomain: "albuquerqueconsultoriameidas.com",
      pixKey: "6769b9cc-dae0-46f1-88db-3144cc4a7ca7",
      pixMerchantName: "SERVICO EMPRESARIAL ASSEGURADO ILTDA",
      pixMerchantCity: "SAO PAULO",
      secondaryTitle: "Pagina ADV ativa",
      secondaryMessage: "A pagina alternativa ADV esta ativa para exibir o conteudo institucional aos visitantes.",
      lastVisitAt: "",
      lastPaymentAt: "",
      accessLog: [],
      clickLog: [],
      payments: []
    }
  };

  let stateCache = null;
  let supabaseClient = null;

  function deepMerge(base, patch) {
    const result = Array.isArray(base) ? base.slice() : { ...base };
    Object.keys(patch || {}).forEach(function(key) {
      const patchValue = patch[key];
      const baseValue = result[key];
      if (
        patchValue &&
        typeof patchValue === "object" &&
        !Array.isArray(patchValue) &&
        baseValue &&
        typeof baseValue === "object" &&
        !Array.isArray(baseValue)
      ) {
        result[key] = deepMerge(baseValue, patchValue);
      } else {
        result[key] = patchValue;
      }
    });
    return result;
  }

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function normalizeCnpjValue(value) {
    return String(value || "").replace(/\D/g, "").trim();
  }

  function normalizeState(state) {
    const merged = deepMerge(cloneDefaultState(), state || {});

    if (!["primary", "secondary"].includes(merged.analytics.activePage)) {
      merged.analytics.activePage = "primary";
    }

    merged.analytics.accessLog = Array.isArray(merged.analytics.accessLog)
      ? merged.analytics.accessLog.slice(0, 20)
      : [];
    merged.analytics.payments = Array.isArray(merged.analytics.payments)
      ? merged.analytics.payments.slice(0, 20)
      : [];
    merged.analytics.clickLog = Array.isArray(merged.analytics.clickLog)
      ? merged.analytics.clickLog.slice(0, 50)
      : [];

    return merged;
  }

  function getSupabaseConfig() {
    const config = window.PGMEI_SUPABASE || {};
    return {
      url: String(config.url || "").trim(),
      anonKey: String(config.anonKey || "").trim(),
      table: String(config.table || "site_state").trim(),
      rowId: String(config.rowId || "global").trim()
    };
  }

  function isSupabaseConfigured() {
    const config = getSupabaseConfig();
    return Boolean(config.url && config.anonKey && window.supabase);
  }

  function getSupabaseClient() {
    if (!isSupabaseConfigured()) {
      return null;
    }

    if (!supabaseClient) {
      const config = getSupabaseConfig();
      supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }

    return supabaseClient;
  }

  function getStorageProviderName() {
    return isSupabaseConfigured() ? "supabase" : "local";
  }

  function readLocalState() {
    try {
      const raw = localStorage.getItem(LOCAL_STATE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : normalizeState(DEFAULT_STATE);
    } catch (error) {
      return normalizeState(DEFAULT_STATE);
    }
  }

  function writeLocalState(state) {
    const normalized = normalizeState(state);
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(normalized));
    stateCache = normalized;
    return normalized;
  }

  async function readSupabaseState() {
    const client = getSupabaseClient();
    const config = getSupabaseConfig();
    const { data, error } = await client
      .from(config.table)
      .select("payload")
      .eq("id", config.rowId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Falha ao ler estado no Supabase");
    }

    if (!data || !data.payload) {
      const defaultState = normalizeState(DEFAULT_STATE);
      return writeSupabaseState(defaultState);
    }

    const normalized = normalizeState(data.payload);
    stateCache = normalized;
    return normalized;
  }

  async function writeSupabaseState(state) {
    const client = getSupabaseClient();
    const config = getSupabaseConfig();
    const normalized = normalizeState(state);
    const { data, error } = await client
      .from(config.table)
      .upsert(
        {
          id: config.rowId,
          payload: normalized,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .select("payload")
      .single();

    if (error) {
      throw new Error(error.message || "Falha ao salvar estado no Supabase");
    }

    stateCache = normalizeState(data.payload);
    return stateCache;
  }

  async function fetchState() {
    if (isSupabaseConfigured()) {
      return readSupabaseState();
    }

    stateCache = readLocalState();
    return stateCache;
  }

  function getCachedState() {
    if (!stateCache) {
      stateCache = normalizeState(DEFAULT_STATE);
    }
    return stateCache;
  }

  async function persistState(state) {
    if (isSupabaseConfigured()) {
      return writeSupabaseState(state);
    }

    return writeLocalState(state);
  }

  function getTrackingSession() {
    try {
      const raw = sessionStorage.getItem(TRACKING_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveTrackingSession(data) {
    sessionStorage.setItem(TRACKING_SESSION_KEY, JSON.stringify(data));
  }

  function clearTrackingSession() {
    sessionStorage.removeItem(TRACKING_SESSION_KEY);
  }

  function applyActionToState(state, action, params) {
    const nextState = normalizeState(state);
    const analytics = nextState.analytics;
    const now = new Date().toISOString();
    const safeParams = params || {};

    if (action === "get") {
      return nextState;
    }

    if (action === "set_active_page") {
      analytics.activePage = safeParams.page === "secondary" ? "secondary" : "primary";
      return nextState;
    }

    if (action === "update_settings") {
      if (String(safeParams.secondaryTitle || "").trim()) {
        analytics.secondaryTitle = String(safeParams.secondaryTitle).trim();
      }
      if (String(safeParams.secondaryMessage || "").trim()) {
        analytics.secondaryMessage = String(safeParams.secondaryMessage).trim();
      }
      return nextState;
    }

    if (action === "track_visit") {
      analytics.visits += 1;
      analytics.lastVisitAt = now;

      if (String(safeParams.unique || "0") === "1") {
        analytics.uniqueVisitors += 1;
      }

      analytics.accessLog.unshift({
        time: now,
        page: safeParams.page === "secondary" ? "secondary" : "primary",
        location: String(safeParams.location || "/").trim() || "/"
      });
      analytics.accessLog = analytics.accessLog.slice(0, 20);
      return nextState;
    }

    if (action === "track_cnpj_access") {
      const cnpj = String(safeParams.cnpj || "").trim();
      const normalizedCnpj = normalizeCnpjValue(cnpj);
      const companyName = String(safeParams.companyName || "Razao social nao informada").trim();

      analytics.cnpjLogins += 1;
      analytics.lastVisitAt = now;
      analytics.accessLog.unshift({
        time: now,
        page: "primary",
        location: String(safeParams.location || "/oficial/").trim() || "/oficial/",
        cnpj: cnpj,
        cnpjDigits: normalizedCnpj,
        companyName: companyName,
        pixGenerated: false
      });
      analytics.accessLog = analytics.accessLog.slice(0, 20);
      return nextState;
    }

    if (action === "track_click") {
      const cnpj = String(safeParams.cnpj || "").trim();
      const normalizedCnpj = normalizeCnpjValue(cnpj);
      const companyName = String(safeParams.companyName || "").trim();

      analytics.totalClicks += 1;
      analytics.clickLog.unshift({
        time: now,
        page: safeParams.page === "secondary" ? "secondary" : "primary",
        location: String(safeParams.location || window.location.pathname || "/").trim() || "/",
        target: String(safeParams.target || "Clique").trim() || "Clique",
        cnpj: cnpj,
        cnpjDigits: normalizedCnpj,
        companyName: companyName
      });
      analytics.clickLog = analytics.clickLog.slice(0, 50);

      if (normalizedCnpj) {
        const accessItem = analytics.accessLog.find(function(item) {
          return normalizeCnpjValue(item.cnpj || item.cnpjDigits || "") === normalizedCnpj;
        });

        if (accessItem) {
          accessItem.clickCount = (accessItem.clickCount || 0) + 1;
          accessItem.lastClickAt = now;
          accessItem.companyName = accessItem.companyName || companyName;
        }
      }

      return nextState;
    }

    if (action === "increment_metric") {
      const metric = String(safeParams.metric || "");
      const amount = Math.max(1, parseInt(String(safeParams.amount || "1"), 10) || 1);
      const allowedMetrics = new Set(["totalClicks", "cnpjLogins", "pixGenerated", "paymentsConfirmed"]);

      if (!allowedMetrics.has(metric)) {
        throw new Error("INVALID_METRIC");
      }

      analytics[metric] = (analytics[metric] || 0) + amount;
      return nextState;
    }

    if (action === "log_payment") {
      analytics.pixGenerated += 1;
      analytics.lastPaymentAt = now;
      const cnpj = String(safeParams.cnpj || "").trim();
      const normalizedCnpj = normalizeCnpjValue(cnpj);
      const companyName = String(safeParams.companyName || "Razao social nao informada").trim();
      const amount = String(safeParams.amount || "R$ 0,00").trim();

      let accessItem = analytics.accessLog.find(function(item) {
        return normalizeCnpjValue(item.cnpj || item.cnpjDigits || "") === normalizedCnpj;
      });

      if (!accessItem) {
        accessItem = {
          time: now,
          page: "primary",
          location: "/oficial/",
          cnpj: cnpj,
          cnpjDigits: normalizedCnpj,
          companyName: companyName
        };
        analytics.accessLog.unshift(accessItem);
      }

      accessItem.pixGenerated = true;
      accessItem.paymentTime = now;
      accessItem.pixAmount = amount;
      accessItem.companyName = accessItem.companyName || companyName;
      analytics.accessLog = analytics.accessLog.slice(0, 20);

      analytics.payments.unshift({
        label: String(safeParams.label || "Pagamento Pix").trim(),
        amount: amount,
        status: "Pendente",
        time: now,
        cnpj: cnpj,
        cnpjDigits: normalizedCnpj,
        companyName: companyName,
        code: String(safeParams.code || "").trim()
      });
      analytics.payments = analytics.payments.slice(0, 20);
      return nextState;
    }

    if (action === "log_pix_copy") {
      const cnpj = String(safeParams.cnpj || "").trim();
      const normalizedCnpj = normalizeCnpjValue(cnpj);
      const companyName = String(safeParams.companyName || "Razao social nao informada").trim();
      const amount = String(safeParams.amount || "").trim();
      let accessItem = analytics.accessLog.find(function(item) {
        return normalizeCnpjValue(item.cnpj || item.cnpjDigits || "") === normalizedCnpj;
      });

      if (!accessItem) {
        accessItem = {
          time: now,
          page: "primary",
          location: "/oficial/",
          cnpj: cnpj,
          cnpjDigits: normalizedCnpj,
          companyName: companyName
        };
        analytics.accessLog.unshift(accessItem);
      }

      accessItem.pixGenerated = true;
      accessItem.pixCopied = true;
      accessItem.pixCopiedAt = now;
      accessItem.pixAmount = amount || accessItem.pixAmount || "R$ 0,00";
      accessItem.companyName = accessItem.companyName || companyName;
      analytics.accessLog = analytics.accessLog.slice(0, 20);

      const paymentItem = analytics.payments.find(function(item) {
        return normalizeCnpjValue(item.cnpj || item.cnpjDigits || "") === normalizedCnpj;
      });

      if (paymentItem) {
        paymentItem.status = "Pix copiado";
        paymentItem.copiedAt = now;
        paymentItem.amount = amount || paymentItem.amount || "R$ 0,00";
      }

      return nextState;
    }

    throw new Error("INVALID_ACTION");
  }

  async function sendAction(action, params) {
    const currentState = await fetchState();
    const nextState = applyActionToState(currentState, action, params);
    return persistState(nextState);
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(USER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveSession(session) {
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(USER_SESSION_KEY);
    clearTrackingSession();
  }

  async function recordVisit(pageName, locationPath) {
    const isUnique = !sessionStorage.getItem(VISITOR_SESSION_KEY);
    if (isUnique) {
      sessionStorage.setItem(VISITOR_SESSION_KEY, String(Date.now()));
    }

    return sendAction("track_visit", {
      page: pageName,
      location: locationPath,
      unique: isUnique ? 1 : 0
    });
  }

  async function incrementMetric(metric, amount) {
    try {
      return await sendAction("increment_metric", {
        metric: metric,
        amount: amount || 1
      });
    } catch (error) {
      console.warn("Falha ao atualizar metrica:", metric, error.message);
      return getCachedState();
    }
  }

  async function recordClick(pageName, locationPath, target, context) {
    try {
      const data = context || {};
      return await sendAction("track_click", {
        page: pageName,
        location: locationPath,
        target: target,
        cnpj: data.cnpj || "",
        companyName: data.companyName || data.nome || ""
      });
    } catch (error) {
      console.warn("Falha ao registrar clique:", error.message);
      return getCachedState();
    }
  }

  function maskCnpj(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
    let masked = digits.slice(0, 2);
    if (digits.length > 2) masked += "." + digits.slice(2, 5);
    if (digits.length > 5) masked += "." + digits.slice(5, 8);
    if (digits.length > 8) masked += "/" + digits.slice(8, 12);
    if (digits.length > 12) masked += "-" + digits.slice(12, 14);
    return masked;
  }

  function validateCnpj(cnpj) {
    const clean = String(cnpj || "").replace(/\D/g, "");
    if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) {
      return false;
    }

    function calcDigit(base, factors) {
      const total = base.split("").reduce(function(sum, char, index) {
        return sum + Number(char) * factors[index];
      }, 0);
      const rest = total % 11;
      return rest < 2 ? 0 : 11 - rest;
    }

    const d1 = calcDigit(clean.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit(clean.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return clean === clean.slice(0, 12) + String(d1) + String(d2);
  }

  function formatCurrency(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function formatDateTime(value) {
    return value ? new Date(value).toLocaleString("pt-BR") : "";
  }

  function redirect(path) {
    if (window.location.pathname !== path) {
      window.location.replace(path);
    }
  }

  function applyPageTitleByState(state) {
    if (state && state.analytics && state.analytics.activePage === "secondary") {
      document.title = "Fabio Albuquerque | Advocacia para MEI e Pequenas Empresas";
      return;
    }

    if (window.location.pathname.startsWith("/painel")) {
      document.title = "Painel Albuquerque Consultoria";
      return;
    }
    if (window.location.pathname.startsWith("/adv")) {
      document.title = "Fabio Albuquerque | Advocacia para MEI e Pequenas Empresas";
      return;
    }
    if (window.location.pathname.startsWith("/oficial")) {
      document.title = "PGMEI - Programa Gerador de DAS";
      return;
    }
    if (window.location.pathname.startsWith("/login")) {
      document.title = "PGMEI - Acesso";
      return;
    }
    document.title = "PGMEI";
  }

  function crc16Ccitt(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i += 1) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPixField(id, value) {
    const safeValue = String(value || "");
    return id + safeValue.length.toString().padStart(2, "0") + safeValue;
  }

  function buildPixPayload(state, amountValue) {
    const amount = Number(amountValue || 0).toFixed(2);
    const pixKey = String(state.analytics.pixKey || "").trim().slice(0, 77);
    const merchantName = String(state.analytics.pixMerchantName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, "")
      .toUpperCase()
      .slice(0, 25);
    const merchantCity = String(state.analytics.pixMerchantCity || "SAO PAULO")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, "")
      .toUpperCase()
      .slice(0, 15);
    const txid = ("PGMEI" + Date.now()).slice(0, 25);
    const merchantAccountInfo =
      buildPixField("00", "BR.GOV.BCB.PIX") +
      buildPixField("01", pixKey);

    const basePayload =
      buildPixField("00", "01") +
      buildPixField("01", "12") +
      buildPixField("26", merchantAccountInfo) +
      buildPixField("52", "0000") +
      buildPixField("53", "986") +
      buildPixField("54", amount) +
      buildPixField("58", "BR") +
      buildPixField("59", merchantName) +
      buildPixField("60", merchantCity) +
      buildPixField("62", buildPixField("05", txid)) +
      "6304";

    return basePayload + crc16Ccitt(basePayload);
  }

  window.PGMEI = {
    USER_SESSION_KEY: USER_SESSION_KEY,
    DEFAULT_STATE: DEFAULT_STATE,
    fetchState: fetchState,
    sendAction: sendAction,
    getCachedState: getCachedState,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    recordVisit: recordVisit,
    recordClick: recordClick,
    incrementMetric: incrementMetric,
    maskCnpj: maskCnpj,
    validateCnpj: validateCnpj,
    formatCurrency: formatCurrency,
    formatDateTime: formatDateTime,
    redirect: redirect,
    buildPixPayload: buildPixPayload,
    getStorageProviderName: getStorageProviderName,
    isSupabaseConfigured: isSupabaseConfigured,
    getSupabaseConfig: getSupabaseConfig,
    getTrackingSession: getTrackingSession,
    saveTrackingSession: saveTrackingSession,
    clearTrackingSession: clearTrackingSession,
    applyPageTitleByState: applyPageTitleByState
  };
})();
