import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import ReviewButton from "@/components/review-button";
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

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  proposedPrice: string;
  scheduledDate: string;
  createdAt: string;
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
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = authManager.getUser();
  const [counterProposalRequestId, setCounterProposalRequestId] = useState<string | null>(null);
  const [counterProposalNegotiationId, setCounterProposalNegotiationId] = useState<string | null>(null);
  const [originalNegotiationData, setOriginalNegotiationData] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
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

  // Accept/Reject negotiation mutation
  const updateNegotiationStatusMutation = useMutation({
    mutationFn: async ({ negotiationId, status }: { negotiationId: string; status: 'accepted' | 'rejected' }) => {
      const response = await apiRequest('PUT', `/api/negotiations/${negotiationId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Negociação atualizada!",
        description: "O status da negociação foi alterado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar negociação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  // Create counter proposal mutation
  const createCounterProposalMutation = useMutation({
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
    onSuccess: () => {
      toast({
        title: "Contraproposta enviada!",
        description: "O prestador foi notificado sobre sua proposta.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setCounterProposalRequestId(null);
      setCounterProposalNegotiationId(null);
      setOriginalNegotiationData(null);
      counterProposalForm.reset();
    },
    onError: () => {
      toast({
        title: "Erro ao enviar contraproposta",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) =>
    status === 'completed' ? 'bg-green-100 text-green-800' :
    status === 'accepted' ? 'bg-blue-100 text-blue-800' :
    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    status === 'negotiating' ? 'bg-blue-100 text-blue-800' :
    status === 'cancelled' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800';

  const getStatusText = (status: string) =>
    status === 'completed' ? 'Concluído' :
    status === 'accepted' ? 'Aceito' :
    status === 'pending' ? 'Pendente' :
    status === 'negotiating' ? 'Negociando' :
    status === 'cancelled' ? 'Cancelado' :
    status;

  // Function to check if service date has passed
  const checkServiceDate = (request: ServiceRequest) => {
    if (!request.scheduledDate) return false;
    const serviceDate = new Date(request.scheduledDate);
    const now = new Date();
    return now < serviceDate;
  };

  // Function to handle request status updates
  const handleUpdateRequestStatus = async (requestId: string, status: string) => {
    try {
      const response = await apiRequest('PUT', `/api/requests/${requestId}`, { status });
      if (response.ok) {
        toast({
          title: "Status atualizado!",
          description: "O status da solicitação foi alterado com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
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
    }
  }, [currentUser?.isProviderEnabled, setLocation]);

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
    // If request is already completed, accepted, or cancelled, return that status
    if (['completed', 'accepted', 'cancelled'].includes(request.status)) {
      return request.status;
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
                                <Badge className={getStatusColor(getEffectiveRequestStatus(request))}>
                                  {getStatusText(getEffectiveRequestStatus(request))}
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm mb-3">{request.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                <span className="font-medium text-blue-600">
                                  Prestador: {request.provider.user.name}
                                </span>
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
                                                  R$ {parseFloat(negotiation.proposedPrice).toFixed(2).replace('.', ',')}
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
                                                  {new Date(negotiation.proposedDate).toLocaleDateString('pt-BR')}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {negotiation.status === 'pending' && negotiation.proposer.id !== currentUser?.id && (
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
                                                      setCounterProposalNegotiationId(negotiation.id);
                                                      setOriginalNegotiationData(negotiation);
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
                                                      Envie uma contraproposta para o prestador com seus termos.
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
                                                                <SelectItem value="hourly">Por Hora</SelectItem>
                                                                <SelectItem value="daily">Por Dia</SelectItem>
                                                                <SelectItem value="fixed">Valor Fixo</SelectItem>
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
                                                          disabled={createCounterProposalMutation.isPending}
                                                          className="bg-blue-600 hover:bg-blue-700"
                                                        >
                                                          {createCounterProposalMutation.isPending ? "Enviando..." : "Enviar Proposta"}
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
                                              if (negotiation.proposer.id === currentUser?.id) {
                                                // User's own pending proposal
                                                return (
                                                  <div className="ml-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      Aguardando resposta
                                                    </span>
                                                  </div>
                                                );
                                              } else {
                                                // Provider's pending proposal (can have actions)
                                                return null; // Will show action buttons
                                              }
                                            } else if (effectiveStatus === 'rejected') {
                                              // Show rejected badge for proposals that were superseded
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
                                          {new Date(negotiation.createdAt).toLocaleDateString('pt-BR')} às {new Date(negotiation.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Show completion button for accepted services */}
                            {(request.status === 'accepted' || request.status === 'pending_completion') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
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
                                          Atenção: O serviço está agendado para <strong>{request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString('pt-BR') : ''}</strong>. 
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
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Confirmar Conclusão
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Show review button for completed services */}
                            {request.status === 'completed' && (
                              <ReviewButton
                                requestId={request.id}
                                onOpenReview={() => handleOpenReviewDialog(request)}
                              />
                            )}
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
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
      
      <Footer />
    </div>
  );
}