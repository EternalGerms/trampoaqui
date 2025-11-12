import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ReviewDialog from "@/components/review-dialog";
import PaymentDialog from "@/components/payment-dialog";
import { 
  User, 
  Briefcase, 
  MessageSquare, 
  Star, 
  Calendar, 
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Check,
  X,
  MessageCircle,
  CheckCircle
} from "lucide-react";

interface Review {
  id: string;
  requestId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

interface DailySession {
  day: number;
  scheduledDate: Date | string;
  scheduledTime: string;
  clientCompleted: boolean;
  providerCompleted: boolean;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  pricingType: string;
  proposedPrice: string;
  proposedHours?: number | null;
  proposedDays?: number | null;
  scheduledDate: string;
  dailySessions?: DailySession[];
  createdAt: string;
  clientCompletedAt?: string;
  providerCompletedAt?: string;
  paymentCompletedAt?: string;
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
    proposer: { 
      id: string;
      name: string; 
      email: string; 
    };
  }>;
  reviews?: Review[];
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authManager.getUser();
  const [counterProposalRequestId, setCounterProposalRequestId] = useState<string | null>(null);
  const [counterProposalNegotiationId, setCounterProposalNegotiationId] = useState<string | null>(null);
  const [originalNegotiationData, setOriginalNegotiationData] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<any>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<ServiceRequest | null>(null);

  // Counter proposal schema
  const counterProposalSchema = z.object({
    pricingType: z.enum(['hourly', 'daily', 'fixed']),
    proposedPrice: z.string().optional(),
    proposedHours: z.string().optional(),
    proposedDays: z.string().optional(),
    proposedDate: z.string().optional(),
    proposedTime: z.string().optional(),
    message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
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

  const counterProposalForm = useForm<z.infer<typeof counterProposalSchema>>({
    resolver: zodResolver(counterProposalSchema),
    defaultValues: {
      pricingType: "fixed",
      proposedPrice: "",
      proposedHours: "",
      proposedDays: "",
      proposedDate: "",
      proposedTime: "",
      message: "",
    },
  });

  // Get user's service requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/requests"],
    enabled: !!currentUser,
  });



