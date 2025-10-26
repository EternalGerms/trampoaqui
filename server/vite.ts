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
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Pular rotas da API - deixar serem tratadas pelo middleware da API
    if (url.startsWith("/api")) {
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
      res.status(200).set({ "Content-Type": "application/json" }).end(safePage);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // redirecionar para index.html se o arquivo não existir
  // Lidar apenas com rotas não-API
  app.use("*", (req, res, next) => {
    // Pular rotas da API - deixar serem tratadas pelo middleware da API
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
