// routes/patient/documentRoutes.js
const express = require("express");
const { dbGet, dbAll, dbRun } = require("../../db"); // Importez les méthodes promisifiées
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs").promises; // Utiliser la version promisifiée de fs
const fsSync = require("fs"); // Pour fs.unlink synchrone en cas d'erreur

// Utiliser { mergeParams: true } pour accéder aux paramètres du routeur parent (patientId)
const router = express.Router({ mergeParams: true });

// --- Configuration de Multer pour l'upload de fichiers ---

// Configuration pour les uploads via le bureau (patientId est dans req.params)
// ou pour la sauvegarde finale du fichier mobile après traitement.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "..", // remonte à routes/
      "..", // remonte à server/
      "uploads",
      req.params.patientId.toString()
    );
    // Créer le dossier s'il n'existe pas
    fsSync.mkdirSync(uploadPath, { recursive: true }); // Utiliser fs synchrone ici car multer l'attend
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`);
  },
});

const uploadDesktop = multer({ storage: storage });

// Configuration pour les uploads depuis le mobile (stockage en mémoire initial)
const uploadMobile = multer({ storage: multer.memoryStorage() });

// Stockage en mémoire pour les sessions. Pour la production, utilisez une base de données comme Redis.
const mobileUploadSessions = new Map();

module.exports = (io) => {
  // Le routeur est maintenant une fonction qui prend 'io'

  // POST: Uploader un document pour un patient (depuis le bureau)
  router.post(
    "/:patientId/documents",
    uploadDesktop.single("document"),
    async (req, res) => {
      const patientId = req.params.patientId;

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Aucun fichier n'a été uploadé." });
      }

      const document_name = req.file.originalname;
      const document_path = path.join(
        req.params.patientId.toString(),
        req.file.filename
      );
      const upload_date = new Date().toISOString().split("T")[0];

      const query = `
          INSERT INTO documents (patient_id, document_name, document_path, upload_date)
          VALUES (?, ?, ?, ?)
      `;
      const values = [patientId, document_name, document_path, upload_date];

      try {
        const result = await dbRun(query, values);
        res.status(201).json({
          document_id: result.lastID,
          message: "Document uploadé et enregistré avec succès.",
        });
      } catch (err) {
        console.error("Error inserting document record:", err.message);
        // En cas d'erreur DB, tenter de supprimer le fichier physique si déjà enregistré
        const filePath = path.join(
          __dirname,
          "..",
          "..",
          "uploads",
          document_path
        );
        fs.unlink(filePath).catch((unlinkErr) =>
          console.error("Error cleaning up file:", unlinkErr.message)
        );
        res.status(500).json({ error: err.message });
      }
    }
  );

  // GET: Récupérer la liste des documents pour un patient
  router.get("/:patientId/documents", async (req, res) => {
    const patientId = req.params.patientId;

    if (isNaN(patientId)) {
      return res.status(400).json({ error: "ID du patient invalide." });
    }

    try {
      const rows = await dbAll(
        `SELECT document_id, patient_id, document_name, document_path, upload_date FROM documents WHERE patient_id = ? ORDER BY document_id DESC`,
        [patientId]
      );
      res.json(rows);
    } catch (err) {
      console.error("Error fetching documents:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE: Supprimer un document
  router.delete("/:patientId/documents/:documentId", async (req, res) => {
    const { patientId, documentId } = req.params;

    if (isNaN(documentId) || isNaN(patientId)) {
      return res
        .status(400)
        .json({ error: "ID du document ou du patient invalide." });
    }

    try {
      // Étape 1: Récupérer le chemin du document
      const doc = await dbGet(
        "SELECT document_path FROM documents WHERE document_id = ? AND patient_id = ?",
        [documentId, patientId]
      );
      if (!doc) {
        return res
          .status(404)
          .json({ error: "Document non trouvé pour ce patient." });
      }

      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        doc.document_path
      );

      // Étape 2: Supprimer le fichier physique du disque
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        if (unlinkErr.code !== "ENOENT") {
          // Ignorer si le fichier n'existe pas
          console.error("Error deleting document file:", unlinkErr.message);
          return res
            .status(500)
            .json({ error: "Impossible de supprimer le fichier physique." });
        }
      }

      // Étape 3: Supprimer l'enregistrement du document de la base de données
      const result = await dbRun(
        "DELETE FROM documents WHERE document_id = ?",
        [documentId]
      );
      res.json({
        message: "Document supprimé avec succès.",
        changes: result.changes,
      });
    } catch (err) {
      console.error("Error deleting document record:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Routes pour l'upload depuis un mobile via QR Code ---

  // POST: Créer une session d'upload pour un patient
  router.post("/:patientId/documents/upload-session", async (req, res) => {
    // Note: patientId est dans req.params ici
    const { patientId } = req.params;
    const sessionId = uuidv4();
    mobileUploadSessions.set(sessionId, patientId);

    setTimeout(() => {
      mobileUploadSessions.delete(sessionId);
    }, 300000); // 5 minutes

    res.json({ sessionId });
  });

  // POST: Recevoir un document uploadé depuis la page web mobile (cette route n'a pas patientId dans ses params)
  router.post(
    "/mobile-upload", // Cette route est montée directement sous /patient/mobile-upload dans le routeur principal
    uploadMobile.array("document", 10),
    async (req, res) => {
      const { sessionId } = req.body;

      if (!req.files || req.files.length === 0)
        return res
          .status(400)
          .json({ error: "Aucun fichier n'a été uploadé." });
      if (!sessionId || !mobileUploadSessions.has(sessionId))
        return res.status(403).json({ error: "Session invalide ou expirée." });

      const patientId = mobileUploadSessions.get(sessionId);
      const patientUploadDir = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        patientId.toString()
      );

      try {
        await fs.mkdir(patientUploadDir, { recursive: true });

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const document_name = file.originalname;
          const fileBuffer = file.buffer;
          const filename = `${Date.now()}-${i}-${document_name.replace(
            /\s/g,
            "_"
          )}`;
          const filePathOnDisk = path.join(patientUploadDir, filename);
          const document_path = path.join(patientId.toString(), filename);
          const upload_date = new Date().toISOString().split("T")[0];

          await fs.writeFile(filePathOnDisk, fileBuffer);
          await dbRun(
            `INSERT INTO documents (patient_id, document_name, document_path, upload_date) VALUES (?, ?, ?, ?)`,
            [patientId, document_name, document_path, upload_date]
          );
        }

        io.to(sessionId).emit("upload_complete", {
          message: `${req.files.length} fichier(s) uploadé(s) avec succès.`,
        });
        mobileUploadSessions.delete(sessionId);
        res.status(201).json({ message: "Documents reçus avec succès." });
      } catch (err) {
        console.error("Error processing mobile uploaded files:", err.message);
        res.status(500).json({
          error: "Une erreur est survenue lors du traitement des fichiers.",
        });
      }
    }
  );

  return router;
};
