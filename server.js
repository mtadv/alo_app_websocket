// server.js
const WebSocket = require("ws");

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`✅ WebSocket server is running on port ${port}`);

wss.on("connection", async (ws) => {
  console.log("🔌 New client connected");

  // Connect to AssemblyAI real-time API
  const assemblyWs = await connectToAssemblyAI();

  // Forward AssemblyAI transcripts back to client
  if (assemblyWs) {
    assemblyWs.on("message", (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.text) {
        console.log("📝 Transcript:", data.text);
        ws.send(JSON.stringify({ transcript: data.text }));
      }
    });
  }

  // Handle incoming messages from client
  ws.on("message", (message) => {
    console.log(`💬 Received from client`);

    // If it's audio data, forward to AssemblyAI
    if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
      assemblyWs.send(
        JSON.stringify({
          audio_data: message.toString("base64"), // assuming raw PCM
        })
      );
    }

    // Broadcast message to other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    if (assemblyWs) assemblyWs.close();
  });
});

// 🔹 Function to connect to AssemblyAI Realtime API
async function connectToAssemblyAI() {
  try {
    // Get a temporary token from AssemblyAI
    const resp = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expires_in: 3600 }), // 1 hour expiry
    });

    const data = await resp.json();
    if (!data || !data.token) {
      console.error("❌ Failed to get AssemblyAI token:", data);
      return null;
    }

    const assemblyUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${data.token}`;
    const assemblyWs = new WebSocket(assemblyUrl);

    assemblyWs.on("open", () => {
      console.log("🔗 Connected to AssemblyAI Realtime API");
    });

    assemblyWs.on("error", (err) => {
      console.error("⚠️ AssemblyAI WebSocket error:", err);
    });

    assemblyWs.on("close", () => {
      console.log("🔌 AssemblyAI connection closed");
    });

    return assemblyWs;
  } catch (err) {
    console.error("❌ Error connecting to AssemblyAI:", err);
    return null;
  }
}
