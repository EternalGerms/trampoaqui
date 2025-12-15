import type { User } from "@shared/schema";

/**
 * Formata resposta de usuário com campos básicos (usado em autenticação).
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
 * Formata resposta de usuário com dados completos de perfil.
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
 * Formata resposta de usuário para perfil de prestador.
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
 * Formata resposta de usuário para perfil público (sem dados sensíveis).
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

