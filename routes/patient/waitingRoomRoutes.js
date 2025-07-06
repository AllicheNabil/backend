// routes/patient/waitingRoomRoutes.js
const express = require("express");
const { dbGet, dbAll, dbRun } = require("../../db"); // Importez les méthodes promisifiées

const router = express.Router();

// POST: Ajouter un patient à la salle d'attente
router.post("/add", async (req, res) => {
  const { patient_id } = req.body;
  const userId = req.user.id;

  if (!patient_id) {
    return res.status(400).json({ error: "Le champ 'patient_id' est requis." });
  }

  try {
    // Vérifier si le patient existe et appartient à l'utilisateur
    const patient = await dbGet("SELECT id FROM patients WHERE id = ? AND userId = ?", [
      patient_id,
      userId,
    ]);
    if (!patient) {
      return res.status(404).json({ error: "Patient non trouvé." });
    }

    // Vérifier si le patient n'est pas déjà activement dans la salle d'attente de cet utilisateur
    const existingEntry = await dbGet(
      "SELECT id FROM waiting_room WHERE patient_id = ? AND userId = ? AND status IN ('en attente', 'appelé', 'en consultation')",
      [patient_id, userId]
    );
    if (existingEntry) {
      return res
        .status(409)
        .json({ error: "Ce patient est déjà dans la salle d'attente." });
    }

    const arrival_timestamp = new Date().toISOString();
    const status = "en attente";

    const query = `
      INSERT INTO waiting_room (patient_id, arrival_timestamp, status, userId)
      VALUES (?, ?, ?, ?)
    `;
    const result = await dbRun(query, [patient_id, arrival_timestamp, status, userId]);
    res.status(201).json({
      id: result.lastID,
      patient_id,
      arrival_timestamp,
      status,
      message: "Patient ajouté à la salle d'attente.",
    });
  } catch (err) {
    console.error("Error adding patient to waiting room:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET: Récupérer tous les patients actifs dans la salle d'attente de l'utilisateur
router.get("/", async (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT wr.id, wr.patient_id, p.name as patient_name, wr.arrival_timestamp, wr.status, wr.call_timestamp
    FROM waiting_room wr
    JOIN patients p ON wr.patient_id = p.id
    WHERE wr.userId = ? AND wr.status != 'terminé'
    ORDER BY wr.arrival_timestamp ASC
  `;
  try {
    const rows = await dbAll(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching waiting room:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT: Mettre à jour le statut d'une entrée dans la salle d'attente
router.put("/:entryId/status", async (req, res) => {
  const { entryId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  if (!status) {
    return res.status(400).json({ error: "Le champ 'status' est requis." });
  }

  const allowedStatus = ["en attente", "appelé", "en consultation", "terminé"];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({
      error: `Statut invalide. Les statuts autorisés sont : ${allowedStatus.join(
        ", "
      )}.`,
    });
  }

  let query = "UPDATE waiting_room SET status = ?";
  const params = [status];

  if (status === "appelé") {
    query += ", call_timestamp = COALESCE(call_timestamp, ?)";
    params.push(new Date().toISOString());
  }

  query += " WHERE id = ? AND userId = ?";
  params.push(entryId, userId);

  try {
    const result = await dbRun(query, params);
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "Entrée de la salle d'attente non trouvée." });
    }
    res.json({
      message: "Statut de l'entrée mis à jour avec succès.",
      changes: result.changes,
    });
  } catch (err) {
    console.error("Error updating waiting room entry status:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Retirer une entrée de la salle d'attente (ou la marquer comme terminée)
router.delete("/:entryId", async (req, res) => {
  const { entryId } = req.params;
  const userId = req.user.id;

  try {
    const result = await dbRun("DELETE FROM waiting_room WHERE id = ? AND userId = ?", [
      entryId,
      userId,
    ]);
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "Entrée de la salle d'attente non trouvée." });
    }
    res.json({
      message: "Entrée supprimée de la salle d'attente avec succès.",
      changes: result.changes,
    });
  } catch (err) {
    console.error("Error deleting waiting room entry:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;