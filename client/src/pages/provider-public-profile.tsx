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

export default function ProviderPublicProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("about");
  
  const user = authManager.getUser();
  const providerId = params.id;

  const { data: provider, isLoading } = useQuery<ProviderWithDetails>({
    queryKey: ["/api/providers", providerId],
    queryFn: async () => {
      const response = await fetch(`/api/providers/${providerId}`);
      if (!response.ok) {
        throw new Error('Provider not found');
      }
      return response.json();
    },
    enabled: !!providerId,
  });

  const { data: reviews = [] } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/providers", provider?.userId, "reviews"],
    queryFn: async () => {
      // provider is guaranteed to be available here because of the `enabled` flag
      const response = await fetch(`/api/providers/${provider!.userId}/reviews`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!provider?.userId,
  });

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const isOwner = user && provider && user.id === provider.userId;

  if (isLoading) {
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

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Prestador não encontrado</h1>
              <p className="text-gray-600 mb-6">O prestador de serviço que você está procurando não foi encontrado.</p>
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

  // Calcular avaliação geral
  const averageRating = provider.averageRating || 0;
  const reviewCount = provider.reviewCount || 0;
  
  // Agrupar avaliações por serviço
  const reviewsByService = reviews.reduce((acc, review) => {
    const serviceName = provider.category.name;
    if (!acc[serviceName]) {
      acc[serviceName] = [];
    }
    acc[serviceName].push(review);
    return acc;
  }, {} as Record<string, ReviewWithUser[]>);

  // Calcular avaliação por serviço
  const serviceRatings = Object.entries(reviewsByService).map(([serviceName, serviceReviews]) => {
    const avgRating = serviceReviews.reduce((sum, review) => sum + review.rating, 0) / serviceReviews.length;
    return {
      serviceName,
      averageRating: avgRating,
      reviewCount: serviceReviews.length,
      reviews: serviceReviews
    };
  });

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
                  <i className={`${provider.category.icon} text-primary-600 text-3xl`}></i>
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{provider.user.name}</h1>
                  <p className="text-primary-600 font-semibold text-xl mb-3">{provider.category.name}</p>
                  
                  {/* Avaliação Geral */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center">
                      <Star className="w-6 h-6 text-yellow-500 fill-current mr-2" />
                      <span className="text-2xl font-bold text-gray-900">
                        {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
                      </span>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-medium">{reviewCount}</span> avaliações
                    </div>
                    {averageRating > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {averageRating >= 4.5 ? "Excelente" : 
                         averageRating >= 4.0 ? "Muito Bom" : 
                         averageRating >= 3.5 ? "Bom" : 
                         averageRating >= 3.0 ? "Regular" : "Baixo"}
                      </Badge>
                    )}
                  </div>

                  {/* Informações de Contato */}
                  <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-600">
                    {provider.user.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {provider.user.location}
                      </div>
                    )}
                    {provider.user.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {provider.user.phone}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {provider.user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col space-y-3 mt-6 lg:mt-0">
                {isOwner ? (
                  <Button 
                    onClick={() => setLocation('/provider-dashboard')}
                    className="w-full lg:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => setLocation(`/provider/${provider.id}`)}
                      className="w-full lg:w-auto"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Solicitar Serviço
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setLocation(`/provider-profile/${provider.id}`)}
                      className="w-full lg:w-auto"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Conteúdo Principal */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="about">Perfil</TabsTrigger>
                  <TabsTrigger value="services">Serviços</TabsTrigger>
                  <TabsTrigger value="reviews">Avaliações</TabsTrigger>
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
                      {provider.user.bio ? (
                        <p className="text-gray-700 leading-relaxed">{provider.user.bio}</p>
                      ) : (
                        <p className="text-gray-500 italic">Nenhuma informação biográfica disponível.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Experiência */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Experiência
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {provider.experience ? (
                        <p className="text-gray-700 leading-relaxed">{provider.experience}</p>
                      ) : (
                        <p className="text-gray-500 italic">Nenhuma informação de experiência disponível.</p>
                      )}
                    </CardContent>
                  </Card>


                </TabsContent>

                {/* Aba Serviços */}
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
                        {/* Serviço principal baseado na categoria */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{provider.category.name}</h4>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                              <span className="font-medium">
                                {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
                              </span>
                              <span className="text-gray-600 ml-1">
                                ({reviewCount} avaliações)
                              </span>
                            </div>
                          </div>
                          
                          {/* Descrição do serviço */}
                          {provider.description && (
                            <p className="text-gray-700 mb-4">{provider.description}</p>
                          )}
                          
                          {/* Tipos de Preço */}
                          <div className="space-y-3 mb-4">
                            <h5 className="font-medium text-gray-900">Tipos de Preço:</h5>
                            <div className="flex flex-wrap gap-2">
                              {(provider.pricingTypes as string[])?.map((type: string) => (
                                <Badge key={type} variant="outline" className="capitalize">
                                  {type === 'hourly' ? 'Por Hora' : 
                                   type === 'daily' ? 'Por Dia' : 'Preço Fixo'}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Preços Mínimos */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {provider.minHourlyRate && (
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-primary-600">
                                  R$ {parseFloat(provider.minHourlyRate.toString()).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">por hora</div>
                              </div>
                            )}
                            {provider.minDailyRate && (
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-primary-600">
                                  R$ {parseFloat(provider.minDailyRate.toString()).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">por dia</div>
                              </div>
                            )}
                            {provider.minFixedRate && (
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-primary-600">
                                  R$ {parseFloat(provider.minFixedRate.toString()).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">preço fixo</div>
                              </div>
                              )}
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <Button onClick={() => setLocation(`/provider/${provider.id}`)}>
                              Visualizar Serviço
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Avaliações */}
                <TabsContent value="reviews" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Todas as Avaliações ({reviewCount})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reviews.length > 0 ? (
                        <div className="space-y-6">
                          {reviews.map((review) => (
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
                                  <Badge variant="secondary" className="mb-2">{review.serviceRequest.category.name}</Badge>
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
                          <p className="text-gray-600">Nenhuma avaliação disponível ainda.</p>
                          <p className="text-sm text-gray-500">Seja o primeiro a avaliar este profissional!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Estatísticas */}
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Avaliação Geral</span>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                      <span className="font-semibold">
                        {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total de Avaliações</span>
                    <span className="font-semibold">{reviewCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Serviços Oferecidos</span>
                    <span className="font-semibold">{serviceRatings.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Informações de Contato */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {provider.user.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{provider.user.location}</span>
                    </div>
                  )}
                  {provider.user.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{provider.user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <span>{provider.user.email}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Méritos */}
              <Card>
                <CardHeader>
                  <CardTitle>Méritos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      Conquistas serão exibidas aqui conforme você atinge marcos importantes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
