import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { formatUserResponsePublic } from "../utils/response";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("user");

export function registerUserRoutes(app: Express) {
  // Obtém status do perfil
  app.get("/api/auth/profile/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const missingFields = [];
      if (!user.bio) missingFields.push('bio');
      if (!user.experience) missingFields.push('experience');
      if (!user.location) missingFields.push('location');
      
      const isProfileComplete = missingFields.length === 0;
      
      res.json({ 
        isProfileComplete,
        missingFields,
        profile: {
          bio: user.bio,
          experience: user.experience,
          location: user.location
        },
        isProviderEnabled: user.isProviderEnabled,
        redirectToProfile: !isProfileComplete && user.isProviderEnabled
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint de debug de autenticação
  app.get("/api/debug/auth", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      const provider = await storage.getServiceProviderByUserId(req.user!.userId);
      
      res.json({ 
        authenticatedUser: req.user,
        userFromDB: user,
        providerProfile: provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        authenticatedUser: req.user
      });
    }
  });

  // Busca usuário por ID
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(formatUserResponsePublic(user));
    } catch (error) {
      logger.error("Error fetching user", {
        error,
        userId: req.params.id,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

