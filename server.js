const WebSocket = require('ws');

// Create the server on port 8080 (where your dashboard is looking)
const wss = new WebSocket.Server({ port: 8080 });

console.log("🚀 Server started on ws://localhost:8080");

wss.on('connection', (ws) => {
    console.log("✅ A client connected (Dashboard or Postman)");

    // When the server gets a message from Postman...
    ws.on('message', (data) => {
        console.log("📩 Received from Postman:", data.toString());

        // ...it sends it to the Dashboard
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });

    ws.on('close', () => console.log("❌ Client disconnected"));
});