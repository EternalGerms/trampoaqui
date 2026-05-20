import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertNegotiationSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth";
import { validateFutureDateTime } from "../utils/validation";
import { handleRouteError } from "../utils/errorHandler";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("negotiation");

export function registerNegotiationRoutes(app: Express) {
  // Cria negociação
  app.post("/api/negotiations", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Faz parse do corpo sem proposerId (será adicionado abaixo)
      const negotiationData = insertNegotiationSchema.omit({ proposerId: true }).parse(req.body);
      
      // Adiciona o proposerId do usuário autenticado
      const negotiation = {
        ...negotiationData,
        proposerId: req.user!.userId,
      };
      
      const createdNegotiation = await storage.createNegotiation(negotiation);
      
      // Se estava pendente, muda a solicitação para negotiating
      await storage.updateRequestStatus(negotiation.requestId, 'negotiating');
      
      res.json(createdNegotiation);
    } catch (error) {
      logger.error("Error creating negotiation", {
        error,
        userId: req.user?.userId,
        requestId: req.body.requestId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });

  // Atualiza status da negociação
  app.put("/api/negotiations/:id/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
      }
      
      // Busca a negociação atual
      const currentNegotiation = await storage.getNegotiationById(req.params.id);
      if (!currentNegotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      
      // Verifica se o usuário pode responder a esta negociação
      const request = await storage.getServiceRequest(currentNegotiation.requestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Só cliente ou prestador podem responder
      const isClient = request.clientId === req.user!.userId;
      const provider = request.providerId ? await storage.getServiceProvider(request.providerId) : null;
      const isProvider = provider && provider.userId === req.user!.userId;
      
      if (!isClient && !isProvider) {
        return res.status(403).json({ message: "Unauthorized to respond to this negotiation" });
      }
      
      // O proponente não pode responder à própria negociação
      if (currentNegotiation.proposerId === req.user!.userId) {
        return res.status(400).json({ message: "Cannot respond to your own negotiation" });
      }
      
      // Aceita ou rejeita a negociação
      await storage.updateNegotiationStatus(req.params.id, status);
      
      // Se aceita, atualiza a solicitação com os dados da negociação
      if (status === 'accepted') {
        // Garante proposedPrice preenchido ao aceitar
        let finalProposedPrice: string | undefined = currentNegotiation.proposedPrice?.toString();
        
        // Se não houver proposedPrice, calcula com base no tipo e nas tarifas do prestador
        if (!finalProposedPrice && provider) {
          let calculatedPrice: number | null = null;
          
          if (currentNegotiation.pricingType === 'hourly' && provider.minHourlyRate) {
            const minPrice = parseFloat(provider.minHourlyRate.toString());
            if (currentNegotiation.proposedHours) {
              calculatedPrice = currentNegotiation.proposedHours * minPrice;
            } else if (request.proposedHours) {
              calculatedPrice = request.proposedHours * minPrice;
            }
          } else if (currentNegotiation.pricingType === 'daily' && provider.minDailyRate) {
            const minPrice = parseFloat(provider.minDailyRate.toString());
            if (currentNegotiation.proposedDays) {
              calculatedPrice = currentNegotiation.proposedDays * minPrice;
            } else if (request.proposedDays) {
              calculatedPrice = request.proposedDays * minPrice;
            }
          } else if (currentNegotiation.pricingType === 'fixed' && provider.minFixedRate) {
            calculatedPrice = parseFloat(provider.minFixedRate.toString());
          }
          
          if (calculatedPrice && calculatedPrice > 0) {
            finalProposedPrice = calculatedPrice.toString();
          }
        }
        
        // Usa proposedPrice da solicitação se não houver na negociação
        if (!finalProposedPrice && request.proposedPrice) {
          finalProposedPrice = request.proposedPrice.toString();
        }
        
        await storage.updateServiceRequest(currentNegotiation.requestId, {
          status: 'payment_pending', // Change to payment_pending instead of accepted
          proposedPrice: finalProposedPrice || undefined,
          proposedHours: currentNegotiation.proposedHours || request.proposedHours || undefined,
          proposedDays: currentNegotiation.proposedDays || request.proposedDays || undefined,
          scheduledDate: currentNegotiation.proposedDate || request.scheduledDate || undefined,
          pricingType: currentNegotiation.pricingType,
        });
      }
      
      res.json({ message: "Negotiation status updated" });
    } catch (error) {
      logger.error("Error updating negotiation status", {
        error,
        negotiationId: req.params.id,
        userId: req.user?.userId,
        status: req.body.status,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Lista negociações por ID da solicitação
  app.get("/api/requests/:id/negotiations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const negotiations = await storage.getNegotiationsByRequest(req.params.id);
      res.json(negotiations);
    } catch (error) {
      logger.error("Error getting negotiations", {
        error,
        requestId: req.params.id,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cria contraproposta
  app.post("/api/negotiations/:id/counter-proposal", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Busca a negociação atual
      const currentNegotiation = await storage.getNegotiationById(req.params.id);
      if (!currentNegotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      
      // Schema da contraproposta (sem requestId e proposerId)
      const counterProposalSchema = z.object({
        pricingType: z.enum(['hourly', 'daily', 'fixed']),
        proposedPrice: z.union([z.string(), z.number()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return val === '' ? undefined : val;
          }
          return val?.toString();
        }),
        proposedHours: z.union([z.string(), z.number()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return val === '' ? undefined : parseInt(val, 10);
          }
          return val;
        }),
        proposedDays: z.union([z.string(), z.number()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return val === '' ? undefined : parseInt(val, 10);
          }
          return val;
        }),
        proposedDate: z.union([z.date(), z.string()]).optional().transform((val) => {
          if (typeof val === 'string') {
            return new Date(val);
          }
          return val;
        }),
        message: z.string().min(1, "Message is required"),
      });

      // Valida e transforma o corpo usando o schema da contraproposta
      const validatedData = counterProposalSchema.parse({
        pricingType: req.body.pricingType,
        proposedPrice: req.body.proposedPrice,
        proposedHours: req.body.proposedHours,
        proposedDays: req.body.proposedDays,
        proposedDate: req.body.proposedDate,
        message: req.body.message,
      });
      
      // Verifica se o usuário pode responder a esta negociação
      const request = await storage.getServiceRequest(currentNegotiation.requestId);
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Só cliente ou prestador podem responder
      const isClient = request.clientId === req.user!.userId;
      const isProvider = request.providerId && (await storage.getServiceProvider(request.providerId))?.userId === req.user!.userId;
      
      if (!isClient && !isProvider) {
        return res.status(403).json({ message: "Unauthorized to respond to this negotiation" });
      }
      
      // O proponente não pode responder à própria negociação
      if (currentNegotiation.proposerId === req.user!.userId) {
        return res.status(400).json({ message: "Cannot respond to your own negotiation" });
      }
      
      // Valida campos obrigatórios
      if (!validatedData.pricingType || !validatedData.message) {
        return res.status(400).json({ message: "pricingType and message are required" });
      }

      // Validar data/hora se fornecida
      if (validatedData.proposedDate) {
        const dateValidation = validateFutureDateTime(validatedData.proposedDate);
        if (!dateValidation.isValid) {
          return res.status(400).json({ message: dateValidation.errorMessage });
        }
      }
      
      // Cria nova negociação como contraproposta
      const counterNegotiation = await storage.createNegotiation({
        ...validatedData,
        requestId: currentNegotiation.requestId,
        proposerId: req.user!.userId,
      });
      
      // Marca a negociação atual como respondida
      await storage.updateNegotiationStatus(req.params.id, 'counter_proposed');
      
      res.json({ 
        message: "Counter proposal created successfully",
        counterNegotiation,
        originalNegotiationId: req.params.id
      });
    } catch (error) {
      logger.error("Error creating counter proposal", {
        error,
        negotiationId: req.params.id,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });
}

