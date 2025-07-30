import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { 
  User, 
  Briefcase, 
  MessageSquare, 
  Star, 
  Calendar, 
  MapPin,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  proposedPrice: string;
  scheduledDate: string;
  createdAt: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authManager.getUser();

  // Get user's service requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests"],
    enabled: !!currentUser,
  });

  // Enable provider capability mutation
  const enableProviderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/enable-provider', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Update local auth state
      authManager.setAuth(data.token, data.user);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Recursos de prestador habilitados!",
        description: "Agora você pode criar seu perfil de prestador de serviços.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível habilitar os recursos de prestador.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Olá, {currentUser.name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie seus serviços e solicitações aqui.
            </p>
          </div>

          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">Minhas Solicitações</TabsTrigger>
              <TabsTrigger value="provider">Prestador de Serviços</TabsTrigger>
            </TabsList>

            {/* Service Requests Tab */}
            <TabsContent value="requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Solicitações de Serviço
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o status de suas solicitações de serviço
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {requestsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : requests.length > 0 ? (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{request.title}</h3>
                                <Badge className={getStatusColor(request.status)}>
                                  {getStatusText(request.status)}
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                {request.proposedPrice && (
                                  <span className="font-medium text-green-600">
                                    R$ {parseFloat(request.proposedPrice).toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                                {request.scheduledDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(request.scheduledDate).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Criado em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Mensagens
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação ainda</h3>
                      <p className="text-gray-600 mb-4">Você ainda não fez nenhuma solicitação de serviço.</p>
                      <Button onClick={() => setLocation('/services')}>
                        Buscar Profissionais
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Provider Tab */}
            <TabsContent value="provider" className="space-y-6">
              {!currentUser.isProviderEnabled ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Torne-se um Prestador de Serviços
                    </CardTitle>
                    <CardDescription>
                      Habilite recursos de prestador para oferecer seus serviços na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="font-semibold text-blue-900 mb-3">Benefícios de ser um prestador:</h3>
                      <ul className="space-y-2 text-blue-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Crie seu perfil profissional
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Receba solicitações de clientes
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Gerencie sua agenda e preços
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Construa sua reputação com avaliações
                        </li>
                      </ul>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button 
                        size="lg"
                        onClick={() => enableProviderMutation.mutate()}
                        disabled={enableProviderMutation.isPending}
                        className="px-8"
                      >
                        {enableProviderMutation.isPending ? (
                          "Habilitando..."
                        ) : (
                          <>
                            Habilitar Recursos de Prestador
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Recursos de Prestador Habilitados
                    </CardTitle>
                    <CardDescription>
                      Você já pode oferecer seus serviços na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800">
                        Seus recursos de prestador estão ativos! Complete seu perfil para começar a receber solicitações.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button onClick={() => setLocation('/provider-dashboard')}>
                        <Briefcase className="w-4 h-4 mr-2" />
                        Dashboard do Prestador
                      </Button>
                      <Button variant="outline" onClick={() => setLocation('/complete-profile')}>
                        <User className="w-4 h-4 mr-2" />
                        Completar Perfil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}