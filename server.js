const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const RECIPIENT = "fabio.juranek@bhakwien13.at";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8"
};

const decodeLatin1 = (value = "") => value.replace(/\r\n$/g, "");

const parseMultipart = (buffer, boundary) => {
  const fields = {};
  const files = {};
  const bodyText = buffer.toString("latin1");
  const boundaryToken = `--${boundary}`;
  const parts = bodyText.split(boundaryToken).slice(1, -1);

  for (const rawPart of parts) {
    const part = rawPart.replace(/^\r\n/, "");
    const separatorIndex = part.indexOf("\r\n\r\n");
    if (separatorIndex === -1) continue;

    const rawHeaders = part.slice(0, separatorIndex);
    const rawContent = part.slice(separatorIndex + 4).replace(/\r\n$/, "");
    const headers = rawHeaders.split("\r\n");

    const dispositionLine = headers.find((line) => line.toLowerCase().startsWith("content-disposition"));
    if (!dispositionLine) continue;

    const nameMatch = dispositionLine.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];

    const filenameMatch = dispositionLine.match(/filename="([^"]*)"/);
    if (filenameMatch && filenameMatch[1]) {
      const contentTypeLine = headers.find((line) => line.toLowerCase().startsWith("content-type")) || "";
      const mimeType = contentTypeLine.split(":")[1]?.trim() || "application/octet-stream";
      files[fieldName] = {
        filename: path.basename(filenameMatch[1]),
        contentType: mimeType,
        data: Buffer.from(rawContent, "latin1")
      };
      continue;
    }

    fields[fieldName] = decodeLatin1(rawContent);
  }

  return { fields, files };
};

const sendApplicationEmail = ({ fields, files }) =>
  new Promise((resolve, reject) => {
    const cv = files.cv;

    const textBody = [
      "Neue Bewerbung über Maygasse Finance Society Website",
      "",
      `Name: ${fields.name || ""}`,
      `Klasse: ${fields.klasse || ""}`,
      "",
      "Motivation:",
      fields.motivation || "",
      "",
      "Nachricht:",
      fields.nachricht || ""
    ].join("\n");

    const boundary = `MFS-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let message = "";
    message += `To: ${RECIPIENT}\n`;
    message += "From: no-reply@maygasse-finance-society.local\n";
    message += "Subject: Neue Bewerbung - Maygasse Finance Society\n";
    message += "MIME-Version: 1.0\n";

    if (cv) {
      message += `Content-Type: multipart/mixed; boundary=\"${boundary}\"\n\n`;
      message += `--${boundary}\n`;
      message += "Content-Type: text/plain; charset=utf-8\n\n";
      message += `${textBody}\n\n`;
      message += `--${boundary}\n`;
      message += `Content-Type: ${cv.contentType}; name=\"${cv.filename}\"\n`;
      message += `Content-Disposition: attachment; filename=\"${cv.filename}\"\n`;
      message += "Content-Transfer-Encoding: base64\n\n";
      message += `${cv.data.toString("base64").replace(/(.{76})/g, "$1\n")}\n`;
      message += `--${boundary}--\n`;
    } else {
      message += "Content-Type: text/plain; charset=utf-8\n\n";
      message += `${textBody}\n`;
    }

    const sendmail = spawn("/usr/sbin/sendmail", ["-t", "-i"]);

    let stderr = "";
    sendmail.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    sendmail.on("error", (error) => {
      reject(new Error(`sendmail_not_available: ${error.message}`));
    });

    sendmail.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sendmail_failed: ${stderr || `exit_code_${code}`}`));
    });

    sendmail.stdin.write(message);
    sendmail.stdin.end();
  });

const serveStaticFile = (req, res) => {
  const safePath = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^\.\.(\/|\\|$)/, "");
  let filePath = safePath === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  });
};

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/apply") {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)$/);

    if (!contentType.startsWith("multipart/form-data") || !boundaryMatch) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, message: "multipart/form-data required" }));
      return;
    }

    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, message: "file too large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", async () => {
      try {
        const payload = Buffer.concat(chunks);
        const boundary = boundaryMatch[1].replace(/^"|"$/g, "");
        const { fields, files } = parseMultipart(payload, boundary);

        if (!fields.name || !fields.klasse || !fields.motivation || !fields.nachricht || !files.cv) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "missing required fields" }));
          return;
        }

        await sendApplicationEmail({ fields, files });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        console.error("Application submit failed:", error.message);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: false,
            message:
              "Email delivery failed. Ensure sendmail is configured on this server to forward messages to fabio.juranek@bhakwien13.at."
          })
        );
      }
    });

    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStaticFile(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`Maygasse site running on http://0.0.0.0:${PORT}`);
});
