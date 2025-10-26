import { insertNegotiationSchema } from "@shared/schema";
import { Router, Request, Response } from "express";
import { authenticateToken } from "server/middlewares/auth.middleware";
import { storage } from "server/storage";
import { z } from "zod";

const negotiationsRouter = Router();

// Endpoint de negociações
negotiationsRouter.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Parse the request body without proposerId since we'll add it
      const negotiationData = insertNegotiationSchema
        .omit({ proposerId: true })
        .parse(req.body);

      // Add the proposer ID from the authenticated user
      const negotiation = {
        ...negotiationData,
        proposerId: req.user!.userId,
      };

      const createdNegotiation = await storage.createNegotiation(negotiation);

      // Update request status to negotiating if it was pending
      await storage.updateRequestStatus(negotiation.requestId, "negotiating");

      res.json(createdNegotiation);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      res.status(400).json({ message: "Invalid negotiation data" });
    }
  }
);

negotiationsRouter.put(
  "/:id/status",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be 'accepted' or 'rejected'",
        });
      }

      // Get the current negotiation
      const currentNegotiation = await storage.getNegotiationById(
        req.params.id
      );
      if (!currentNegotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }

      // Check if user is authorized to respond to this negotiation
      const request = await storage.getServiceRequest(
        currentNegotiation.requestId
      );
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // User can only respond if they are the client or provider of the request
      const isClient = request.clientId === req.user!.userId;
      const isProvider =
        request.providerId &&
        (await storage.getServiceProvider(request.providerId))?.userId ===
          req.user!.userId;

      if (!isClient && !isProvider) {
        return res
          .status(403)
          .json({ message: "Unauthorized to respond to this negotiation" });
      }

      // User cannot respond to their own negotiation
      if (currentNegotiation.proposerId === req.user!.userId) {
        return res
          .status(400)
          .json({ message: "Cannot respond to your own negotiation" });
      }

      // Accept or reject the negotiation
      await storage.updateNegotiationStatus(req.params.id, status);

      // If accepted, update the request with the accepted negotiation details
      if (status === "accepted") {
        await storage.updateServiceRequest(currentNegotiation.requestId, {
          status: "payment_pending", // Change to payment_pending instead of accepted
          proposedPrice: currentNegotiation.proposedPrice || undefined,
          proposedHours: currentNegotiation.proposedHours || undefined,
          proposedDays: currentNegotiation.proposedDays || undefined,
          scheduledDate: currentNegotiation.proposedDate || undefined,
          pricingType: currentNegotiation.pricingType,
        });
      }

      res.json({ message: "Negotiation status updated" });
    } catch (error) {
      console.error("Error updating negotiation status:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create counter proposal endpoint
negotiationsRouter.post(
  "/:id/counter-proposal",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Get the current negotiation first
      const currentNegotiation = await storage.getNegotiationById(
        req.params.id
      );
      if (!currentNegotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }

      // Create a schema for counter proposal data (without requestId and proposerId)
      const counterProposalSchema = z.object({
        pricingType: z.enum(["hourly", "daily", "fixed"]),
        proposedPrice: z
          .union([z.string(), z.number()])
          .optional()
          .transform((val) => {
            if (typeof val === "string") {
              return val === "" ? undefined : val;
            }
            return val?.toString();
          }),
        proposedHours: z
          .union([z.string(), z.number()])
          .optional()
          .transform((val) => {
            if (typeof val === "string") {
              return val === "" ? undefined : parseInt(val, 10);
            }
            return val;
          }),
        proposedDays: z
          .union([z.string(), z.number()])
          .optional()
          .transform((val) => {
            if (typeof val === "string") {
              return val === "" ? undefined : parseInt(val, 10);
            }
            return val;
          }),
        proposedDate: z
          .union([z.date(), z.string()])
          .optional()
          .transform((val) => {
            if (typeof val === "string") {
              return new Date(val);
            }
            return val;
          }),
        message: z.string().min(1, "Message is required"),
      });

      // Validate and transform the request body using the counter proposal schema
      const validatedData = counterProposalSchema.parse({
        pricingType: req.body.pricingType,
        proposedPrice: req.body.proposedPrice,
        proposedHours: req.body.proposedHours,
        proposedDays: req.body.proposedDays,
        proposedDate: req.body.proposedDate,
        message: req.body.message,
      });

      // Check if user is authorized to respond to this negotiation
      const request = await storage.getServiceRequest(
        currentNegotiation.requestId
      );
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // User can only respond if they are the client or provider of the request
      const isClient = request.clientId === req.user!.userId;
      const isProvider =
        request.providerId &&
        (await storage.getServiceProvider(request.providerId))?.userId ===
          req.user!.userId;

      if (!isClient && !isProvider) {
        return res
          .status(403)
          .json({ message: "Unauthorized to respond to this negotiation" });
      }

      // User cannot respond to their own negotiation
      if (currentNegotiation.proposerId === req.user!.userId) {
        return res
          .status(400)
          .json({ message: "Cannot respond to your own negotiation" });
      }

      // Validate required fields
      if (!validatedData.pricingType || !validatedData.message) {
        return res
          .status(400)
          .json({ message: "pricingType and message are required" });
      }

      // Create a new negotiation as a counter proposal
      const counterNegotiation = await storage.createNegotiation({
        ...validatedData,
        requestId: currentNegotiation.requestId,
        proposerId: req.user!.userId,
      });

      // Mark the current negotiation as responded to
      await storage.updateNegotiationStatus(req.params.id, "counter_proposed");

      res.json({
        message: "Counter proposal created successfully",
        counterNegotiation,
        originalNegotiationId: req.params.id,
      });
    } catch (error) {
      console.error("Error creating counter proposal:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default negotiationsRouter;
