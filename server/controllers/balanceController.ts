import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("balance");

export function registerBalanceRoutes(app: Express) {
  // Get current user's balance
  app.get("/api/users/me/balance", authenticateToken, async (req: Request, res: Response) => {
    try {
      const balance = await storage.getUserBalance(req.user!.userId);
      res.json({ balance });
    } catch (error) {
      logger.error("Error fetching balance", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

