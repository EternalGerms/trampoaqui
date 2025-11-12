import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  cpf: text("cpf").notNull().unique(),
  birthDate: timestamp("birth_date").notNull(),
  isProviderEnabled: boolean("is_provider_enabled").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  // Provider profile fields
  bio: text("bio"), // About me section
  experience: text("experience"), // Professional experience
  location: text("location"), // Service location
  // Address fields
  cep: text("cep"),
  city: text("city"),
  state: text("state"),
  street: text("street"),
  neighborhood: text("neighborhood"),
  number: text("number"),
  hasNumber: boolean("has_number").default(true),
  complement: text("complement"),
  // Balance field for providers
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  slug: text("slug").notNull().unique(),
});

export const serviceProviders = pgTable("service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  categoryId: varchar("category_id").notNull().references(() => serviceCategories.id),
  description: text("description").notNull(),
  pricingTypes: jsonb("pricing_types").notNull(), // ['hourly', 'daily', 'fixed']
  minHourlyRate: decimal("min_hourly_rate", { precision: 10, scale: 2 }),
  minDailyRate: decimal("min_daily_rate", { precision: 10, scale: 2 }),
  minFixedRate: decimal("min_fixed_rate", { precision: 10, scale: 2 }),
  experience: text("experience"),
  location: text("location").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  availability: jsonb("availability"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  providerId: varchar("provider_id").notNull().references(() => serviceProviders.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'negotiating', 'accepted', 'payment_pending', 'completed', 'cancelled'
  pricingType: text("pricing_type").notNull(), // 'hourly', 'daily', 'fixed'
  proposedPrice: decimal("proposed_price", { precision: 10, scale: 2 }),
  proposedHours: integer("proposed_hours"), // Para serviços por hora
  proposedDays: integer("proposed_days"), // Para serviços diários
  scheduledDate: timestamp("scheduled_date"),
  dailySessions: jsonb("daily_sessions").default([]), // Array de dias para serviços diários
  negotiationHistory: jsonb("negotiation_history").default([]), // Array de contra-propostas
  clientCompletedAt: timestamp("client_completed_at"), // Quando o cliente marcou como concluído
  providerCompletedAt: timestamp("provider_completed_at"), // Quando o prestador marcou como concluído
  paymentMethod: text("payment_method"), // 'boleto', 'pix', 'credit_card'
  paymentCompletedAt: timestamp("payment_completed_at"), // Quando o pagamento foi realizado
  balanceAddedAt: timestamp("balance_added_at"), // Quando o saldo foi adicionado ao prestador
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const negotiations = pgTable("negotiations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => serviceRequests.id),
  proposerId: varchar("proposer_id").notNull().references(() => users.id), // Quem fez a proposta
  pricingType: text("pricing_type").notNull(), // 'hourly', 'daily', 'fixed'
  proposedPrice: decimal("proposed_price", { precision: 10, scale: 2 }),
  proposedHours: integer("proposed_hours"),
  proposedDays: integer("proposed_days"),
  proposedDate: timestamp("proposed_date"),
  message: text("message").notNull(), // Motivo da alteração
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => serviceRequests.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  requestId: varchar("request_id").references(() => serviceRequests.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  serviceProvider: many(serviceProviders),
  clientRequests: many(serviceRequests, { relationName: "clientRequests" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  givenReviews: many(reviews, { relationName: "givenReviews" }),
  receivedReviews: many(reviews, { relationName: "receivedReviews" }),
  withdrawals: many(withdrawals),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  providers: many(serviceProviders),
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(users, {
    fields: [serviceProviders.userId],
    references: [users.id],
  }),
  category: one(serviceCategories, {
    fields: [serviceProviders.categoryId],
    references: [serviceCategories.id],
  }),
  requests: many(serviceRequests),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  client: one(users, {
    fields: [serviceRequests.clientId],
    references: [users.id],
    relationName: "clientRequests",
  }),
  provider: one(serviceProviders, {
    fields: [serviceRequests.providerId],
    references: [serviceProviders.id],
  }),
  reviews: many(reviews),
  messages: many(messages),
  negotiations: many(negotiations),
}));

export const negotiationsRelations = relations(negotiations, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [negotiations.requestId],
    references: [serviceRequests.id],
  }),
  proposer: one(users, {
    fields: [negotiations.proposerId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [reviews.requestId],
    references: [serviceRequests.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "givenReviews",
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: "receivedReviews",
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  request: one(serviceRequests, {
    fields: [messages.requestId],
    references: [serviceRequests.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isProviderEnabled: true, // This will be handled separately
}).extend({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF deve ter no máximo 14 caracteres"),
  birthDate: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }, "Usuário deve ter pelo menos 18 anos").transform((date) => new Date(date)),
});

// Provider profile update schema (for updating user profile info)
export const updateProviderProfileSchema = z.object({
  bio: z.string().optional(),
  experience: z.string().min(10, "Experiência deve ter pelo menos 10 caracteres"),
  location: z.string().min(3, "Localização deve ter pelo menos 3 caracteres").refine((location) => {
    // Validar formato Cidade - Estado
    const parts = location.split(' - ');
    if (parts.length === 2) {
      const city = parts[0].trim();
      const state = parts[1].trim();
      return city.length >= 2 && state.length >= 2;
    }
    return true; // Se não estiver no formato esperado, permitir
  }, "Formato recomendado: Cidade - Estado (ex: São Paulo - SP)"),
});

// User profile update schema (for updating user address and personal info)
export const updateUserProfileSchema = z.object({
  phone: z.string().optional(),
  cep: z.string().optional().refine((cep) => {
    if (!cep) return true;
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  }, "CEP deve ter 8 dígitos"),
  city: z.string().optional(),
  state: z.string().optional().refine((state) => {
    if (!state) return true;
    const validStates = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];
    return validStates.includes(state.toUpperCase());
  }, "Estado deve ser uma UF válida do Brasil"),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  bio: z.string().optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
});

// Change password schema
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Senha antiga é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Delete account schema
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória para confirmar a exclusão"),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
}).extend({
  pricingTypes: z.array(z.enum(['hourly', 'daily', 'fixed'])).min(1),
  location: z.string().min(3, "Localização deve ter pelo menos 3 caracteres").refine((location) => {
    // Validar formato Cidade - Estado
    const parts = location.split(' - ');
    if (parts.length === 2) {
      const city = parts[0].trim();
      const state = parts[1].trim();
      return city.length >= 2 && state.length >= 2;
    }
    return true; // Se não estiver no formato esperado, permitir
  }, "Formato recomendado: Cidade - Estado (ex: São Paulo - SP)"),
  minHourlyRate: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : val;
    }
    return val?.toString();
  }),
  minDailyRate: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : val;
    }
    return val?.toString();
  }),
  minFixedRate: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : val;
    }
    return val?.toString();
  }),
});



