import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { sql, eq, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { insertUserSchema, updateUserProfileSchema, changePasswordSchema, deleteAccountSchema, users, serviceProviders, serviceRequests, messages, reviews, negotiations, withdrawals } from "@shared/schema";
import { z, ZodError } from "zod";
import { generateVerificationToken, sendVerificationEmail } from "../utils/email";
import { generateAuthToken } from "../utils/auth";
import { formatUserResponse, formatUserResponseFull, formatUserResponseProvider } from "../utils/response";
import { handleRouteError } from "../utils/errorHandler";
import { authenticateToken } from "../middleware/auth";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth");

const RESEND_VERIFICATION_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
const resendVerificationTracker = new Map<string, number>();

export function registerAuthRoutes(app: Express) {
  // Registro
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Verificar se usuário já existe por email
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Verificar se usuário já existe por CPF
      const existingUserByCPF = await storage.getUserByCPF(userData.cpf);
      if (existingUserByCPF) {
        return res.status(400).json({ message: "CPF já está em uso" });
      }

      // Criptografar senha
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const emailVerificationToken = generateVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 3600000); // expira em 1 hora

      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        emailVerificationToken,
        emailVerificationExpires,
      });

      // Enviar e-mail de verificação
      const emailSent = await sendVerificationEmail(user.email, emailVerificationToken);
      if (!emailSent) {
        logger.warn("Verification email could not be sent during registration", {
          email: user.email,
          userId: user.id,
        });
      }

      // Gerar token JWT
      const token = generateAuthToken(user);
      
      res.json({ 
        token, 
        user: formatUserResponse(user)
      });
    } catch (error) {
      logger.error("Registration error", {
        error,
        email: req.body.email,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });

  // Login
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

      const token = generateAuthToken(user);
      
      res.json({ 
        token, 
        user: formatUserResponse(user)
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reenvia e-mail de verificação
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    const resendSchema = z.object({
      email: z.string().email("Email inválido").transform((value) => value.trim().toLowerCase()),
    });

    try {
      const { email } = resendSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Este e-mail já foi verificado" });
      }

      const now = Date.now();
      const lastAttempt = resendVerificationTracker.get(user.id) ?? 0;
      const timeSinceLastAttempt = now - lastAttempt;

      if (timeSinceLastAttempt < RESEND_VERIFICATION_INTERVAL_MS) {
        const secondsRemaining = Math.ceil((RESEND_VERIFICATION_INTERVAL_MS - timeSinceLastAttempt) / 1000);
        return res.status(429).json({
          message: `Aguarde ${secondsRemaining}s para solicitar um novo e-mail de verificação.`,
          retryAfter: secondsRemaining,
        });
      }

      const emailVerificationToken = generateVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 3600000); // expira em 1 hora

      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpires,
      });

      const emailSent = await sendVerificationEmail(user.email, emailVerificationToken);
      if (!emailSent) {
        logger.error("Failed to resend verification email: transporter not initialized or send failed", {
          email: req.body.email,
        });
        return res.status(500).json({ message: "Não foi possível enviar o e-mail de verificação. Tente novamente mais tarde." });
      }

      resendVerificationTracker.set(user.id, now);

      return res.status(200).json({
        message: "Um novo e-mail de verificação foi enviado.",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Dados inválidos", details: error.flatten() });
      }

      logger.error("Erro ao reenviar e-mail de verificação", {
        error,
        email: req.body.email,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Verifica e-mail
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token de verificação inválido ou ausente" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ message: "Token de verificação inválido" });
      }

      if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
        return res.status(400).json({ message: "Token de verificação expirado" });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      // Retorna sucesso
      return res.status(200).json({ 
        message: "E-mail verificado com sucesso",
        verified: true 
      });
    } catch (error) {
      logger.error("Erro na verificação de e-mail", {
        error,
        token: req.query.token,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Obtém usuário atual
  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(formatUserResponseFull(user));
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Habilita perfil de prestador
  app.post("/api/auth/enable-provider", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = await storage.enableProviderCapability(req.user!.userId);
      
      // Verificar se perfil está completo e identificar campos faltantes
      const missingFields = [];
      if (!user.bio) missingFields.push('bio');
      if (!user.experience) missingFields.push('experience');
      if (!user.location) missingFields.push('location');
      
      const isProfileComplete = missingFields.length === 0;
      
      // Gerar novo token com status de prestador atualizado
      const token = generateAuthToken(user);
      
      res.json({ 
        token,
        user: formatUserResponseProvider(user),
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

  // Atualiza perfil do usuário
  app.put("/api/auth/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const profileData = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.user!.userId, profileData);
      
      res.json(formatUserResponseFull(user));
    } catch (error) {
      logger.error("Error updating profile", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid profile data", details: error.flatten() });
      }
      res.status(400).json({ message: "Invalid profile data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Altera senha
  app.put("/api/auth/change-password", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      // Busca usuário no banco
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verifica senha antiga
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Senha antiga incorreta" });
      }

      // Gera hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualiza senha
      await storage.updateUser(req.user!.userId, { password: hashedPassword });

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      logger.error("Error changing password", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Dados inválidos", details: error.flatten() });
      }
      res.status(500).json({ message: "Erro ao alterar senha", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Exclui conta do usuário
  app.delete("/api/auth/account", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { password } = deleteAccountSchema.parse(req.body);
      
      // Busca usuário no banco
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verifica senha
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Senha incorreta" });
      }

      // Verifica solicitações ativas como cliente
      const clientRequests = await storage.getServiceRequestsByClient(req.user!.userId);
      const hasActiveClientRequests = clientRequests.some(request => 
        request.status === 'pending' || 
        request.status === 'accepted' || 
        request.status === 'negotiating' || 
        request.status === 'payment_pending'
      );

      if (hasActiveClientRequests) {
        return res.status(400).json({ 
          message: "Não é possível excluir a conta com serviços ativos. Finalize ou cancele os serviços primeiro." 
        });
      }

      // Verifica solicitações ativas como prestador
      const userProviders = await storage.getServiceProvidersByUserIdWithDetails(req.user!.userId);
      for (const provider of userProviders) {
        const providerRequests = await storage.getServiceRequestsByProvider(provider.id);
        const hasActiveProviderRequests = providerRequests.some(request => 
          request.status === 'pending' || 
          request.status === 'accepted' || 
          request.status === 'negotiating' || 
          request.status === 'payment_pending'
        );

        if (hasActiveProviderRequests) {
          return res.status(400).json({ 
            message: "Não é possível excluir a conta com serviços ativos. Finalize ou cancele os serviços primeiro." 
          });
        }
      }

      // Remove dados relacionados usando session_replication_role = replica para contornar FKs
      await db.execute(sql`SET session_replication_role = replica`);

      // Remove na ordem: messages, reviews, negotiations, service_requests, service_providers, withdrawals, users
      await db.delete(messages).where(or(eq(messages.senderId, req.user!.userId), eq(messages.receiverId, req.user!.userId)));
      await db.delete(reviews).where(or(eq(reviews.reviewerId, req.user!.userId), eq(reviews.revieweeId, req.user!.userId)));
      await db.delete(negotiations).where(eq(negotiations.proposerId, req.user!.userId));
      
      // Remove solicitações em que o usuário é cliente
      await db.delete(serviceRequests).where(eq(serviceRequests.clientId, req.user!.userId));
      
      // Remove solicitações em que o usuário é prestador (via service_providers)
      for (const provider of userProviders) {
        await db.delete(serviceRequests).where(eq(serviceRequests.providerId, provider.id));
      }
      
      // Remove prestadores
      await db.delete(serviceProviders).where(eq(serviceProviders.userId, req.user!.userId));
      
      // Remove saques
      await db.delete(withdrawals).where(eq(withdrawals.userId, req.user!.userId));
      
      // Remove usuário
      await db.delete(users).where(eq(users.id, req.user!.userId));

      // Reativa restrições de chave estrangeira
      await db.execute(sql`SET session_replication_role = DEFAULT`);

      res.json({ message: "Conta excluída com sucesso" });
    } catch (error) {
      logger.error("Error deleting account", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Reativa restrições de chave estrangeira em caso de erro
      try {
        await db.execute(sql`SET session_replication_role = DEFAULT`);
      } catch (e) {
        logger.error("Error re-enabling foreign key constraints", {
          error: e,
          userId: req.user?.userId,
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Dados inválidos", details: error.flatten() });
      }
      res.status(500).json({ message: "Erro ao excluir conta", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });
}

