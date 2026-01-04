const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 8080;
const db = new sqlite3.Database("./vehicles.db");

// Store last payload for new dashboards
let lastPayload = null;

// -------------------- helpers --------------------

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

function ensureVehicleRow(plate) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO vehicle_stats (plate, early, late)
       VALUES (?, 0, 0)`,
      [plate],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function accumulate(plate, status) {
  return new Promise((resolve, reject) => {
    let sql =
      status === "on_time"
        ? `UPDATE vehicle_stats SET early = early + 1 WHERE plate = ?`
        : `UPDATE vehicle_stats SET late = late + 1 WHERE plate = ?`;

    db.run(sql, [plate], (err) => (err ? reject(err) : resolve()));
  });
}

function getTotals(plate) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT early, late FROM vehicle_stats WHERE plate = ?`,
      [plate],
      (err, row) => {
        if (err) return reject(err);
        resolve({
          early: row?.early ?? 0,
          late: row?.late ?? 0,
        });
      }
    );
  });
}

// -------------------- websocket --------------------

wss.on("connection", (ws) => {
  console.log("✅ Dashboard connected");
  if (lastPayload) ws.send(JSON.stringify(lastPayload));
});

// -------------------- http endpoint --------------------

app.post("/api/update", upload.single("image"), async (req, res) => {
  try {
    const plate = req.body.name?.trim();
    if (!plate) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }

    // Determine status
    let status = null;
    if (req.body.status) {
      status = req.body.status.toLowerCase();
    } else if (req.body.is_late !== undefined) {
      status = req.body.is_late === "true" ? "late" : "on_time";
    }

    if (status !== "on_time" && status !== "late") {
      return res.status(400).json({
        ok: false,
        error: 'status must be "on_time" or "late"',
      });
    }

    // 1️⃣ ensure row exists
    await ensureVehicleRow(plate);

    // 2️⃣ accumulate
    await accumulate(plate, status);

    // 3️⃣ read totals
    const totals = await getTotals(plate);

    // 4️⃣ build payload for frontend
    const payload = {
      name: plate,
      early: totals.early,
      late: totals.late,
      status,
      description: req.body.description ?? undefined,
    };

    if (req.file) {
      const mime = req.file.mimetype;
      const b64 = req.file.buffer.toString("base64");
      payload.image_data = `data:${mime};base64,${b64}`;
    }

    lastPayload = payload;
    broadcast(payload);

    res.json({
      ok: true,
      plate,
      early: totals.early,
      late: totals.late,
      status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "server error" });
  }
});

// ---------------------------------------------
// ADMIN: Flush all accumulated early/late counts
// ---------------------------------------------
app.post("/api/reset", async (req, res) => {
  try {
    db.run(
      `UPDATE vehicle_stats SET early = 0, late = 0`,
      [],
      (err) => {
        if (err) {
          console.error("❌ Reset error:", err);
          return res.status(500).json({ ok: false, error: "DB reset failed" });
        }

        console.log("🧹 All vehicle stats reset");

        // Optional: broadcast reset to dashboards
        const payload = {
          name: "--",
          early: 0,
          late: 0,
          status: "on_time",
          description: "All vehicle statistics have been reset",
        };

        lastPayload = payload;
        broadcast(payload);

        res.json({
          ok: true,
          message: "All early/late counts reset to zero",
        });
      }
    );
  } catch (e) {
    console.error("❌ /api/reset error:", e);
    res.status(500).json({ ok: false, error: "server error" });
  }
});


// -------------------- start --------------------

server.listen(PORT, () => {
  console.log(`🚀 HTTP: http://localhost:${PORT}`);
  console.log(`🚀 WS:   ws://localhost:${PORT}`);
});
