const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = 8080;
const root = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

http
  .createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/") {
      reqPath = "/index.html";
    }
    const normalizedPath = decodeURIComponent(reqPath);
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
    console.log(`Local server running at http://${host}:${port}`);
  });
