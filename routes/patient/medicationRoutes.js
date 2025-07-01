// routes/patient/medicationRoutes.js
const express = require("express");
const { dbGet, dbAll, dbRun } = require("../../db"); // Importez les méthodes promisifiées

const router = express.Router({ mergeParams: true });

// POST un nouveau médicament pour un patient
router.post("/", async (req, res) => {
  const patientId = req.params.patientId;
  const m = req.body;
  console.log("Corps reçu :", req.body);

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }
  if (!m.medication_name || !m.medication_date) {
    return res.status(400).json({
      error:
        "Les champs 'medication_name' et 'medication_date' sont requis pour un médicament.",
    });
  }

  const query = `
    INSERT INTO medications (patient_id, medication_name, medication_date, medication_duration, dosage_form, times_per_day, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    patientId,
    m.medication_name,
    m.medication_date,
    m.medication_duration,
    m.dosage_form,
    m.times_per_day,
    m.amount,
  ];

  try {
    const result = await dbRun(query, values);
    res.status(201).json({
      medication_id: result.lastID,
      message: "Médicament ajouté avec succès.",
    });
  } catch (err) {
    console.error("Error inserting medication:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET tous les médicaments pour un patient
router.get("/", async (req, res) => {
  const patientId = req.params.patientId;

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }

  try {
    const rows = await dbAll(
      `SELECT * FROM medications WHERE patient_id = ? ORDER BY medication_id DESC`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching medications:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET médicaments filtrés par nom pour un patient
router.get("/search", async (req, res) => {
  const patientId = req.params.patientId;
  const name = `%${req.query.name || ""}%`;

  if (isNaN(patientId))
    return res.status(400).json({ error: "ID du patient invalide." });

  try {
    const rows = await dbAll(
      `SELECT * FROM medications WHERE patient_id = ? AND medication_name LIKE ? ORDER BY medication_id DESC`,
      [patientId, name]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching filtered medications:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// TODO: Ajouter des routes PUT et DELETE pour les médicaments si nécessaire

module.exports = router;
