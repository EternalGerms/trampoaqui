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
  // Provider profile fields
  bio: text("bio"), // About me section
  experience: text("experience"), // Professional experience
  location: text("location"), // Service location
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
  status: text("status").notNull().default('pending'), // 'pending', 'negotiating', 'accepted', 'completed', 'cancelled'
  pricingType: text("pricing_type").notNull(), // 'hourly', 'daily', 'fixed'
  proposedPrice: decimal("proposed_price", { precision: 10, scale: 2 }),
  proposedHours: integer("proposed_hours"), // Para serviços por hora
  proposedDays: integer("proposed_days"), // Para serviços diários
  scheduledDate: timestamp("scheduled_date"),
  negotiationHistory: jsonb("negotiation_history").default([]), // Array de contra-propostas
  clientCompletedAt: timestamp("client_completed_at"), // Quando o cliente marcou como concluído
  providerCompletedAt: timestamp("provider_completed_at"), // Quando o prestador marcou como concluído
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  serviceProvider: many(serviceProviders),
  clientRequests: many(serviceRequests, { relationName: "clientRequests" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  givenReviews: many(reviews, { relationName: "givenReviews" }),
  receivedReviews: many(reviews, { relationName: "receivedReviews" }),
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
  location: z.string().min(3, "Localização deve ter pelo menos 3 caracteres"),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
}).extend({
  pricingTypes: z.array(z.enum(['hourly', 'daily', 'fixed'])).min(1),
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
