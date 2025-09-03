// server.js
const WebSocket = require("ws");
const express = require("express");
const fetch = require("node-fetch");

const port = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// 🔹 Debug log for every request
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`, req.body || "");
  next();
});

// 🔹 Test route
app.get("/", (req, res) => {
  console.log("✅ Health check hit");
  res.send("Server is running!");
});

// 🔹 1. Create transcript job
app.post("/transcribe", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    console.error("❌ No URL provided in request body");
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    console.log("🎧 Received transcription request for:", url);

    const resp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: url }),
    });

    const data = await resp.json();
    console.log("📩 AssemblyAI create response:", data);

    if (!data.id) {
      console.error("❌ Failed to create transcript:", data);
      return res.status(400).json({ error: "Failed to create transcript", details: data });
    }

    res.json({ id: data.id, status: data.status });
  } catch (err) {
    console.error("❌ Transcribe error:", err.message);
    res.status(500).json({ error: "Transcription failed", details: err.message });
  }
});

// 🔹 2. Poll transcript status
app.get("/transcribe/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    console.error("❌ No transcript ID provided");
    return res.status(400).json({ error: "No transcript ID provided" });
  }

  try {
    console.log(`🔍 Checking transcript status for ID: ${id}`);

    const check = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: process.env.ASSEMBLYAI_API_KEY },
    });

    const data = await check.json();
    console.log("⏳ Transcript status response:", data);

    res.json(data);
  } catch (err) {
    console.error("❌ Check transcript error:", err.message);
    res.status(500).json({ error: "Failed to check transcript", details: err.message });
  }
});

// 🔹 WebSocket server attached to Express
const server = app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("🔌 New WebSocket client connected");

  ws.on("message", (msg) => {
    console.log("💬 WS message:", msg.toString());
  });

  ws.on("close", () => {
    console.log("❌ WS client disconnected");
  });
});
