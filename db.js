const sqlite3 = require("sqlite3").verbose();

// Connect to SQLite database
const db = new sqlite3.Database("./medDatabase.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the medDatabase SQLite database.");
});

// Promisify SQLite methods
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Create tables
db.serialize(() => {
  // Create Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

  // Create Patients table
  db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creation_date TEXT,
        name TEXT,
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
        vaccines TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

  // Drop tables if they exist
  db.run(`DROP TABLE IF EXISTS visits`);
  db.run(`DROP TABLE IF EXISTS medications`);
  db.run(`DROP TABLE IF EXISTS lab_tests`);

  // Create Visits table
  db.run(`CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reason TEXT,
        physical_examination TEXT,
        weight TEXT,
        weight_percentile TEXT,
        height TEXT,
        height_percentile TEXT,
        head_circumference TEXT,
        head_circumference_percentile TEXT,
        bmi TEXT,
        diagnosis TEXT,
        visit_date TEXT,
        visit_hour TEXT,
        patient_id INTEGER,
        userId INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

  // Create Waiting Room table
  db.run(`CREATE TABLE IF NOT EXISTS waiting_room (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        arrival_time TEXT,
        status TEXT,
        userId INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

  // Create Documents table
  db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        document_name TEXT,
        document_path TEXT,
        upload_date TEXT,
        userId INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

  // Create Lab Tests table
  db.run(`CREATE TABLE IF NOT EXISTS lab_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lab_test_name TEXT,
        lab_test_date TEXT,
        patient_id INTEGER,
        userId INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

  // Create Medications table
  db.run(`CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_name TEXT,
        medication_date TEXT,
        medication_duration TEXT,
        dosage_form TEXT,
        times_per_day TEXT,
        amount TEXT,
        patient_id INTEGER,
        userId INTEGER,
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);
});

module.exports = { db, dbGet, dbAll, dbRun };
