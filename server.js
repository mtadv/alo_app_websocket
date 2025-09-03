// server.js
const WebSocket = require("ws");
const express = require("express");

const app = express();
app.use(express.json());

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

// ✅ Add HTTP transcription endpoint for Flutter
app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing audio url" });

    // Request transcription from AssemblyAI
    const response = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: url }),
    });

    const data = await response.json();
    if (!data.id) return res.status(500).json({ error: "Failed to start transcription", details: data });

    // Poll until transcription is ready
    let transcript;
    while (true) {
      const check = await fetch(`https://api.assemblyai.com/v2/transcript/${data.id}`, {
        headers: { authorization: process.env.ASSEMBLYAI_API_KEY },
      });
      transcript = await check.json();
      if (transcript.status === "completed") break;
      if (transcript.status === "error") throw new Error(transcript.error);
      await new Promise(r => setTimeout(r, 2000)); // wait 2s
    }

    res.json({ text: transcript.text });
  } catch (err) {
    console.error("❌ Error in /transcribe:", err);
    res.status(500).json({ error: err.message });
  }
});

// Keep your WebSocket server as before...
console.log(`✅ WebSocket server is running on port ${port}`);
