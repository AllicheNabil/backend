// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors"); // Pour permettre les requêtes depuis votre application Flutter
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const routes = require("./routes/routes"); // Importez les routes des patients
const authRoutes = require("./routes/authRoutes"); // Importez les routes d'authentification

const app = express();
const server = http.createServer(app); // Créez un serveur HTTP à partir de l'application Express
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
const PORT = process.env.PORT || 3000;
// Middleware pour parser les corps de requête JSON
app.use(express.json());

// Middleware CORS pour permettre à votre application Flutter de se connecter
// Pour le développement, '*' est acceptable. Pour la production, spécifiez des origines permises.
app.use(cors({ origin: "*" }));

// Servir les fichiers statiques du dossier 'uploads'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Servir les fichiers statiques du dossier 'public' (pour mobile-upload.html et autres assets web)
app.use(express.static(path.join(__dirname, "public")));

// Utiliser les routes des patients
// Toutes les routes définies dans patients.js seront préfixées par '/patient'
app.use("/patient", routes(io)); // Passe l'instance io au routeur des patients
app.use("/api/auth", authRoutes);

// Logique Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected via WebSocket");
  socket.on("join_session", (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });
});

// Gestion des routes non trouvées (404)
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint non trouvé." });
});

// Gestion des erreurs générales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Quelque chose s'est mal passé sur le serveur !" });
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
