// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Chemin vers le fichier de la base de données.
// Il est recommandé d'utiliser un chemin absolu pour éviter les problèmes de chemin relatif.
const DB_PATH = path.join(__dirname, "medDatabase.db");

// Créez une nouvelle instance de la base de données
// Si le fichier n'existe pas, sqlite3 le créera.
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    // Initialiser les tables si elles n'existent pas
    db.serialize(() => {
      db.run(`
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    creation_date TEXT,
                    name TEXT UNIQUE,
                    sex TEXT,
                    date_of_birth TEXT,
                    phone TEXT,
                    adresse TEXT,
                    personal_medical_history TEXT,
                    familial_medical_history TEXT,
                    current_medical_conditions TEXT,
                    current_medications TEXT,
                    allergies TEXT,
                    surgeries TEXT,
                    vaccines TEXT
                );
            `);

      db.run(`
                CREATE TABLE IF NOT EXISTS visits (
                    visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    visit_reason TEXT,
                    visit_weight TEXT,
                    visit_weight_percentile TEXT,
                    visit_height TEXT,
                    visit_height_percentile TEXT,
                    visit_head_circumference TEXT,
                    visit_head_circumference_percentile TEXT,
                    visit_bmi TEXT,
                    visit_physical_examination TEXT,
                    visit_diagnosis TEXT,
                    visit_date TEXT,
                    visit_hour TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
                );
            `);

      db.run(`
                CREATE TABLE IF NOT EXISTS medications (
                    medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    medication_name TEXT,
                    medication_date TEXT,
                    medication_duration TEXT,
                    dosage_form TEXT,
                    times_per_day TEXT,
                    amount TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
                );
            `);

      db.run(`
                CREATE TABLE IF NOT EXISTS lab_tests (
                    lab_test_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    lab_test_name TEXT,
                    lab_test_date TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
                );
            `);

      db.run(`
                CREATE TABLE IF NOT EXISTS documents (
                    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    document_name TEXT NOT NULL,
                    document_path TEXT NOT NULL,
                    upload_date TEXT NOT NULL,
                    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
                );
            `);
      db.run(`
                CREATE TABLE IF NOT EXISTS waiting_room (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    arrival_timestamp TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'en attente', -- Valeurs possibles: 'en attente', 'appelé', 'en consultation', 'terminé'
                    call_timestamp TEXT, -- Heure à laquelle le patient a été appelé
                    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
                );
            `);

      console.log("All necessary tables checked/created.");
    });
  }
});

// Promisify db methods for async/await usage
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // 'this' contains lastID, changes
    });
  });
};

module.exports = { db, dbGet, dbAll, dbRun };