  // Enable provider capability mutation
  const enableProviderMutation = useMutationWithToast({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/enable-provider', {});
      return response.json();
    },
    successMessage: "Recursos de prestador habilitados!",
    successDescription: "Agora você pode criar seu perfil de prestador de serviços.",
    errorMessage: "Erro",
    errorDescription: "Não foi possível habilitar os recursos de prestador.",
    invalidateQueries: ["/api/auth/me"],
    onSuccess: (data) => {
      // Update local auth state
      authManager.setAuth(data.token, data.user);
    },
  });

  // Accept/Reject negotiation mutation
  const updateNegotiationStatusMutation = useMutationWithToast({
    mutationFn: async ({ negotiationId, status }: { negotiationId: string; status: 'accepted' | 'rejected' }) => {
      const response = await apiRequest('PUT', `/api/negotiations/${negotiationId}/status`, { status });
      return response.json();
    },
    successMessage: "Negociação atualizada!",
    successDescription: "O status da negociação foi alterado com sucesso.",
    errorMessage: "Erro ao atualizar negociação",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests"],
  });

  // Create counter proposal mutation
  const createCounterProposalMutation = useMutationWithToast({
    mutationFn: async (data: z.infer<typeof counterProposalSchema>) => {
      // Convert date and time fields to proper Date object
      const proposalData = {
        ...data,
        proposedDate: data.proposedDate && data.proposedTime ? 
          new Date(`${data.proposedDate}T${data.proposedTime}:00`) : 
          data.proposedDate ? new Date(data.proposedDate) : undefined,
        proposedHours: data.proposedHours ? parseInt(data.proposedHours) : undefined,
        proposedDays: data.proposedDays ? parseInt(data.proposedDays) : undefined,
        proposedPrice: data.proposedPrice || undefined,
      };

      const response = await apiRequest('POST', `/api/negotiations/${counterProposalNegotiationId}/counter-proposal`, proposalData);
      return response.json();
    },
    successMessage: "Contraproposta enviada!",
    successDescription: "O prestador foi notificado sobre sua proposta.",
    errorMessage: "Erro ao enviar contraproposta",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests"],
    onSuccess: () => {
      setCounterProposalRequestId(null);
      setCounterProposalNegotiationId(null);
      setOriginalNegotiationData(null);
      counterProposalForm.reset();
    },
  });

  // Payment mutations
  const processPaymentMutation = useMutationWithToast({
    mutationFn: async ({ requestId, paymentMethod }: { requestId: string; paymentMethod: string }) => {
      const response = await apiRequest('POST', `/api/requests/${requestId}/payment`, { paymentMethod });
      return response.json();
    },
    successMessage: "Método de pagamento selecionado!",
    successDescription: "Agora você pode confirmar o pagamento.",
    errorMessage: "Erro ao processar pagamento",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests"],
  });

  const completePaymentMutation = useMutationWithToast({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest('POST', `/api/requests/${requestId}/complete-payment`);
      return response.json();
    },
    successMessage: "Pagamento confirmado!",
    successDescription: "O prestador foi notificado e pode agendar o serviço.",
    errorMessage: "Erro ao confirmar pagamento",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests"],
  });

  // Complete daily session mutation
  const completeDailySessionMutation = useMutationWithToast({
    mutationFn: async ({ requestId, dayIndex }: { requestId: string; dayIndex: number }) => {
      const response = await apiRequest('PUT', `/api/requests/${requestId}/daily-session/${dayIndex}`, {
        completed: true
      });
      return response.json();
    },
    successMessage: "Dia marcado como concluído!",
    successDescription: "O prestador também precisa confirmar para finalizar este dia.",
    errorMessage: "Erro",
    errorDescription: "Não foi possível marcar o dia como concluído.",
    invalidateQueries: ["/api/requests"],
  });

  // Update request status mutation
  const updateRequestStatusMutation = useMutationWithToast({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/requests/${requestId}`, { status });
      return response.json();
    },
    successMessage: "Status atualizado!",
    successDescription: "O status da solicitação foi alterado com sucesso.",
    errorMessage: "Erro ao atualizar status",
    errorDescription: "Tente novamente em alguns instantes.",
    invalidateQueries: ["/api/requests"],
    onSuccess: (_, variables) => {
      if (variables.status === 'completed') {
        toast({
          title: "Serviço marcado como concluído!",
          description: "O prestador será notificado sobre a confirmação de conclusão.",
        });
      }
    },
  });

  const getStatusColor = (status: string) =>
    status === 'completed' ? 'bg-green-100 text-green-800' :
    status === 'accepted' ? 'bg-blue-100 text-blue-800' :
    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    status === 'negotiating' ? 'bg-blue-100 text-blue-800' :
    status === 'payment_pending' ? 'bg-orange-100 text-orange-800' :
    status === 'pending_completion' ? 'bg-blue-100 text-blue-800' :
    status === 'cancelled' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800';

  const getStatusText = (status: string) =>
    status === 'completed' ? 'Concluído' :
    status === 'accepted' ? 'Aceito' :
    status === 'pending' ? 'Pendente' :
    status === 'negotiating' ? 'Negociando' :
    status === 'payment_pending' ? 'Aguardando Pagamento' :
    status === 'pending_completion' ? 'Aguardando Conclusão' :
    status === 'cancelled' ? 'Cancelado' :
    status;

  const handlePaymentMethodSelected = (paymentMethod: string) => {
    if (selectedRequestForPayment) {
      processPaymentMutation.mutate({
        requestId: selectedRequestForPayment.id,
        paymentMethod
      });
      // Automatically complete payment after method selection
      setTimeout(() => {
        handleCompletePayment(selectedRequestForPayment.id);
      }, 1000); // Small delay to ensure the first mutation completes
    }
  };

  const handleCompletePayment = (requestId: string) => {
    completePaymentMutation.mutate(requestId);
  };

  // Function to get payment amount from request or accepted negotiation
  const getPaymentAmount = (request: ServiceRequest): number | null => {
    // First, try to get the proposedPrice from the request
    if (request.proposedPrice) {
      const price = parseFloat(request.proposedPrice.toString());
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }

    // If proposedPrice is not available or invalid, check for accepted negotiations
    if (request.negotiations && request.negotiations.length > 0) {
      // Sort negotiations by creation date (most recent first)
      const sortedNegotiations = [...request.negotiations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Find the most recent accepted negotiation
      const acceptedNegotiation = sortedNegotiations.find(
        (n) => n.status === 'accepted' && n.proposedPrice
      );

      if (acceptedNegotiation && acceptedNegotiation.proposedPrice) {
        const price = parseFloat(acceptedNegotiation.proposedPrice.toString());
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }

      // If no accepted negotiation, try the most recent negotiation with a price
      const latestNegotiationWithPrice = sortedNegotiations.find(
        (n) => n.proposedPrice
      );

      if (latestNegotiationWithPrice && latestNegotiationWithPrice.proposedPrice) {
        const price = parseFloat(latestNegotiationWithPrice.proposedPrice.toString());
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    // No valid price found
    return null;
  };

  // Function to get display status text considering the actual request status
  const getDisplayStatusText = (request: ServiceRequest) => {
    const effectiveStatus = getEffectiveRequestStatus(request);
    
    // If the effective status is 'accepted' but the actual status is 'pending_completion',
    // show a more appropriate message
    if (effectiveStatus === 'accepted' && request.status === 'pending_completion') {
      return 'Aguardando Confirmação';
    }
    
    return getStatusText(effectiveStatus);
  };

  // Function to check if service date has passed
  const checkServiceDate = (request: ServiceRequest) => {
    if (!request.scheduledDate) return false;
    const serviceDate = new Date(request.scheduledDate);
    const now = new Date();
    return now < serviceDate;
  };

  // Function to handle request status updates
  const handleUpdateRequestStatus = (requestId: string, status: string) => {
    updateRequestStatusMutation.mutate({ requestId, status });
  };

  // Function to open review dialog
  const handleOpenReviewDialog = (request: ServiceRequest) => {
    setSelectedRequestForReview(request);
    setReviewDialogOpen(true);
  };

  // Auto-redirect to provider dashboard if user has provider features enabled
  useEffect(() => {
    if (currentUser?.isProviderEnabled) {
      setLocation('/provider-dashboard');
      return; // Exit early to prevent rendering
    }
  }, [currentUser?.isProviderEnabled, setLocation]);

  // Don't render anything if user should be redirected
  if (currentUser?.isProviderEnabled) {
    return null;
  }

  // Function to get the effective status of a negotiation for the client
  // This handles the logic for showing "Recusado" vs "Aguardando resposta"
  const getEffectiveNegotiationStatus = (request: ServiceRequest, negotiation: any) => {
    // If negotiation is already accepted/rejected, return that status
    if (negotiation.status !== 'pending') {
      return negotiation.status;
    }

    // Safety check for negotiations array
    if (!request.negotiations || request.negotiations.length === 0) {
      return 'pending';
    }

    // Find the most recent negotiation (regardless of status)
    const allNegotiations = request.negotiations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (allNegotiations.length === 0) return 'pending';
    
    const mostRecentNegotiation = allNegotiations[0];
    
    // If this is the most recent negotiation
    if (negotiation.id === mostRecentNegotiation.id) {
      return 'pending'; // Can have actions or show "Aguardando resposta"
    }
    
    // If this is an older negotiation, it should be marked as "Recusado"
    // because a newer proposal has been made or the most recent was acted upon
    return 'rejected';
  };

  // Function to get the effective request status
  // This determines if a request should show "Negociando" or "Cancelado"
  const getEffectiveRequestStatus = (request: ServiceRequest) => {
    // If request is already completed, accepted, payment_pending, or cancelled, return that status
    if (['completed', 'accepted', 'payment_pending', 'cancelled'].includes(request.status)) {
      return request.status;
    }

    // If request is pending_completion, show as accepted for the client
    // since the service was already accepted and is just waiting for completion confirmation
    if (request.status === 'pending_completion') {
      return 'accepted';
    }

    // If request is pending and has no negotiations, return pending
    if (request.status === 'pending' && (!request.negotiations || request.negotiations.length === 0)) {
      return 'pending';
    }

    // If request is negotiating, check if all negotiations are rejected
    if (request.status === 'negotiating' && request.negotiations && request.negotiations.length > 0) {
      const allNegotiations = request.negotiations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const mostRecentNegotiation = allNegotiations[0];
      
      // If the most recent negotiation was rejected, the request should be cancelled
      if (mostRecentNegotiation.status === 'rejected') {
        return 'cancelled';
      }
      
      // If the most recent negotiation was accepted, the request should be accepted
      if (mostRecentNegotiation.status === 'accepted') {
        return 'accepted';
      }
      
      // If the most recent negotiation is still pending, keep negotiating
      if (mostRecentNegotiation.status === 'pending') {
        return 'negotiating';
      }
    }

    return request.status;
  };

  const handleCounterProposal = (data: z.infer<typeof counterProposalSchema>) => {
    if (!counterProposalNegotiationId || !originalNegotiationData) return;
    
    // Check if any field has changed from the original negotiation
    const hasChanges = 
      data.pricingType !== originalNegotiationData.pricingType ||
      data.proposedPrice !== (originalNegotiationData.proposedPrice || "") ||
      data.proposedHours !== (originalNegotiationData.proposedHours?.toString() || "") ||
      data.proposedDays !== (originalNegotiationData.proposedDays?.toString() || "") ||
      data.proposedDate !== (originalNegotiationData.proposedDate ? 
        new Date(originalNegotiationData.proposedDate).toISOString().split('T')[0] : "") ||
      data.proposedTime !== (originalNegotiationData.proposedDate ? 
        new Date(originalNegotiationData.proposedDate).toTimeString().slice(0, 5) : "");
    
    if (!hasChanges) {
      toast({
        title: "Nenhuma alteração detectada",
        description: "Você deve alterar pelo menos um campo para enviar uma contraproposta.",
        variant: "destructive",
      });
      return;
    }
    
    createCounterProposalMutation.mutate(data);
  };

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
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
                                  <Badge className={getStatusColor(getEffectiveRequestStatus(request))}>
                                    {getDisplayStatusText(request)}
                                  </Badge>
                                </div>

                                <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                  <span className="font-medium text-blue-600">
                                    Prestador: {request.provider.user.name}
                                  </span>
                                  {request.proposedPrice && (
                                    <span className="font-medium text-green-600">
                                      Valor Final: {formatCurrency(request.proposedPrice)}
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
                                    </span>
                                  )}
                                  {request.scheduledDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {formatDate(request.scheduledDate)}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Criado em {formatDate(request.createdAt)}
                                  </div>
                                </div>

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
                                              <p className="text-sm text-gray-600">{negotiation.message}</p>
                                            </div>
                                            <Badge className={negotiation.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                              {negotiation.status === 'accepted' ? 'Aceita' : 'Pendente'}
                                            </Badge>
                                          </div>
                                          
                                          {negotiation.proposedPrice && (
                                            <div className="text-sm text-gray-600">
                                              <strong>Preço proposto:</strong> {formatCurrency(negotiation.proposedPrice)}
                                            </div>
                                          )}
                                          
                                          {negotiation.proposedDate && (
                                            <div className="text-sm text-gray-600">
                                              <strong>Data proposta:</strong> {formatDate(negotiation.proposedDate)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

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
                                        let message = "Aguarde o pagamento ser confirmado para marcar os dias como concluídos.";
                                        if (request.status === 'pending') {
                                          message = "Aguarde o prestador aceitar a solicitação.";
                                        } else if (request.status === 'payment_pending') {
                                          message = "Aguarde o pagamento ser confirmado para marcar os dias como concluídos.";
                                        } else if (request.status === 'cancelled' || request.status === 'rejected') {
                                          message = "Este serviço foi cancelado ou recusado.";
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
                                                  {!session.clientCompleted && canMarkDays && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => {
                                                        completeDailySessionMutation.mutate({
                                                          requestId: request.id,
                                                          dayIndex: index
                                                        });
                                                      }}
                                                      disabled={completeDailySessionMutation.isPending}
                                                    >
                                                      {completeDailySessionMutation.isPending ? "Processando..." : "Marcar como Concluído"}
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

                                {/* Action buttons based on status */}
                                <div className="flex gap-2">
                                  {/* Only show counter proposal button when there are negotiations in progress */}
                                  {getEffectiveRequestStatus(request) === 'negotiating' && request.negotiations && request.negotiations.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setCounterProposalRequestId(request.id);
                                        setOriginalNegotiationData(null);
                                      }}
                                    >
                                      <MessageCircle className="w-4 h-4 mr-2" />
                                      Fazer Contraproposta
                                    </Button>
                                  )}

                                  {/* Show payment button when request is in payment_pending status */}
                                  {request.status === 'payment_pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const paymentAmount = getPaymentAmount(request);
                                        if (paymentAmount === null || paymentAmount <= 0) {
                                          toast({
                                            title: "Erro ao obter valor do pagamento",
                                            description: "Não foi possível determinar o valor a ser pago. Por favor, entre em contato com o suporte.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        setSelectedRequestForPayment(request);
                                        setShowPaymentDialog(true);
                                      }}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Realizar Pagamento
                                    </Button>
                                  )}


                                  
                                  {/* Show "Marcar como Concluído" button when service is accepted or pending completion and client has not confirmed yet */}
                                  {/* Para serviços diários, não mostrar este botão - a conclusão é feita através das diárias individuais */}
                                  {(request.status === 'accepted' || request.status === 'pending_completion') && !request.clientCompletedAt && request.pricingType !== 'daily' && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
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
                                                O prestador também precisará confirmar a conclusão para que o serviço seja finalizado.
                                              </>
                                            )}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            Confirmar Conclusão
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                  
                                  {getEffectiveRequestStatus(request) === 'completed' && (
                                    (() => {
                                      const hasClientReviewed = request.reviews?.some(review => review.reviewerId === currentUser?.id);
                                      if (hasClientReviewed) {
                                        return (
                                          <Button size="sm" disabled>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Avaliado
                                          </Button>
                                        );
                                      }
                                      return (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setSelectedRequestForReview(request);
                                            setReviewDialogOpen(true);
                                          }}
                                        >
                                          <Star className="w-4 h-4 mr-2" />
                                          Avaliar
                                        </Button>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-6xl text-gray-300 mb-4">
                          <Briefcase />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Nenhuma solicitação encontrada
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Você ainda não fez nenhuma solicitação de serviço
                        </p>
                        <Button onClick={() => setLocation('/services')}>
                          Encontrar Profissionais
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
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Review Dialog */}
      {selectedRequestForReview && (
        <ReviewDialog
          requestId={selectedRequestForReview.id}
          providerId={selectedRequestForReview.provider.user.id}
          providerName={selectedRequestForReview.provider.user.name}
          isOpen={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
        />
      )}

      {/* Payment Dialog */}
      {selectedRequestForPayment && (() => {
        const paymentAmount = getPaymentAmount(selectedRequestForPayment);
        // Only render if we have a valid payment amount
        if (paymentAmount !== null && paymentAmount > 0) {
          return (
            <PaymentDialog
              isOpen={showPaymentDialog}
              onClose={() => {
                setShowPaymentDialog(false);
                setSelectedRequestForPayment(null);
              }}
              onPaymentMethodSelected={handlePaymentMethodSelected}
              amount={paymentAmount}
            />
          );
        }
        return null;
      })()}
      
      <Footer />
    </div>
  );
}