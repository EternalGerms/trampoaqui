import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("payment");

export function registerPaymentRoutes(app: Express) {
  // Processa pagamento de uma solicitação
  app.post("/api/requests/:id/payment", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { paymentMethod } = req.body;
      
      if (!['boleto', 'pix', 'credit_card'].includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Verifica se o usuário é o cliente da solicitação
      if (request.clientId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verifica se a solicitação está em payment_pending
      if (request.status !== 'payment_pending') {
        return res.status(400).json({ message: "Request is not in payment pending status" });
      }
      
      const updatedRequest = await storage.updateServiceRequestPayment(req.params.id, paymentMethod);
      res.json(updatedRequest);
    } catch (error) {
      logger.error("Error processing payment", {
        error,
        requestId: req.params.id,
        userId: req.user?.userId,
        paymentMethod: req.body.paymentMethod,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Conclui o pagamento de uma solicitação
  app.post("/api/requests/:id/complete-payment", authenticateToken, async (req: Request, res: Response) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Verifica se o usuário é o cliente da solicitação
      if (request.clientId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Verifica se há método de pagamento definido
      if (!request.paymentMethod) {
        return res.status(400).json({ message: "Payment method not set" });
      }
      
      const updatedRequest = await storage.completeServiceRequestPayment(req.params.id);
      res.json(updatedRequest);
    } catch (error) {
      logger.error("Error completing payment", {
        error,
        requestId: req.params.id,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

