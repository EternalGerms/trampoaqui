import { Router } from "express";
import { storage } from "server/storage";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { insertReviewSchema } from "@shared/schema";
import { authenticateToken, authenticateAdmin } from "server/middlewares/auth.middleware";

const reviewsRouter = Router();


// Cria uma review
reviewsRouter.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: req.user!.userId,
      });

      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  }
);

// Obtem as reviews de um serviço específico
reviewsRouter.get(
  "/service-provider/:serviceProviderId",
  async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getReviewsByServiceProvider(
        req.params.serviceProviderId
      );
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching service provider reviews:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

reviewsRouter.get("/user/:userId/", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { direction, role } = req.query;

    if (direction !== "received" && direction !== "sent") {
      return res.status(400).json({ message: "Invalid direction" });
    }

    let validatedRole: "client" | "provider" | undefined = undefined;
    if (role) {
      if (role !== "client" && role !== "provider") {
        return res.status(400).json({ message: "Invalid role" });
      }
      validatedRole = role;
    }

    const reviews = await storage.getReviewsForUser(
      userId,
      direction,
      validatedRole
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Server error " });
  }
});

export default reviewsRouter;
