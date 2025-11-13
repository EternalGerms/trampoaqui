import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("withdrawal");

export function registerWithdrawalRoutes(app: Express) {
  // Create withdrawal
  app.post("/api/withdrawals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const currentBalance = await storage.getUserBalance(req.user!.userId);
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      const withdrawal = await storage.createWithdrawal({
        userId: req.user!.userId,
        amount: amount.toString(),
        status: 'pending'
      });
      
      // Subtract from balance
      await storage.subtractFromUserBalance(req.user!.userId, amount);
      
      res.json(withdrawal);
    } catch (error) {
      logger.error("Error creating withdrawal", {
        error,
        userId: req.user?.userId,
        amount: req.body.amount,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get withdrawals for current user
  app.get("/api/withdrawals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const withdrawals = await storage.getWithdrawalsByUser(req.user!.userId);
      res.json(withdrawals);
    } catch (error) {
      logger.error("Error fetching withdrawals", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

