import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  DollarSign,
  Briefcase,
  Check,
  X,
  BarChart,
  PieChart
} from "lucide-react";
import { authManager, authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/utils/format";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";
import ClientReviewDialog from "@/components/client-review-dialog";
import { 
  ServiceProvider, 
  ServiceRequest, 
  ServiceCategory, 
  insertServiceProviderSchema 
} from "@shared/schema";

const newServiceSchema = z.object({
  categoryId: z.string().min(1, "Selecione uma categoria"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  pricingTypes: z.array(z.string()).min(1, "Selecione pelo menos um tipo de preço"),
  minHourlyRate: z.string().optional(),
  minDailyRate: z.string().optional(),
  minFixedRate: z.string().optional(),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado (UF) é obrigatório").max(2, "Use a sigla do estado"),
});

const counterProposalSchema = z.object({
  pricingType: z.enum(['hourly', 'daily', 'fixed']),
  proposedPrice: z.string().optional(),
  proposedHours: z.string().optional(),
  proposedDays: z.string().optional(),
  proposedDate: z.string().optional(),
  proposedTime: z.string().optional(),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
}).refine((data) => {
  // Garante que ao menos um campo mudou em relação à solicitação original
  return true; // Validação final acontece no submit handler
}, {
  message: "Você deve alterar pelo menos um campo para enviar uma contraproposta",
}).refine((data) => {
  // Validar data/hora se fornecida
  if (data.proposedDate && data.proposedTime) {
    const dateTime = new Date(`${data.proposedDate}T${data.proposedTime}:00`);
    const now = new Date();
    return dateTime > now;
  }
  return true;
}, {
  message: "A data e horário devem ser no futuro",
  path: ["proposedDate"]
});

const reviewSchema = z.object({
  rating: z.string().min(1, "Avaliação é obrigatória"),
  comment: z.string().min(10, "Comentário deve ter pelo menos 10 caracteres"),
});

type NewServiceForm = z.infer<typeof newServiceSchema>;
type CounterProposalForm = z.infer<typeof counterProposalSchema>;
type ReviewForm = z.infer<typeof reviewSchema>;

type ProviderWithDetails = ServiceProvider & { 
  user: { id: string; name: string; email: string; phone?: string; bio?: string; city?: string; state?: string };
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

type DailySession = {
  day: number;
  scheduledDate: Date | string;
  scheduledTime: string;
  clientCompleted: boolean;
  providerCompleted: boolean;
};

type RequestWithClient = ServiceRequest & {
  client: { id: string; name: string; email: string };
  dailySessions?: DailySession[];
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
    proposer: { id: string; name: string; email: string };
  }>;
  reviews?: Array<{
    id: string;
    requestId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string | null;
    createdAt: Date;
  }>;
  clientCompletedAt?: string | null;
  providerCompletedAt?: string | null;
  paymentCompletedAt?: string | null;
};

type ClientRequest = ServiceRequest & {
  provider: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
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
    proposer: { id: string; name: string; email: string };
  }>;
  reviews?: Array<{
    id: string;
    requestId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string | null;
    createdAt: Date;
  }>;
};

 

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [counterProposalRequestId, setCounterProposalRequestId] = useState<string | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [originalRequestData, setOriginalRequestData] = useState<any>(null);
  const [clientReviewDialogOpen, setClientReviewDialogOpen] = useState(false);
  const [selectedRequestForClientReview, setSelectedRequestForClientReview] = useState<RequestWithClient | null>(null);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);

  const user = authManager.getUser();

  const { data: userProviders = [], isLoading: isLoadingProviders } = useQuery<any[]>({
    queryKey: ["/api/users/me/providers"],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/users/me/providers');
      return response.json();
    },
    enabled: !!user,
  });
  
  const provider = userProviders[0];

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/categories');
      return response.json();
    },
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<RequestWithClient[]>({
    queryKey: ["/api/requests/provider"],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/requests/provider');
      return response.json();
    },
    refetchOnWindowFocus: true,
    select: (data: any) => {
      if (Array.isArray(data)) return data as RequestWithClient[];
      if (data && Array.isArray(data.requests)) return data.requests as RequestWithClient[];
      return [] as RequestWithClient[];
    },
  });

  // Query separada para solicitações do usuário como cliente
  const { data: clientRequests = [], isLoading: clientRequestsLoading } = useQuery<ClientRequest[]>({
    queryKey: ["/api/requests"],
    enabled: !!user,
    select: (data: any) => {
      if (Array.isArray(data)) return data as ClientRequest[];
      if (data && Array.isArray(data.requests)) return data.requests as ClientRequest[];
      return [] as ClientRequest[];
    },
  });

  const newServiceForm = useForm<NewServiceForm>({
    resolver: zodResolver(newServiceSchema),
    defaultValues: {
      categoryId: "",
      description: "",
      pricingTypes: ["fixed"],
      minHourlyRate: "",
      minDailyRate: "",
      minFixedRate: "",
      city: provider?.user?.city || "",
      state: provider?.user?.state || "",
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

  const createNewServiceMutation = useMutationWithToast({
    mutationFn: async (data: NewServiceForm) => {
      const { city, state, ...serviceData } = data;
      const location = `${city} - ${state}`;
      const response = await authenticatedRequest('POST', `/api/providers`, {
        ...serviceData,
        location,
        userId: user?.id,
      });
      return response.json();
    },
    successMessage: "Novo serviço criado!",
    successDescription: "Seu serviço foi adicionado com sucesso.",
    errorMessage: "Erro ao criar serviço",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/providers"],
    onSuccess: () => {
      setShowNewServiceForm(false);
      newServiceForm.reset({
        categoryId: "",
        description: "",
        pricingTypes: ["fixed"],
        minHourlyRate: "",
        minDailyRate: "",
        minFixedRate: "",
        city: provider?.user?.city || "",
        state: provider?.user?.state || "",
      });
    },
  });

  const updateRequestStatusMutation = useMutationWithToast({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await authenticatedRequest('PUT', `/api/requests/${requestId}`, { status });
      return response.json();
    },
    successMessage: "Status atualizado!",
    successDescription: "O status da solicitação foi alterado.",
    errorMessage: "Erro ao atualizar status",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests/provider"],
  });

  const createNegotiationMutation = useMutationWithToast({
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
    successMessage: "Contra-proposta enviada!",
    successDescription: "O cliente foi notificado sobre sua proposta.",
    errorMessage: "Erro ao enviar contra-proposta",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests/provider"],
    onSuccess: () => {
      setCounterProposalRequestId(null);
      setOriginalRequestData(null);
      counterProposalForm.reset();
    },
  });

  const updateNegotiationStatusMutation = useMutationWithToast({
    mutationFn: async ({ negotiationId, status }: { negotiationId: string; status: 'accepted' | 'rejected' }) => {
      const response = await authenticatedRequest('PUT', `/api/negotiations/${negotiationId}/status`, { status });
      return response.json();
    },
    successMessage: "Status da negociação atualizado!",
    successDescription: "O status foi alterado com sucesso.",
    errorMessage: "Erro ao atualizar status",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests/provider"],
  });

  // Cria mutation para enviar avaliação
  const createReviewMutation = useMutationWithToast({
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
    successMessage: "Avaliação enviada!",
    successDescription: "Sua avaliação foi registrada com sucesso.",
    errorMessage: "Erro ao enviar avaliação",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests/provider"],
    onSuccess: () => {
      setReviewRequestId(null);
      setRevieweeId(null);
      reviewForm.reset();
    },
  });

  // Abre o diálogo de avaliação do cliente
  const handleOpenClientReviewDialog = (request: RequestWithClient) => {
    setSelectedRequestForClientReview(request);
    setClientReviewDialogOpen(true);
  };

  // Verifica se a negociação pode exibir ações (apenas a mais recente pendente de outro usuário)
  const canNegotiationHaveActions = (request: RequestWithClient, negotiation: any) => {
    if (!request.negotiations || request.negotiations.length === 0) return false;
    
    // Ordena pela negociação mais recente
    const allNegotiations = request.negotiations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (allNegotiations.length === 0) return false;
    
    const mostRecentNegotiation = allNegotiations[0];
    
    // Só a mais recente, pendente e não criada pelo prestador pode ter ações
    return negotiation.id === mostRecentNegotiation.id && 
           negotiation.proposer.id !== user?.id && 
           negotiation.status === 'pending';
  };

  // Calcula o status efetivo da negociação (Recusado/Substituída/Aguardando)
  const getEffectiveNegotiationStatus = (request: RequestWithClient, negotiation: any) => {
    // Se já aceito/recusado, retorna direto
    if (negotiation.status !== 'pending') {
      return negotiation.status;
    }

    // Guarda-chuva para array vazio
    if (!request.negotiations || request.negotiations.length === 0) {
      return 'pending';
    }

    // Negociação mais recente
    const allNegotiations = request.negotiations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (allNegotiations.length === 0) return 'pending';
    
    const mostRecentNegotiation = allNegotiations[0];
    
    // Se for a negociação mais recente
    if (negotiation.id === mostRecentNegotiation.id) {
      // Se for do prestador atual, mostra "Aguardando resposta"
      if (negotiation.proposer.id === user?.id) {
        return 'pending';
      }
      // Se for do cliente e ainda pendente, mantém "Aguardando resposta" (pode ter ações)
      if (negotiation.status === 'pending') {
        return 'pending';
      }
      // Se for do cliente mas já aceito/recusado, devolve status real
      return negotiation.status;
    }
    
    // Negociações antigas ficam como "Recusado" (há proposta mais recente)
    return 'rejected';
  };

  // Calcula o status efetivo da solicitação (Negociando/Cancelado/etc.)
  const getEffectiveRequestStatus = (request: RequestWithClient) => {
    // Se já estiver completed/accepted/payment_pending/cancelled, retorna direto
    if (['completed', 'accepted', 'payment_pending', 'cancelled'].includes(request.status)) {
      return request.status;
    }

    // Se estiver pending sem negociações, mantém pending
    if (request.status === 'pending' && (!request.negotiations || request.negotiations.length === 0)) {
      return 'pending';
    }

    // Em negotiating, verifica status da negociação mais recente
    if (request.status === 'negotiating' && request.negotiations && request.negotiations.length > 0) {
      const allNegotiations = request.negotiations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const mostRecentNegotiation = allNegotiations[0];
      
      // Se a mais recente foi rejeitada, cancela a solicitação
      if (mostRecentNegotiation.status === 'rejected') {
        return 'cancelled';
      }
      
      // Se a mais recente foi aceita, aceita a solicitação
      if (mostRecentNegotiation.status === 'accepted') {
        return 'accepted';
      }
      
      // Se a mais recente segue pendente, mantém negotiating
      if (mostRecentNegotiation.status === 'pending') {
        return 'negotiating';
      }
    }

    return request.status;
  };

  // Redireciona se não estiver logado
  if (!user) {
    setLocation('/login');
    return null;
  }

  // Redireciona se não for prestador habilitado
  if (!user.isProviderEnabled) {
    setLocation('/dashboard');
    return null;
  }


  const handleCreateNewService = (data: NewServiceForm) => {
    // Verificar se já existe um serviço na mesma categoria
    const existingService = userProviders.find(p => p.categoryId === data.categoryId);
    if (existingService) {
      toast({
        title: "Categoria já cadastrada",
        description: "Você já possui um serviço nesta categoria. Escolha outra categoria.",
        variant: "destructive",
      });
      return;
    }
    
    createNewServiceMutation.mutate(data);
  };

  const handleCancelNewService = () => {
    setShowNewServiceForm(false);
    newServiceForm.reset({
      categoryId: "",
      description: "",
      pricingTypes: ["fixed"],
      minHourlyRate: "",
      minDailyRate: "",
      minFixedRate: "",
      city: provider?.user?.city || "",
      state: provider?.user?.state || "",
    });
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


  const handleCounterProposal = (data: CounterProposalForm) => {
    if (!counterProposalRequestId || !originalRequestData) return;
    
    // Verifica se algum campo mudou em relação à solicitação original
    const hasChanges = 
      data.pricingType !== originalRequestData.pricingType ||
      data.proposedPrice !== (originalRequestData.proposedPrice || "") ||
      data.proposedHours !== (originalRequestData.proposedHours?.toString() || "") ||
      data.proposedDays !== (originalRequestData.proposedDays?.toString() || "") ||
      data.proposedDate !== (originalRequestData.scheduledDate ? 
        new Date(originalRequestData.scheduledDate).toISOString().split('T')[0] : "") ||
      data.proposedTime !== (originalRequestData.scheduledDate ? 
        new Date(originalRequestData.scheduledDate).toTimeString().slice(0, 5) : "");
    
    if (!hasChanges) {
      toast({
        title: "Nenhuma alteração detectada",
        description: "Você deve alterar pelo menos um campo para enviar uma contraproposta.",
        variant: "destructive",
      });
      return;
    }
    
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
      case 'negotiating':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><MessageCircle className="w-3 h-3 mr-1" />Negociando</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Aceito</Badge>;
      case 'payment_pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Aguardando Pagamento</Badge>;
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

  const completedServices = Array.isArray(requests) ? requests.filter(r => r.status === 'completed').length : 0;
  const pendingRequests = Array.isArray(requests) ? requests.filter(r => r.status === 'pending').length : 0;
  const monthlyEarnings = Array.isArray(requests) 
    ? requests
        .filter(r => r.status === 'completed' && r.proposedPrice)
        .reduce((sum, r) => {
          const serviceAmount = parseFloat(r.proposedPrice || "0");
          const platformFee = serviceAmount * 0.05; // Taxa da plataforma (5%)
          const providerAmount = serviceAmount - platformFee;
          return sum + providerAmount;
        }, 0)
    : 0;

  // Calcula avaliações do prestador, excluindo reviews feitas por ele mesmo
  const getCorrectRatingForProvider = (serviceProvider: any) => {
    if (!Array.isArray(requests) || requests.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    // Coleta todas as reviews das solicitações deste prestador
    const allReviews: any[] = [];
    
    requests.forEach(request => {
      if (request.providerId === serviceProvider.id && Array.isArray(request.reviews)) {
        // Inclui apenas reviews cujo avaliador não é o próprio prestador
        const clientReviews = request.reviews.filter(review => 
          review.reviewerId !== serviceProvider.userId && 
          review.revieweeId === serviceProvider.userId
        );
        allReviews.push(...clientReviews);
      }
    });

    if (allReviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;

    return {
      averageRating: averageRating,
      reviewCount: allReviews.length
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Gerencie seus serviços e solicitações</p>
        </div>

        <Tabs defaultValue="client" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Cliente</TabsTrigger>
            <TabsTrigger value="professional">Profissional</TabsTrigger>
          </TabsList>

          {/* Aba Cliente */}
          <TabsContent value="client">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Minhas Solicitações
                  </CardTitle>
                  <CardDescription>
                    Acompanhe suas solicitações de serviço como cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clientRequestsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(clientRequests) && clientRequests.length > 0 ? (
                    <div className="space-y-3">
                      {Array.isArray(clientRequests) ? clientRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{request.title}</p>
                              <p className="text-gray-600 text-xs">Profissional: {request.provider?.user?.name || 'N/A'}</p>
                            </div>
                            <Badge variant="secondary" className={
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'payment_pending' ? 'bg-orange-100 text-orange-800' :
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              request.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              request.status === 'negotiating' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'pending_completion' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }>
                              {request.status === 'pending' ? 'Pendente' :
                               request.status === 'accepted' ? 'Aceito' :
                               request.status === 'payment_pending' ? 'Aguardando Pagamento' :
                               request.status === 'completed' ? 'Concluído' :
                               request.status === 'cancelled' ? 'Cancelado' :
                               request.status === 'negotiating' ? 'Negociando' :
                               request.status === 'pending_completion' ? 'Aguardando Conclusão' : request.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Solicitado em: {formatDate(request.createdAt)}</span>
                            {request.proposedPrice && (
                              <span className="text-green-600 font-medium">R$ {request.proposedPrice}</span>
                            )}
                          </div>
                        </div>
                      )) : null}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhuma solicitação ainda
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Você ainda não fez nenhuma solicitação de serviço como cliente.
                      </p>
                      <Button onClick={() => setLocation('/services')}>
                        Buscar Serviços
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Profissional */}
          <TabsContent value="professional">
            <div className="space-y-6">
              {!provider ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil de Profissional Não Encontrado</h2>
                    <p className="text-gray-600 mb-4">
                      Você precisa criar um perfil de profissional para acessar as funcionalidades de prestador de serviços.
                    </p>
                    <Button onClick={() => setLocation('/complete-profile')}>
                      Criar Perfil de Profissional
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                      <TabsTrigger value="requests">Solicitações</TabsTrigger>
                      <TabsTrigger value="analytics">Relatórios</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                      <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-6">
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
                                  {/* Placeholder para foto de perfil */}
                                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4 border-2 border-gray-300">
                                    <User className="w-8 h-8 text-gray-400" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{user?.name}</p>
                                    <p className="text-primary-600 text-sm">
                                      {userProviders.length > 1 ? "Prestador de Serviços" : provider.category?.name}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Avaliação:</span>
                                    <div className="flex items-center">
                                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                      {(() => {
                                        const correctedRating = getCorrectRatingForProvider(provider);
                                        return (
                                          <span className="font-medium">
                                            {correctedRating.averageRating > 0 ? correctedRating.averageRating.toFixed(1) : "N/A"}
                                          </span>
                                        );
                                      })()}
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
                                
                                {/* Botão Ver Perfil */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <Button 
                                    onClick={() => setLocation(`/profile/${user?.id}`)}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                  >
                                    <User className="w-4 h-4 mr-2" />
                                    Ver Perfil
                                  </Button>
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
                              {!showNewServiceForm && (
                                <Button 
                                  size="sm" 
                                  onClick={() => setShowNewServiceForm(true)}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={userProviders.length >= categories.length}
                                >
                                  + Novo
                                </Button>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {/* Lista de serviços existentes */}
                            {userProviders.length > 0 ? (
                              <div className="space-y-3">
                                {userProviders.map((serviceProvider) => (
                                  <div 
                                    key={serviceProvider.id} 
                                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setLocation(`/provider/${serviceProvider.id}`)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                          <i className={`${serviceProvider.category?.icon || 'fas fa-briefcase'} text-primary-600`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-sm text-gray-900 mb-1">{serviceProvider.category.name}</h4>
                                          
                                          {/* Descrição truncada */}
                                          {serviceProvider.description && (
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                                              {serviceProvider.description.length > 120 
                                                ? `${serviceProvider.description.substring(0, 120)}...` 
                                                : serviceProvider.description
                                              }
                                            </p>
                                          )}
                                          
                                          <p className="text-xs text-gray-600 mb-1">{serviceProvider.location}</p>
                                          
                                          <div className="flex items-center text-xs text-gray-500">
                                            <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                            {(() => {
                                              const correctedRating = getCorrectRatingForProvider(serviceProvider);
                                              return (
                                                <span>
                                                  {correctedRating.averageRating > 0 ? correctedRating.averageRating.toFixed(1) : "0.0"} ({correctedRating.reviewCount})
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Botão de ação */}
                                      <div className="ml-3 flex-shrink-0">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLocation(`/provider/${serviceProvider.id}`);
                                          }}
                                          className="text-xs"
                                        >
                                          Ver
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-3">Nenhum serviço cadastrado</p>
                                {!showNewServiceForm && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => setShowNewServiceForm(true)}
                                  >
                                    Criar Serviço
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Mensagem quando todas as categorias estão ocupadas */}
                            {userProviders.length >= categories.length && userProviders.length > 0 && (
                              <div className="text-center py-4 text-sm text-gray-500">
                                Você já possui serviços em todas as categorias disponíveis.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        </div>
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
                          ) : Array.isArray(requests) && requests.length > 0 ? (
                            <div className="space-y-4">
                              {requests.map((request) => {
                                return (
                                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{request.title}</h4>
                                        <p className="text-gray-600 text-sm">Cliente: {request.client.name}</p>
                                      </div>
                                      {getStatusBadge(getEffectiveRequestStatus(request))}
                                    </div>
                                    
                                    <p className="text-gray-700 mb-3">{request.description}</p>
                                    
                                    {/* Enhanced request details */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">Tipo de Orçamento</p>
                                        <p className="text-sm font-medium text-gray-900 capitalize">
                                          {request.pricingType === 'hourly' ? 'Por Hora' : 
                                           request.pricingType === 'daily' ? 'Por Dia' : 'Valor Fixo'}
                                        </p>
                                      </div>
                                      
                                      {request.proposedPrice && (
                                        <>
                                          <div>
                                            <p className="text-xs text-gray-500 font-medium">Valor Final</p>
                                            <p className="text-sm font-medium text-green-600">
                                              {formatCurrency(request.proposedPrice)}
                                              {request.pricingType === 'hourly' && request.proposedHours && (
                                                <span className="text-xs text-gray-500 ml-1">
                                                  ({request.proposedHours}h)
                                                </span>
                                              )}
                                              {request.pricingType === 'daily' && request.proposedDays && (
                                                <span className="text-xs text-gray-500 ml-1">
                                                  ({request.proposedDays} dias)
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500 font-medium">Valor Líquido</p>
                                            <p className="text-sm font-medium text-blue-600">
                                              {formatCurrency(parseFloat(request.proposedPrice.toString()) * 0.95)}
                                              <span className="text-xs text-gray-500 ml-1 block">
                                                (taxa 5%)
                                              </span>
                                            </p>
                                          </div>
                                        </>
                                      )}
                                      
                                      {request.proposedHours && (
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">Tempo Estimado</p>
                                          <p className="text-sm font-medium text-gray-900">{request.proposedHours}h</p>
                                        </div>
                                      )}
                                      
                                      {request.proposedDays && (
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">Dias Estimados</p>
                                          <p className="text-sm font-medium text-gray-900">{request.proposedDays} dias</p>
                                        </div>
                                      )}
                                      
                                      {request.scheduledDate && (
                                        <div className="md:col-span-5">
                                          <p className="text-xs text-gray-500 font-medium">Data e Horário Agendado</p>
                                          <p className="text-sm font-medium text-blue-600">
                                            {formatDateTime(request.scheduledDate)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                                      <span>Solicitado em: {formatDate(request.createdAt)}</span>
                                    </div>
                                    
                                    {/* Daily Sessions for daily services */}
                                    {request.pricingType === 'daily' && request.dailySessions && Array.isArray(request.dailySessions) && request.dailySessions.length > 0 && (
                                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                                        <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          Dias do Serviço ({request.dailySessions.length})
                                        </h4>
                                        {/* Verificar se pode marcar dias como concluídos */}
                                        {(() => {
                                          const canMarkDays = (request.status === 'pending_completion' || 
                                                              (request.status === 'accepted' && request.paymentCompletedAt));
                                          
                                          if (!canMarkDays) {
                                            let message = "";
                                            if (request.status === 'pending') {
                                              message = "Aguarde aceitar a solicitação e o pagamento ser confirmado.";
                                            } else if (request.status === 'payment_pending') {
                                              message = "Aguarde o pagamento ser confirmado para marcar os dias como concluídos.";
                                            } else if (request.status === 'cancelled' || request.status === 'rejected') {
                                              message = "Este serviço foi cancelado ou recusado.";
                                            } else {
                                              // Para outros status que não permitem marcação, não exibir mensagem
                                              return null;
                                            }
                                            return (
                                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                                                <p className="text-sm text-yellow-800">{message}</p>
                                              </div>
                                            );
                                          }
                                          
                                          return null;
                                        })()}
                                        {(() => {
                                          const canMarkDays = (request.status === 'pending_completion' || 
                                                              (request.status === 'accepted' && request.paymentCompletedAt));
                                          
                                          return (
                                            <div className="space-y-2">
                                              {request.dailySessions.map((session, index) => {
                                                return (
                                                  <div key={index} className="bg-white border border-purple-200 rounded p-3">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                          <span className="font-medium text-sm">Dia {session.day}</span>
                                                          <span className="text-xs text-gray-500">
                                                            {formatDate(session.scheduledDate)} às {session.scheduledTime}
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-gray-600">
                                                          <span className={session.clientCompleted ? 'text-green-600' : 'text-gray-400'}>
                                                            Cliente: {session.clientCompleted ? '✓ Concluído' : 'Pendente'}
                                                          </span>
                                                          <span className={session.providerCompleted ? 'text-green-600' : 'text-gray-400'}>
                                                            Prestador: {session.providerCompleted ? '✓ Concluído' : 'Pendente'}
                                                          </span>
                                                        </div>
                                                      </div>
                                                      {!session.providerCompleted && canMarkDays && (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={async () => {
                                                            try {
                                                              const response = await authenticatedRequest('PUT', `/api/requests/${request.id}/daily-session/${index}`, {
                                                                completed: true
                                                              });
                                                              await response.json();
                                                              queryClient.invalidateQueries({ queryKey: ["/api/requests/provider"] });
                                                              toast({
                                                                title: "Dia marcado como concluído!",
                                                                description: "O cliente também precisa confirmar para finalizar este dia.",
                                                              });
                                                            } catch (error: any) {
                                                              toast({
                                                                title: "Erro",
                                                                description: error.message || "Não foi possível marcar o dia como concluído.",
                                                                variant: "destructive",
                                                              });
                                                            }
                                                          }}
                                                        >
                                                          Marcar como Concluído
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {/* Show negotiations if they exist */}
                                    {request.negotiations && request.negotiations.length > 0 && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                          <Clock className="w-4 h-4" />
                                          Negociações ({request.negotiations.length})
                                        </h4>
                                        <div className="space-y-2">
                                          {request.negotiations.map((negotiation) => (
                                            <div key={negotiation.id} className="bg-white border border-blue-200 rounded p-3">
                                              <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                  <p className="text-sm text-gray-700 mb-1">
                                                    <strong>Proposta de {negotiation.proposer.name}:</strong>
                                                  </p>
                                                  <p className="text-sm text-gray-600 mb-2">{negotiation.message}</p>
                                                  <div className="flex items-center gap-4 text-sm">
                                                    {negotiation.proposedPrice && (
                                                      <span className="flex items-center gap-1 text-green-600 font-medium">
                                                        <DollarSign className="w-3 h-3" />
                                                        {formatCurrency(negotiation.proposedPrice)}
                                                      </span>
                                                    )}
                                                    {negotiation.proposedHours && (
                                                      <span className="text-gray-600">
                                                        {negotiation.proposedHours} horas
                                                      </span>
                                                    )}
                                                    {negotiation.proposedDays && (
                                                      <span className="text-gray-600">
                                                        {negotiation.proposedDays} dias
                                                      </span>
                                                    )}
                                                    {negotiation.proposedDate && (
                                                      <span className="text-gray-600">
                                                        {formatDate(negotiation.proposedDate)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                {canNegotiationHaveActions(request, negotiation) && (
                                                  <div className="flex gap-2 ml-4">
                                                    <Button
                                                      size="sm"
                                                      onClick={() => updateNegotiationStatusMutation.mutate({ 
                                                        negotiationId: negotiation.id, 
                                                        status: 'accepted' 
                                                      })}
                                                      className="bg-green-600 hover:bg-green-700 text-white"
                                                      disabled={updateNegotiationStatusMutation.isPending}
                                                    >
                                                      <Check className="w-3 h-3 mr-1" />
                                                      Aceitar
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => updateNegotiationStatusMutation.mutate({ 
                                                        negotiationId: negotiation.id, 
                                                        status: 'rejected' 
                                                      })}
                                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                                      disabled={updateNegotiationStatusMutation.isPending}
                                                    >
                                                      <X className="w-3 h-3 mr-1" />
                                                      Recusar
                                                    </Button>
                                                    <Dialog>
                                                      <DialogTrigger asChild>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() => {
                                                            setCounterProposalRequestId(request.id);
                                                            setOriginalRequestData(negotiation);
                                                            // Pre-fill form with current negotiation data
                                                            counterProposalForm.reset({
                                                              pricingType: negotiation.pricingType as 'hourly' | 'daily' | 'fixed',
                                                              proposedPrice: negotiation.proposedPrice || "",
                                                              proposedHours: negotiation.proposedHours?.toString() || "",
                                                              proposedDays: negotiation.proposedDays?.toString() || "",
                                                              proposedDate: negotiation.proposedDate ? 
                                                                new Date(negotiation.proposedDate).toISOString().split('T')[0] : "",
                                                              proposedTime: negotiation.proposedDate ? 
                                                                new Date(negotiation.proposedDate).toTimeString().slice(0, 5) : "",
                                                              message: "",
                                                            });
                                                          }}
                                                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                                        >
                                                          <MessageCircle className="w-3 h-3 mr-1" />
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
                                                  </div>
                                                )}

                                                {/* Show effective status for all negotiations */}
                                                {(() => {
                                                  const effectiveStatus = getEffectiveNegotiationStatus(request, negotiation);
                                                  
                                                  if (effectiveStatus === 'pending') {
                                                    if (negotiation.proposer.id === user?.id) {
                                                      // Proposta pendente feita pelo próprio usuário
                                                      return (
                                                        <div className="ml-4">
                                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Aguardando resposta
                                                          </span>
                                                        </div>
                                                      );
                                                    } else {
                                                      // Proposta pendente do cliente (permite ações)
                                                      return null; // Botões de ação exibidos
                                                    }
                                                  } else if (effectiveStatus === 'rejected') {
                                                    // Exibe badge de recusado para propostas substituídas
                                                    return (
                                                      <Badge className="bg-red-100 text-red-800">
                                                        Recusado
                                                      </Badge>
                                                    );
                                                  } else if (effectiveStatus === 'accepted') {
                                                    return (
                                                      <Badge className="bg-green-100 text-green-800">
                                                        Aceito
                                                      </Badge>
                                                    );
                                                  }
                                                  
                                                  return null;
                                                })()}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {formatDate(negotiation.createdAt)} às {formatTime(negotiation.createdAt)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {request.status === 'pending' && (
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm"
                                          onClick={() => handleUpdateRequestStatus(request.id, 'payment_pending')}
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
                                                setOriginalRequestData(request); // Store original request data
                                                // Pre-fill form with current request data
                                                counterProposalForm.reset({
                                                  pricingType: request.pricingType as 'hourly' | 'daily' | 'fixed',
                                                  proposedPrice: request.proposedPrice || "",
                                                  proposedHours: request.proposedHours?.toString() || "",
                                                  proposedDays: request.proposedDays?.toString() || "",
                                                  proposedDate: request.scheduledDate ? 
                                                    new Date(request.scheduledDate).toISOString().split('T')[0] : "",
                                                  proposedTime: request.scheduledDate ? 
                                                    new Date(request.scheduledDate).toTimeString().slice(0, 5) : "",
                                                  message: "",
                                                });
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
                                    
                                    {/* Para serviços diários, não mostrar este botão - a conclusão é feita através das diárias individuais */}
                                    {(request.status === 'accepted' || request.status === 'pending_completion') && !request.providerCompletedAt && request.pricingType !== 'daily' && (
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
                                      (() => {
                                        const hasProviderReviewed = request.reviews?.some(review => review.reviewerId === user?.id);
                                        if (hasProviderReviewed) {
                                          return (
                                            <Button size="sm" disabled>
                                              <CheckCircle className="w-4 h-4 mr-2" />
                                              Cliente Avaliado
                                            </Button>
                                          );
                                        }
                                        return (
                                          <Button 
                                            size="sm"
                                            onClick={() => handleOpenClientReviewDialog(request)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            <Star className="w-4 h-4 mr-2" />
                                            Avaliar Cliente
                                          </Button>
                                        );
                                      })()
                                    )}
                                  </div>
                                );
                              })}
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

                    <TabsContent value="analytics">
                      {/* Cards de Estatísticas Principais */}
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
                                  {(() => {
                                    const correctedRating = getCorrectRatingForProvider(provider);
                                    return correctedRating.averageRating > 0 ? correctedRating.averageRating.toFixed(1) : "N/A";
                                  })()}
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

                      {/* Seção de Análise Financeira */}
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <DollarSign className="w-5 h-5" />
                              Análise Financeira
                            </CardTitle>
                            <CardDescription>
                              Resumo dos seus ganhos e taxas
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Ganhos Líquidos (Este Mês)</span>
                                <span className="font-semibold text-green-600">R$ {monthlyEarnings.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Taxa da Plataforma (5%)</span>
                                <span className="font-semibold text-red-600">
                                  R$ {Array.isArray(requests) 
                                    ? requests
                                        .filter(r => r.status === 'completed' && r.proposedPrice)
                                        .reduce((sum, r) => {
                                          const serviceAmount = parseFloat(r.proposedPrice || "0");
                                          const platformFee = serviceAmount * 0.05;
                                          return sum + platformFee;
                                        }, 0).toFixed(2)
                                    : "0.00"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Valor Médio por Serviço</span>
                                <span className="font-semibold">
                                  R$ {completedServices > 0 ? (monthlyEarnings / completedServices).toFixed(2) : "0.00"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Saldo Atual</span>
                                <span className="font-semibold text-blue-600">
                                  R$ {provider?.balance ? parseFloat(provider.balance.toString()).toFixed(2) : "0.00"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart className="w-5 h-5" />
                              Performance
                            </CardTitle>
                            <CardDescription>
                              Métricas de desempenho
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Total de Solicitações</span>
                                <span className="font-semibold">{Array.isArray(requests) ? requests.length : 0}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Taxa de Aceitação</span>
                                <span className="font-semibold">
                                  {Array.isArray(requests) && requests.length > 0 
                                    ? `${((requests.filter(r => r.status !== 'cancelled').length / requests.length) * 100).toFixed(1)}%`
                                    : "N/A"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-600">Taxa de Conclusão</span>
                                <span className="font-semibold">
                                  {Array.isArray(requests) && requests.length > 0 
                                    ? `${((completedServices / requests.length) * 100).toFixed(1)}%`
                                    : "N/A"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Total de Avaliações</span>
                                <span className="font-semibold">
                                  {(() => {
                                    const correctedRating = getCorrectRatingForProvider(provider);
                                    return correctedRating.reviewCount;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico de Atividades por Status */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Distribuição de Solicitações
                          </CardTitle>
                          <CardDescription>
                            Status das suas solicitações de serviço
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {Array.isArray(requests) ? requests.filter(r => r.status === 'completed').length : 0}
                              </div>
                              <div className="text-sm text-green-700">Concluídos</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                              <div className="text-2xl font-bold text-yellow-600">
                                {Array.isArray(requests) ? requests.filter(r => r.status === 'pending').length : 0}
                              </div>
                              <div className="text-sm text-yellow-700">Pendentes</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {Array.isArray(requests) ? requests.filter(r => r.status === 'accepted').length : 0}
                              </div>
                              <div className="text-sm text-blue-700">Aceitos</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">
                                {Array.isArray(requests) ? requests.filter(r => r.status === 'cancelled').length : 0}
                              </div>
                              <div className="text-sm text-red-700">Cancelados</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>
      
      {/* Client Review Dialog */}
      {selectedRequestForClientReview && (
        <ClientReviewDialog
          requestId={selectedRequestForClientReview.id}
          clientId={selectedRequestForClientReview.client.id}
          clientName={selectedRequestForClientReview.client.name}
          isOpen={clientReviewDialogOpen}
          onOpenChange={setClientReviewDialogOpen}
        />
      )}

      {/* Modal para Criar Novo Serviço */}
      <Dialog open={showNewServiceForm} onOpenChange={setShowNewServiceForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Adicionar Novo Serviço
            </DialogTitle>
            <DialogDescription>
              Preencha as informações para criar um novo serviço em sua categoria escolhida.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newServiceForm}>
            <form onSubmit={newServiceForm.handleSubmit(handleCreateNewService)} className="space-y-6">
              <FormField
                control={newServiceForm.control}
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
                        {categories
                          .filter(category => !userProviders.some(p => p.categoryId === category.id))
                          .map((category) => (
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
                control={newServiceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição dos Serviços</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva seus serviços e especialidades nesta categoria..."
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newServiceForm.control}
                name="pricingTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipos de Preço</FormLabel>
                    <div className="grid grid-cols-3 gap-4">
                      {(['hourly', 'daily', 'fixed'] as const).map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={type}
                            checked={field.value.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, type]);
                              } else {
                                field.onChange(field.value.filter(t => t !== type));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={type} className="text-sm">
                            {type === 'hourly' ? 'Por Hora' : type === 'daily' ? 'Por Dia' : 'Valor Fixo'}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-3 gap-4">
                {newServiceForm.watch('pricingTypes').includes('hourly') && (
                  <FormField
                    control={newServiceForm.control}
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
                )}

                {newServiceForm.watch('pricingTypes').includes('daily') && (
                  <FormField
                    control={newServiceForm.control}
                    name="minDailyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por Dia (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="400.00" 
                            step="0.01"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {newServiceForm.watch('pricingTypes').includes('fixed') && (
                  <FormField
                    control={newServiceForm.control}
                    name="minFixedRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Fixo (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="150.00" 
                            step="0.01"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newServiceForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Sua cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newServiceForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={createNewServiceMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {createNewServiceMutation.isPending ? "Criando..." : "Criar Serviço"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleCancelNewService}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
