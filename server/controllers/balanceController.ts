import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";

export function registerBalanceRoutes(app: Express) {
  // Get current user's balance
  app.get("/api/users/me/balance", authenticateToken, async (req: Request, res: Response) => {
    try {
      const balance = await storage.getUserBalance(req.user!.userId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

