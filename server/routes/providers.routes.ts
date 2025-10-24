import { Router } from "express";
import { storage } from "server/storage";
import { Request, Response } from "express";
import { insertServiceProviderSchema } from "@shared/schema";
import { authenticateToken } from "server/middlewares/auth.middleware";
const providersRouter = Router();

providersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    let providers;
    if (categoryId) {
      providers = await storage.getServiceProvidersByCategory(
        categoryId as string
      );
    } else {
      providers = await storage.getAllServiceProviders();
    }

    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

providersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const provider = await storage.getServiceProviderWithDetails(req.params.id);
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

providersRouter.post(
  "/",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.isProviderEnabled) {
        return res
          .status(403)
          .json({ message: "Provider capability must be enabled first" });
      }

      const providerData = insertServiceProviderSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });

      // Check if user already has a service in this category
      const existingProvider =
        await storage.getServiceProviderByUserAndCategory(
          req.user.userId,
          providerData.categoryId
        );
      if (existingProvider) {
        return res.status(400).json({
          message:
            "Você já possui um serviço nesta categoria. Edite o existente ou escolha outra categoria.",
        });
      }

      const provider = await storage.createServiceProvider(providerData);
      res.json(provider);
    } catch (error) {
      console.error("Error creating provider:", error);
      res.status(400).json({
        message: "Invalid input data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

providersRouter.put(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Evita com que o usuário altere o ID do prestador
      const updateData = insertServiceProviderSchema
        .omit({ userId: true })
        .parse(req.body);
      const updatedProvider = await storage.updateServiceProvider(
        req.params.id,
        updateData
      );
      res.json(updatedProvider);
    } catch (error) {
      console.error("Error updating provider:", error);
      res.status(400).json({
        message: "Invalid input data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

providersRouter.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      if (provider.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check for active requests before deletion
      const activeRequests = await storage.getServiceRequestsByProvider(
        req.params.id
      );
      const hasActiveRequests = activeRequests.some(
        (request) =>
          request.status === "pending" ||
          request.status === "accepted" ||
          request.status === "negotiating"
      );

      if (hasActiveRequests) {
        return res.status(400).json({
          message:
            "Não é possível excluir o serviço com solicitações ativas. Finalize ou cancele as solicitações primeiro.",
        });
      }

      await storage.deleteServiceProvider(req.params.id);
      res.json({ message: "Provider deleted successfully" });
    } catch (error) {
      console.error("Error deleting provider:", error);
      res.status(500).json({
        message: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default providersRouter;
