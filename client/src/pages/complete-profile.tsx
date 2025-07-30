import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, MapPin, Star, Clock, DollarSign } from "lucide-react";
import { authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ServiceCategory, 
  insertServiceProviderSchema,
  type ServiceProvider
} from "@shared/schema";

const profileSchema = insertServiceProviderSchema.omit({ userId: true });
type ProfileForm = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = authManager.getUser();

  // Redirect if not authenticated or provider not enabled
  if (!user || !user.isProviderEnabled) {
    setLocation('/');
    return null;
  }

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: existingProvider } = useQuery<ServiceProvider | undefined>({
    queryKey: ["/api/providers", "current"],
    queryFn: async () => {
      const response = await fetch('/api/providers');
      const providers: ServiceProvider[] = await response.json();
      return providers.find((p: ServiceProvider) => p.userId === user.id);
    },
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      categoryId: existingProvider?.categoryId || "",
      description: existingProvider?.description || "",
      hourlyRate: existingProvider?.hourlyRate || "",
      experience: existingProvider?.experience || "",
      location: existingProvider?.location || "",
      availability: existingProvider?.availability || null,
    },
  });

  // Update form when existing provider data loads
  useEffect(() => {
    if (existingProvider) {
      form.reset({
        categoryId: existingProvider.categoryId,
        description: existingProvider.description,
        hourlyRate: existingProvider.hourlyRate,
        experience: existingProvider.experience,
        location: existingProvider.location,
        availability: existingProvider.availability,
      });
    }
  }, [existingProvider, form]);

  const createProviderMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest('POST', '/api/providers', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil criado com sucesso!",
        description: "Você agora pode receber solicitações de serviços.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      setLocation('/provider-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest('PUT', `/api/providers/${existingProvider!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "Suas informações foram salvas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      setLocation('/provider-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    if (existingProvider) {
      updateProviderMutation.mutate(data);
    } else {
      createProviderMutation.mutate(data);
    }
  };

  const isLoading = createProviderMutation.isPending || updateProviderMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {existingProvider ? 'Editar Perfil' : 'Complete seu Perfil de Prestador'}
            </h1>
            <p className="text-gray-600">
              {existingProvider 
                ? 'Atualize suas informações para melhor atender seus clientes'
                : 'Preencha as informações para começar a receber solicitações de serviços'
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Category Selection */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria de Serviço *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione sua área de atuação" />
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

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição dos Serviços *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva os serviços que você oferece, sua experiência e diferenciais..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Experience */}
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experiência *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conte sobre sua experiência, certificações, projetos anteriores..."
                            className="min-h-[80px]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location and Rate */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Cidade, Bairro"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor por Hora (R$) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="50.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Availability */}
                  <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disponibilidade</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: Segunda a sexta das 8h às 18h, sábados pela manhã..."
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation('/dashboard')}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {existingProvider ? 'Atualizando...' : 'Criando...'}
                        </>
                      ) : (
                        existingProvider ? 'Atualizar Perfil' : 'Criar Perfil'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Dicas para um perfil atrativo
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Seja específico sobre os serviços que oferece</li>
                <li>• Mencione suas certificações e experiência relevante</li>
                <li>• Defina um preço justo e competitivo</li>
                <li>• Seja claro sobre sua disponibilidade</li>
                <li>• Use uma linguagem profissional e amigável</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}