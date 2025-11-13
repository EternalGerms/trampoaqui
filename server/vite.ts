import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { createLogger as createAppLogger } from "./utils/logger.js";

// Função de escape HTML para prevenir XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Rate limiter simples em memória
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 100; // 100 requisições por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const clientData = rateLimiter.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  clientData.count++;
  return true;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();
const logger = createAppLogger("vite");

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Lidar apenas com rotas não-API com o catch-all
  // Use app.all to catch all HTTP methods
  app.all("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Pular rotas da API - deixar serem tratadas pelo middleware da API
    if (url.startsWith("/api")) {
      return next();
    }

    // Only handle GET requests for serving HTML
    if (req.method !== "GET") {
      return next();
    }

    // Rate limiting para operações de arquivo
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ message: "Too many requests" });
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if template file exists
      if (!fs.existsSync(clientTemplate)) {
        logger.error("Template file not found", { templatePath: clientTemplate });
        return res.status(500).send("Template file not found");
      }

      // Sanitizar URL para prevenir XSS
      const sanitizedUrl = url.replace(/[<>"'&]/g, '');

      // sempre recarregar o arquivo index.html do disco caso ele mude
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(sanitizedUrl, template);
      // Proteção XSS adicional: escapar qualquer conteúdo inseguro restante
      const safePage = page.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        return match.includes('src=') ? match : escapeHtml(match);
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(safePage);
    } catch (e) {
      logger.error("Error serving index.html", { error: e, url });
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const staticLogger = createAppLogger("static");
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  staticLogger.debug("Checking dist path", { distPath, __dirname, exists: fs.existsSync(distPath) });

  if (!fs.existsSync(distPath)) {
    // List parent directory to help debug
    const parentDir = path.resolve(__dirname, "..");
    staticLogger.debug("Parent directory info", { parentDir, exists: fs.existsSync(parentDir) });
    if (fs.existsSync(parentDir)) {
      try {
        const files = fs.readdirSync(parentDir);
        staticLogger.debug("Files in parent directory", { files });
      } catch (e) {
        staticLogger.error("Error reading parent directory", { error: e });
      }
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Verify index.html exists
  const indexPath = path.resolve(distPath, "index.html");
  staticLogger.debug("Index.html check", { indexPath, exists: fs.existsSync(indexPath) });

  staticLogger.info("Serving static files", { distPath });

  // Custom static file middleware that doesn't send 404s
  app.use((req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes
    if (url.startsWith("/api")) {
      return next();
    }
    
    try {
      // Try to serve static file
      // Remove leading slash and normalize the path
      const fileToServe = url === "/" || url === "" ? "index.html" : url.replace(/^\//, "");
      const resolvedPath = path.resolve(distPath, fileToServe);
      const distPathResolved = path.resolve(distPath);
      
      // Security check: ensure the resolved path is within distPath
      if (!resolvedPath.startsWith(distPathResolved)) {
        staticLogger.warn("Security check failed", { resolvedPath, distPathResolved, url });
        return next();
      }
      
      // Check if file exists
      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        if (stats.isFile()) {
          staticLogger.debug("Serving file", { url, resolvedPath });
          return res.sendFile(resolvedPath, (err) => {
            if (err) {
              staticLogger.error("Error sending file", { error: err, resolvedPath, url });
              next(err);
            }
          });
        }
      }
      
      // File doesn't exist, continue to catch-all
      staticLogger.debug("File not found, continuing to catch-all", { url });
      next();
    } catch (error) {
      staticLogger.error("Error in static middleware", { error, url });
      next(error);
    }
  });

  // Catch-all route to serve index.html for all non-API routes
  app.use((req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes
    if (url.startsWith("/api")) {
      return next();
    }
    
    // Only handle GET requests for serving HTML
    if (req.method !== "GET") {
      staticLogger.debug("Catch-all skipping non-GET request", { method: req.method, url });
      return next();
    }
    
    // Skip if response already sent (static file was found)
    if (res.headersSent) {
      staticLogger.debug("Catch-all skipping, response already sent", { url });
      return next();
    }
    
    try {
      staticLogger.debug("Catch-all route serving index.html", { url });
      
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        staticLogger.error("index.html not found", { indexPath });
        return res.status(500).send("index.html not found");
      }
      
      staticLogger.debug("Sending index.html", { indexPath, url });
      res.sendFile(indexPath, (err) => {
        if (err) {
          staticLogger.error("Error sending index.html", { error: err, indexPath, url });
          next(err);
        } else {
          staticLogger.debug("Successfully sent index.html", { url });
        }
      });
    } catch (error) {
      staticLogger.error("Error in catch-all", { error, url });
      next(error);
    }
  });
}
