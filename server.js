// server.js
const WebSocket = require("ws");
const express = require("express");
const fetch = require("node-fetch");

const port = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// 🔹 HTTP endpoint for transcribing stored audio files
app.post("/transcribe", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    console.log("🎧 Received transcription request for:", url);

    // 1. Create a transcript request
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

    // 2. Poll until the transcript is ready
    let status = data.status;
    let transcript = null;

    while (status !== "completed" && status !== "error") {
      await new Promise((r) => setTimeout(r, 3000)); // wait 3s
      const check = await fetch(
        `https://api.assemblyai.com/v2/transcript/${data.id}`,
        { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
      );
      const checkData = await check.json();
      console.log("⏳ Polling status:", checkData);

      status = checkData.status;
      if (status === "completed") transcript = checkData.text;
      if (status === "error") return res.status(400).json(checkData);
    }

    res.json({ text: transcript });
  } catch (err) {
    console.error("❌ Transcribe error:", err);
    res.status(500).json({ error: "Transcription failed" });
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
