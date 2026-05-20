import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertServiceProviderSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
import { handleRouteError } from "../utils/errorHandler";
import { ZodError } from "zod";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("serviceProvider");

export function registerServiceProviderRoutes(app: Express) {
  // Lista prestadores (com filtro opcional de categoria)
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.query;
      
      let providers;
      if (categoryId) {
        providers = await storage.getServiceProvidersByCategory(categoryId as string);
      } else {
        providers = await storage.getAllServiceProviders();
      }
      
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Busca prestador por ID
  app.get("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProviderWithDetails(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create provider
  app.post("/api/providers", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (!req.user?.isProviderEnabled) {
        return res.status(403).json({ message: "Provider capability must be enabled first" });
      }

      const providerData = insertServiceProviderSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });
      
      // Verifica se já existe serviço nesta categoria para o usuário
      const existingProvider = await storage.getServiceProviderByUserAndCategory(req.user.userId, providerData.categoryId);
      if (existingProvider) {
        return res.status(400).json({ 
          message: "Você já possui um serviço nesta categoria. Edite o existente ou escolha outra categoria." 
        });
      }
      
      const provider = await storage.createServiceProvider(providerData);
      res.json(provider);
    } catch (error) {
      logger.error("Error creating provider", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });

  // Atualiza prestador
  app.put("/api/providers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = insertServiceProviderSchema.omit({ userId: true }).parse(req.body);
      const updatedProvider = await storage.updateServiceProvider(req.params.id, updateData);
      res.json(updatedProvider);
    } catch (error) {
      logger.error("Error updating provider", {
        error,
        providerId: req.params.id,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input data", details: error.flatten() });
      }
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Remove prestador
  app.delete("/api/providers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Verifica solicitações ativas antes de excluir
      const activeRequests = await storage.getServiceRequestsByProvider(req.params.id);
      const hasActiveRequests = activeRequests.some(request => 
        request.status === 'pending' || request.status === 'accepted' || request.status === 'negotiating'
      );

      if (hasActiveRequests) {
        return res.status(400).json({ 
          message: "Não é possível excluir o serviço com solicitações ativas. Finalize ou cancele as solicitações primeiro." 
        });
      }

      await storage.deleteServiceProvider(req.params.id);
      res.json({ message: "Provider deleted successfully" });
    } catch (error) {
      logger.error("Error deleting provider", {
        error,
        providerId: req.params.id,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Lista serviços do usuário atual com detalhes
  app.get("/api/users/me/providers", authenticateToken, async (req: Request, res: Response) => {
    try {
      const providers = await storage.getServiceProvidersByUserIdWithDetails(req.user!.userId);
      res.json(providers);
    } catch (error) {
      logger.error("Error fetching user's providers", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

