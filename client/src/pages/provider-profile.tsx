import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Star, MapPin, Phone, Mail, MessageCircle, Calendar, Edit } from "lucide-react";
import { authManager, authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ServiceProvider, User, ServiceCategory, insertServiceProviderSchema } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const requestSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  pricingType: z.enum(['hourly', 'daily', 'fixed']),
  proposedPrice: z.string().optional(),
  proposedHours: z.string().optional(),
  proposedDays: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
}).refine((data) => {
  if (data.pricingType === 'hourly' && data.proposedHours && parseInt(data.proposedHours) <= 0) {
    return false;
  }
  if (data.pricingType === 'daily' && data.proposedDays && parseInt(data.proposedDays) <= 0) {
    return false;
  }
  return true;
}, {
  message: "Quantidade deve ser maior que zero",
  path: ["proposedHours", "proposedDays"]
}).refine((data) => {
  if (data.proposedPrice && parseFloat(data.proposedPrice) <= 0) {
    return false;
  }
  return true;
}, {
  message: "Preço deve ser maior que zero",
  path: ["proposedPrice"]
});

const messageSchema = z.object({
  content: z.string().min(1, "Mensagem não pode estar vazia"),
});

const editProviderSchema = insertServiceProviderSchema.omit({ userId: true });

type RequestForm = z.infer<typeof requestSchema>;
type MessageForm = z.infer<typeof messageSchema>;
type EditProviderForm = z.infer<typeof editProviderSchema>;

