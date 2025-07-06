const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  console.log("Received token:", token);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // Add user payload to the request
    console.log("Token decoded successfully:", decoded);
    next();
  } catch (ex) {
    console.error("Token verification failed:", ex.message);
    res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = authMiddleware;
