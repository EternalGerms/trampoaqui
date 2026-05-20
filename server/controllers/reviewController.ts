import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertReviewSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
import { handleRouteError } from "../utils/errorHandler";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("review");

export function registerReviewRoutes(app: Express) {
  // Cria avaliação
  app.post("/api/reviews", authenticateToken, async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: req.user!.userId,
      });
      
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      handleRouteError(error, res);
    }
  });

  // Lista avaliações por prestador
  app.get("/api/reviews/provider/:providerId", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByProvider(req.params.providerId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações pelo usuário prestador
  app.get("/api/providers/user/:userId/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByProviderUser(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching provider reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações de um prestador específico
  app.get("/api/reviews/service-provider/:serviceProviderId", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByServiceProvider(req.params.serviceProviderId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching service provider reviews", {
        error,
        serviceProviderId: req.params.serviceProviderId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações recebidas pelo usuário (como cliente)
  app.get("/api/reviews/user/:userId/received", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByUserReceived(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching user received reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações enviadas pelo usuário (como cliente)
  app.get("/api/reviews/user/:userId/sent", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByUserSent(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching user sent reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações recebidas pelo usuário como prestador
  app.get("/api/reviews/provider/user/:userId/received", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByProviderUser(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching provider user reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações recebidas pelo usuário como cliente
  app.get("/api/reviews/client/user/:userId/received", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByUserAsClientReceived(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching client user received reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações enviadas pelo usuário como cliente
  app.get("/api/reviews/client/user/:userId/sent", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByUserAsClientSent(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching client user sent reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista avaliações recebidas pelo usuário como prestador (detalhado)
  app.get("/api/reviews/provider/user/:userId/received-specific", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByUserAsProviderReceived(req.params.userId);
      res.json(reviews);
    } catch (error) {
      logger.error("Error fetching provider user received reviews", {
        error,
        userId: req.params.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

