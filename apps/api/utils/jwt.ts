import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET!;

export function signToken(payload: object | string): string {
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret);
}
