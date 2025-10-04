// middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./utils/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token!) as { userId: string; role: string };
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user_id = decoded.userId;
    req.user_role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
