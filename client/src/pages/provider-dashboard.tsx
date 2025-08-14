import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  DollarSign,
  Briefcase
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

const counterProposalSchema = z.object({
  pricingType: z.enum(['hourly', 'daily', 'fixed']),
  proposedPrice: z.string().optional(),
  proposedHours: z.string().optional(),
  proposedDays: z.string().optional(),
  proposedDate: z.string().optional(),
  proposedTime: z.string().optional(),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
});

const reviewSchema = z.object({
  rating: z.string().min(1, "Avaliação é obrigatória"),
  comment: z.string().min(10, "Comentário deve ter pelo menos 10 caracteres"),
});

type UpdateProviderForm = z.infer<typeof updateProviderSchema>;
type CounterProposalForm = z.infer<typeof counterProposalSchema>;
type ReviewForm = z.infer<typeof reviewSchema>;

type ProviderWithDetails = ServiceProvider & { 
  user: { id: string; name: string; email: string; phone?: string };
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

type RequestWithClient = ServiceRequest & {
  client: { id: string; name: string; email: string };
  negotiations?: Array<{
    id: string;
    proposerId: string;
    pricingType: string;
    proposedPrice: string | null;
    proposedHours: number | null;
    proposedDays: number | null;
    proposedDate: Date | null;
    message: string;
    status: string;
    createdAt: Date;
    proposer: { name: string; email: string };
  }>;
};

type MessageWithSender = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string; email: string };
};

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingProfile, setEditingProfile] = useState(false);
  const [counterProposalRequestId, setCounterProposalRequestId] = useState<string | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);

  const user = authManager.getUser();

  const { data: allProviders } = useQuery<ProviderWithDetails[]>({
    queryKey: ["/api/providers"],
  });

  const userProviders = allProviders?.filter(p => p.userId === user?.id) || [];
  const provider = userProviders[0]; // For backward compatibility

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<RequestWithClient[]>({
    queryKey: ["/api/requests/provider"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages/received"],
  });

  const form = useForm<UpdateProviderForm>({
    resolver: zodResolver(updateProviderSchema),
    defaultValues: {
      categoryId: provider?.categoryId || "",
      description: provider?.description || "",
      pricingTypes: Array.isArray(provider?.pricingTypes) ? provider.pricingTypes : ["fixed"],
      minHourlyRate: provider?.minHourlyRate || "",
      minDailyRate: provider?.minDailyRate || "",
      minFixedRate: provider?.minFixedRate || "",
      experience: provider?.experience || "",
      location: provider?.location || "",
      isVerified: provider?.isVerified || false,
      availability: provider?.availability || {},
    },
  });

  const counterProposalForm = useForm<CounterProposalForm>({
    resolver: zodResolver(counterProposalSchema),
    defaultValues: {
      pricingType: "hourly",
      proposedPrice: "",
      proposedHours: "",
      proposedDays: "",
      proposedDate: "",
      proposedTime: "",
      message: "",
    },
  });

  const reviewForm = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: "",
      comment: "",
    },
  });

  // Reset form when provider data loads
  useEffect(() => {
    if (provider) {
      form.reset({
        categoryId: provider.categoryId,
        description: provider.description,
        pricingTypes: Array.isArray(provider.pricingTypes) ? provider.pricingTypes : ["fixed"],
        minHourlyRate: provider.minHourlyRate || "",
        minDailyRate: provider.minDailyRate || "",
        minFixedRate: provider.minFixedRate || "",
        experience: provider.experience || "",
        location: provider.location,
        availability: provider.availability || {},
      });
    }
  }, [provider, form]);

  const updateProviderMutation = useMutation({
    mutationFn: async (data: UpdateProviderForm) => {
      const response = await authenticatedRequest('PUT', `/api/providers/${provider?.id}`, {
        ...data,
        userId: user?.id,
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/requests/provider"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const createNegotiationMutation = useMutation({
    mutationFn: async (data: {
      requestId: string;
      pricingType: string;
      proposedPrice?: string;
      proposedHours?: number;
      proposedDays?: number;
      proposedDate?: Date;
      message: string;
    }) => {
      const response = await authenticatedRequest('POST', '/api/negotiations', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contra-proposta enviada!",
        description: "O cliente foi notificado sobre sua proposta.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/provider"] });
      setCounterProposalRequestId(null);
      counterProposalForm.reset();
    },
    onError: () => {
      toast({
        title: "Erro ao enviar contra-proposta",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const updateNegotiationStatusMutation = useMutation({
    mutationFn: async ({ negotiationId, status }: { negotiationId: string; status: 'accepted' | 'rejected' }) => {
      const response = await authenticatedRequest('PUT', `/api/negotiations/${negotiationId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status da negociação atualizado!",
        description: "O status foi alterado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/provider"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewForm) => {
      const payload = {
        requestId: reviewRequestId,
        revieweeId: revieweeId,
        rating: parseInt(data.rating),
        comment: data.comment,
      };
      
      const response = await authenticatedRequest('POST', '/api/reviews', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação enviada!",
        description: "Sua avaliação foi registrada com sucesso.",
      });
      setReviewRequestId(null);
      setRevieweeId(null);
      reviewForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/requests/provider"] });
    },
    onError: () => {
      toast({
        title: "Erro ao enviar avaliação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  // Redirect if not a provider (after all hooks)
  if (!user || !user.isProviderEnabled) {
    setLocation('/');
    return null;
  }

  // Check if provider profile exists
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
              <Button onClick={() => setLocation('/complete-profile')}>
                Criar Perfil de Profissional
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleUpdateProvider = (data: UpdateProviderForm) => {
    updateProviderMutation.mutate(data);
  };

  const handleUpdateRequestStatus = (requestId: string, status: string) => {
    updateRequestStatusMutation.mutate({ requestId, status });
  };

  const checkServiceDate = (request: RequestWithClient) => {
    if (request.scheduledDate) {
      const scheduledDate = new Date(request.scheduledDate);
      const now = new Date();
      return scheduledDate > now;
    }
    return false;
  };

  const formatDateTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCounterProposal = (data: CounterProposalForm) => {
    if (!counterProposalRequestId) return;
    
    const proposalData = {
      requestId: counterProposalRequestId,
      pricingType: data.pricingType,
      proposedPrice: data.proposedPrice || undefined,
      proposedHours: data.proposedHours ? parseInt(data.proposedHours) : undefined,
      proposedDays: data.proposedDays ? parseInt(data.proposedDays) : undefined,
      proposedDate: data.proposedDate && data.proposedTime ? 
        new Date(`${data.proposedDate}T${data.proposedTime}:00`) : 
        data.proposedDate ? new Date(data.proposedDate) : undefined,
      message: data.message,
    };

    createNegotiationMutation.mutate(proposalData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Aceito</Badge>;
      case 'pending_completion':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Clock className="w-3 h-3 mr-1" />Aguardando Confirmação</Badge>;
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

              {/* Multiple Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Meus Serviços
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => setLocation('/complete-profile')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      + Novo
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProviders.length > 0 ? (
                    <div className="space-y-3">
                      {userProviders.map((serviceProvider) => (
                        <div key={serviceProvider.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                <i className={`${serviceProvider.category?.icon || 'fas fa-briefcase'} text-primary-600`}></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{serviceProvider.category.name}</h4>
                                <p className="text-xs text-gray-600">{serviceProvider.location}</p>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                  <span>{serviceProvider.averageRating?.toFixed(1) || "0.0"} ({serviceProvider.reviewCount})</span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setLocation(`/provider/${serviceProvider.id}`)}
                              className="text-xs"
                            >
                              Ver
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">Nenhum serviço cadastrado</p>
                      <Button 
                        size="sm" 
                        onClick={() => setLocation('/complete-profile')}
                      >
                        Criar Serviço
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

              {/* Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Mensagens Recebidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.slice(0, 5).map((message) => (
                        <div key={message.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">{message.sender.name}</p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(message.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            {!message.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma mensagem ainda</p>
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setCounterProposalRequestId(request.id);
                                    counterProposalForm.reset();
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Contraproposta
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Fazer Contraproposta</DialogTitle>
                                  <DialogDescription>
                                    Envie uma contraproposta para o cliente com seus termos.
                                  </DialogDescription>
                                </DialogHeader>
                                <Form {...counterProposalForm}>
                                  <form onSubmit={counterProposalForm.handleSubmit(handleCounterProposal)} className="space-y-4">
                                    <FormField
                                      control={counterProposalForm.control}
                                      name="pricingType"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Tipo de Cobrança</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('hourly') && (
                                                <SelectItem value="hourly">Por Hora</SelectItem>
                                              )}
                                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('daily') && (
                                                <SelectItem value="daily">Por Dia</SelectItem>
                                              )}
                                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('fixed') && (
                                                <SelectItem value="fixed">Valor Fixo</SelectItem>
                                              )}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    {counterProposalForm.watch('pricingType') === 'hourly' && (
                                      <FormField
                                        control={counterProposalForm.control}
                                        name="proposedHours"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Horas Estimadas</FormLabel>
                                            <FormControl>
                                              <Input type="number" placeholder="Ex: 8" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    )}

                                    {counterProposalForm.watch('pricingType') === 'daily' && (
                                      <FormField
                                        control={counterProposalForm.control}
                                        name="proposedDays"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Dias Estimados</FormLabel>
                                            <FormControl>
                                              <Input type="number" placeholder="Ex: 2" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    )}

                                    <FormField
                                      control={counterProposalForm.control}
                                      name="proposedPrice"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Valor Proposto (R$)</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" placeholder="Ex: 150.00" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={counterProposalForm.control}
                                      name="proposedDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Data Proposta</FormLabel>
                                          <FormControl>
                                            <Input type="date" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={counterProposalForm.control}
                                      name="proposedTime"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Horário Proposto</FormLabel>
                                          <FormControl>
                                            <Input type="time" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={counterProposalForm.control}
                                      name="message"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Mensagem</FormLabel>
                                          <FormControl>
                                            <Textarea 
                                              placeholder="Explique sua proposta..."
                                              rows={3}
                                              {...field} 
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="flex gap-2">
                                      <Button 
                                        type="submit" 
                                        disabled={createNegotiationMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        {createNegotiationMutation.isPending ? "Enviando..." : "Enviar Proposta"}
                                      </Button>
                                    </div>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
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
                        
                        {(request.status === 'accepted' || request.status === 'pending_completion') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Marcar como Concluído
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Conclusão do Serviço</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {checkServiceDate(request) ? (
                                    <>
                                      Atenção: O serviço está agendado para <strong>{request.scheduledDate ? formatDateTime(request.scheduledDate) : ''}</strong>. 
                                      Você está marcando como concluído antes da data/horário agendado. 
                                      Tem certeza que deseja continuar?
                                    </>
                                  ) : (
                                    <>
                                      Você está prestes a marcar este serviço como concluído. 
                                      O cliente também precisará confirmar a conclusão para que o serviço seja finalizado.
                                    </>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Confirmar Conclusão
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        
                        {request.status === 'completed' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setReviewRequestId(request.id);
                                  setRevieweeId(request.client?.id || '');
                                  reviewForm.reset();
                                }}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Avaliar Cliente
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Avaliar Cliente</DialogTitle>
                                <DialogDescription>
                                  Compartilhe sua experiência com este cliente
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...reviewForm}>
                                <form onSubmit={reviewForm.handleSubmit((data) => createReviewMutation.mutate(data))} className="space-y-4">
                                  <FormField
                                    control={reviewForm.control}
                                    name="rating"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Avaliação</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Selecione uma avaliação" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="1">1 - Muito Ruim</SelectItem>
                                            <SelectItem value="2">2 - Ruim</SelectItem>
                                            <SelectItem value="3">3 - Regular</SelectItem>
                                            <SelectItem value="4">4 - Bom</SelectItem>
                                            <SelectItem value="5">5 - Excelente</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={reviewForm.control}
                                    name="comment"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Comentário</FormLabel>
                                        <FormControl>
                                          <Textarea 
                                            placeholder="Conte como foi trabalhar com este cliente..."
                                            rows={3}
                                            {...field} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex gap-2">
                                    <Button 
                                      type="submit" 
                                      disabled={createReviewMutation.isPending}
                                      className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                      {createReviewMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
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
                  <form onSubmit={form.handleSubmit(handleUpdateProvider)} className="space-y-6">
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
                        name="minHourlyRate"
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
