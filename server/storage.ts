import { 
  users, 
  serviceCategories, 
  serviceProviders, 
  serviceRequests, 
  reviews, 
  messages,
  type User, 
  type InsertUser,
  type ServiceCategory,
  type InsertServiceCategory,
  type ServiceProvider,
  type InsertServiceProvider,
  type ServiceRequest,
  type InsertServiceRequest,
  type Review,
  type InsertReview,
  type Message,
  type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, avg, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  enableProviderCapability(userId: string): Promise<User>;
  
  // Service Category operations
  getAllServiceCategories(): Promise<ServiceCategory[]>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  
  // Service Provider operations
  getServiceProvider(id: string): Promise<ServiceProvider | undefined>;
  getServiceProviderWithDetails(id: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number }) | undefined>;
  getServiceProviderByUserId(userId: string): Promise<ServiceProvider | undefined>;
  getServiceProvidersByCategory(categoryId: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]>;
  getAllServiceProviders(): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(id: string, provider: Partial<InsertServiceProvider>): Promise<ServiceProvider>;
  
  // Service Request operations
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByProvider(providerId: string): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, request: Partial<InsertServiceRequest>): Promise<ServiceRequest>;
  
  // Review operations
  getReviewsByProvider(providerId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Message operations
  getMessagesByRequest(requestId: string): Promise<Message[]>;
  getConversation(senderId: string, receiverId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isProviderEnabled: false // All users start as clients
      })
      .returning();
    return user;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async enableProviderCapability(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isProviderEnabled: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories);
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db
      .insert(serviceCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getServiceProvider(id: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
    return provider || undefined;
  }

  async getServiceProviderWithDetails(id: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number }) | undefined> {
    const result = await db
      .select({
        provider: serviceProviders,
        user: users,
        category: serviceCategories,
        averageRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .leftJoin(reviews, eq(reviews.revieweeId, users.id))
      .where(eq(serviceProviders.id, id))
      .groupBy(serviceProviders.id, users.id, serviceCategories.id);

    if (!result.length || !result[0].provider || !result[0].user || !result[0].category) {
      return undefined;
    }

    const row = result[0];
    return {
      ...row.provider,
      user: row.user,
      category: row.category,
      averageRating: parseFloat(String(row.averageRating || "0")),
      reviewCount: parseInt(String(row.reviewCount || "0")),
    };
  }

  async getServiceProviderByUserId(userId: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId));
    return provider || undefined;
  }

  async getServiceProvidersByCategory(categoryId: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]> {
    const result = await db
      .select({
        provider: serviceProviders,
        user: users,
        category: serviceCategories,
        averageRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .leftJoin(reviews, eq(reviews.revieweeId, users.id))
      .where(eq(serviceProviders.categoryId, categoryId))
      .groupBy(serviceProviders.id, users.id, serviceCategories.id);

    return result.map(row => ({
      ...row.provider,
      user: row.user!,
      category: row.category!,
      averageRating: parseFloat(String(row.averageRating || "0")),
      reviewCount: parseInt(String(row.reviewCount || "0")),
    }));
  }

  async getAllServiceProviders(): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]> {
    const result = await db
      .select({
        provider: serviceProviders,
        user: users,
        category: serviceCategories,
        averageRating: avg(reviews.rating),
        reviewCount: count(reviews.id),
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .leftJoin(reviews, eq(reviews.revieweeId, users.id))
      .groupBy(serviceProviders.id, users.id, serviceCategories.id);

    return result.map(row => ({
      ...row.provider,
      user: row.user!,
      category: row.category!,
      averageRating: parseFloat(String(row.averageRating || "0")),
      reviewCount: parseInt(String(row.reviewCount || "0")),
    }));
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const [newProvider] = await db
      .insert(serviceProviders)
      .values(provider)
      .returning();
    return newProvider;
  }

  async updateServiceProvider(id: string, provider: Partial<InsertServiceProvider>): Promise<ServiceProvider> {
    const [updatedProvider] = await db
      .update(serviceProviders)
      .set(provider)
      .where(eq(serviceProviders.id, id))
      .returning();
    return updatedProvider;
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request || undefined;
  }

  async getServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]> {
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.clientId, clientId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByProvider(providerId: string): Promise<ServiceRequest[]> {
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.providerId, providerId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [newRequest] = await db
      .insert(serviceRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateServiceRequest(id: string, request: Partial<InsertServiceRequest>): Promise<ServiceRequest> {
    const [updatedRequest] = await db
      .update(serviceRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async getReviewsByProvider(providerId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.revieweeId, providerId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review)
      .returning();
    return newReview;
  }

  async getMessagesByRequest(requestId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.requestId, requestId))
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(senderId: string, receiverId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id));
  }
}

export const storage = new DatabaseStorage();