export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  proposedPrice: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : val;
    }
    return val?.toString();
  }),
  proposedHours: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : parseInt(val, 10);
    }
    return val;
  }),
  proposedDays: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : parseInt(val, 10);
    }
    return val;
  }),
  dailySessions: z.array(z.object({
    day: z.number(),
    scheduledDate: z.union([z.date(), z.string()]).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    scheduledTime: z.string(),
    clientCompleted: z.boolean(),
    providerCompleted: z.boolean(),
  })).optional(),
});

export const insertNegotiationSchema = createInsertSchema(negotiations).omit({
  id: true,
  createdAt: true,
}).extend({
  proposedPrice: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : val;
    }
    return val?.toString();
  }),
  proposedHours: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : parseInt(val, 10);
    }
    return val;
  }),
  proposedDays: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return val === '' ? undefined : parseInt(val, 10);
    }
    return val;
  }),
  proposedDate: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
});

export const updateServiceRequestSchema = insertServiceRequestSchema.partial().extend({
  clientCompletedAt: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  providerCompletedAt: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  paymentMethod: z.enum(['boleto', 'pix', 'credit_card']).optional(),
  paymentCompletedAt: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  balanceAddedAt: z.union([z.date(), z.string()]).optional().transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
}).extend({
  rating: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return parseInt(val, 10);
    }
    return val;
  }),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return val;
    }
    return val?.toString();
  }),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Negotiation = typeof negotiations.$inferSelect;
export type InsertNegotiation = z.infer<typeof insertNegotiationSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;

// Extended types for requests with related data
export type RequestWithClient = ServiceRequest & {
  client: User;
};

export type RequestWithProvider = ServiceRequest & {
  provider: ServiceProvider & {
    user: User;
    category: ServiceCategory;
  };
};

export type RequestWithNegotiations = ServiceRequest & {
  negotiations: (Negotiation & {
    proposer: User;
  })[];
};
