import { Request, Response } from "express";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middleware para autenticar usuários administradores
export const authenticateAdmin = (
  req: Request,
  res: Response,
  next: Function
) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: Function
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Garantir que o token decodificado tenha a estrutura esperada
    if (decoded && decoded.userId) {
      req.user = {
        userId: decoded.userId,
        isProviderEnabled: decoded.isProviderEnabled || false,
        isAdmin: decoded.isAdmin || false,
      };
      next();
    } else {
      return res.status(403).json({ message: "Invalid token structure" });
    }
  });
};
