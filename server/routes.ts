import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import authRouter from "./routes/auth.routes";
import providerRouter from "./routes/providers.routes";
import reviewsRouter from "./routes/reviews.routes";
import { authenticateToken } from "server/middlewares/auth.middleware";
import requestsRouter from "./routes/requests.routes";
import negotiationsRouter from "./routes/negotiations.routes";
import usersRouter from "./routes/users.routes";
import adminRouter from "./routes/admin.routes";
import withdrawalsRouter from "./routes/withdrawals.routes";

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
  app.use("/api/providers", providerRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/requests", requestsRouter);
  app.use("/api/regotiations", negotiationsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/withdrawals", withdrawalsRouter);

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

  // Categorias de serviço
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllServiceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

 




  const httpServer = createServer(app);
  return httpServer;
}
