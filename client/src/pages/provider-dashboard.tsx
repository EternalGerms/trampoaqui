import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Star, 
  Calendar, 
  MessageCircle, 
  Settings, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  DollarSign
} from "lucide-react";
import { authManager, authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ServiceProvider, 
  ServiceRequest, 
  ServiceCategory, 
  insertServiceProviderSchema 
} from "@shared/schema";

const updateProviderSchema = insertServiceProviderSchema.omit({ userId: true });

type UpdateProviderForm = z.infer<typeof updateProviderSchema>;

type ProviderWithDetails = ServiceProvider & { 
  user: { id: string; name: string; email: string; phone?: string };
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

type RequestWithClient = ServiceRequest & {
  client: { name: string; email: string };
};

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingProfile, setEditingProfile] = useState(false);

  const user = authManager.getUser();

  // Redirect if not a provider
  if (!user || !user.isProviderEnabled) {
    setLocation('/');
    return null;
  }

  const { data: allProviders } = useQuery<ProviderWithDetails[]>({
    queryKey: ["/api/providers"],
  });

  const provider = allProviders?.find(p => p.userId === user.id);

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<RequestWithClient[]>({
    queryKey: ["/api/requests"],
  });

  const form = useForm<UpdateProviderForm>({
    resolver: zodResolver(updateProviderSchema),
    defaultValues: {
      categoryId: provider?.categoryId || "",
      description: provider?.description || "",
      hourlyRate: provider?.hourlyRate || "",
      experience: provider?.experience || "",
      location: provider?.location || "",
      availability: provider?.availability || null,
    },
  });

  // Reset form when provider data loads
  useState(() => {
    if (provider) {
      form.reset({
        categoryId: provider.categoryId,
        description: provider.description,
        hourlyRate: provider.hourlyRate,
        experience: provider.experience || "",
        location: provider.location,
        availability: provider.availability,
      });
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: async (data: UpdateProviderForm) => {
      if (!provider) throw new Error("Provider not found");
      const response = await authenticatedRequest('PUT', `/api/providers/${provider.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await authenticatedRequest('PUT', `/api/requests/${requestId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado!",
        description: "O status da solicitação foi alterado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  if (providerLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil de Profissional Não Encontrado</h2>
              <p className="text-gray-600 mb-4">
                Você precisa criar um perfil de profissional para acessar o dashboard.
              </p>
              <Button onClick={() => setLocation('/register?type=provider')}>
                Criar Perfil de Profissional
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = (data: UpdateProviderForm) => {
    updateProviderMutation.mutate(data);
  };

  const handleUpdateRequestStatus = (requestId: string, status: string) => {
    updateRequestStatusMutation.mutate({ requestId, status });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Aceito</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const completedServices = requests.filter(r => r.status === 'completed').length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const monthlyEarnings = requests
    .filter(r => r.status === 'completed' && r.proposedPrice)
    .reduce((sum, r) => sum + parseFloat(r.proposedPrice || "0"), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard do Profissional</h1>
          <p className="text-gray-600">Gerencie seus serviços e perfil</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="requests">Solicitações</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="analytics">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Meu Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {provider ? (
                    <>
                      <div className="flex items-center mb-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                          <i className={`${provider.category?.icon || 'fas fa-user'} text-primary-600 text-xl`}></i>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{provider.user?.name}</p>
                          <p className="text-primary-600 text-sm">{provider.category?.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Avaliação:</span>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="font-medium">
                              {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Serviços realizados:</span>
                          <span className="font-medium">{completedServices}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ganhos este mês:</span>
                          <span className="font-medium text-green-600">R$ {monthlyEarnings.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Complete seu perfil para começar</p>
                      <Button onClick={() => setLocation('/complete-profile')} size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Completar Perfil
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Solicitações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {requestsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : requests.length > 0 ? (
                    <div className="space-y-3">
                      {requests.slice(0, 3).map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{request.client.name}</p>
                              <p className="text-gray-600 text-xs">{request.title}</p>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {request.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleUpdateRequestStatus(request.id, 'accepted')}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  Aceitar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleUpdateRequestStatus(request.id, 'cancelled')}
                                  className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700"
                                >
                                  Recusar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma solicitação ainda</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setEditingProfile(true)}
                    >
                      <Edit className="w-4 h-4 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Editar Perfil</p>
                        <p className="text-xs text-gray-600">Atualizar informações e preços</p>
                      </div>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/services')}
                    >
                      <Calendar className="w-4 h-4 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Ver Perfil Público</p>
                        <p className="text-xs text-gray-600">Como os clientes veem você</p>
                      </div>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <MessageCircle className="w-4 h-4 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Mensagens</p>
                        <p className="text-xs text-gray-600">{pendingRequests} não lidas</p>
                      </div>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                    >
                      <BarChart3 className="w-4 h-4 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Relatórios</p>
                        <p className="text-xs text-gray-600">Ver ganhos e estatísticas</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Solicitações</CardTitle>
                <CardDescription>
                  Gerencie suas solicitações de serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse border rounded-lg p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{request.title}</h4>
                            <p className="text-gray-600 text-sm">Cliente: {request.client.name}</p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <p className="text-gray-700 mb-3">{request.description}</p>
                        
                        <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                          <span>Solicitado em: {new Date(request.createdAt).toLocaleDateString('pt-BR')}</span>
                          {request.proposedPrice && (
                            <span className="font-medium">Orçamento: R$ {request.proposedPrice}</span>
                          )}
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateRequestStatus(request.id, 'accepted')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Aceitar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateRequestStatus(request.id, 'cancelled')}
                              className="text-red-600 hover:text-red-700"
                            >
                              Recusar
                            </Button>
                          </div>
                        )}
                        
                        {request.status === 'accepted' && (
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Marcar como Concluído
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma solicitação ainda
                    </h3>
                    <p className="text-gray-600">
                      Suas solicitações de serviço aparecerão aqui.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Editar Perfil Profissional</CardTitle>
                <CardDescription>
                  Mantenha suas informações atualizadas para atrair mais clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria de Serviço</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição dos Serviços</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva seus serviços e especialidades..."
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor por Hora (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="80.00" 
                                step="0.01"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Localização</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade/Bairro onde atende" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experiência</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva sua experiência profissional..."
                              rows={3}
                              {...field}
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button 
                        type="submit" 
                        disabled={updateProviderMutation.isPending}
                        className="bg-primary-600 hover:bg-primary-700"
                      >
                        {updateProviderMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => form.reset()}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{completedServices}</p>
                      <p className="text-sm text-gray-600">Serviços Concluídos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{pendingRequests}</p>
                      <p className="text-sm text-gray-600">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Star className="w-8 h-8 text-yellow-500 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">Avaliação Média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">R$ {monthlyEarnings.toFixed(0)}</p>
                      <p className="text-sm text-gray-600">Ganhos do Mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Atividades</CardTitle>
                <CardDescription>
                  Suas estatísticas de serviços prestados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total de Solicitações</span>
                    <span className="font-semibold">{requests.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Taxa de Aceitação</span>
                    <span className="font-semibold">
                      {requests.length > 0 
                        ? `${((requests.filter(r => r.status !== 'cancelled').length / requests.length) * 100).toFixed(1)}%`
                        : "N/A"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Serviços Concluídos</span>
                    <span className="font-semibold">{completedServices}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Valor Médio por Serviço</span>
                    <span className="font-semibold">
                      R$ {completedServices > 0 ? (monthlyEarnings / completedServices).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
}
