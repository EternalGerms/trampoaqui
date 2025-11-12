import jwt from "jsonwebtoken";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export function generateAuthToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      isProviderEnabled: user.isProviderEnabled, 
      isAdmin: user.isAdmin 
    },
    JWT_SECRET
  );
}

