import type { Response } from "express";
import { ZodError } from "zod";
import { createLogger } from "./logger.js";

const logger = createLogger("errorHandler");

/**
 * Handle route errors consistently
 * - ZodError → 400 with validation details
 * - Database errors (object with 'code' property) → 400
 * - Other errors → 500
 */
export function handleRouteError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    logger.error("Validation error", {
      type: "ZodError",
      errors: error.flatten(),
      issues: error.issues,
    });
    return res.status(400).json({ message: "Invalid input data", details: error.flatten() });
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    logger.error("Database error", {
      type: "DatabaseError",
      error,
      code: (error as any).code,
      message: (error as any).message,
      stack: (error as Error).stack,
    });
    return res.status(400).json({ message: "Database error occurred" });
  }
  
  logger.error("Unexpected error", {
    type: "UnexpectedError",
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return res.status(500).json({ message: "Internal server error" });
}

