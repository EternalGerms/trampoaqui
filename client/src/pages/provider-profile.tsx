import { useState } from "react";
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
import { Star, MapPin, Phone, Mail, MessageCircle, Calendar } from "lucide-react";
import { authManager, authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ServiceProvider, User, ServiceCategory } from "@shared/schema";

const requestSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  proposedPrice: z.string().optional(),
  scheduledDate: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

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
  const providerId = params.id;

  const user = authManager.getUser();
  const isClient = !!user; // Any authenticated user can request services

  const { data: provider, isLoading } = useQuery<ProviderWithDetails>({
    queryKey: ["/api/providers", providerId],
    enabled: !!providerId,
  });

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      proposedPrice: "",
      scheduledDate: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestForm) => {
      const response = await authenticatedRequest('POST', '/api/requests', {
        ...data,
        providerId,
        proposedPrice: data.proposedPrice ? parseFloat(data.proposedPrice) : undefined,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      });
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
    onError: () => {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
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
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profissional não encontrado</h2>
              <p className="text-gray-600 mb-4">O profissional que você está procurando não existe.</p>
              <Button onClick={() => setLocation('/services')}>
                Voltar para busca
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = (data: RequestForm) => {
    createRequestMutation.mutate(data);
  };

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
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {provider.hourlyRate}/h
                    </p>
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
                
                {isClient && (
                  <div className="space-y-3 pt-4 border-t">
                    <Button 
                      onClick={() => setShowRequestForm(true)}
                      className="w-full bg-primary-600 hover:bg-primary-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Solicitar Serviço
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                  </div>
                )}
                
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
                      name="proposedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orçamento previsto (opcional)</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data preferencial (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
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
      </div>
      
      <Footer />
    </div>
  );
}
