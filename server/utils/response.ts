import type { User } from "@shared/schema";

/**
 * Format user response with basic fields (for authentication responses)
 */
export function formatUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isProviderEnabled: user.isProviderEnabled,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
  };
}

/**
 * Format user response with full profile data (for profile endpoints)
 */
export function formatUserResponseFull(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isProviderEnabled: user.isProviderEnabled,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    bio: user.bio,
    experience: user.experience,
    location: user.location,
    phone: user.phone,
    cep: user.cep,
    city: user.city,
    state: user.state,
    street: user.street,
    neighborhood: user.neighborhood,
    number: user.number,
    complement: user.complement,
  };
}

/**
 * Format user response for provider profile (includes provider-specific fields)
 */
export function formatUserResponseProvider(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isProviderEnabled: user.isProviderEnabled,
    bio: user.bio,
    experience: user.experience,
    location: user.location,
    city: user.city,
    state: user.state,
  };
}

/**
 * Format user response for public profile (includes all fields except sensitive data)
 */
export function formatUserResponsePublic(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    experience: user.experience,
    isProviderEnabled: user.isProviderEnabled,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    cep: user.cep,
    city: user.city,
    state: user.state,
    street: user.street,
    neighborhood: user.neighborhood,
    number: user.number,
    complement: user.complement,
    createdAt: user.createdAt,
  };
}

