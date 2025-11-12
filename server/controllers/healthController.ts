import type { Express, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export function registerHealthRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Test simple database connection
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({ 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

