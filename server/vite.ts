import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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
        console.error(`[Vite] Template file not found: ${clientTemplate}`);
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
      console.error("[Vite] Error serving index.html:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  console.log(`[Static] Checking dist path: ${distPath}`);
  console.log(`[Static] __dirname: ${__dirname}`);
  console.log(`[Static] distPath exists: ${fs.existsSync(distPath)}`);

  if (!fs.existsSync(distPath)) {
    // List parent directory to help debug
    const parentDir = path.resolve(__dirname, "..");
    console.log(`[Static] Parent directory: ${parentDir}`);
    console.log(`[Static] Parent exists: ${fs.existsSync(parentDir)}`);
    if (fs.existsSync(parentDir)) {
      try {
        const files = fs.readdirSync(parentDir);
        console.log(`[Static] Files in parent: ${files.join(", ")}`);
      } catch (e) {
        console.error(`[Static] Error reading parent dir:`, e);
      }
    }
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Verify index.html exists
  const indexPath = path.resolve(distPath, "index.html");
  console.log(`[Static] Index.html path: ${indexPath}`);
  console.log(`[Static] Index.html exists: ${fs.existsSync(indexPath)}`);

  console.log(`[Static] Serving static files from: ${distPath}`);

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
        console.log(`[Static] Security check failed: ${resolvedPath} not in ${distPathResolved}`);
        return next();
      }
      
      // Check if file exists
      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        if (stats.isFile()) {
          console.log(`[Static] Serving file: ${url} -> ${resolvedPath}`);
          return res.sendFile(resolvedPath, (err) => {
            if (err) {
              console.error(`[Static] Error sending file ${resolvedPath}:`, err);
              next(err);
            }
          });
        }
      }
      
      // File doesn't exist, continue to catch-all
      console.log(`[Static] File not found: ${url}, continuing to catch-all`);
      next();
    } catch (error) {
      console.error(`[Static] Error in static middleware for ${url}:`, error);
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
      console.log(`[Static] Catch-all skipping non-GET request: ${req.method} ${url}`);
      return next();
    }
    
    // Skip if response already sent (static file was found)
    if (res.headersSent) {
      console.log(`[Static] Catch-all skipping, response already sent for: ${url}`);
      return next();
    }
    
    try {
      console.log(`[Static] Catch-all route serving index.html for: ${url}`);
      
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        console.error(`[Static] index.html not found at: ${indexPath}`);
        return res.status(500).send("index.html not found");
      }
      
      console.log(`[Static] Sending index.html from: ${indexPath}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[Static] Error sending index.html:`, err);
          next(err);
        } else {
          console.log(`[Static] Successfully sent index.html for: ${url}`);
        }
      });
    } catch (error) {
      console.error(`[Static] Error in catch-all for ${url}:`, error);
      next(error);
    }
  });
}
