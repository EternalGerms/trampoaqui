// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isProviderEnabled: boolean;
        isAdmin: boolean;
      };
    }
  }
}

export {};