type ProviderWithDetails = ServiceProvider & { 
  user: User; 
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

export default function ProviderProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const providerId = params.id;

  const user = authManager.getUser();
  const isClient = !!user; // Any authenticated user can request services

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

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const isOwner = user && provider && user.id === provider.userId; // Check if current user owns this service

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      pricingType: "hourly",
      proposedPrice: "",
      proposedHours: "",
      proposedDays: "",
      scheduledDate: "",
      scheduledTime: "",
    },
  });

  // Update default pricingType when provider data loads
  useEffect(() => {
    if (Array.isArray(provider?.pricingTypes) && provider.pricingTypes.length > 0) {
      const firstAvailableType = provider.pricingTypes[0];
      form.setValue('pricingType', firstAvailableType as 'hourly' | 'daily' | 'fixed');
    }
  }, [provider, form]);

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestForm) => {
      const payload = {
        title: data.title,
        description: data.description,
        providerId,
        pricingType: data.pricingType,
        proposedPrice: data.proposedPrice || undefined,
        proposedHours: data.proposedHours || undefined,
        proposedDays: data.proposedDays || undefined,
        scheduledDate: data.scheduledDate && data.scheduledTime ? 
          new Date(`${data.scheduledDate}T${data.scheduledTime}:00`) : 
          data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      };
      
      const response = await authenticatedRequest('POST', '/api/requests', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "O profissional foi notificado sobre sua solicitação.",
      });
      setShowRequestForm(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error: any) => {
      console.error("Error creating request:", error);
      toast({
        title: "Erro ao enviar solicitação",
        description: error.response?.data?.message || error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  const editForm = useForm<EditProviderForm>({
    resolver: zodResolver(editProviderSchema),
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

  // Reset edit form when provider data loads
  useEffect(() => {
    if (provider) {
      editForm.reset({
        categoryId: provider.categoryId,
        description: provider.description,
        pricingTypes: Array.isArray(provider.pricingTypes) ? provider.pricingTypes : ["fixed"],
        minHourlyRate: provider.minHourlyRate || "",
        minDailyRate: provider.minDailyRate || "",
        minFixedRate: provider.minFixedRate || "",
        experience: provider.experience,
        location: provider.location,
        isVerified: provider.isVerified,
        availability: provider.availability || {},
      });
    }
  }, [provider, editForm]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageForm) => {
      const response = await authenticatedRequest('POST', '/api/messages', {
        content: data.content,
        receiverId: provider?.userId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "O prestador receberá sua mensagem.",
      });
      setShowMessageForm(false);
      messageForm.reset();
    },
    onError: () => {
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authenticatedRequest('PUT', `/api/providers/${providerId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço atualizado!",
        description: "Suas alterações foram salvas com sucesso.",
      });
      setShowEditForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/providers", providerId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest('DELETE', `/api/providers/${providerId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço excluído!",
        description: "Seu anúncio foi removido da plataforma.",
      });
      setLocation('/services');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir serviço",
        description: error.response?.data?.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestForm) => {
    createRequestMutation.mutate(data);
  };

  const onMessageSubmit = (data: MessageForm) => {
    sendMessageMutation.mutate(data);
  };

  const onEditSubmit = (data: EditProviderForm) => {
    updateProviderMutation.mutate(data);
  };

  // Verificações condicionais APÓS todos os hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Prestador não encontrado</h2>
            <p className="text-gray-600 mb-4">
              O prestador que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => setLocation('/services')}>
              Voltar aos Serviços
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Provider Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-gray-900">{provider.user.name}</CardTitle>
                    <p className="text-primary-600 font-medium text-lg">{provider.category.name}</p>
                    <div className="flex items-center mt-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-current mr-1" />
                      <span className="font-semibold">
                        {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : "N/A"}
                      </span>
                      <span className="text-gray-600 ml-1">
                        ({provider.reviewCount} avaliações)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium">Tipos de orçamento:</div>
                      <div className="flex gap-1 mt-1">
                        {Array.isArray(provider.pricingTypes) && provider.pricingTypes.map((type: string) => (
                          <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {type === 'hourly' ? 'Hora' : type === 'daily' ? 'Dia' : 'Fixo'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {provider.isVerified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                        Verificado
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sobre</h3>
                  <p className="text-gray-600 leading-relaxed">{provider.description}</p>
                </div>
                
                {provider.experience && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Experiência</h3>
                    <p className="text-gray-600">{provider.experience}</p>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{provider.location}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Mail className="w-5 h-5 mr-3" />
                  <span>{provider.user.email}</span>
                </div>
                
                {provider.user.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-5 h-5 mr-3" />
                    <span>{provider.user.phone}</span>
                  </div>
                )}
                
                {isOwner ? (
                  <div className="space-y-3 pt-4 border-t">
                    <Button 
                      onClick={() => setShowEditForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Serviço
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
                          deleteProviderMutation.mutate();
                        }
                      }}
                      disabled={deleteProviderMutation.isPending}
                    >
                      {deleteProviderMutation.isPending ? "Excluindo..." : "Excluir Serviço"}
                    </Button>
                  </div>
                ) : isClient && !isOwner ? (
                  <div className="space-y-3 pt-4 border-t">
                    <Button 
                      onClick={() => setShowRequestForm(true)}
                      className="w-full bg-primary-600 hover:bg-primary-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Solicitar Serviço
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowMessageForm(true)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                  </div>
                ) : null}
                
                {!user && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-3">
                      Faça login para entrar em contato
                    </p>
                    <Button 
                      onClick={() => setLocation('/login')}
                      className="w-full bg-primary-600 hover:bg-primary-700"
                    >
                      Fazer Login
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Request Form Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Solicitar Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do serviço</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Instalação de tomada" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição detalhada</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva o que precisa ser feito..." 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pricingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de orçamento</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full border rounded-md p-2"
                            >
                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('hourly') && (
                                <option value="hourly">Por hora {provider.minHourlyRate ? `- R$ ${provider.minHourlyRate}` : ''}</option>
                              )}
                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('daily') && (
                                <option value="daily">Por dia {provider.minDailyRate ? `- R$ ${provider.minDailyRate}` : ''}</option>
                              )}
                              {Array.isArray(provider?.pricingTypes) && provider.pricingTypes.includes('fixed') && (
                                <option value="fixed">Fixo {provider.minFixedRate ? `- R$ ${provider.minFixedRate}` : ''}</option>
                              )}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('pricingType') === 'hourly' && (
                      <FormField
                        control={form.control}
                        name="proposedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horas propostas</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Ex: 2" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch('pricingType') === 'daily' && (
                      <FormField
                        control={form.control}
                        name="proposedDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dias propostos</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Ex: 1" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="proposedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço proposto (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Ex: 150.00" 
                              step="0.01"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data preferencial</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário (24h)</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRequestForm(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createRequestMutation.isPending}
                        className="flex-1 bg-primary-600 hover:bg-primary-700"
                      >
                        {createRequestMutation.isPending ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Message Form Modal */}
        {showMessageForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Enviar Mensagem</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(onMessageSubmit)} className="space-y-4">
                    <FormField
                      control={messageForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sua mensagem</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Digite sua mensagem..." 
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowMessageForm(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={sendMessageMutation.isPending}
                        className="flex-1 bg-primary-600 hover:bg-primary-700"
                      >
                        {sendMessageMutation.isPending ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Editar Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                    <FormField
                      control={editForm.control}
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
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Serviço</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva seus serviços..."
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="pricingTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipos de Cobrança</FormLabel>
                          <div className="flex flex-col space-y-3">
                            {[
                              { id: 'hourly', label: '⏰ Por Hora', desc: 'Cobrança por hora trabalhada' },
                              { id: 'daily', label: '📅 Por Dia', desc: 'Cobrança por dia completo' },
                              { id: 'fixed', label: '💰 Valor Fixo', desc: 'Preço fechado para o serviço' }
                            ].map((option) => (
                              <div key={option.id} className="flex items-start space-x-3">
                                <Checkbox
                                  checked={field.value?.includes(option.id as any)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, option.id]);
                                    } else {
                                      field.onChange(currentValue.filter((value: string) => value !== option.id));
                                    }
                                  }}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {option.label}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {option.desc}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Conditional price fields */}
                    {editForm.watch('pricingTypes')?.includes('hourly' as any) && (
                      <FormField
                        control={editForm.control}
                        name="minHourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Mínimo por Hora (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 50.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {editForm.watch('pricingTypes')?.includes('daily' as any) && (
                      <FormField
                        control={editForm.control}
                        name="minDailyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Mínimo por Dia (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 200.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {editForm.watch('pricingTypes')?.includes('fixed' as any) && (
                      <FormField
                        control={editForm.control}
                        name="minFixedRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Mínimo Fixo (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Ex: 150.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={editForm.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experiência</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva sua experiência..."
                              rows={3}
                              value={field.value || ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: São Paulo, SP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditForm(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProviderMutation.isPending}
                        className="flex-1 bg-primary-600 hover:bg-primary-700"
                      >
                        {updateProviderMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
