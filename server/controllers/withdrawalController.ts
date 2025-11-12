import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";

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
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get withdrawals for current user
  app.get("/api/withdrawals", authenticateToken, async (req: Request, res: Response) => {
    try {
      const withdrawals = await storage.getWithdrawalsByUser(req.user!.userId);
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

