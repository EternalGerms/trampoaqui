import { 
  users, 
  serviceCategories, 
  serviceProviders, 
  serviceRequests, 
  reviews, 
  messages,
  negotiations,
  withdrawals,
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
  type InsertMessage,
  type Negotiation,
  type InsertNegotiation,
  type Withdrawal,
  type InsertWithdrawal
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, avg, count, or, gte, lte } from "drizzle-orm";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("storage");

export interface IStorage {
  // Operações de usuário
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByCPF(cpf: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  updateUserProfile(userId: string, profile: { 
    bio?: string; 
    experience?: string; 
    location?: string;
    phone?: string;
    cep?: string;
    city?: string;
    state?: string;
    street?: string;
    neighborhood?: string;
    number?: string;
    complement?: string;
  }): Promise<User>;
  enableProviderCapability(userId: string): Promise<User>;
  
  // Operações de categorias de serviço
  getAllServiceCategories(): Promise<ServiceCategory[]>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  
  // Operações de prestadores de serviço
  getServiceProvider(id: string): Promise<ServiceProvider | undefined>;
  getServiceProviderWithDetails(id: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number }) | undefined>;
  getServiceProvidersByUserIdWithDetails(userId: string): Promise<(ServiceProvider & { category: ServiceCategory; averageRating: number; reviewCount: number; })[]>;
  getServiceProviderByUserId(userId: string): Promise<ServiceProvider | undefined>;
  getServiceProviderByUserAndCategory(userId: string, categoryId: string): Promise<ServiceProvider | undefined>;
  getServiceProvidersByCategory(categoryId: string): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]>;
  getAllServiceProviders(): Promise<(ServiceProvider & { user: User; category: ServiceCategory; averageRating: number; reviewCount: number })[]>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(id: string, provider: Partial<InsertServiceProvider>): Promise<ServiceProvider>;
  deleteServiceProvider(id: string): Promise<void>;
  
  // Operações de solicitações de serviço
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByClientWithNegotiations(clientId: string): Promise<(ServiceRequest & { 
    provider: ServiceProvider & { user: User };
    negotiations: (Negotiation & { proposer: User })[];
    reviews: Review[];
  })[]>;
  getServiceRequestsByProvider(providerId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByProviderWithClient(providerId: string): Promise<(ServiceRequest & { client: User })[]>;
  getServiceRequestsByProviderWithNegotiations(providerId: string): Promise<(ServiceRequest & { 
    client: User;
    negotiations: (Negotiation & { proposer: User })[];
    reviews: Review[];
  })[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, request: Partial<InsertServiceRequest>): Promise<ServiceRequest>;
  updateRequestStatus(requestId: string, status: string): Promise<void>;
  
  // Operações de avaliações
  getReviewsByProvider(providerId: string): Promise<(Review & { reviewer: User })[]>;
  getReviewsByProviderUser(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByServiceProvider(serviceProviderId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByUserReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByUserSent(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByUserAsClientReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByUserAsClientSent(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  getReviewsByUserAsProviderReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Operações de mensagens
  getMessagesByRequest(requestId: string): Promise<Message[]>;
  getConversation(senderId: string, receiverId: string): Promise<Message[]>;
  getReceivedMessages(userId: string): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<void>;

  // Operações de negociações
  createNegotiation(negotiation: InsertNegotiation): Promise<Negotiation>;
  updateNegotiationStatus(negotiationId: string, status: 'accepted' | 'rejected' | 'counter_proposed'): Promise<void>;
  getNegotiationById(negotiationId: string): Promise<Negotiation | undefined>;
  getNegotiationsByRequest(requestId: string): Promise<(Negotiation & { proposer: User })[]>;

  // Operações de pagamento
  updateServiceRequestPayment(requestId: string, paymentMethod: string): Promise<ServiceRequest>;
  completeServiceRequestPayment(requestId: string): Promise<ServiceRequest>;

  // Operações de saldo
  getUserBalance(userId: string): Promise<number>;
  updateUserBalance(userId: string, amount: number): Promise<User>;
  addToUserBalance(userId: string, amount: number): Promise<User>;
  subtractFromUserBalance(userId: string, amount: number): Promise<User>;

  // Operações de saque
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawalsByUser(userId: string): Promise<Withdrawal[]>;
  updateWithdrawalStatus(withdrawalId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Withdrawal>;
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

  async getUserByCPF(cpf: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.cpf, cpf));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      logger.error("Error creating user in database", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Lançar o erro novamente para que a rota possa capturá-lo e enviar uma resposta 500
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserProfile(userId: string, profile: { 
    bio?: string; 
    experience?: string; 
    location?: string;
    phone?: string;
    cep?: string;
    city?: string;
    state?: string;
    street?: string;
    neighborhood?: string;
    number?: string;
    complement?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set(profile)
      .where(eq(users.id, userId))
      .returning();
    return user;
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
    const reviewsSubQuery = db
      .select({
        providerId: serviceRequests.providerId,
        avgRating: avg(reviews.rating).as('avg_rating'),
        reviewCount: count(reviews.id).as('review_count'),
      })
      .from(reviews)
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .groupBy(serviceRequests.providerId)
      .as('reviews_sub');

    const result = await db
      .select({
        provider: serviceProviders,
        user: users,
        category: serviceCategories,
        averageRating: reviewsSubQuery.avgRating,
        reviewCount: reviewsSubQuery.reviewCount,
      })
      .from(serviceProviders)
      .leftJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .leftJoin(reviewsSubQuery, eq(serviceProviders.id, reviewsSubQuery.providerId))
      .where(eq(serviceProviders.id, id));

    if (!result.length || !result[0].provider || !result[0].user || !result[0].category) {
      return undefined;
    }

    const row = result[0];
    return {
      ...row.provider,
      user: row.user!,
      category: row.category!,
      averageRating: parseFloat(String(row.averageRating || "0")),
      reviewCount: parseInt(String(row.reviewCount || "0")),
    };
  }

  async getServiceProvidersByUserIdWithDetails(userId: string): Promise<(ServiceProvider & { category: ServiceCategory; averageRating: number; reviewCount: number; })[]> {
    const reviewsSubQuery = db
      .select({
        providerId: serviceRequests.providerId,
        avgRating: avg(reviews.rating).as('avg_rating'),
        reviewCount: count(reviews.id).as('review_count'),
      })
      .from(reviews)
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .groupBy(serviceRequests.providerId)
      .as('reviews_sub');

    const result = await db
      .select({
        provider: serviceProviders,
        category: serviceCategories,
        averageRating: reviewsSubQuery.avgRating,
        reviewCount: reviewsSubQuery.reviewCount,
      })
      .from(serviceProviders)
      .leftJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .leftJoin(reviewsSubQuery, eq(serviceProviders.id, reviewsSubQuery.providerId))
      .where(eq(serviceProviders.userId, userId));

    return result.map(row => ({
      ...row.provider,
      category: row.category!,
      averageRating: parseFloat(String(row.averageRating || "0")),
      reviewCount: parseInt(String(row.reviewCount || "0")),
    }));
  }

  async getServiceProviderByUserId(userId: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId));
    return provider || undefined;
  }

  async getServiceProviderByUserAndCategory(userId: string, categoryId: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select()
      .from(serviceProviders)
      .where(and(eq(serviceProviders.userId, userId), eq(serviceProviders.categoryId, categoryId)));
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

  async deleteServiceProvider(id: string): Promise<void> {
    await db.delete(serviceProviders).where(eq(serviceProviders.id, id));
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

  async getServiceRequestsByClientWithNegotiations(clientId: string): Promise<(ServiceRequest & { 
    provider: ServiceProvider & { user: User };
    negotiations: (Negotiation & { proposer: User })[];
    reviews: Review[];
  })[]> {
    const rows = await db
      .select()
      .from(serviceRequests)
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(users, eq(serviceProviders.userId, users.id))
      .leftJoin(negotiations, eq(negotiations.requestId, serviceRequests.id))
      .leftJoin(reviews, eq(reviews.requestId, serviceRequests.id))
      .where(eq(serviceRequests.clientId, clientId))
      .orderBy(desc(serviceRequests.createdAt), desc(negotiations.createdAt));

    const requestsMap = new Map<string, any>();

    for (const row of rows) {
      const { service_requests: request, service_providers: provider, users: providerUser, negotiations: negotiation, reviews: review } = row;
      if (!requestsMap.has(request.id)) {
        requestsMap.set(request.id, {
          ...request,
          provider: {
            ...provider,
            user: providerUser,
          },
          negotiations: [],
          reviews: [],
        });
      }

      const existingRequest = requestsMap.get(request.id)!;

      if (negotiation && !existingRequest.negotiations.some((n: any) => n.id === negotiation.id)) {
        // Sem dados do proponente aqui; buscamos depois ou ajustamos a query para incluir users.
        existingRequest.negotiations.push(negotiation);
      }
      
      if (review && !existingRequest.reviews.some((r: any) => r.id === review.id)) {
        existingRequest.reviews.push(review);
      }
    }
    
    const finalRequests = Array.from(requestsMap.values());
    
    // Busca proponentes das negociações (ainda N+1, mas melhor que na query principal)
    for (const request of finalRequests) {
        if (request.negotiations.length > 0) {
            const proposerIds = request.negotiations.map((n: Negotiation) => n.proposerId);
            const proposers = await db.select().from(users).where(or(...proposerIds.map((id: string) => eq(users.id, id))));
            const proposersMap = new Map(proposers.map(p => [p.id, p]));
            request.negotiations = request.negotiations.map((n: Negotiation) => ({
                ...n,
                proposer: proposersMap.get(n.proposerId),
            }));
        }
    }

    return finalRequests;
  }

  async getServiceRequestsByProvider(providerId: string): Promise<ServiceRequest[]> {
    return db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.providerId, providerId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByProviderWithClient(providerId: string): Promise<(ServiceRequest & { client: User })[]> {
    const result = await db
      .select({
        request: serviceRequests,
        client: users,
      })
      .from(serviceRequests)
      .innerJoin(users, eq(serviceRequests.clientId, users.id))
      .where(eq(serviceRequests.providerId, providerId))
      .orderBy(desc(serviceRequests.createdAt));

    return result.map(row => ({
      ...row.request,
      client: row.client,
    }));
  }

  async getServiceRequestsByProviderWithNegotiations(providerId: string): Promise<(ServiceRequest & { 
    client: User;
    negotiations: (Negotiation & { proposer: User })[];
    reviews: Review[];
  })[]> {
    const rows = await db
      .select()
      .from(serviceRequests)
      .innerJoin(users, eq(serviceRequests.clientId, users.id))
      .leftJoin(negotiations, eq(negotiations.requestId, serviceRequests.id))
      .leftJoin(reviews, eq(reviews.requestId, serviceRequests.id))
      .where(eq(serviceRequests.providerId, providerId))
      .orderBy(desc(serviceRequests.createdAt), desc(negotiations.createdAt));

      const requestsMap = new Map<string, any>();

      for (const row of rows) {
        const { service_requests: request, users: client, negotiations: negotiation, reviews: review } = row;
        if (!requestsMap.has(request.id)) {
          requestsMap.set(request.id, {
            ...request,
            client,
            negotiations: [],
            reviews: [],
          });
        }
  
        const existingRequest = requestsMap.get(request.id)!;
  
        if (negotiation && !existingRequest.negotiations.some((n: any) => n.id === negotiation.id)) {
          existingRequest.negotiations.push(negotiation);
        }
        
        if (review && !existingRequest.reviews.some((r: any) => r.id === review.id)) {
          existingRequest.reviews.push(review);
        }
      }
      
    const finalRequests = Array.from(requestsMap.values());
      
      // Busca proponentes das negociações
      for (const request of finalRequests) {
          if (request.negotiations.length > 0) {
              const proposerIds = request.negotiations.map((n: Negotiation) => n.proposerId);
              // Busca usuários cujo id está em proposerIds
              const proposers = await db.select().from(users).where(or(...proposerIds.map((id: string) => eq(users.id, id))));
              const proposersMap = new Map(proposers.map(p => [p.id, p]));
              request.negotiations = request.negotiations.map((n: Negotiation) => ({
                  ...n,
                  proposer: proposersMap.get(n.proposerId),
              }));
          }
      }
  
      return finalRequests;
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

  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    await db.update(serviceRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(serviceRequests.id, requestId));
  }

  async getReviewsByProvider(serviceProviderId: string): Promise<(Review & { reviewer: User })[]> {
    const results = await db
      .select({
        review: reviews,
        reviewer: users,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .where(eq(serviceRequests.providerId, serviceProviderId))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.review,
      reviewer: r.reviewer,
    }));
  }

  async getReviewsByProviderUser(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(eq(reviews.revieweeId, userId)) // Filtra corretamente pela pessoa avaliada
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByServiceProvider(serviceProviderId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(eq(serviceRequests.providerId, serviceProviderId))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByUserReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByUserSent(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(eq(reviews.reviewerId, userId))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByUserAsClientReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(
        and(
          eq(reviews.revieweeId, userId), // Usuário foi avaliado
          eq(serviceRequests.clientId, userId) // Usuário era o cliente na solicitação
        )
      )
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByUserAsClientSent(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(
        and(
          eq(reviews.reviewerId, userId), // Usuário fez a avaliação
          eq(serviceRequests.clientId, userId) // Usuário era o cliente na solicitação
        )
      )
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
  }

  async getReviewsByUserAsProviderReceived(userId: string): Promise<(Review & { reviewer: User, serviceRequest: ServiceRequest & { category: ServiceCategory } })[]> {
    const results = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(serviceRequests, eq(reviews.requestId, serviceRequests.id))
      .innerJoin(serviceProviders, eq(serviceRequests.providerId, serviceProviders.id))
      .innerJoin(serviceCategories, eq(serviceProviders.categoryId, serviceCategories.id))
      .where(
        and(
          eq(reviews.revieweeId, userId), // Usuário foi avaliado
          eq(serviceProviders.userId, userId) // Usuário era o prestador na solicitação
        )
      )
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.reviews,
      reviewer: r.users,
      serviceRequest: {
        ...r.service_requests,
        category: r.service_categories,
      }
    }));
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

  async getReceivedMessages(userId: string): Promise<(Message & { sender: User })[]> {
    const result = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.receiverId, userId))
      .orderBy(desc(messages.createdAt));

    return result.map(row => ({
      ...row.message,
      sender: row.sender!,
    }));
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

  async createNegotiation(negotiation: InsertNegotiation): Promise<Negotiation> {
    const [result] = await db.insert(negotiations).values(negotiation).returning();
    return result;
  }

  async updateNegotiationStatus(negotiationId: string, status: 'accepted' | 'rejected' | 'counter_proposed'): Promise<void> {
    await db.update(negotiations)
      .set({ status })
      .where(eq(negotiations.id, negotiationId));
  }

  async getNegotiationById(negotiationId: string): Promise<Negotiation | undefined> {
    const [negotiation] = await db.select().from(negotiations).where(eq(negotiations.id, negotiationId));
    return negotiation || undefined;
  }

  async getNegotiationsByRequest(requestId: string): Promise<(Negotiation & { proposer: User })[]> {
    const result = await db
      .select({
        negotiation: negotiations,
        proposer: users,
      })
      .from(negotiations)
      .leftJoin(users, eq(negotiations.proposerId, users.id))
      .where(eq(negotiations.requestId, requestId))
      .orderBy(desc(negotiations.createdAt));

    return result.map(row => ({
      ...row.negotiation,
      proposer: row.proposer!,
    }));
  }

  // Operações de pagamento
  async updateServiceRequestPayment(requestId: string, paymentMethod: string): Promise<ServiceRequest> {
    const [result] = await db
      .update(serviceRequests)
      .set({ 
        paymentMethod,
        status: 'payment_pending'
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();
    return result;
  }

  async completeServiceRequestPayment(requestId: string): Promise<ServiceRequest> {
    const [result] = await db
      .update(serviceRequests)
      .set({ 
        paymentCompletedAt: new Date(),
        status: 'accepted'
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();
    return result;
  }

  // Operações de saldo
  async getUserBalance(userId: string): Promise<number> {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return parseFloat(user?.balance || '0');
  }

  async updateUserBalance(userId: string, amount: number): Promise<User> {
    const [result] = await db
      .update(users)
      .set({ balance: amount.toString() })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  async addToUserBalance(userId: string, amount: number): Promise<User> {
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = currentBalance + amount;
    return this.updateUserBalance(userId, newBalance);
  }

  async subtractFromUserBalance(userId: string, amount: number): Promise<User> {
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = Math.max(0, currentBalance - amount);
    return this.updateUserBalance(userId, newBalance);
  }

  // Operações de saque
  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [result] = await db.insert(withdrawals).values(withdrawal).returning();
    return result;
  }

  async getWithdrawalsByUser(userId: string): Promise<Withdrawal[]> {
    return await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawalStatus(withdrawalId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<Withdrawal> {
    const [result] = await db
      .update(withdrawals)
      .set({ status })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
