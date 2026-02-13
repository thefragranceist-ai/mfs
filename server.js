const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const RECIPIENT = "fabio.juranek@bhakwien13.at";

const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "Maygasse Finance Society <no-reply@maygasse-finance-society.local>",
  secure: (process.env.SMTP_SECURE || "true").toLowerCase() !== "false"
};

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
const toBase64 = (value) => Buffer.from(value, "utf8").toString("base64");

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

const buildMimeMessage = ({ fields, files }) => {
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
  const textBase64 = Buffer.from(textBody, "utf8").toString("base64").replace(/(.{76})/g, "$1\n");

  let message = "";
  message += `To: ${RECIPIENT}\r\n`;
  message += `From: ${EMAIL_CONFIG.from}\r\n`;
  message += "Subject: New Application - Maygasse Finance Society\r\n";
  message += "MIME-Version: 1.0\r\n";

  if (cv) {
    message += `Content-Type: multipart/mixed; boundary=\"${boundary}\"\r\n\r\n`;
    message += `--${boundary}\r\n`;
    message += "Content-Type: text/plain; charset=utf-8\r\n";
    message += "Content-Transfer-Encoding: base64\r\n\r\n";
    message += `${textBase64}\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: ${cv.contentType}; name=\"${cv.filename}\"\r\n`;
    message += `Content-Disposition: attachment; filename=\"${cv.filename}\"\r\n`;
    message += "Content-Transfer-Encoding: base64\r\n\r\n";
    message += `${cv.data.toString("base64").replace(/(.{76})/g, "$1\n")}\r\n`;
    message += `--${boundary}--\r\n`;
  } else {
    message += "Content-Type: text/plain; charset=utf-8\r\n";
    message += "Content-Transfer-Encoding: base64\r\n\r\n";
    message += `${textBase64}\r\n`;
  }

  return message;
};

const sendViaSendmail = (mimeMessage) =>
  new Promise((resolve, reject) => {
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

    sendmail.stdin.write(mimeMessage);
    sendmail.stdin.end();
  });

const sendSmtpCommand = (socket, command, expectedCodes) =>
  new Promise((resolve, reject) => {
    let buffer = "";

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (!/^\d{3}[\s-]/.test(last) || last[3] === "-") return;

      const code = Number(last.slice(0, 3));
      socket.off("data", onData);
      if (expectedCodes.includes(code)) resolve(last);
      else reject(new Error(`smtp_unexpected_${code}: ${last}`));
    };

    socket.on("data", onData);

    if (command) socket.write(`${command}\r\n`);
  });

const sendViaSmtp = async (mimeMessage) => {
  if (!EMAIL_CONFIG.host || !EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
    throw new Error("smtp_config_missing");
  }

  const socket = EMAIL_CONFIG.secure
    ? tls.connect({ host: EMAIL_CONFIG.host, port: EMAIL_CONFIG.port, servername: EMAIL_CONFIG.host })
    : net.connect({ host: EMAIL_CONFIG.host, port: EMAIL_CONFIG.port });

  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });

  try {
    await sendSmtpCommand(socket, null, [220]);
    await sendSmtpCommand(socket, "EHLO maygasse-finance-society.local", [250]);
    await sendSmtpCommand(socket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(socket, toBase64(EMAIL_CONFIG.user), [334]);
    await sendSmtpCommand(socket, toBase64(EMAIL_CONFIG.pass), [235]);
    await sendSmtpCommand(socket, `MAIL FROM:<${EMAIL_CONFIG.user}>`, [250]);
    await sendSmtpCommand(socket, `RCPT TO:<${RECIPIENT}>`, [250, 251]);
    await sendSmtpCommand(socket, "DATA", [354]);
    await sendSmtpCommand(socket, `${mimeMessage}\r\n.`, [250]);
    await sendSmtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
};

const sendApplicationEmail = async ({ fields, files }) => {
  const mimeMessage = buildMimeMessage({ fields, files });

  if (EMAIL_CONFIG.host) {
    await sendViaSmtp(mimeMessage);
    return;
  }

  await sendViaSendmail(mimeMessage);
};

const serveStaticFile = (req, res) => {
  const safePath = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = safePath === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
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

        const setupHint = EMAIL_CONFIG.host
          ? "SMTP failed. Verify SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS and provider settings."
          : "No SMTP configured and sendmail unavailable. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.";

        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: false,
            message: `${setupHint} Target recipient is ${RECIPIENT}.`
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
  if (EMAIL_CONFIG.host) {
    console.log(`Email mode: SMTP (${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}) -> ${RECIPIENT}`);
  } else {
    console.log("Email mode: sendmail fallback (/usr/sbin/sendmail)");
  }
});
