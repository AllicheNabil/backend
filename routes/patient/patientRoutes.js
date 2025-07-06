// routes/patient/patientRoutes.js
const express = require("express");
const { dbGet, dbAll, dbRun } = require("../../db"); // Importez les méthodes promisifiées

const router = express.Router();

// GET tous les patients pour l'utilisateur authentifié
router.get("/", async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await dbAll(
      "SELECT * FROM patients WHERE userId = ? ORDER BY name COLLATE NOCASE ASC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching all patients:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET patient par ID pour l'utilisateur authentifié
router.get("/id/:id", async (req, res) => {
  const patientId = req.params.id;
  const userId = req.user.id;
  try {
    const row = await dbGet("SELECT * FROM patients WHERE id = ? AND userId = ?", [patientId, userId]);
    if (!row) {
      return res.status(404).json({ error: "Patient non trouvé" });
    }
    res.json(row);
  } catch (err) {
    console.error("Error fetching patient by ID:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET patient par nom pour l'utilisateur authentifié
router.get("/name/:name", async (req, res) => {
  const patientName = req.params.name;
  const userId = req.user.id;
  try {
    const row = await dbGet("SELECT * FROM patients WHERE name = ? AND userId = ?", [
      patientName,
      userId,
    ]);
    if (!row) {
      return res.status(404).json({ error: "Patient non trouvé" });
    }
    res.json(row);
  } catch (err) {
    console.error("Error fetching patient by name:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST un nouveau patient pour l'utilisateur authentifié
router.post("/", async (req, res) => {
  const p = req.body;
  const userId = req.user.id;
  console.log("Corps reçu :", p);

  if (!p.name || !p.creation_date || !p.sex || !p.date_of_birth) {
    return res.status(400).json({
      error:
        "Les champs 'name', 'creation_date', 'sex' et 'date_of_birth' sont requis.",
    });
  }

  const query = `
    INSERT INTO patients (creation_date, name, sex, date_of_birth, phone, adresse, personal_medical_history, familial_medical_history, current_medical_conditions, current_medications, allergies, surgeries, vaccines, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    p.creation_date,
    p.name,
    p.sex,
    p.date_of_birth,
    p.phone,
    p.adresse,
    p.personal_medical_history,
    p.familial_medical_history,
    p.current_medical_conditions,
    p.current_medications,
    p.allergies,
    p.surgeries,
    p.vaccines,
    userId,
  ];

  try {
    const result = await dbRun(query, values);
    res
      .status(201)
      .json({ id: result.lastID, message: "Patient créé avec succès." });
  } catch (err) {
    console.error("Error inserting patient:", err.message);
    if (err.message.includes("UNIQUE constraint failed: patients.name")) {
      return res
        .status(409)
        .json({ error: "Un patient avec ce nom existe déjà." });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT (Mise à jour) d'un patient par ID pour l'utilisateur authentifié
router.put("/:id", async (req, res) => {
  const patientId = req.params.id;
  const userId = req.user.id;
  const p = req.body;

  if (isNaN(patientId))
    return res.status(400).json({ error: "ID du patient invalide." });
  if (!p.name || !p.creation_date || !p.sex || !p.date_of_birth) {
    return res.status(400).json({
      error: "Les champs essentiels sont requis pour la mise à jour.",
    });
  }

  const query = `
    UPDATE patients SET creation_date = ?, name = ?, sex = ?, date_of_birth = ?, phone = ?, adresse = ?,
    personal_medical_history = ?, familial_medical_history = ?, current_medical_conditions = ?,
    current_medications = ?, allergies = ?, surgeries = ?, vaccines = ?
    WHERE id = ? AND userId = ?
  `;
  const values = [
    p.creation_date,
    p.name,
    p.sex,
    p.date_of_birth,
    p.phone,
    p.adresse,
    p.personal_medical_history,
    p.familial_medical_history,
    p.current_medical_conditions,
    p.current_medications,
    p.allergies,
    p.surgeries,
    p.vaccines,
    patientId,
    userId,
  ];

  try {
    const result = await dbRun(query, values);
    if (result.changes === 0)
      return res.status(404).json({
        error: "Patient non trouvé ou aucune modification effectuée.",
      });
    res.json({
      changes: result.changes,
      message: "Patient mis à jour avec succès.",
    });
  } catch (err) {
    console.error("Error updating patient:", err.message);
    if (err.message.includes("UNIQUE constraint failed: patients.name"))
      return res
        .status(409)
        .json({ error: "Un autre patient avec ce nom existe déjà." });
    res.status(500).json({ error: err.message });
  }
});

// DELETE un patient par ID pour l'utilisateur authentifié
router.delete("/:id", async (req, res) => {
  const patientId = req.params.id;
  const userId = req.user.id;
  if (isNaN(patientId))
    return res.status(400).json({ error: "ID du patient invalide." });

  try {
    const result = await dbRun(`DELETE FROM patients WHERE id = ? AND userId = ?`, [
      patientId,
      userId,
    ]);
    if (result.changes === 0)
      return res.status(404).json({ error: "Patient non trouvé." });
    res.json({
      changes: result.changes,
      message: "Patient supprimé avec succès (et données associées).",
    });
  } catch (err) {
    console.error("Error deleting patient:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;