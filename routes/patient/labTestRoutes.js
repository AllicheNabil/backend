// routes/patient/labTestRoutes.js
const express = require("express");
const { dbAll, dbRun } = require("../../db");

const router = express.Router({ mergeParams: true });

// POST un nouveau test de laboratoire pour un patient
router.post("/", async (req, res) => {
  const patientId = req.params.patientId;
  const userId = req.user.id;
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
    INSERT INTO lab_tests (patient_id, lab_test_name, lab_test_date, userId)
    VALUES (?, ?, ?, ?)
  `;
  const values = [patientId, lt.lab_test_name, lt.lab_test_date, userId];

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
  const userId = req.user.id;

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }

  try {
    const rows = await dbAll(
      `SELECT * FROM lab_tests WHERE patient_id = ? AND userId = ? ORDER BY id DESC`,
      [patientId, userId]
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
  const userId = req.user.id;
  const name = `%${req.query.name || ""}%`;

  if (isNaN(patientId))
    return res.status(400).json({ error: "ID du patient invalide." });

  try {
    const rows = await dbAll(
      `SELECT * FROM lab_tests WHERE patient_id = ? AND userId = ? AND lab_test_name LIKE ? ORDER BY id DESC`,
      [patientId, userId, name]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching filtered lab tests:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;