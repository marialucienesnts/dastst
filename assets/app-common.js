(function() {
  const API_STATE_ENDPOINT = "/api/state";
  const USER_SESSION_KEY = "pgmeiAuthenticatedSession";
  const VISITOR_SESSION_KEY = "pgmeiVisitorSession";
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
      secondaryTitle: "Estamos em manutencao",
      secondaryMessage: "A equipe da Albuquerque Consultoria MEI DAS esta realizando melhorias para oferecer uma experiencia mais rapida, segura e confiavel. Em breve o atendimento sera retomado.",
      lastVisitAt: "",
      lastPaymentAt: "",
      accessLog: [],
      payments: []
    }
  };

  let stateCache = null;

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

  function normalizeState(state) {
    const merged = deepMerge(cloneDefaultState(), state || {});
    if (!["primary", "secondary"].includes(merged.analytics.activePage)) {
      merged.analytics.activePage = "primary";
    }
    if (!Array.isArray(merged.analytics.accessLog)) {
      merged.analytics.accessLog = [];
    }
    if (!Array.isArray(merged.analytics.payments)) {
      merged.analytics.payments = [];
    }
    return merged;
  }

  function buildApiUrl(action, params) {
    const url = new URL(API_STATE_ENDPOINT, window.location.origin);
    url.searchParams.set("action", action);
    url.searchParams.set("_ts", String(Date.now()));
    Object.entries(params || {}).forEach(function(entry) {
      if (entry[1] !== undefined && entry[1] !== null) {
        url.searchParams.set(entry[0], String(entry[1]));
      }
    });
    return url.toString();
  }

  async function fetchState() {
    const response = await fetch(buildApiUrl("get"), { cache: "no-store" });
    const text = await response.text();
    let payload = {};

    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error("API retornou conteudo invalido");
    }

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Falha ao carregar estado");
    }

    stateCache = normalizeState(payload);
    return stateCache;
  }

  async function sendAction(action, params) {
    const response = await fetch(buildApiUrl(action, params), { cache: "no-store" });
    const text = await response.text();
    let payload = {};

    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new Error("API retornou conteudo invalido");
    }

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Falha ao salvar estado");
    }

    stateCache = normalizeState(payload);
    return stateCache;
  }

  function getCachedState() {
    if (!stateCache) {
      stateCache = cloneDefaultState();
    }
    return stateCache;
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
    if (!value) {
      return "";
    }
    return new Date(value).toLocaleString("pt-BR");
  }

  function redirect(path) {
    if (window.location.pathname !== path) {
      window.location.replace(path);
    }
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
    API_STATE_ENDPOINT: API_STATE_ENDPOINT,
    USER_SESSION_KEY: USER_SESSION_KEY,
    DEFAULT_STATE: DEFAULT_STATE,
    buildApiUrl: buildApiUrl,
    fetchState: fetchState,
    sendAction: sendAction,
    getCachedState: getCachedState,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    recordVisit: recordVisit,
    incrementMetric: incrementMetric,
    maskCnpj: maskCnpj,
    validateCnpj: validateCnpj,
    formatCurrency: formatCurrency,
    formatDateTime: formatDateTime,
    redirect: redirect,
    buildPixPayload: buildPixPayload
  };
})();
