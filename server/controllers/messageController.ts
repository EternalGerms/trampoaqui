import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";

export function registerMessageRoutes(app: Express) {
  // Create message
  app.post("/api/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { content, receiverId, requestId } = req.body;
      
      if (!content || !receiverId) {
        return res.status(400).json({ message: "Content and receiverId are required" });
      }

      const message = await storage.createMessage({
        senderId: req.user!.userId,
        receiverId,
        requestId: requestId || null,
        content,
        isRead: false,
      });
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get conversation between two users
  app.get("/api/messages/conversation/:userId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getConversation(req.user!.userId, req.params.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get messages received by current user
  app.get("/api/messages/received", authenticateToken, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getReceivedMessages(req.user!.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
}

