import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar, 
  Edit,
  Clock,
  DollarSign,
  CheckCircle,
  Award,
  User,
  Briefcase,
  Star as StarIcon
} from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { authManager } from "@/lib/auth";
import { ServiceProvider, User as UserType, ServiceCategory, Review } from "@shared/schema";
import EditProfileDialog from "@/components/edit-profile-dialog";

type ProviderWithDetails = ServiceProvider & {
  user: UserType;
  category: ServiceCategory;
  averageRating: number;
  reviewCount: number;
};

type ReviewWithUser = Review & {
  reviewer: UserType;
  serviceRequest: {
    category: {
      name: string;
    };
  };
};

export default function Profile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("about");
  const [clientReviewsView, setClientReviewsView] = useState<"received" | "sent">("received");
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  
  const currentUser = authManager.getUser();
  const userId = params.id;

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('User not found');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch all providers for this user
  const { data: allProviders = [] } = useQuery<ProviderWithDetails[]>({
    queryKey: ["/api/providers"],
    queryFn: async () => {
      const response = await fetch(`/api/providers`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter providers for this specific user
  const userProviders = allProviders.filter(p => p.userId === user?.id);

  // Fetch reviews received by this user as client (only from requests where user was client)
  const { data: clientReviewsReceived = [] } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/reviews/client/received", userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/client/user/${userId}/received`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch reviews sent by this user as client (only from requests where user was client)
  const { data: clientReviewsSent = [] } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/reviews/client/sent", userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/client/user/${userId}/sent`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch reviews received by this user as provider (only from requests where user was provider)
  const { data: providerReviewsReceived = [] } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/reviews/provider/received-specific", userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/provider/user/${userId}/received-specific`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && user?.isProviderEnabled,
  });

  // Fetch reviews for each service provider
  const { data: serviceReviews = {} } = useQuery<Record<string, ReviewWithUser[]>>({
    queryKey: ["/api/reviews/service-providers", userProviders.map(s => s.id)],
    queryFn: async () => {
      const reviewsMap: Record<string, ReviewWithUser[]> = {};
      
      // Fetch reviews for each service provider
      await Promise.all(
        userProviders.map(async (service) => {
          try {
            const response = await fetch(`/api/reviews/service-provider/${service.id}`);
            if (response.ok) {
              reviewsMap[service.id] = await response.json();
            } else {
              reviewsMap[service.id] = [];
            }
          } catch (error) {
            console.error(`Error fetching reviews for service ${service.id}:`, error);
            reviewsMap[service.id] = [];
          }
        })
      );
      
      return reviewsMap;
    },
    enabled: userProviders.length > 0,
  });

  const isOwner = currentUser && user && currentUser.id === user.id;
  const isProvider = user?.isProviderEnabled && userProviders.length > 0;

  // Function to calculate client ratings (reviews received as client)
  const getClientRating = () => {
    if (clientReviewsReceived.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = clientReviewsReceived.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / clientReviewsReceived.length;

    return {
      averageRating: averageRating,
      reviewCount: clientReviewsReceived.length
    };
  };

  // Function to calculate provider ratings (reviews received as provider)
  const getProviderRating = () => {
    if (providerReviewsReceived.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = providerReviewsReceived.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / providerReviewsReceived.length;

    return {
      averageRating: averageRating,
      reviewCount: providerReviewsReceived.length
    };
  };

  // Function to calculate ratings for a specific service
  const getServiceSpecificRating = (serviceId: string) => {
    const service = userProviders.find(s => s.id === serviceId);
    if (!service) {
      return { averageRating: 0, reviewCount: 0 };
    }

    // Get reviews specific to this service
    const serviceSpecificReviews = serviceReviews[service.id] || [];
    
    // Filter out reviews from the provider themselves
    const filteredServiceReviews = serviceSpecificReviews.filter(
      (review) => review.reviewerId !== user?.id
    );

    if (filteredServiceReviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = filteredServiceReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / filteredServiceReviews.length;

    return {
      averageRating: averageRating,
      reviewCount: filteredServiceReviews.length
    };
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Usuário não encontrado</h1>
              <p className="text-gray-600 mb-6">O usuário que você está procurando não foi encontrado.</p>
              <Button onClick={() => setLocation('/services')}>
                Voltar para Profissionais
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get ratings
  const clientRating = getClientRating();
  const providerRating = getProviderRating();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header do Perfil */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-12 h-12 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                  
                  {/* Avaliações */}
                  <div className="space-y-3 mb-4">
                    {/* Avaliação como Cliente */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                        <span className="text-lg font-bold text-gray-900">
                          {clientRating.averageRating > 0 ? clientRating.averageRating.toFixed(1) : "N/A"}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">{clientRating.reviewCount}</span> avaliações como cliente
                      </div>
                      {clientRating.averageRating > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Cliente
                        </Badge>
                      )}
                    </div>

                    {/* Avaliação como Prestador (se for prestador) */}
                    {isProvider && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                          <span className="text-lg font-bold text-gray-900">
                            {providerRating.averageRating > 0 ? providerRating.averageRating.toFixed(1) : "N/A"}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">{providerRating.reviewCount}</span> avaliações como prestador
                        </div>
                        {providerRating.averageRating > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Prestador
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Informações de Contato */}
                  <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-600">
                    {user.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {user.location}
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col space-y-3 mt-6 lg:mt-0">
                {isOwner ? (
                  <Button 
                    onClick={() => setShowEditProfileDialog(true)}
                    className="w-full lg:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setLocation(`/messages/${user.id}`)}
                    className="w-full lg:w-auto"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Conteúdo Principal */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className={`grid w-full ${isProvider ? 'grid-cols-4' : 'grid-cols-2'}`}>
                  <TabsTrigger value="about">Perfil</TabsTrigger>
                  {isProvider && <TabsTrigger value="services">Serviços</TabsTrigger>}
                  <TabsTrigger value="client-reviews">Avaliações (Cliente)</TabsTrigger>
                  {isProvider && <TabsTrigger value="provider-reviews">Avaliações (Prestador)</TabsTrigger>}
                </TabsList>

                {/* Aba Perfil */}
                <TabsContent value="about" className="space-y-6">
                  {/* Bio */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Sobre Mim
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {user.bio ? (
                        <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                      ) : (
                        <p className="text-gray-500 italic">Nenhuma informação biográfica disponível.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Experiência (apenas para prestadores) */}
                  {isProvider && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Experiência
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {user.experience ? (
                          <p className="text-gray-700 leading-relaxed">{user.experience}</p>
                        ) : (
                          <p className="text-gray-500 italic">Nenhuma informação de experiência disponível.</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Aba Serviços (apenas para prestadores) */}
                {isProvider && (
                  <TabsContent value="services" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          Serviços Oferecidos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {userProviders.length > 0 ? (
                            userProviders.map((service) => (
                              <div key={service.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900">{service.category.name}</h4>
                                  <div className="flex items-center">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                                    {(() => {
                                      const serviceRating = getServiceSpecificRating(service.id);
                                      return (
                                        <>
                                          <span className="font-medium">
                                            {serviceRating.averageRating > 0 ? serviceRating.averageRating.toFixed(1) : "N/A"}
                                          </span>
                                          <span className="text-gray-600 ml-1">
                                            ({serviceRating.reviewCount} avaliações)
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Descrição do serviço */}
                                {service.description && (
                                  <p className="text-gray-700 mb-4">{service.description}</p>
                                )}
                                
                                {/* Tipos de Preço */}
                                <div className="space-y-3 mb-4">
                                  <h5 className="font-medium text-gray-900">Tipos de Preço:</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {(service.pricingTypes as string[])?.map((type: string) => (
                                      <Badge key={type} variant="outline" className="capitalize">
                                        {type === 'hourly' ? 'Por Hora' : 
                                         type === 'daily' ? 'Por Dia' : 'Preço Fixo'}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* Preços Mínimos */}
                                <div className="space-y-2">
                                  {service.minHourlyRate && (
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-sm font-medium text-gray-700">Hora Mínima:</span>
                                      <span className="text-sm font-bold text-primary-600">
                                        R$ {parseFloat(service.minHourlyRate.toString()).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {service.minDailyRate && (
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-sm font-medium text-gray-700">Diária Mínima:</span>
                                      <span className="text-sm font-bold text-primary-600">
                                        R$ {parseFloat(service.minDailyRate.toString()).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {service.minFixedRate && (
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-sm font-medium text-gray-700">Orçamento Mínimo:</span>
                                      <span className="text-sm font-bold text-primary-600">
                                        R$ {parseFloat(service.minFixedRate.toString()).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-4 flex justify-end">
                                  <Button onClick={() => setLocation(`/provider/${service.id}`)}>
                                    Visualizar Serviço
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-600">Nenhum serviço disponível no momento.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Aba Avaliações como Cliente */}
                <TabsContent value="client-reviews" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Star className="w-5 h-5" />
                          Avaliações como Cliente
                        </CardTitle>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setClientReviewsView("received")}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              clientReviewsView === "received" 
                                ? "bg-white text-primary-600 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Recebidas ({clientRating.reviewCount})
                          </button>
                          <button
                            onClick={() => setClientReviewsView("sent")}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              clientReviewsView === "sent" 
                                ? "bg-white text-primary-600 shadow-sm" 
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Enviadas ({clientReviewsSent.length})
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {clientReviewsView === "received" ? (
                        // Avaliações Recebidas
                        clientReviewsReceived.length > 0 ? (
                          <div className="space-y-4">
                            {clientReviewsReceived.map((review) => (
                              <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-medium text-gray-900">{review.reviewer.name}</h4>
                                      <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                          <StarIcon
                                            key={i}
                                            className={`w-4 h-4 ${
                                              i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <Badge variant="secondary" className="mb-2 text-xs">
                                      {review.serviceRequest.category.name}
                                    </Badge>
                                    {review.comment && (
                                      <p className="text-gray-700">{review.comment}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">Nenhuma avaliação recebida ainda.</p>
                            <p className="text-sm text-gray-500">Avaliações de prestadores aparecerão aqui após a conclusão de serviços.</p>
                          </div>
                        )
                      ) : (
                        // Avaliações Enviadas
                        clientReviewsSent.length > 0 ? (
                          <div className="space-y-4">
                            {clientReviewsSent.map((review) => (
                              <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-medium text-gray-900">{review.reviewer.name}</h4>
                                      <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                          <StarIcon
                                            key={i}
                                            className={`w-4 h-4 ${
                                              i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <Badge variant="secondary" className="mb-2 text-xs">
                                      {review.serviceRequest.category.name}
                                    </Badge>
                                    {review.comment && (
                                      <p className="text-gray-700">{review.comment}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">Nenhuma avaliação enviada ainda.</p>
                            <p className="text-sm text-gray-500">Suas avaliações para prestadores aparecerão aqui.</p>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Avaliações como Prestador (apenas para prestadores) */}
                {isProvider && (
                  <TabsContent value="provider-reviews" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="w-5 h-5" />
                          Avaliações como Prestador ({providerRating.reviewCount})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {providerReviewsReceived.length > 0 ? (
                          <div className="space-y-6">
                            {providerReviewsReceived.map((review) => (
                              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                                <div className="flex items-start space-x-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-primary-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-medium text-gray-900">{review.reviewer.name}</h4>
                                      <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                          <StarIcon
                                            key={i}
                                            className={`w-4 h-4 ${
                                              i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <Badge variant="secondary" className="mb-2 text-xs">
                                      {review.serviceRequest.category.name}
                                    </Badge>
                                    {review.comment && (
                                      <p className="text-gray-700">{review.comment}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">Nenhuma avaliação como prestador ainda.</p>
                            <p className="text-sm text-gray-500">Seja o primeiro a receber avaliações como prestador!</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Informações de Contato */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{user.email}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Méritos */}
              <Card>
                <CardHeader>
                  <CardTitle>Méritos</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.emailVerified ? (
                    <div className="flex items-center space-x-3 text-green-600">
                      <CheckCircle className="w-6 h-6" />
                      <div className="flex flex-col">
                        <span className="font-semibold">Conta Verificada</span>
                        <span className="text-sm text-gray-500">O e-mail deste usuário foi verificado.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        Conquistas serão exibidas aqui conforme você atinge marcos importantes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Edit Profile Dialog */}
      {isOwner && user && (
        <EditProfileDialog
          user={user}
          isOpen={showEditProfileDialog}
          onOpenChange={setShowEditProfileDialog}
        />
      )}
    </div>
  );
}
