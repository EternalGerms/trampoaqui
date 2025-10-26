import { Router } from "express";
import { storage } from "server/storage";
import { Request, Response } from "express";
import {
  insertServiceRequestSchema,
  updateServiceRequestSchema,
} from "@shared/schema";
import { authenticateToken } from "server/middlewares/auth.middleware";

const requestsRouter = Router();

// Endpoint de serviços
requestsRouter.get(
  "/",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const requests = await storage.getServiceRequestsByClientWithNegotiations(
        req.user!.userId
      );

      res.json(requests);
    } catch (error) {
      console.error("Error in client requests route:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

requestsRouter.get(
  "/provider",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // First check if user has provider capability enabled
      const user = await storage.getUser(req.user!.userId);
      if (!user?.isProviderEnabled) {
        return res.status(403).json({
          message: "Provider capability not enabled",
          code: "PROVIDER_NOT_ENABLED",
        });
      }

      // Check if profile is complete and identify missing fields
      const missingFields = [];
      if (!user.bio) missingFields.push("bio");
      if (!user.experience) missingFields.push("experience");
      if (!user.location) missingFields.push("location");

      const isProfileComplete = missingFields.length === 0;
      if (!isProfileComplete) {
        return res.status(200).json({
          message: "Profile incomplete",
          code: "PROFILE_INCOMPLETE",
          profileStatus: {
            isComplete: false,
            missingFields,
          },
          requests: [],
        });
      }

      // Get all service providers for the current user
      const providers = await storage.getServiceProvidersByUserIdWithDetails(
        req.user!.userId
      );

      if (!providers || providers.length === 0) {
        return res.status(200).json({
          message: "Provider profile not found",
          code: "PROVIDER_PROFILE_NOT_FOUND",
          profileStatus: {
            isComplete: true,
            missingFields: [],
          },
          requests: [],
        });
      }

      // Get requests for all providers of this user
      const allRequests = [];
      for (const provider of providers) {
        const providerRequests =
          await storage.getServiceRequestsByProviderWithNegotiations(
            provider.id
          );
        allRequests.push(...providerRequests);
      }

      // Sort all requests by creation date (most recent first)
      const requests = allRequests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({
        message: "Success",
        code: "SUCCESS",
        profileStatus: {
          isComplete: true,
          missingFields: [],
        },
        requests,
      });
    } catch (error) {
      console.error("Error in provider requests route:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

requestsRouter.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user!.userId,
      });

      const request = await storage.createServiceRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({
        message: "Invalid input data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

requestsRouter.put(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
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
      if (
        request.clientId !== req.user!.userId &&
        provider.userId !== req.user!.userId
      ) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = updateServiceRequestSchema.parse(req.body);

      // Handle completion logic
      if (updateData.status === "completed") {
        const now = new Date();
        const isClient = request.clientId === req.user!.userId;
        const isProvider = provider.userId === req.user!.userId;

        if (isClient) {
          updateData.clientCompletedAt = now;
        } else if (isProvider) {
          updateData.providerCompletedAt = now;
        }

        // Only mark as completed if both parties have confirmed
        const hasClientCompleted =
          request.clientCompletedAt || (isClient ? now : null);
        const hasProviderCompleted =
          request.providerCompletedAt || (isProvider ? now : null);

        if (!hasClientCompleted || !hasProviderCompleted) {
          // Change status to 'pending_completion' if only one party has confirmed
          updateData.status = "pending_completion";
        } else {
          // Both parties have confirmed - add balance to provider
          if (request.proposedPrice) {
            const serviceAmount = parseFloat(request.proposedPrice.toString());
            const platformFee = serviceAmount * 0.05; // 5% platform fee
            const providerAmount = serviceAmount - platformFee;

            await storage.addToUserBalance(provider.userId, providerAmount);
          }
        }
      }

      const updatedRequest = await storage.updateServiceRequest(
        req.params.id,
        updateData
      );
      res.json(updatedRequest);
    } catch (error) {
      console.error("Validation error:", error);
      res.status(400).json({
        message: "Invalid input data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

requestsRouter.get(
  "/:id/negotiations",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const negotiations = await storage.getNegotiationsByRequest(
        req.params.id
      );
      res.json(negotiations);
    } catch (error) {
      console.error("Error getting negotiations:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Payment routes
requestsRouter.post(
  "/:id/payment",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { paymentMethod } = req.body;

      if (!["boleto", "pix", "credit_card"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }

      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Check if user is the client of this request
      if (request.clientId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check if request is in payment_pending status
      if (request.status !== "payment_pending") {
        return res
          .status(400)
          .json({ message: "Request is not in payment pending status" });
      }

      const updatedRequest = await storage.updateServiceRequestPayment(
        req.params.id,
        paymentMethod
      );
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

requestsRouter.post(
  "/:id/complete-payment",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const request = await storage.getServiceRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Check if user is the client of this request
      if (request.clientId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check if request has payment method set
      if (!request.paymentMethod) {
        return res.status(400).json({ message: "Payment method not set" });
      }

      const updatedRequest = await storage.completeServiceRequestPayment(
        req.params.id
      );
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error completing payment:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default requestsRouter;
