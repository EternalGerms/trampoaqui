import type { Express } from "express";
import { createServer, type Server } from "http";
import { createServer as createHttpsServer } from "https";
import { readFileSync } from "fs";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("routes");
import { registerAuthRoutes } from "./controllers/authController";
import { registerUserRoutes } from "./controllers/userController";
import { registerCategoryRoutes, seedCategories } from "./controllers/categoryController";
import { registerServiceProviderRoutes } from "./controllers/serviceProviderController";
import { registerServiceRequestRoutes } from "./controllers/serviceRequestController";
import { registerNegotiationRoutes } from "./controllers/negotiationController";
import { registerReviewRoutes } from "./controllers/reviewController";
import { registerMessageRoutes } from "./controllers/messageController";
import { registerPaymentRoutes } from "./controllers/paymentController";
import { registerBalanceRoutes } from "./controllers/balanceController";
import { registerWithdrawalRoutes } from "./controllers/withdrawalController";
import { registerAdminRoutes } from "./controllers/adminController";
import { registerHealthRoutes } from "./controllers/healthController";

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed initial service categories
  await seedCategories();

  // Register all route controllers
  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerCategoryRoutes(app);
  registerServiceProviderRoutes(app);
  registerServiceRequestRoutes(app);
  registerNegotiationRoutes(app);
  registerReviewRoutes(app);
  registerMessageRoutes(app);
  registerPaymentRoutes(app);
  registerBalanceRoutes(app);
  registerWithdrawalRoutes(app);
  registerAdminRoutes(app);

  // Use HTTPS in production, HTTP in development
  if (process.env.NODE_ENV === 'production' && process.env.SSL_CERT && process.env.SSL_KEY) {
    try {
      const httpsOptions = {
        key: readFileSync(process.env.SSL_KEY),
        cert: readFileSync(process.env.SSL_CERT)
      };
      const httpsServer = createHttpsServer(httpsOptions, app);
      logger.info("HTTPS server configured successfully");
      return httpsServer;
    } catch (error) {
      logger.warn("HTTPS setup failed, falling back to HTTP", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
  
  const httpServer = createServer(app);
  return httpServer;
}
