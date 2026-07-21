const http = require("http");
const fs = require("fs");
const path = require("path");

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
    username: "admin",
    password: "admin123"
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
    secondaryTitle: "Voltaremos em instantes",
    secondaryMessage: "A equipe da Albuquerque Consultoria MEI DAS esta realizando uma atualizacao programada para melhorar sua experiencia. Em breve o site estara disponivel novamente.",
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

function readState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(stateFilePath, "utf8");
    return mergeState(JSON.parse(raw));
  } catch (error) {
    return defaultState;
  }
}

function writeState(nextState) {
  const merged = mergeState(nextState);
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

http
  .createServer(async (req, res) => {
    const reqPath = req.url.split("?")[0];

    if (reqPath === "/api/state") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === "GET") {
        sendJson(res, 200, readState());
        return;
      }

      if (req.method === "POST") {
        try {
          const body = await readRequestBody(req);
          const parsed = body ? JSON.parse(body) : {};
          const saved = writeState(parsed);
          sendJson(res, 200, saved);
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
