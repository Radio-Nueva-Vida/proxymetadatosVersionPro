
const express = require("express");
const http = require("http");
const https = require("https");
const fetch = require("node-fetch");
const morgan = require("morgan");
const url = require("url");

const app = express();
app.use(morgan("tiny"));

// CONFIG
const PORT = process.env.PORT || 3000;
const UPSTREAM_URL = process.env.UPSTREAM_URL || "https://server.streamcasthd.com/8626/stream";
const METADATA_URL = process.env.METADATA_URL || "https://server.streamcasthd.com/cp/get_info.php?p=8626";

function pipeRequest(upstream, upstreamReqOptions, clientRes) {
  const parsed = url.parse(upstream);
  const requester = parsed.protocol === "https:" ? https : http;

  const req = requester.request(upstream, upstreamReqOptions, (upRes) => {
    const headers = Object.assign({}, upRes.headers);

    if (!headers["content-type"]) headers["content-type"] = "audio/mpeg";

    headers["access-control-allow-origin"] = "*";
    headers["access-control-expose-headers"] = Object.keys(headers).join(",");

    clientRes.writeHead(upRes.statusCode || 200, headers);
    upRes.pipe(clientRes);
  });

  req.on("error", (err) => {
    console.error("Error piping upstream:", err);
    try {
      clientRes.writeHead(502, { "content-type": "text/plain" });
      clientRes.end("Bad gateway");
    } catch (e) {}
  });

  req.end();
}

app.get("/stream", (req, res) => {
  const upstreamOptions = {
    method: "GET",
    headers: {
      "Icy-MetaData": "1",
      "User-Agent": req.headers["user-agent"] || "Radio-Proxy/1.0"
    }
  };
  pipeRequest(UPSTREAM_URL, upstreamOptions, res);
});

app.get("/nowplaying", async (req, res) => {
  try {
    const r = await fetch(METADATA_URL, { timeout: 8000 });
    const data = await r.json();

    const titleRaw = data.title || "";
    let artist = "Desconocido";
    let title = titleRaw;

    if (titleRaw.includes(" - ")) {
      const parts = titleRaw.split(" - ");
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }

    const portada = data.art || null;
    const artworkUrl = portada ? `${req.protocol}://${req.get("host")}/artwork?url=${encodeURIComponent(portada)}` : null;

    res.set("Access-Control-Allow-Origin", "*");
    res.json({
      raw: data,
      artist,
      title,
      artwork: artworkUrl
    });

  } catch (err) {
    console.error("Error fetching nowplaying:", err);
    res.set("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "no metadata" });
  }
});

app.get("/artwork", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

  try {
    const parsed = url.parse(target);
    const client = parsed.protocol === "https:" ? https : http;

    client.get(target, (upRes) => {
      const contentType = upRes.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=1800");
      res.setHeader("Access-Control-Allow-Origin", "*");
      upRes.pipe(res);
    }).on("error", (err) => {
      console.error("Artwork fetch error:", err);
      res.status(502).send("Bad gateway retrieving artwork");
    });
  } catch (err) {
    console.error("Artwork proxy error:", err);
    res.status(500).send("Server error");
  }
});

app.get("/", (req, res) => {
  res.send(`<h3>Radio Proxy running</h3>
  <p>/stream -> proxy stream</p>
  <p>/nowplaying -> JSON metadata</p>`);
});

app.listen(PORT, () => {
  console.log(`Radio proxy listening on port ${PORT}`);
  console.log(`UPSTREAM_URL=${UPSTREAM_URL}`);
  console.log(`METADATA_URL=${METADATA_URL}`);
});
