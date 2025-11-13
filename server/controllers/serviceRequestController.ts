import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertServiceRequestSchema, updateServiceRequestSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
import { validateFutureDateTime } from "../utils/validation";
import { handleRouteError } from "../utils/errorHandler";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("serviceRequest");

export function registerServiceRequestRoutes(app: Express) {
  // Get service requests for current user (as client)
  app.get("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getServiceRequestsByClientWithNegotiations(req.user!.userId);
      
      res.json(requests);
    } catch (error) {
      logger.error("Error in client requests route", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get service requests for current user (as provider)
  app.get("/api/requests/provider", authenticateToken, async (req: Request, res: Response) => {
    try {
      // First check if user has provider capability enabled
      const user = await storage.getUser(req.user!.userId);
      if (!user?.isProviderEnabled) {
        return res.status(403).json({ 
          message: "Provider capability not enabled",
          code: "PROVIDER_NOT_ENABLED"
        });
      }
      
      // Check if profile is complete and identify missing fields
      const missingFields = [];
      if (!user.bio) missingFields.push('bio');
      if (!user.experience) missingFields.push('experience');
      if (!user.location) missingFields.push('location');
      
      const isProfileComplete = missingFields.length === 0;
      if (!isProfileComplete) {
        return res.status(200).json({
          message: "Profile incomplete",
          code: "PROFILE_INCOMPLETE",
          profileStatus: {
            isComplete: false,
            missingFields
          },
          requests: []
        });
      }
      
      // Get all service providers for the current user
      const providers = await storage.getServiceProvidersByUserIdWithDetails(req.user!.userId);
      
      if (!providers || providers.length === 0) {
        return res.status(200).json({
          message: "Provider profile not found",
          code: "PROVIDER_PROFILE_NOT_FOUND",
          profileStatus: {
            isComplete: true,
            missingFields: []
          },
          requests: []
        });
      }
      
      // Get requests for all providers of this user
      const allRequests = [];
      for (const provider of providers) {
        const providerRequests = await storage.getServiceRequestsByProviderWithNegotiations(provider.id);
        allRequests.push(...providerRequests);
      }
      
      // Sort all requests by creation date (most recent first)
      const requests = allRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json({
        message: "Success",
        code: "SUCCESS",
        profileStatus: {
          isComplete: true,
          missingFields: []
        },
        requests
      });
    } catch (error) {
      logger.error("Error in provider requests route", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Create service request
  app.post("/api/requests", authenticateToken, async (req: Request, res: Response) => {
    try {
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user!.userId,
      });
      
      // Buscar o provider para validar preço mínimo
      const provider = await storage.getServiceProvider(requestData.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Validar preço mínimo baseado no tipo de orçamento
      let minPrice: number | null = null;
      let calculatedPrice: number | null = null;

      if (requestData.pricingType === 'hourly') {
        if (!provider.minHourlyRate) {
          return res.status(400).json({ message: "Provider não possui valor mínimo por hora configurado" });
        }
        minPrice = parseFloat(provider.minHourlyRate.toString());
        if (requestData.proposedHours) {
          calculatedPrice = requestData.proposedHours * minPrice;
        }
      } else if (requestData.pricingType === 'daily') {
        if (!provider.minDailyRate) {
          return res.status(400).json({ message: "Provider não possui valor mínimo por dia configurado" });
        }
        minPrice = parseFloat(provider.minDailyRate.toString());
        if (requestData.proposedDays) {
          calculatedPrice = requestData.proposedDays * minPrice;
        }
      } else if (requestData.pricingType === 'fixed') {
        if (!provider.minFixedRate) {
          return res.status(400).json({ message: "Provider não possui valor mínimo fixo configurado" });
        }
        minPrice = parseFloat(provider.minFixedRate.toString());
      }

      // Validar proposedPrice se fornecido
      if (requestData.proposedPrice) {
        const proposedPriceValue = parseFloat(requestData.proposedPrice.toString());
        const priceToCompare = calculatedPrice || minPrice;
        
        if (priceToCompare && proposedPriceValue < priceToCompare) {
          return res.status(400).json({ 
            message: `O preço proposto (R$ ${proposedPriceValue.toFixed(2)}) deve ser maior ou igual ao valor mínimo de R$ ${priceToCompare.toFixed(2)}` 
          });
        }
      }

      // Para hourly e daily, calcular e definir o preço final automaticamente se não foi fornecido
      if ((requestData.pricingType === 'hourly' || requestData.pricingType === 'daily') && calculatedPrice) {
        requestData.proposedPrice = calculatedPrice.toString();
      }

      // Validar data/hora se fornecida
      if (requestData.scheduledDate) {
        const dateValidation = validateFutureDateTime(requestData.scheduledDate);
        if (!dateValidation.isValid) {
          return res.status(400).json({ message: dateValidation.errorMessage });
        }
      }

      // Para serviços diários, gerar array de dias
      if (requestData.pricingType === 'daily' && requestData.proposedDays && requestData.scheduledDate) {
        const dailySessions: Array<{
          day: number;
          scheduledDate: Date;
          scheduledTime: string;
          clientCompleted: boolean;
          providerCompleted: boolean;
        }> = [];

        const startDate = new Date(requestData.scheduledDate);
        const scheduledTime = startDate.toTimeString().slice(0, 5); // HH:MM

        for (let i = 0; i < requestData.proposedDays; i++) {
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + i);
          
          dailySessions.push({
            day: i + 1,
            scheduledDate: dayDate,
            scheduledTime: scheduledTime,
            clientCompleted: false,
            providerCompleted: false,
          });
        }

        requestData.dailySessions = dailySessions as any;
      }
      
      const request = await storage.createServiceRequest(requestData);
      res.json(request);
    } catch (error) {
      logger.error("Validation error", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });

  // Update daily session for a request
  app.put("/api/requests/:id/daily-session/:dayIndex", authenticateToken, async (req: Request, res: Response) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Verificar se é um serviço diário
      if (request.pricingType !== 'daily') {
        return res.status(400).json({ message: "Este endpoint é apenas para serviços diários" });
      }

      // Validar status - só permite marcar dias como concluídos após pagamento
      const allowedStatuses = ['pending_completion', 'accepted'];
      if (!allowedStatuses.includes(request.status)) {
        return res.status(400).json({ 
          message: `Não é possível marcar dias como concluídos. O serviço deve estar aceito e pago. Status atual: ${request.status}` 
        });
      }

      // Verificar se o pagamento foi realizado
      if (!request.paymentCompletedAt) {
        return res.status(400).json({ 
          message: "Não é possível marcar dias como concluídos. O pagamento ainda não foi confirmado." 
        });
      }

      // Get provider for this request
      const provider = await storage.getServiceProvider(request.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Check if user has permission (client or provider)
      const isClient = request.clientId === req.user!.userId;
      const isProvider = provider.userId === req.user!.userId;
      if (!isClient && !isProvider) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const dayIndex = parseInt(req.params.dayIndex);
      if (isNaN(dayIndex) || dayIndex < 0) {
        return res.status(400).json({ message: "Índice do dia inválido" });
      }

      // Obter dailySessions do request
      let dailySessions: Array<{
        day: number;
        scheduledDate: Date | string;
        scheduledTime: string;
        clientCompleted: boolean;
        providerCompleted: boolean;
      }> = [];

      if (request.dailySessions && Array.isArray(request.dailySessions)) {
        dailySessions = request.dailySessions as any;
      }

      if (dayIndex >= dailySessions.length) {
        return res.status(400).json({ message: "Índice do dia fora do range" });
      }

      const session = dailySessions[dayIndex];

      // Processar atualização
      if (req.body.completed !== undefined) {
        // Marcar como concluído
        if (isClient) {
          session.clientCompleted = req.body.completed === true;
        } else if (isProvider) {
          session.providerCompleted = req.body.completed === true;
        }
      }

      // Editar data/hora se fornecido (mesma validação de status aplica)
      if (req.body.scheduledDate || req.body.scheduledTime) {
        // Validação de status já foi feita acima, então podemos permitir edição
        if (req.body.scheduledDate) {
          const newDate = new Date(req.body.scheduledDate);
          const dateValidation = validateFutureDateTime(newDate);
          if (!dateValidation.isValid) {
            return res.status(400).json({ message: dateValidation.errorMessage });
          }
          session.scheduledDate = newDate;
        }
        if (req.body.scheduledTime) {
          session.scheduledTime = req.body.scheduledTime;
          // Atualizar também a data se necessário
          if (session.scheduledDate) {
            const dateObj = typeof session.scheduledDate === 'string' ? new Date(session.scheduledDate) : session.scheduledDate;
            const [hours, minutes] = req.body.scheduledTime.split(':');
            dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            const dateValidation = validateFutureDateTime(dateObj);
            if (!dateValidation.isValid) {
              return res.status(400).json({ message: dateValidation.errorMessage });
            }
            session.scheduledDate = dateObj;
          }
        }
      }

      // Atualizar o array
      dailySessions[dayIndex] = session;

      // Verificar se todos os dias estão concluídos por ambas as partes
      const allCompleted = dailySessions.every(s => s.clientCompleted && s.providerCompleted);

      // Atualizar o request
      const now = new Date();
      const updateData: any = {
        dailySessions: dailySessions,
        updatedAt: now,
      };

      // Se todos os dias estão concluídos e o pagamento foi realizado, marcar o serviço como concluído
      if (allCompleted && request.status !== 'completed' && request.paymentCompletedAt) {
        updateData.status = 'completed';
        updateData.clientCompletedAt = now;
        updateData.providerCompletedAt = now;
      }

      // Add balance to provider when service is completed (check if conditions are met)
      const finalStatus = updateData.status || request.status;
      const paymentWasCompleted = request.paymentCompletedAt != null; // Check for both null and undefined
      const balanceNotAddedYet = !request.balanceAddedAt;
      const bothPartiesConfirmed = updateData.clientCompletedAt && updateData.providerCompletedAt;
      
      if (finalStatus === 'completed' && 
          paymentWasCompleted && 
          bothPartiesConfirmed && 
          balanceNotAddedYet && 
          request.proposedPrice) {
        const serviceAmount = parseFloat(request.proposedPrice.toString());
        if (!isNaN(serviceAmount) && serviceAmount > 0) {
          const platformFee = serviceAmount * 0.05; // 5% platform fee
          const providerAmount = serviceAmount - platformFee;
          
          await storage.addToUserBalance(provider.userId, providerAmount);
          updateData.balanceAddedAt = now;
        }
      }

      const updatedRequest = await storage.updateServiceRequest(req.params.id, updateData);
      res.json(updatedRequest);
    } catch (error) {
      logger.error("Error updating daily session", {
        error,
        requestId: req.params.id,
        dayIndex: req.params.dayIndex,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(400).json({ message: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update service request
  app.put("/api/requests/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Get provider for this request
      const provider = await storage.getServiceProvider(request.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Check if user has permission to update this request (client or provider)
      if (request.clientId !== req.user!.userId && provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = updateServiceRequestSchema.parse(req.body);

      // Validar data/hora se fornecida na atualização
      if (updateData.scheduledDate) {
        const dateValidation = validateFutureDateTime(updateData.scheduledDate);
        if (!dateValidation.isValid) {
          return res.status(400).json({ message: dateValidation.errorMessage });
        }
      }
      
      // Handle completion logic
      const now = new Date();
      const isClient = request.clientId === req.user!.userId;
      const isProvider = provider.userId === req.user!.userId;
      const statusIsChangingToCompleted = updateData.status === 'completed' && request.status !== 'completed';
      const statusIsAlreadyCompleted = request.status === 'completed';
      
      // If status is being set to completed, validate and set completion timestamps
      if (statusIsChangingToCompleted) {
        // Para serviços diários, validar se todas as diárias foram concluídas
        if (request.pricingType === 'daily') {
          if (request.dailySessions && Array.isArray(request.dailySessions)) {
            const dailySessions = request.dailySessions as Array<{
              clientCompleted: boolean;
              providerCompleted: boolean;
            }>;
            const allDaysCompleted = dailySessions.every(s => s.clientCompleted && s.providerCompleted);
            
            if (!allDaysCompleted) {
              return res.status(400).json({ 
                message: "Não é possível marcar o serviço como concluído. Todas as diárias devem estar marcadas como concluídas por ambas as partes." 
              });
            }
          } else {
            return res.status(400).json({ 
              message: "Serviço diário não possui diárias configuradas." 
            });
          }
        }
        
        if (isClient) {
          updateData.clientCompletedAt = now;
        } else if (isProvider) {
          updateData.providerCompletedAt = now;
        }
      }
      
      // Check if request should be marked as completed
      const hasClientCompleted = updateData.clientCompletedAt || request.clientCompletedAt;
      const hasProviderCompleted = updateData.providerCompletedAt || request.providerCompletedAt;
      
      // Determine final status
      if (statusIsChangingToCompleted) {
        if (!hasClientCompleted || !hasProviderCompleted) {
          // Change status to 'pending_completion' if only one party has confirmed
          updateData.status = 'pending_completion';
        } else {
          // Both parties have confirmed - mark as completed
          updateData.status = 'completed';
        }
      }
      
      // Add balance to provider when service is completed (check if conditions are met)
      // Conditions: status is/will be 'completed', payment was completed, both parties confirmed, balance not added yet
      const finalStatus = updateData.status || request.status;
      const paymentWasCompleted = request.paymentCompletedAt != null; // Check for both null and undefined
      const balanceNotAddedYet = !request.balanceAddedAt;
      const bothPartiesConfirmed = hasClientCompleted && hasProviderCompleted;
      
      if (finalStatus === 'completed' && 
          paymentWasCompleted && 
          bothPartiesConfirmed && 
          balanceNotAddedYet && 
          request.proposedPrice) {
        const serviceAmount = parseFloat(request.proposedPrice.toString());
        if (!isNaN(serviceAmount) && serviceAmount > 0) {
          const platformFee = serviceAmount * 0.05; // 5% platform fee
          const providerAmount = serviceAmount - platformFee;
          
          await storage.addToUserBalance(provider.userId, providerAmount);
          updateData.balanceAddedAt = now;
        }
      }

      const updatedRequest = await storage.updateServiceRequest(req.params.id, updateData);
      res.json(updatedRequest);
    } catch (error) {
      logger.error("Validation error", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      handleRouteError(error, res);
    }
  });
}

