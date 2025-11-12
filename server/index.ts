import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log, setupVite, serveStatic } from "./vite";
import { testConnection } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware - log ALL requests for debugging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  console.log(`[Request] ${req.method} ${req.originalUrl} - IP: ${req.ip || req.connection.remoteAddress || 'unknown'}`);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    } else {
      // Log non-API requests too for debugging
      console.log(`[Request] ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  // Error handler for this request
  res.on("error", (err) => {
    console.error(`[Request Error] ${req.method} ${req.originalUrl}:`, err);
  });

  next();
});

(async () => {
  console.log('🔄 [DEBUG] Server starting...');
  await testConnection();

  console.log('🔄 [DEBUG] Registering routes...');
  const server = await registerRoutes(app);
  console.log('🔄 [DEBUG] Routes registered successfully');

  // Set up frontend serving based on environment
  // This must be done AFTER routes are registered but BEFORE error handler
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 [DEBUG] Setting up static file serving...');
    serveStatic(app);
    console.log('🔄 [DEBUG] Static file serving configured');
  } else {
    console.log('🔄 [DEBUG] Setting up Vite dev server...');
    await setupVite(app, server);
    console.log('🔄 [DEBUG] Vite dev server configured');
  }

  // Final catch-all for any unmatched routes (shouldn't be needed, but safety net)
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    // If we get here and no response was sent, something went wrong
    if (!res.headersSent) {
      console.log(`[Final Catch-all] Unhandled route: ${req.method} ${req.originalUrl}`);
      next(); // Let error handler deal with it
    }
  });

  // Error handler must be last
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Global error handler:", err);
    res.status(status).json({ message });
    // Don't throw the error again - it would crash the server
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Tratamento de erro para evitar crashes
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`❌ Port ${port} is already in use. Server will retry automatically.`);
      // Não tentar mudar a porta automaticamente em modo watch
      // O tsx watch vai reiniciar o servidor automaticamente
    } else {
      log(`❌ Server error: ${err.message}`);
      process.exit(1);
    }
  });

  // Listen on 0.0.0.0 in Docker/production to accept external connections
  // Use 127.0.0.1 in development for security
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  server.listen(port, host, () => {
    log(`serving on ${host}:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
})();
