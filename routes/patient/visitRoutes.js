// routes/patient/visitRoutes.js
const express = require("express");
const { dbAll, dbRun } = require("../../db");

const router = express.Router({ mergeParams: true });

// POST une nouvelle visite pour un patient
router.post("/", async (req, res) => {
  const patientId = req.params.patientId;
  const userId = req.user.id;
  const v = req.body;

  if (isNaN(patientId)) {
    return res.status(400).json({ error: "ID du patient invalide." });
  }
  if (!v.visit_date || !v.visit_hour || !v.visit_reason) {
    return res.status(400).json({
      error:
        "Les champs 'visit_date', 'visit_hour' et 'visit_reason' sont requis pour une visite.",
    });
  }

  const query = `
    INSERT INTO visits (patient_id, visit_reason, visit_weight, visit_weight_percentile, visit_height, visit_height_percentile, visit_head_circumference, visit_head_circumference_percentile, visit_bmi, visit_physical_examination, visit_diagnosis, visit_date, visit_hour, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    patientId,
    v.visit_reason,
    v.visit_weight,
    v.visit_weight_percentile,
    v.visit_height,
    v.visit_height_percentile,
    v.visit_head_circumference,
    v.visit_head_circumference_percentile,
    v.visit_bmi,
    v.visit_physical_examination,
    v.visit_diagnosis,
    v.visit_date,
    v.visit_hour,
    userId,
  ];

  try {
    const result = await dbRun(query, values);
    res
      .status(201)
      .json({
        visit_id: result.lastID,
        message: "Visite ajoutée avec succès.",
      });
  } catch (err) {
    console.error("Error inserting visit:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET toutes les visites pour un patient
router.get("/", async (req, res) => {
  const patientId = req.params.patientId;
  const userId = req.user.id;
  console.log(`GET /visits/ for patientId: ${patientId}`);

  if (isNaN(patientId)) {
    console.log(`Invalid patientId: ${patientId}`);
    return res.status(400).json({ error: "ID du patient invalide." });
  }

  try {
    const rows = await dbAll(
      `SELECT * FROM visits WHERE patient_id = ? AND userId = ? ORDER BY id DESC`,
      [patientId, userId]
    );
    console.log(`Fetched ${rows.length} visits for patientId: ${patientId}`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching visits:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;