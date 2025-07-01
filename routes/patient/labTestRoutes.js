// routes/patient/labTestRoutes.js
const express = require("express");
const { dbGet, dbAll, dbRun } = require("../../db"); // Importez les méthodes promisifiées

const router = express.Router({ mergeParams: true });

// POST un nouveau test de laboratoire pour un patient
router.post("/", async (req, res) => {
  const patientId = req.params.patientId;
  const lt = req.body;
  console.log("Corps reçu :", req.body);

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }
  if (!lt.lab_test_name || !lt.lab_test_date) {
    return res.status(400).json({
      error:
        "Les champs 'lab_test_name' et 'lab_test_date' sont requis pour un test de laboratoire.",
    });
  }

  const query = `
    INSERT INTO lab_tests (patient_id, lab_test_name, lab_test_date)
    VALUES (?, ?, ?)
  `;
  const values = [patientId, lt.lab_test_name, lt.lab_test_date];

  try {
    const result = await dbRun(query, values);
    res.status(201).json({
      lab_test_id: result.lastID,
      message: "Test de laboratoire ajouté avec succès.",
    });
  } catch (err) {
    console.error("Error inserting lab test:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET tous les tests de laboratoire pour un patient
router.get("/", async (req, res) => {
  const patientId = req.params.patientId;

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }

  try {
    const rows = await dbAll(
      `SELECT * FROM lab_tests WHERE patient_id = ? ORDER BY lab_test_id DESC`,
      [patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching lab tests:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET tests de laboratoire filtrés par nom pour un patient
router.get("/search", async (req, res) => {
  const patientId = req.params.patientId;
  const name = `%${req.query.name || ""}%`;

  if (isNaN(patientId))
    return res.status(400).json({ error: "ID du patient invalide." });

  try {
    const rows = await dbAll(
      `SELECT * FROM lab_tests WHERE patient_id = ? AND lab_test_name LIKE ? ORDER BY lab_test_id DESC`,
      [patientId, name]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching filtered lab tests:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// TODO: Ajouter des routes PUT et DELETE pour les tests de laboratoire si nécessaire

module.exports = router;
