import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { sql, eq, desc, or } from "drizzle-orm";
import { users, serviceProviders, serviceRequests, serviceCategories } from "@shared/schema";
import { authenticateToken, authenticateAdmin } from "../middleware/auth";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("admin");

export function registerAdminRoutes(app: Express) {
  // Get admin dashboard data
  app.get("/api/admin/dashboard", authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
    try {
      // Get system statistics
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalProviders = await db.select({ count: sql<number>`count(*)` }).from(serviceProviders);
      const totalRequests = await db.select({ count: sql<number>`count(*)` }).from(serviceRequests);
      const totalCategories = await db.select({ count: sql<number>`count(*)` }).from(serviceCategories);
      
      // Get recent users
      const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(10);
      
      // Get recent service requests
      const recentRequests = await db
        .select({
          request: serviceRequests,
          client: users,
          provider: serviceProviders,
          category: serviceCategories
        })
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.clientId, users.id))
        .leftJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
        .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(10);

      res.json({
        statistics: {
          totalUsers: totalUsers[0]?.count || 0,
          totalProviders: totalProviders[0]?.count || 0,
          totalRequests: totalRequests[0]?.count || 0,
          totalCategories: totalCategories[0]?.count || 0
        },
        recentUsers,
        recentRequests: recentRequests.map(r => ({
          ...r.request,
          client: r.client,
          provider: r.provider ? { ...r.provider, category: r.category } : null
        }))
      });
    } catch (error) {
      logger.error("Error fetching admin dashboard data", {
        error,
        userId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const usersList = await db
        .select()
        .from(users)
        .where(
          search 
            ? or(
                sql`${users.name} ILIKE ${'%' + search + '%'}`,
                sql`${users.email} ILIKE ${'%' + search + '%'}`
              )
            : undefined
        )
        .orderBy(desc(users.createdAt))
        .limit(Number(limit))
        .offset(offset);
      
      res.json(usersList);
    } catch (error) {
      logger.error("Error fetching users", {
        error,
        userId: req.user?.userId,
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all service requests (admin only)
  app.get("/api/admin/requests", authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, status = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const requests = await db
        .select({
          request: serviceRequests,
          client: users,
          provider: serviceProviders,
          category: serviceCategories
        })
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.clientId, users.id))
        .leftJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
        .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
        .where(
          status ? eq(serviceRequests.status, status as string) : undefined
        )
        .orderBy(desc(serviceRequests.createdAt))
        .limit(Number(limit))
        .offset(offset);

      res.json(requests.map(r => ({
        ...r.request,
        client: r.client,
        provider: r.provider ? { ...r.provider, category: r.category } : null
      })));
    } catch (error) {
      logger.error("Error fetching requests", {
        error,
        userId: req.user?.userId,
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update user admin status
  app.put("/api/admin/users/:id/admin", authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { isAdmin } = req.body;
      const user = await storage.updateUser(req.params.id, { isAdmin });
      res.json(user);
    } catch (error) {
      logger.error("Error updating user admin status", {
        error,
        targetUserId: req.params.id,
        adminUserId: req.user?.userId,
        isAdmin: req.body.isAdmin,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", authenticateToken, authenticateAdmin, async (req: Request, res: Response) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user!.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error("Error deleting user", {
        error,
        targetUserId: req.params.id,
        adminUserId: req.user?.userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ message: "Server error" });
    }
  });
}

