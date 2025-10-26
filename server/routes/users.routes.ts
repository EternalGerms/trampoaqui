import { Router, Request, Response } from "express";
import { authenticateToken } from "server/middlewares/auth.middleware";
import { storage } from "server/storage";

const usersRouter = Router();

// Get current user's provider profiles with details
usersRouter.get(
  "/me/providers",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const providers = await storage.getServiceProvidersByUserIdWithDetails(
        req.user!.userId
      );
      res.json(providers);
    } catch (error) {
      console.error("Error fetching user's providers:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get user by ID
usersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      experience: user.experience,
      isProviderEnabled: user.isProviderEnabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Balance routes
usersRouter.get(
  "/me/balance",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const balance = await storage.getUserBalance(req.user!.userId);
      res.json({ balance });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default usersRouter;
