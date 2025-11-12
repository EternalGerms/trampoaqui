import type { Request, Response } from "express";
import { handleRouteError } from "./errorHandler";

/**
 * Wrapper for async route handlers to automatically handle errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response, next: Function) => {
    try {
      await fn(req, res);
    } catch (error) {
      handleRouteError(error, res);
    }
  };
}

