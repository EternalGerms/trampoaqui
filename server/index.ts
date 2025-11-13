import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { testConnection } from "./db";
import { createLogger } from "./utils/logger.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const logger = createLogger("express");

// Request logging middleware - log ALL requests for debugging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  logger.debug("Incoming request", {
    method: req.method,
    path: req.originalUrl,
    ip,
  });

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
    };

    if (capturedJsonResponse) {
      logData.response = capturedJsonResponse;
    }

    if (path.startsWith("/api")) {
      if (res.statusCode >= 400) {
        logger.warn("API request completed with error", logData);
      } else {
        logger.info("API request completed", logData);
      }
    } else {
      logger.debug("Non-API request completed", logData);
    }
  });

  // Error handler for this request
  res.on("error", (err) => {
    logger.error("Request error", {
      method: req.method,
      path: req.originalUrl,
      error: err,
      ip,
    });
  });

  next();
});

(async () => {
  logger.info("Server starting...");
  await testConnection();

  logger.debug("Registering routes...");
  const server = await registerRoutes(app);
  logger.info("Routes registered successfully");

  // Set up frontend serving based on environment
  // This must be done AFTER routes are registered but BEFORE error handler
  if (process.env.NODE_ENV === 'production') {
    logger.debug("Setting up static file serving...");
    serveStatic(app);
    logger.info("Static file serving configured");
  } else {
    logger.debug("Setting up Vite dev server...");
    await setupVite(app, server);
    logger.info("Vite dev server configured");
  }

  // Final catch-all for any unmatched routes (shouldn't be needed, but safety net)
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    // If we get here and no response was sent, something went wrong
    if (!res.headersSent) {
      logger.warn("Unhandled route", {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
      });
      next(); // Let error handler deal with it
    }
  });

  // Error handler must be last
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("Global error handler", {
      status,
      message,
      error: err,
      stack: err.stack,
    });
    res.status(status).json({ message });
    // Don't throw the error again - it would crash the server
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Tratamento de erro para evitar crashes
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn("Port already in use", {
        port,
        message: "Server will retry automatically",
        error: err,
      });
      // Não tentar mudar a porta automaticamente em modo watch
      // O tsx watch vai reiniciar o servidor automaticamente
    } else {
      logger.error("Server error", {
        error: err,
        message: err.message,
      });
      process.exit(1);
    }
  });

  // Listen on 0.0.0.0 in Docker/production to accept external connections
  // Use 127.0.0.1 in development for security
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  server.listen(port, host, () => {
    logger.info("Server listening", { host, port, env: process.env.NODE_ENV });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info("SIGINT received, shutting down gracefully");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
})();
