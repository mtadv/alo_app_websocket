// server.js
const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`✅ WebSocket server is running on port ${port}`);

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.on('message', (message) => {
    console.log(`💬 Received: ${message}`);

    // Broadcast to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});
