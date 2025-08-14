import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertServiceProviderSchema, insertServiceRequestSchema, updateServiceRequestSchema, insertMessageSchema, insertReviewSchema, insertNegotiationSchema, updateProviderProfileSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isProviderEnabled: boolean;
      };
    }
  }
}

// Middleware to authenticate JWT tokens
const authenticateToken = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed initial service categories
  const seedCategories = async () => {
    const categories = [
      { name: "Eletricista", icon: "fas fa-bolt", slug: "eletricista" },
      { name: "Encanador", icon: "fas fa-wrench", slug: "encanador" },
      { name: "Faxineira", icon: "fas fa-broom", slug: "faxineira" },
      { name: "Pintor", icon: "fas fa-paint-roller", slug: "pintor" },
      { name: "Jardineiro", icon: "fas fa-seedling", slug: "jardineiro" },
      { name: "Marido de Aluguel", icon: "fas fa-tools", slug: "marido-aluguel" },
      { name: "Pedreiro", icon: "fas fa-hammer", slug: "pedreiro" },
    ];

    for (const category of categories) {
      try {
        await storage.createServiceCategory(category);
      } catch (error) {
        // Category might already exist, ignore error
      }
    }
  };

  await seedCategories();

  // Health check endpoint for Docker
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Simple database connection test
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({ 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Profile status endpoint - SIMPLE VERSION
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

  // Debug endpoint to check authentication
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



  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, isProviderEnabled: user.isProviderEnabled }, JWT_SECRET);
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          isProviderEnabled: user.isProviderEnabled 
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id, isProviderEnabled: user.isProviderEnabled }, JWT_SECRET);
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          isProviderEnabled: user.isProviderEnabled 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        isProviderEnabled: user.isProviderEnabled 
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Enable provider capability
  app.post("/api/auth/enable-provider", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.enableProviderCapability(req.user!.userId);
      
      // Check if profile is complete and identify missing fields
      const missingFields = [];
      if (!user.bio) missingFields.push('bio');
      if (!user.experience) missingFields.push('experience');
      if (!user.location) missingFields.push('location');
      
      const isProfileComplete = missingFields.length === 0;
      
      // Generate new token with updated provider status
      const token = jwt.sign({ userId: user.id, isProviderEnabled: user.isProviderEnabled }, JWT_SECRET);
      
      res.json({ 
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          isProviderEnabled: user.isProviderEnabled 
        },
        profileStatus: {
          isComplete: isProfileComplete,
          missingFields,
          redirectToProfile: !isProfileComplete
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });



  // Update provider profile (personal info)
  app.put("/api/auth/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const profileData = updateProviderProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.user!.userId, profileData);
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        isProviderEnabled: user.isProviderEnabled,
        bio: user.bio,
        experience: user.experience,
        location: user.location
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Invalid profile data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Service categories
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllServiceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Service providers
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

  app.post("/api/providers", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (!req.user?.isProviderEnabled) {
        return res.status(403).json({ message: "Provider capability must be enabled first" });
      }

      const providerData = insertServiceProviderSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });
      
      // Check if user already has a service in this category
      const existingProvider = await storage.getServiceProviderByUserAndCategory(req.user.userId, providerData.categoryId);
      if (existingProvider) {
        return res.status(400).json({ 
          message: "Você já possui um serviço nesta categoria. Edite o existente ou escolha outra categoria." 
        });
      }
      
      const provider = await storage.createServiceProvider(providerData);
      res.json(provider);
    } catch (error) {
      console.error("Error creating provider:", error);
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/providers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedProvider = await storage.updateServiceProvider(req.params.id, req.body);
      res.json(updatedProvider);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

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
      console.error("Error updating provider:", error);
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/providers/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check for active requests before deletion
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
      console.error("Error deleting provider:", error);
      res.status(500).json({ message: "Server error", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Messages
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

  // Service requests
  app.get("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Get service requests for the current user as a client with negotiations
      const requests = await storage.getServiceRequestsByClientWithNegotiations(req.user!.userId);
      
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/requests/provider", authenticateToken, async (req: Request, res: Response) => {
    try {
      console.log("Provider requests route called for user:", req.user!.userId);
      
      // First check if user has provider capability enabled
      const user = await storage.getUser(req.user!.userId);
      if (!user?.isProviderEnabled) {
        return res.status(403).json({ 
          message: "Provider capability not enabled",
          code: "PROVIDER_NOT_ENABLED"
        });
      }
      
      // Check if profile is complete and identify missing fields
      const missingFields = [];
      if (!user.bio) missingFields.push('bio');
      if (!user.experience) missingFields.push('experience');
      if (!user.location) missingFields.push('location');
      
      const isProfileComplete = missingFields.length === 0;
      if (!isProfileComplete) {
        return res.status(200).json({
          message: "Profile incomplete",
          code: "PROFILE_INCOMPLETE",
          profileStatus: {
            isComplete: false,
            missingFields
          },
          requests: []
        });
      }
      
      // Get service requests for the current user as a provider
      const provider = await storage.getServiceProviderByUserId(req.user!.userId);
      console.log("Provider found:", provider);
      
      if (!provider) {
        console.log("No provider profile found for user:", req.user!.userId);
        return res.status(200).json({
          message: "Provider profile not found",
          code: "PROVIDER_PROFILE_NOT_FOUND",
          profileStatus: {
            isComplete: true,
            missingFields: []
          },
          requests: []
        });
      }
      
      console.log("Looking for requests with providerId:", provider.id);
      const requests = await storage.getServiceRequestsByProviderWithNegotiations(provider.id);
      console.log("Requests found:", requests);
      
      res.json({
        message: "Success",
        code: "SUCCESS",
        profileStatus: {
          isComplete: true,
          missingFields: []
        },
        requests
      });
    } catch (error) {
      console.error("Error in provider requests route:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      console.log("Received request body:", req.body);
      console.log("User ID:", req.user!.userId);
      
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user!.userId,
      });
      
      console.log("Parsed request data:", requestData);
      
      const request = await storage.createServiceRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/requests/:id", authenticateToken, async (req: Request, res: Response) => {
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
      if (request.clientId !== req.user!.userId && provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = updateServiceRequestSchema.parse(req.body);
      
      // Handle completion logic
      if (updateData.status === 'completed') {
        const now = new Date();
        const isClient = request.clientId === req.user!.userId;
        const isProvider = provider.userId === req.user!.userId;
        
        if (isClient) {
          updateData.clientCompletedAt = now;
        } else if (isProvider) {
          updateData.providerCompletedAt = now;
        }
        
        // Only mark as completed if both parties have confirmed
        const hasClientCompleted = request.clientCompletedAt || (isClient ? now : null);
        const hasProviderCompleted = request.providerCompletedAt || (isProvider ? now : null);
        
        if (!hasClientCompleted || !hasProviderCompleted) {
          // Change status to 'pending_completion' if only one party has confirmed
          updateData.status = 'pending_completion';
        }
      }

      const updatedRequest = await storage.updateServiceRequest(req.params.id, updateData);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Reviews
  app.post("/api/reviews", authenticateToken, async (req: Request, res: Response) => {
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
  });

  // Messages routes
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

  // Negotiation routes
  app.post("/api/negotiations", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Parse the request body without proposerId since we'll add it
      const negotiationData = insertNegotiationSchema.omit({ proposerId: true }).parse(req.body);
      
      // Add the proposer ID from the authenticated user
      const negotiation = {
        ...negotiationData,
        proposerId: req.user!.userId,
      };
      
      const createdNegotiation = await storage.createNegotiation(negotiation);
      
      // Update request status to negotiating if it was pending
      await storage.updateRequestStatus(negotiation.requestId, 'negotiating');
      
      res.json(createdNegotiation);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      res.status(400).json({ message: "Invalid negotiation data" });
    }
  });

  app.put("/api/negotiations/:id/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      await storage.updateNegotiationStatus(req.params.id, status);
      
      // If accepted, update the request with the accepted negotiation details
      if (status === 'accepted') {
        // First get the negotiation by its ID to get the requestId
        const negotiation = await storage.getNegotiationById(req.params.id);
        if (negotiation) {
          await storage.updateServiceRequest(negotiation.requestId, {
            status: 'accepted',
            proposedPrice: negotiation.proposedPrice || undefined,
            proposedHours: negotiation.proposedHours || undefined,
            proposedDays: negotiation.proposedDays || undefined,
            scheduledDate: negotiation.proposedDate || undefined,
            pricingType: negotiation.pricingType,
          });
        }
      }
      
      res.json({ message: "Negotiation status updated" });
    } catch (error) {
      console.error("Error updating negotiation status:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/requests/:id/negotiations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const negotiations = await storage.getNegotiationsByRequest(req.params.id);
      res.json(negotiations);
    } catch (error) {
      console.error("Error getting negotiations:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
