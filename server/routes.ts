import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertServiceProviderSchema, insertServiceRequestSchema, insertMessageSchema, insertReviewSchema } from "@shared/schema";

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
      
      // Generate new token with updated provider status
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
      const provider = await storage.getServiceProvider(req.params.id);
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
      if (req.user.userType !== 'provider') {
        return res.status(403).json({ message: "Only providers can create provider profiles" });
      }

      const providerData = insertServiceProviderSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });
      
      const provider = await storage.createServiceProvider(providerData);
      res.json(provider);
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

      if (provider.userId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedProvider = await storage.updateServiceProvider(req.params.id, req.body);
      res.json(updatedProvider);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Service requests
  app.get("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      let requests;
      if (req.user.userType === 'client') {
        requests = await storage.getServiceRequestsByClient(req.user.userId);
      } else {
        // For providers, get requests for their provider profile
        const provider = await storage.getServiceProviderByUserId(req.user.userId);
        if (!provider) {
          return res.status(404).json({ message: "Provider profile not found" });
        }
        requests = await storage.getServiceRequestsByProvider(provider.id);
      }
      
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (req.user.userType !== 'client') {
        return res.status(403).json({ message: "Only clients can create service requests" });
      }

      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user.userId,
      });
      
      const request = await storage.createServiceRequest(requestData);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.put("/api/requests/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Check if user has permission to update this request
      if (req.user.userType === 'client' && request.clientId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (req.user.userType === 'provider') {
        const provider = await storage.getServiceProviderByUserId(req.user.userId);
        if (!provider || request.providerId !== provider.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const updatedRequest = await storage.updateServiceRequest(req.params.id, req.body);
      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Reviews
  app.post("/api/reviews", authenticateToken, async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: req.user.userId,
      });
      
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Messages
  app.get("/api/messages/conversation/:userId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getConversation(req.user.userId, req.params.userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.userId,
      });
      
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
