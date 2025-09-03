// server.js
const WebSocket = require("ws");
const express = require("express");
const fetch = require("node-fetch");

const port = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// 🔹 1. Create transcript job
app.post("/transcribe", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

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
      return res.status(400).json({ error: "Failed to create transcript", details: data });
    }

    // ✅ Return transcript job ID immediately
    res.json({ id: data.id, status: data.status });
  } catch (err) {
    console.error("❌ Transcribe error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// 🔹 2. Poll transcript status
app.get("/transcribe/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "No transcript ID provided" });

  try {
    const check = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: process.env.ASSEMBLYAI_API_KEY },
    });

    const data = await check.json();
    console.log("⏳ Transcript status:", data);

    res.json(data);
  } catch (err) {
    console.error("❌ Check transcript error:", err);
    res.status(500).json({ error: "Failed to check transcript" });
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
