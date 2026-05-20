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

// Função para escapar componentes de URL de forma segura
function escapeUrlComponent(str: string): string {
  try {
    // Remove caracteres perigosos antes de fazer encoding
    const cleaned = str.replace(/[<>"']/g, '');
    return encodeURIComponent(cleaned);
  } catch {
    return '';
  }
}

// Função para normalizar e validar path, prevenindo path traversal
function normalizePath(pathStr: string): string | null {
  if (!pathStr || typeof pathStr !== 'string') {
    return null;
  }

  // Remover query strings e fragments
  const pathOnly = pathStr.split('?')[0].split('#')[0];

  // Validar que o path é relativo (começa com / ou é vazio)
  if (pathOnly && !pathOnly.startsWith('/')) {
    return null;
  }

  // Normalizar o path (resolve .., ., etc.)
  let normalized: string;
  try {
    normalized = path.normalize(pathOnly || '/');
  } catch {
    return null;
  }

  // Garantir que sempre comece com /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  // Validar contra path traversal (não deve conter .. após normalização)
  if (normalized.includes('..') || normalized.includes('\0')) {
    return null;
  }

  // Remover caracteres perigosos e não permitidos em paths
  const dangerousChars = /[<>"|*?\\]/;
  if (dangerousChars.test(normalized)) {
    return null;
  }

  // Limitar comprimento do path
  if (normalized.length > 2048) {
    return null;
  }

  return normalized;
}

// Função robusta para sanitizar URL completa
function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  // Extrair apenas o path (sem query strings e fragments)
  let urlPath = url.split('?')[0].split('#')[0];

  // Normalizar o path
  const normalized = normalizePath(urlPath);
  
  if (!normalized) {
    // Se normalização falhou, retornar path seguro padrão
    return '/';
  }

  // Decodificar URL encoding antes de validar
  try {
    urlPath = decodeURIComponent(normalized);
  } catch {
    // Se decoding falhar, usar versão normalizada
    urlPath = normalized;
  }

  // Re-validar após decode
  const reNormalized = normalizePath(urlPath);
  return reNormalized || '/';
}

// Função para sanitizar URL para logs (não pode conter caracteres de controle)
function sanitizeUrlForLog(url: string): string {
  if (!url || typeof url !== 'string') {
    return '[invalid-url]';
  }
  
  // Remover caracteres de controle e limitar tamanho
  return url
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 500); // Limita tamanho
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
  
  // Lida apenas com rotas não-API via catch-all
  // Usa app.all para capturar todos os métodos HTTP
  app.all("*", async (req, res, next) => {
    const originalUrl = req.originalUrl;
    
    // Pular rotas da API - deixar serem tratadas pelo middleware da API
    if (originalUrl.startsWith("/api")) {
      return next();
    }

    // Apenas GET serve HTML
    if (req.method !== "GET") {
      return next();
    }

    // Rate limiting para operações de arquivo
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ message: "Muitas requisições" });
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );


      if (!fs.existsSync(clientTemplate)) {
        logger.error("Template file not found", { templatePath: clientTemplate });
        return res.status(500).send("Template file not found");
      }

      // Sanitizar URL de forma robusta para prevenir XSS e path traversal
      const sanitizedUrl = sanitizeUrl(originalUrl);

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
      
      // Adicionar headers de segurança
      res.status(200).set({
        "Content-Type": "text/html",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      }).end(safePage);
    } catch (e) {
      // Sanitizar URL para logs também
      const safeUrlForLog = sanitizeUrlForLog(originalUrl);
      logger.error("Error serving index.html", { error: e, url: safeUrlForLog });
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

  // Verifica se index.html existe
  const indexPath = path.resolve(distPath, "index.html");
  staticLogger.debug("Index.html check", { indexPath, exists: fs.existsSync(indexPath) });

  staticLogger.info("Serving static files", { distPath });

  // Middleware estático custom que não retorna 404
  app.use((req, res, next) => {
    const url = req.originalUrl;
    const safeUrlForLog = sanitizeUrlForLog(url);
    
    // Ignora rotas de API
    if (url.startsWith("/api")) {
      return next();
    }
    
    try {
      // Tenta servir arquivo estático
      // Remove barra inicial e normaliza o path
      const fileToServe = url === "/" || url === "" ? "index.html" : url.replace(/^\//, "");
      const resolvedPath = path.resolve(distPath, fileToServe);
      const distPathResolved = path.resolve(distPath);
      
      // Checagem de segurança: garante que o path resolvido está dentro de distPath
      if (!resolvedPath.startsWith(distPathResolved)) {
        staticLogger.warn("Security check failed", { resolvedPath, distPathResolved, url: safeUrlForLog });
        return next();
      }
      
      // Verifica se o arquivo existe
      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        if (stats.isFile()) {
          staticLogger.debug("Serving file", { url: safeUrlForLog, resolvedPath });
          return res.sendFile(resolvedPath, (err) => {
            if (err) {
              staticLogger.error("Error sending file", { error: err, resolvedPath, url: safeUrlForLog });
              next(err);
            }
          });
        }
      }
      
      // Arquivo não existe, segue para catch-all
      staticLogger.debug("File not found, continuing to catch-all", { url: safeUrlForLog });
      next();
    } catch (error) {
      staticLogger.error("Error in static middleware", { error, url: safeUrlForLog });
      next(error);
    }
  });

  // Rota catch-all para servir index.html em rotas não-API
  app.use((req, res, next) => {
    const url = req.originalUrl;
    
    // Ignora rotas de API
    if (url.startsWith("/api")) {
      return next();
    }
    
    // Só processa GET para servir HTML
    const safeUrlForLog = sanitizeUrlForLog(url);
    if (req.method !== "GET") {
      staticLogger.debug("Catch-all skipping non-GET request", { method: req.method, url: safeUrlForLog });
      return next();
    }
    
    // Pula se a resposta já foi enviada (arquivo estático encontrado)
    if (res.headersSent) {
      staticLogger.debug("Catch-all skipping, response already sent", { url: safeUrlForLog });
      return next();
    }
    
    try {
      staticLogger.debug("Catch-all route serving index.html", { url: safeUrlForLog });
      
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        staticLogger.error("index.html not found", { indexPath });
        return res.status(500).send("index.html not found");
      }
      
      staticLogger.debug("Sending index.html", { indexPath, url: safeUrlForLog });
      res.sendFile(indexPath, (err) => {
        if (err) {
          staticLogger.error("Error sending index.html", { error: err, indexPath, url: safeUrlForLog });
          next(err);
        } else {
          staticLogger.debug("Successfully sent index.html", { url: safeUrlForLog });
        }
      });
    } catch (error) {
      staticLogger.error("Error in catch-all", { error, url: safeUrlForLog });
      next(error);
    }
  });
}
