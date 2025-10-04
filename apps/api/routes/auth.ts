import express from "express";
import prisma from "db/client";
import { hashPassword, verifyPassword } from "../utils/hash";
import { signToken } from "../utils/jwt";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { email, password, userName, companyName, country, currency } = req.body;
  if (!email || !password || !companyName) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already exists" });

  const company = await prisma.company.create({
    data: {
      name: companyName,
      country: country ?? "Unknown",
      currency: currency ?? "USD",
    },
  });

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, password: hashed, role: "ADMIN", company_id: company.id, name: userName },
  });

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    token,
    company: { id: company.id, name: company.name },
    message: "Registration successful",
  });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing fields" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return res.status(401).json({ error: "Invalid credentials" });

  const ok = await verifyPassword(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({
    userId: user.id,
    role: user.role,
    message: "Login successful",
  });

  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    token,
  });
});

// Me
router.get("/me", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    // Use a JWT verification function to decode the token
    const { verifyToken } = require("../utils/jwt");
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    // Fetch user info from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
