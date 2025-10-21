import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, desc, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  insertUserSchema,
  insertServiceProviderSchema,
  insertServiceRequestSchema,
  updateServiceRequestSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertNegotiationSchema,
  updateProviderProfileSchema,
  insertWithdrawalSchema,
  users,
  serviceProviders,
  serviceRequests,
  serviceCategories,
} from "@shared/schema";
import { z, ZodError } from "zod";
import {
  generateVerificationToken,
  sendVerificationEmail,
} from "./utils/email";
import authRouter from "./routes/auth.routes";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Estender tipo Request para incluir usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isProviderEnabled: boolean;
        isAdmin: boolean;
      };
    }
  }
}

// Middleware para autenticar tokens JWT
const authenticateToken = (req: Request, res: Response, next: Function) => {
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

// Middleware para autenticar usuários administradores
const authenticateAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Semear categorias de serviço iniciais - APENAS SE NECESSÁRIO
  const seedCategories = async () => {
    // Primeiro, verificar se as categorias já existem
    const existingCategories = await storage.getAllServiceCategories();

    // Se já existem categorias, não precisamos semear novamente
    if (existingCategories.length > 0) {
      console.log(
        `ℹ️  Categories already seeded (${existingCategories.length} found), skipping...`
      );
      return;
    }

    console.log("🌱 Seeding initial service categories...");
    const categories = [
      { name: "Eletricista", icon: "fas fa-bolt", slug: "eletricista" },
      { name: "Encanador", icon: "fas fa-wrench", slug: "encanador" },
      { name: "Faxineira", icon: "fas fa-broom", slug: "faxineira" },
      { name: "Pintor", icon: "fas fa-paint-roller", slug: "pintor" },
      { name: "Jardineiro", icon: "fas fa-seedling", slug: "jardineiro" },
      {
        name: "Marido de Aluguel",
        icon: "fas fa-tools",
        slug: "marido-aluguel",
      },
      { name: "Pedreiro", icon: "fas fa-hammer", slug: "pedreiro" },
    ];

    for (const category of categories) {
      try {
        await storage.createServiceCategory(category);
        console.log(`  ✓ Created category: ${category.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to create category ${category.name}:`, error);
      }
    }
    console.log("✅ Categories seeded successfully");
  };

  await seedCategories();

  app.use("/api/auth", authRouter);

  // Endpoint de verificação de saúde para Docker
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Teste simples de conexão com banco de dados
      await db.execute(sql`SELECT 1`);
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Endpoint de debug para verificar autenticação
  app.get(
    "/api/debug/auth",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUser(req.user!.userId);
        const provider = await storage.getServiceProviderByUserId(
          req.user!.userId
        );

        res.json({
          authenticatedUser: req.user,
          userFromDB: user,
          providerProfile: provider,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
          authenticatedUser: req.user,
        });
      }
    }
  );
 

  // Habilitar capacidade de prestador
  app.post(
    "/api/auth/enable-provider",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.enableProviderCapability(req.user!.userId);

        // Verificar se perfil está completo e identificar campos faltantes
        const missingFields = [];
        if (!user.bio) missingFields.push("bio");
        if (!user.experience) missingFields.push("experience");
        if (!user.location) missingFields.push("location");

        const isProfileComplete = missingFields.length === 0;

        // Gerar novo token com status de prestador atualizado
        const token = jwt.sign(
          { userId: user.id, isProviderEnabled: user.isProviderEnabled },
          JWT_SECRET
        );

        res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isProviderEnabled: user.isProviderEnabled,
            bio: user.bio,
            experience: user.experience,
            location: user.location,
            city: user.city,
            state: user.state,
          },
          profileStatus: {
            isComplete: isProfileComplete,
            missingFields,
            redirectToProfile: !isProfileComplete,
          },
        });
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update provider profile (personal info)
  app.put(
    "/api/auth/profile",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const profileData = updateProviderProfileSchema.parse(req.body);
        const user = await storage.updateUserProfile(
          req.user!.userId,
          profileData
        );

        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          isProviderEnabled: user.isProviderEnabled,
          bio: user.bio,
          experience: user.experience,
          location: user.location,
          city: user.city,
          state: user.state,
        });
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(400).json({
          message: "Invalid profile data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Categorias de serviço
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllServiceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Prestadores de serviço
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.query;

      let providers;
      if (categoryId) {
        providers = await storage.getServiceProvidersByCategory(
          categoryId as string
        );
      } else {
        providers = await storage.getAllServiceProviders();
      }

      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProviderWithDetails(
        req.params.id
      );
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post(
    "/api/providers",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        if (!req.user?.isProviderEnabled) {
          return res
            .status(403)
            .json({ message: "Provider capability must be enabled first" });
        }

        const providerData = insertServiceProviderSchema.parse({
          ...req.body,
          userId: req.user.userId,
        });

        // Check if user already has a service in this category
        const existingProvider =
          await storage.getServiceProviderByUserAndCategory(
            req.user.userId,
            providerData.categoryId
          );
        if (existingProvider) {
          return res.status(400).json({
            message:
              "Você já possui um serviço nesta categoria. Edite o existente ou escolha outra categoria.",
          });
        }

        const provider = await storage.createServiceProvider(providerData);
        res.json(provider);
      } catch (error) {
        console.error("Error creating provider:", error);
        res.status(400).json({
          message: "Invalid input data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  app.put(
    "/api/providers/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const provider = await storage.getServiceProvider(req.params.id);
        if (!provider) {
          return res.status(404).json({ message: "Provider not found" });
        }

        if (provider.userId !== req.user!.userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        // Evita com que o usuário altere o ID do prestador
        const updateData = insertServiceProviderSchema
          .omit({ userId: true })
          .parse(req.body);
        const updatedProvider = await storage.updateServiceProvider(
          req.params.id,
          updateData
        );
        res.json(updatedProvider);
      } catch (error) {
        console.error("Error updating provider:", error);
        res.status(400).json({
          message: "Invalid input data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  app.delete(
    "/api/providers/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const provider = await storage.getServiceProvider(req.params.id);
        if (!provider) {
          return res.status(404).json({ message: "Provider not found" });
        }

        if (provider.userId !== req.user!.userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        // Check for active requests before deletion
        const activeRequests = await storage.getServiceRequestsByProvider(
          req.params.id
        );
        const hasActiveRequests = activeRequests.some(
          (request) =>
            request.status === "pending" ||
            request.status === "accepted" ||
            request.status === "negotiating"
        );

        if (hasActiveRequests) {
          return res.status(400).json({
            message:
              "Não é possível excluir o serviço com solicitações ativas. Finalize ou cancele as solicitações primeiro.",
          });
        }

        await storage.deleteServiceProvider(req.params.id);
        res.json({ message: "Provider deleted successfully" });
      } catch (error) {
        console.error("Error deleting provider:", error);
        res.status(500).json({
          message: "Server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get current user's provider profiles with details
  app.get(
    "/api/users/me/providers",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const providers = await storage.getServiceProvidersByUserIdWithDetails(
          req.user!.userId
        );
        res.json(providers);
      } catch (error) {
        console.error("Error fetching user's providers:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Messages
  app.post(
    "/api/messages",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { content, receiverId, requestId } = req.body;

        if (!content || !receiverId) {
          return res
            .status(400)
            .json({ message: "Content and receiverId are required" });
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
    }
  );

  // Service requests
  app.get(
    "/api/requests",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const requests =
          await storage.getServiceRequestsByClientWithNegotiations(
            req.user!.userId
          );

        res.json(requests);
      } catch (error) {
        console.error("Error in client requests route:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.get(
    "/api/requests/provider",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        // First check if user has provider capability enabled
        const user = await storage.getUser(req.user!.userId);
        if (!user?.isProviderEnabled) {
          return res.status(403).json({
            message: "Provider capability not enabled",
            code: "PROVIDER_NOT_ENABLED",
          });
        }

        // Check if profile is complete and identify missing fields
        const missingFields = [];
        if (!user.bio) missingFields.push("bio");
        if (!user.experience) missingFields.push("experience");
        if (!user.location) missingFields.push("location");

        const isProfileComplete = missingFields.length === 0;
        if (!isProfileComplete) {
          return res.status(200).json({
            message: "Profile incomplete",
            code: "PROFILE_INCOMPLETE",
            profileStatus: {
              isComplete: false,
              missingFields,
            },
            requests: [],
          });
        }

        // Get all service providers for the current user
        const providers = await storage.getServiceProvidersByUserIdWithDetails(
          req.user!.userId
        );

        if (!providers || providers.length === 0) {
          return res.status(200).json({
            message: "Provider profile not found",
            code: "PROVIDER_PROFILE_NOT_FOUND",
            profileStatus: {
              isComplete: true,
              missingFields: [],
            },
            requests: [],
          });
        }

        // Get requests for all providers of this user
        const allRequests = [];
        for (const provider of providers) {
          const providerRequests =
            await storage.getServiceRequestsByProviderWithNegotiations(
              provider.id
            );
          allRequests.push(...providerRequests);
        }

        // Sort all requests by creation date (most recent first)
        const requests = allRequests.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.json({
          message: "Success",
          code: "SUCCESS",
          profileStatus: {
            isComplete: true,
            missingFields: [],
          },
          requests,
        });
      } catch (error) {
        console.error("Error in provider requests route:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.post(
    "/api/requests",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const requestData = insertServiceRequestSchema.parse({
          ...req.body,
          clientId: req.user!.userId,
        });

        const request = await storage.createServiceRequest(requestData);
        res.json(request);
      } catch (error) {
        console.error("Validation error:", error);
        res.status(400).json({
          message: "Invalid input data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  app.put(
    "/api/requests/:id",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const request = await storage.getServiceRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        // Get provider for this request
        const provider = await storage.getServiceProvider(request.providerId);
        if (!provider) {
          return res.status(404).json({ message: "Provider not found" });
        }

        // Check if user has permission to update this request (client or provider)
        if (
          request.clientId !== req.user!.userId &&
          provider.userId !== req.user!.userId
        ) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const updateData = updateServiceRequestSchema.parse(req.body);

        // Handle completion logic
        if (updateData.status === "completed") {
          const now = new Date();
          const isClient = request.clientId === req.user!.userId;
          const isProvider = provider.userId === req.user!.userId;

          if (isClient) {
            updateData.clientCompletedAt = now;
          } else if (isProvider) {
            updateData.providerCompletedAt = now;
          }

          // Only mark as completed if both parties have confirmed
          const hasClientCompleted =
            request.clientCompletedAt || (isClient ? now : null);
          const hasProviderCompleted =
            request.providerCompletedAt || (isProvider ? now : null);

          if (!hasClientCompleted || !hasProviderCompleted) {
            // Change status to 'pending_completion' if only one party has confirmed
            updateData.status = "pending_completion";
          } else {
            // Both parties have confirmed - add balance to provider
            if (request.proposedPrice) {
              const serviceAmount = parseFloat(
                request.proposedPrice.toString()
              );
              const platformFee = serviceAmount * 0.05; // 5% platform fee
              const providerAmount = serviceAmount - platformFee;

              await storage.addToUserBalance(provider.userId, providerAmount);
            }
          }
        }

        const updatedRequest = await storage.updateServiceRequest(
          req.params.id,
          updateData
        );
        res.json(updatedRequest);
      } catch (error) {
        console.error("Validation error:", error);
        res.status(400).json({
          message: "Invalid input data",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Reviews
  app.post(
    "/api/reviews",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const reviewData = insertReviewSchema.parse({
          ...req.body,
          reviewerId: req.user!.userId,
        });

        const review = await storage.createReview(reviewData);
        res.json(review);
      } catch (error) {
        res.status(400).json({ message: "Invalid input data" });
      }
    }
  );

  // Get reviews by provider
  app.get(
    "/api/reviews/provider/:providerId",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByProvider(
          req.params.providerId
        );
        res.json(reviews);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews by provider user id
  app.get(
    "/api/providers/user/:userId/reviews",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByProviderUser(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching provider reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews by specific service provider
  app.get(
    "/api/reviews/service-provider/:serviceProviderId",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByServiceProvider(
          req.params.serviceProviderId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching service provider reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get user by ID
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        experience: user.experience,
        isProviderEnabled: user.isProviderEnabled,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get reviews received by user (as client)
  app.get(
    "/api/reviews/user/:userId/received",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByUserReceived(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching user received reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews sent by user (as client)
  app.get(
    "/api/reviews/user/:userId/sent",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByUserSent(req.params.userId);
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching user sent reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews received by user as provider
  app.get(
    "/api/reviews/provider/user/:userId/received",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByProviderUser(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching provider user reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews received by user as client
  app.get(
    "/api/reviews/client/user/:userId/received",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByUserAsClientReceived(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching client user received reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews sent by user as client
  app.get(
    "/api/reviews/client/user/:userId/sent",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByUserAsClientSent(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching client user sent reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get reviews received by user as provider (specific)
  app.get(
    "/api/reviews/provider/user/:userId/received-specific",
    async (req: Request, res: Response) => {
      try {
        const reviews = await storage.getReviewsByUserAsProviderReceived(
          req.params.userId
        );
        res.json(reviews);
      } catch (error) {
        console.error("Error fetching provider user received reviews:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Messages routes
  app.get(
    "/api/messages/conversation/:userId",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const messages = await storage.getConversation(
          req.user!.userId,
          req.params.userId
        );
        res.json(messages);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get messages received by current user
  app.get(
    "/api/messages/received",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const messages = await storage.getReceivedMessages(req.user!.userId);
        res.json(messages);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Negotiation routes
  app.post(
    "/api/negotiations",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        // Parse the request body without proposerId since we'll add it
        const negotiationData = insertNegotiationSchema
          .omit({ proposerId: true })
          .parse(req.body);

        // Add the proposer ID from the authenticated user
        const negotiation = {
          ...negotiationData,
          proposerId: req.user!.userId,
        };

        const createdNegotiation = await storage.createNegotiation(negotiation);

        // Update request status to negotiating if it was pending
        await storage.updateRequestStatus(negotiation.requestId, "negotiating");

        res.json(createdNegotiation);
      } catch (error) {
        console.error("Error creating negotiation:", error);
        res.status(400).json({ message: "Invalid negotiation data" });
      }
    }
  );

  app.put(
    "/api/negotiations/:id/status",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { status } = req.body;

        if (!["accepted", "rejected"].includes(status)) {
          return res.status(400).json({
            message: "Invalid status. Must be 'accepted' or 'rejected'",
          });
        }

        // Get the current negotiation
        const currentNegotiation = await storage.getNegotiationById(
          req.params.id
        );
        if (!currentNegotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }

        // Check if user is authorized to respond to this negotiation
        const request = await storage.getServiceRequest(
          currentNegotiation.requestId
        );
        if (!request) {
          return res.status(404).json({ message: "Service request not found" });
        }

        // User can only respond if they are the client or provider of the request
        const isClient = request.clientId === req.user!.userId;
        const isProvider =
          request.providerId &&
          (await storage.getServiceProvider(request.providerId))?.userId ===
            req.user!.userId;

        if (!isClient && !isProvider) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this negotiation" });
        }

        // User cannot respond to their own negotiation
        if (currentNegotiation.proposerId === req.user!.userId) {
          return res
            .status(400)
            .json({ message: "Cannot respond to your own negotiation" });
        }

        // Accept or reject the negotiation
        await storage.updateNegotiationStatus(req.params.id, status);

        // If accepted, update the request with the accepted negotiation details
        if (status === "accepted") {
          await storage.updateServiceRequest(currentNegotiation.requestId, {
            status: "payment_pending", // Change to payment_pending instead of accepted
            proposedPrice: currentNegotiation.proposedPrice || undefined,
            proposedHours: currentNegotiation.proposedHours || undefined,
            proposedDays: currentNegotiation.proposedDays || undefined,
            scheduledDate: currentNegotiation.proposedDate || undefined,
            pricingType: currentNegotiation.pricingType,
          });
        }

        res.json({ message: "Negotiation status updated" });
      } catch (error) {
        console.error("Error updating negotiation status:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.get(
    "/api/requests/:id/negotiations",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const negotiations = await storage.getNegotiationsByRequest(
          req.params.id
        );
        res.json(negotiations);
      } catch (error) {
        console.error("Error getting negotiations:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Create counter proposal endpoint
  app.post(
    "/api/negotiations/:id/counter-proposal",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        // Get the current negotiation first
        const currentNegotiation = await storage.getNegotiationById(
          req.params.id
        );
        if (!currentNegotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }

        // Create a schema for counter proposal data (without requestId and proposerId)
        const counterProposalSchema = z.object({
          pricingType: z.enum(["hourly", "daily", "fixed"]),
          proposedPrice: z
            .union([z.string(), z.number()])
            .optional()
            .transform((val) => {
              if (typeof val === "string") {
                return val === "" ? undefined : val;
              }
              return val?.toString();
            }),
          proposedHours: z
            .union([z.string(), z.number()])
            .optional()
            .transform((val) => {
              if (typeof val === "string") {
                return val === "" ? undefined : parseInt(val, 10);
              }
              return val;
            }),
          proposedDays: z
            .union([z.string(), z.number()])
            .optional()
            .transform((val) => {
              if (typeof val === "string") {
                return val === "" ? undefined : parseInt(val, 10);
              }
              return val;
            }),
          proposedDate: z
            .union([z.date(), z.string()])
            .optional()
            .transform((val) => {
              if (typeof val === "string") {
                return new Date(val);
              }
              return val;
            }),
          message: z.string().min(1, "Message is required"),
        });

        // Validate and transform the request body using the counter proposal schema
        const validatedData = counterProposalSchema.parse({
          pricingType: req.body.pricingType,
          proposedPrice: req.body.proposedPrice,
          proposedHours: req.body.proposedHours,
          proposedDays: req.body.proposedDays,
          proposedDate: req.body.proposedDate,
          message: req.body.message,
        });

        // Check if user is authorized to respond to this negotiation
        const request = await storage.getServiceRequest(
          currentNegotiation.requestId
        );
        if (!request) {
          return res.status(404).json({ message: "Service request not found" });
        }

        // User can only respond if they are the client or provider of the request
        const isClient = request.clientId === req.user!.userId;
        const isProvider =
          request.providerId &&
          (await storage.getServiceProvider(request.providerId))?.userId ===
            req.user!.userId;

        if (!isClient && !isProvider) {
          return res
            .status(403)
            .json({ message: "Unauthorized to respond to this negotiation" });
        }

        // User cannot respond to their own negotiation
        if (currentNegotiation.proposerId === req.user!.userId) {
          return res
            .status(400)
            .json({ message: "Cannot respond to your own negotiation" });
        }

        // Validate required fields
        if (!validatedData.pricingType || !validatedData.message) {
          return res
            .status(400)
            .json({ message: "pricingType and message are required" });
        }

        // Create a new negotiation as a counter proposal
        const counterNegotiation = await storage.createNegotiation({
          ...validatedData,
          requestId: currentNegotiation.requestId,
          proposerId: req.user!.userId,
        });

        // Mark the current negotiation as responded to
        await storage.updateNegotiationStatus(
          req.params.id,
          "counter_proposed"
        );

        res.json({
          message: "Counter proposal created successfully",
          counterNegotiation,
          originalNegotiationId: req.params.id,
        });
      } catch (error) {
        console.error("Error creating counter proposal:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Payment routes
  app.post(
    "/api/requests/:id/payment",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { paymentMethod } = req.body;

        if (!["boleto", "pix", "credit_card"].includes(paymentMethod)) {
          return res.status(400).json({ message: "Invalid payment method" });
        }

        const request = await storage.getServiceRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        // Check if user is the client of this request
        if (request.clientId !== req.user!.userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        // Check if request is in payment_pending status
        if (request.status !== "payment_pending") {
          return res
            .status(400)
            .json({ message: "Request is not in payment pending status" });
        }

        const updatedRequest = await storage.updateServiceRequestPayment(
          req.params.id,
          paymentMethod
        );
        res.json(updatedRequest);
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.post(
    "/api/requests/:id/complete-payment",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const request = await storage.getServiceRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ message: "Request not found" });
        }

        // Check if user is the client of this request
        if (request.clientId !== req.user!.userId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        // Check if request has payment method set
        if (!request.paymentMethod) {
          return res.status(400).json({ message: "Payment method not set" });
        }

        const updatedRequest = await storage.completeServiceRequestPayment(
          req.params.id
        );
        res.json(updatedRequest);
      } catch (error) {
        console.error("Error completing payment:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Balance routes
  app.get(
    "/api/users/me/balance",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const balance = await storage.getUserBalance(req.user!.userId);
        res.json({ balance });
      } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Withdrawal routes
  app.post(
    "/api/withdrawals",
    authenticateToken,
    async (req: Request, res: Response) => {
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
          status: "pending",
        });

        // Subtract from balance
        await storage.subtractFromUserBalance(req.user!.userId, amount);

        res.json(withdrawal);
      } catch (error) {
        console.error("Error creating withdrawal:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  app.get(
    "/api/withdrawals",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const withdrawals = await storage.getWithdrawalsByUser(
          req.user!.userId
        );
        res.json(withdrawals);
      } catch (error) {
        console.error("Error fetching withdrawals:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Admin routes
  app.get(
    "/api/admin/dashboard",
    authenticateToken,
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        // Get system statistics
        const totalUsers = await db
          .select({ count: sql<number>`count(*)` })
          .from(users);
        const totalProviders = await db
          .select({ count: sql<number>`count(*)` })
          .from(serviceProviders);
        const totalRequests = await db
          .select({ count: sql<number>`count(*)` })
          .from(serviceRequests);
        const totalCategories = await db
          .select({ count: sql<number>`count(*)` })
          .from(serviceCategories);

        // Get recent users
        const recentUsers = await db
          .select()
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(10);

        // Get recent service requests
        const recentRequests = await db
          .select({
            request: serviceRequests,
            client: users,
            provider: serviceProviders,
            category: serviceCategories,
          })
          .from(serviceRequests)
          .leftJoin(users, eq(serviceRequests.clientId, users.id))
          .leftJoin(
            serviceProviders,
            eq(serviceRequests.providerId, serviceProviders.id)
          )
          .leftJoin(
            serviceCategories,
            eq(serviceProviders.categoryId, serviceCategories.id)
          )
          .orderBy(desc(serviceRequests.createdAt))
          .limit(10);

        res.json({
          statistics: {
            totalUsers: totalUsers[0]?.count || 0,
            totalProviders: totalProviders[0]?.count || 0,
            totalRequests: totalRequests[0]?.count || 0,
            totalCategories: totalCategories[0]?.count || 0,
          },
          recentUsers,
          recentRequests: recentRequests.map((r) => ({
            ...r.request,
            client: r.client,
            provider: r.provider
              ? { ...r.provider, category: r.category }
              : null,
          })),
        });
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get all users (admin only)
  app.get(
    "/api/admin/users",
    authenticateToken,
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const { page = 1, limit = 20, search = "" } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const usersList = await db
          .select()
          .from(users)
          .where(
            search
              ? or(
                  sql`${users.name} ILIKE ${"%" + search + "%"}`,
                  sql`${users.email} ILIKE ${"%" + search + "%"}`
                )
              : undefined
          )
          .orderBy(desc(users.createdAt))
          .limit(Number(limit))
          .offset(offset);

        res.json(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get all service requests (admin only)
  app.get(
    "/api/admin/requests",
    authenticateToken,
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const { page = 1, limit = 20, status = "" } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const requests = await db
          .select({
            request: serviceRequests,
            client: users,
            provider: serviceProviders,
            category: serviceCategories,
          })
          .from(serviceRequests)
          .leftJoin(users, eq(serviceRequests.clientId, users.id))
          .leftJoin(
            serviceProviders,
            eq(serviceRequests.providerId, serviceProviders.id)
          )
          .leftJoin(
            serviceCategories,
            eq(serviceProviders.categoryId, serviceCategories.id)
          )
          .where(
            status ? eq(serviceRequests.status, status as string) : undefined
          )
          .orderBy(desc(serviceRequests.createdAt))
          .limit(Number(limit))
          .offset(offset);

        res.json(
          requests.map((r) => ({
            ...r.request,
            client: r.client,
            provider: r.provider
              ? { ...r.provider, category: r.category }
              : null,
          }))
        );
      } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update user admin status
  app.put(
    "/api/admin/users/:id/admin",
    authenticateToken,
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        const { isAdmin } = req.body;
        const user = await storage.updateUser(req.params.id, { isAdmin });
        res.json(user);
      } catch (error) {
        console.error("Error updating user admin status:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete user (admin only)
  app.delete(
    "/api/admin/users/:id",
    authenticateToken,
    authenticateAdmin,
    async (req: Request, res: Response) => {
      try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user!.userId) {
          return res
            .status(400)
            .json({ message: "Cannot delete your own account" });
        }

        await db.delete(users).where(eq(users.id, req.params.id));
        res.json({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Use HTTPS in production, HTTP in development
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SSL_CERT &&
    process.env.SSL_KEY
  ) {
    try {
      const httpsOptions = {
        key: readFileSync(process.env.SSL_KEY),
        cert: readFileSync(process.env.SSL_CERT),
      };
      const httpsServer = createHttpsServer(httpsOptions, app);
      return httpsServer;
    } catch (error) {
      console.warn("HTTPS setup failed, falling back to HTTP:", error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
