// server.js
const WebSocket = require("ws");
const express = require("express");
const fetch = require("node-fetch");

const port = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// 🔹 Simple HTTP endpoint for transcribing stored audio files
app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing audio URL" });

    // Start transcription
    const resp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: url }),
    });

    const data = await resp.json();
    if (data.error) {
      console.error("❌ AssemblyAI error:", data.error);
      return res.status(400).json(data);
    }

    // Poll until transcription is ready
    let status = data.status;
    let transcript = null;
    while (status !== "completed" && status !== "error") {
      await new Promise((r) => setTimeout(r, 3000));
      const check = await fetch(
        `https://api.assemblyai.com/v2/transcript/${data.id}`,
        { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
      );
      const checkData = await check.json();
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

// Existing WebSocket server
const wss = new WebSocket.Server({ server: app.listen(port) });
console.log(`✅ Server running on port ${port}`);
