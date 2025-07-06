// routes/patients.js
const express = require("express");
const authMiddleware = require("../authMiddleware");

// Importez les sous-routeurs
const patientRoutes = require("./patient/patientRoutes");
const visitRoutes = require("./patient/visitRoutes");
const medicationRoutes = require("./patient/medicationRoutes");
const labTestRoutes = require("./patient/labTestRoutes");
const documentRoutes = require("./patient/documentRoutes"); // Ce routeur est une fonction qui prend 'io'
const waitingRoomRoutes = require("./patient/waitingRoomRoutes");

module.exports = (io) => {
  // Le routeur principal est maintenant une fonction qui prend 'io'
  const router = express.Router();

  // Apply authentication middleware to all patient-related routes
  router.use(authMiddleware);

  // Middleware pour parser le JSON dans le corps des requêtes
  router.use(express.json());

  // --- Montage des sous-routeurs ---

  // Routes pour les patients eux-mêmes (GET, POST, PUT, DELETE /patient, /patient/id/:id, /patient/name/:name)
  router.use("/", patientRoutes);

  // Routes pour les visites (POST, GET /patient/:patientId/visits)
  router.use("/:patientId/visits", visitRoutes);

  // Routes pour les médicaments (POST, GET /patient/:patientId/medications)
  router.use("/:patientId/medications", medicationRoutes);

  // Routes pour les tests de laboratoire (POST, GET /patient/:patientId/labtests)
  router.use("/:patientId/labtests", labTestRoutes);

  // Le routeur de documents contient maintenant des chemins complets,
  // on peut donc le monter à la racine de `/patient`.
  router.use("/", documentRoutes(io));

  // Routes pour la salle d'attente (POST, GET, PUT, DELETE /patient/waiting-room)
  router.use("/waiting-room", waitingRoomRoutes);

  return router;
};
