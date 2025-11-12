import type { Response } from "express";
import { ZodError } from "zod";

/**
 * Handle route errors consistently
 * - ZodError → 400 with validation details
 * - Database errors (object with 'code' property) → 400
 * - Other errors → 500
 */
export function handleRouteError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    console.error("Validation error:", error.flatten());
    return res.status(400).json({ message: "Invalid input data", details: error.flatten() });
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    console.error("Database error:", error);
    return res.status(400).json({ message: "Database error occurred" });
  }
  
  console.error("Unexpected error:", error);
  return res.status(500).json({ message: "Internal server error" });
}

