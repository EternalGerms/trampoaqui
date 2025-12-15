import type { Request, Response } from "express";
import { handleRouteError } from "./errorHandler";

/**
 * Envoltório para handlers assíncronos tratarem erros automaticamente.
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

