const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./vehicles.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle_stats (
      plate TEXT PRIMARY KEY,
      early INTEGER NOT NULL DEFAULT 0,
      late  INTEGER NOT NULL DEFAULT 0
    )
  `);

  // sample rows
  db.run(`INSERT OR IGNORE INTO vehicle_stats (plate, early, late) VALUES (?, ?, ?)`, ["BUS-4587", 18, 5]);
  db.run(`INSERT OR IGNORE INTO vehicle_stats (plate, early, late) VALUES (?, ?, ?)`, ["ABC-1234", 3, 9]);

  console.log("✅ DB ready: vehicles.db");
});

db.close();
