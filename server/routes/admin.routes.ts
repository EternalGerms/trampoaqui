import {
  users,
  serviceProviders,
  serviceRequests,
  serviceCategories,
} from "@shared/schema";
import { sql, desc, eq, or } from "drizzle-orm";
import { Router, Request, Response } from "express";
import { db } from "server/db";
import {
  authenticateToken,
  authenticateAdmin,
} from "server/middlewares/auth.middleware";
import { storage } from "server/storage";

const adminRouter = Router();

// Admin routes
adminRouter.get(
  "/dashboard",
  authenticateToken,
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      // Status do Sistema
      const totalUsers = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const totalProviders = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceProviders);
      const totalRequests = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceRequests);
      const totalCategories = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceCategories);

      // Visualizar usuários criados recentemente
      const recentUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10);

      // Visualizar serviços recentes
      const recentRequests = await db
        .select({
          request: serviceRequests,
          client: users,
          provider: serviceProviders,
          category: serviceCategories,
        })
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.clientId, users.id))
        .leftJoin(
          serviceProviders,
          eq(serviceRequests.providerId, serviceProviders.id)
        )
        .leftJoin(
          serviceCategories,
          eq(serviceProviders.categoryId, serviceCategories.id)
        )
        .orderBy(desc(serviceRequests.createdAt))
        .limit(10);

      res.json({
        statistics: {
          totalUsers: totalUsers[0]?.count || 0,
          totalProviders: totalProviders[0]?.count || 0,
          totalRequests: totalRequests[0]?.count || 0,
          totalCategories: totalCategories[0]?.count || 0,
        },
        recentUsers,
        recentRequests: recentRequests.map((r) => ({
          ...r.request,
          client: r.client,
          provider: r.provider ? { ...r.provider, category: r.category } : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Ver todos os usuários
adminRouter.get(
  "/users",
  authenticateToken,
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, search = "" } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const usersList = await db
        .select()
        .from(users)
        .where(
          search
            ? or(
                sql`${users.name} ILIKE ${"%" + search + "%"}`,
                sql`${users.email} ILIKE ${"%" + search + "%"}`
              )
            : undefined
        )
        .orderBy(desc(users.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Ver todas as solicitações de serviço
adminRouter.get(
  "/requests",
  authenticateToken,
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, status = "" } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const requests = await db
        .select({
          request: serviceRequests,
          client: users,
          provider: serviceProviders,
          category: serviceCategories,
        })
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.clientId, users.id))
        .leftJoin(
          serviceProviders,
          eq(serviceRequests.providerId, serviceProviders.id)
        )
        .leftJoin(
          serviceCategories,
          eq(serviceProviders.categoryId, serviceCategories.id)
        )
        .where(
          status ? eq(serviceRequests.status, status as string) : undefined
        )
        .orderBy(desc(serviceRequests.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json(
        requests.map((r) => ({
          ...r.request,
          client: r.client,
          provider: r.provider ? { ...r.provider, category: r.category } : null,
        }))
      );
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Dar cargo de admin para um usuário
adminRouter.put(
  "/users/:id/admin",
  authenticateToken,
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { isAdmin } = req.body;
      const user = await storage.updateUser(req.params.id, { isAdmin });
      res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Deletar usuário
adminRouter.delete(
  "/users/:id",
  authenticateToken,
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user!.userId) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default adminRouter;
