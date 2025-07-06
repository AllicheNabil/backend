const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { dbGet, dbRun } = require("../db");

const router = express.Router();
const saltRounds = 10; //the number of salt rounds to use for hashing
const jwtSecret = process.env.JWT_SECRET;
// Register a new user
router.post("/register", async (req, res) => {
  console.log("Registering user:", req.body);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide name, email, and password" });
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    const result = await dbRun(sql, [name, email, hash]);
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error("Error registering user:", err);
    return res.status(500).json({ message: "Error registering user" });
  }
});

// Login a user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide email and password" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  try {
    const user = await dbGet(sql, [email]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
        expiresIn: "1h",
      });
      console.log("Generated token:", token);
      res.json({ token });
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
