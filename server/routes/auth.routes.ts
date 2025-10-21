import { Router } from "express";
import { storage } from "server/storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { insertUserSchema, updateProviderProfileSchema } from "@shared/schema";
import {
  generateVerificationToken,
  sendVerificationEmail,
} from "server/utils/email";

const JWT_SECRET = process.env.JWT_SECRET as string;
const authRouter = Router();

const authenticateToken = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Garantir que o token decodificado tenha a estrutura esperada
    if (decoded && decoded.userId) {
      req.user = {
        userId: decoded.userId,
        isProviderEnabled: decoded.isProviderEnabled || false,
        isAdmin: decoded.isAdmin || false,
      };
      next();
    } else {
      return res.status(403).json({ message: "Invalid token structure" });
    }
  });
};

// Endpoint de login
authRouter.post("/login", async (req: Request, res: Response) => {
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

    const token = jwt.sign(
      {
        userId: user.id,
        isProviderEnabled: user.isProviderEnabled,
        isAdmin: user.isAdmin,
      },
      JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isProviderEnabled: user.isProviderEnabled,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint de registro
authRouter.post("/register", async (req: Request, res: Response) => {
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
    const emailVerificationExpires = new Date(Date.now() + 3600000); // 1 hour from now

    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Enviar e-mail de verificação
    try {
      await sendVerificationEmail(user.email, emailVerificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Opcional: lidar com o erro de envio de e-mail.
      // Como a verificação é opcional, o registro pode continuar mesmo se o e-mail falhar.
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        isProviderEnabled: user.isProviderEnabled,
        isAdmin: user.isAdmin,
      },
      JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isProviderEnabled: user.isProviderEnabled,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof ZodError) {
      console.error("Validation error:", error.flatten());
      return res
        .status(400)
        .json({ message: "Invalid input data", details: error.flatten() });
    }

    // Capturar erros de banco de dados
    if (error && typeof error === "object" && "code" in error) {
      console.error("Database error:", error);
      return res.status(400).json({ message: "Database error occurred" });
    }

    // Capturar outros erros
    console.error("Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint de verificação de email
authRouter.get(
  "/verify-email",
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res
          .status(400)
          .json({ message: "Token de verificação inválido ou ausente" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res
          .status(400)
          .json({ message: "Token de verificação inválido" });
      }

      if (
        user.emailVerificationExpires &&
        user.emailVerificationExpires < new Date()
      ) {
        return res
          .status(400)
          .json({ message: "Token de verificação expirado" });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      // Retornar sucesso
      return res.status(200).json({
        message: "E-mail verificado com sucesso",
        verified: true,
      });
    } catch (error) {
      console.error("Erro na verificação de e-mail:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
);

// Eendpoint de informações do usuário
authRouter.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        isProviderEnabled: user.isProviderEnabled,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        bio: user.bio,
        experience: user.experience,
        location: user.location,
        city: user.city,
        state: user.state,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Endpoint de status do perfil
authRouter.get(
  "/profile/status",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const missingFields = [];
      if (!user.bio) missingFields.push("bio");
      if (!user.experience) missingFields.push("experience");
      if (!user.location) missingFields.push("location");

      const isProfileComplete = missingFields.length === 0;

      res.json({
        isProfileComplete,
        missingFields,
        profile: {
          bio: user.bio,
          experience: user.experience,
          location: user.location,
        },
        isProviderEnabled: user.isProviderEnabled,
        redirectToProfile: !isProfileComplete && user.isProviderEnabled,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Endpoint de atualização do perfil
authRouter.put(
  "/profile",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const profileData = updateProviderProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(
        req.user!.userId,
        profileData
      );

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        isProviderEnabled: user.isProviderEnabled,
        bio: user.bio,
        experience: user.experience,
        location: user.location,
        city: user.city,
        state: user.state,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({
        message: "Invalid profile data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Endpoint de habilitação de funções de prestador
authRouter.post(
  "/enable-provider",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const user = await storage.enableProviderCapability(req.user!.userId);

      // Verificar se perfil está completo e identificar campos faltantes
      const missingFields = [];
      if (!user.bio) missingFields.push("bio");
      if (!user.experience) missingFields.push("experience");
      if (!user.location) missingFields.push("location");

      const isProfileComplete = missingFields.length === 0;

      // Gerar novo token com status de prestador atualizado
      const token = jwt.sign(
        { userId: user.id, isProviderEnabled: user.isProviderEnabled },
        JWT_SECRET
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isProviderEnabled: user.isProviderEnabled,
          bio: user.bio,
          experience: user.experience,
          location: user.location,
          city: user.city,
          state: user.state,
        },
        profileStatus: {
          isComplete: isProfileComplete,
          missingFields,
          redirectToProfile: !isProfileComplete,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default authRouter;
