import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, User, Star, Heart, Briefcase, DollarSign, Settings } from "lucide-react";
import { authManager, authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { apiRequest } from "@/lib/queryClient";
import { updateProviderProfileSchema, insertServiceProviderSchema } from "@shared/schema";
import type { ServiceCategory } from "@shared/schema";
import { z } from "zod";

// Função para validar cidade e estado
const validateCityState = async (location: string): Promise<boolean> => {
  if (!location) return true;
  
  // Extrair cidade e estado da localização (formato: "Cidade - Estado")
  const parts = location.split(' - ');
  if (parts.length !== 2) return true; // Se não estiver no formato esperado, permitir
  
  const city = parts[0].trim();
  const state = parts[1].trim();
  
  if (!city || !state) return true;
  
  try {
    // Usar a API do IBGE para validar cidade e estado
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.toUpperCase()}/municipios`);
    const cities = await response.json();
    
    const cityExists = cities.some((c: any) => 
      c.nome.toLowerCase() === city.toLowerCase()
    );
    
    if (!cityExists) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Se a API falhar, permitir o envio mas mostrar aviso
    console.warn('Não foi possível validar a cidade/estado:', error);
    return true;
  }
};

type ProfileForm = {
  // Campos do perfil pessoal
  bio?: string;
  experience: string;
  city: string;
  state: string;
  
  // Campos do serviço
  categoryId: string;
  description: string;
  pricingTypes: string[];
  minHourlyRate?: string;
  minDailyRate?: string;
  minFixedRate?: string;
};

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = authManager.getUser();
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  // Redirect if not authenticated or provider not enabled
  if (!user || !user.isProviderEnabled) {
    setLocation('/');
    return null;
  }

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  // Debug logs
  console.log('Categories loading:', categoriesLoading);
  console.log('Categories error:', categoriesError);
  console.log('Categories data:', categories);
  console.log('API URL being called:', '/api/categories');

  // Test manual API call
  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API call...');
        const response = await fetch('/api/categories');
        console.log('API response status:', response.status);
        const data = await response.json();
        console.log('API response data:', data);
      } catch (error) {
        console.error('API call error:', error);
      }
    };
    testAPI();
  }, []);

  // Create combined schema for validation
  const combinedSchema = z.object({
    // Perfil pessoal
    bio: z.string().optional(),
    experience: z.string().min(1, "Experiência é obrigatória"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(2, "Estado é obrigatório").max(2, "Use a sigla do estado (ex: SP)"),
    
    // Serviço
    categoryId: z.string().min(1, "Selecione uma categoria"),
    description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
    pricingTypes: z.array(z.string()).min(1, "Selecione pelo menos um tipo de cobrança"),
    minHourlyRate: z.string().optional(),
    minDailyRate: z.string().optional(),
    minFixedRate: z.string().optional(),
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      bio: user.bio || "",
      experience: user.experience || "",
      city: user.city || "",
      state: user.state || "",
      categoryId: "",
      description: "",
      pricingTypes: ["fixed"],
      minHourlyRate: "",
      minDailyRate: "",
      minFixedRate: "",
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        bio: user.bio || "",
        experience: user.experience || "",
        city: user.city || "",
        state: user.state || "",
        categoryId: "",
        description: "",
        pricingTypes: ["fixed"],
        minHourlyRate: "",
        minDailyRate: "",
        minFixedRate: "",
      });
    }
  }, [user, form]);

  const createCompleteProfileMutation = useMutationWithToast({
    mutationFn: async (data: ProfileForm) => {
      setIsCreatingProvider(true);
      const location = `${data.city} - ${data.state}`;
      
      try {
        // 1. First update user profile
        const profileResponse = await apiRequest('PUT', '/api/auth/profile', {
          bio: data.bio,
          experience: data.experience,
          location: location,
        });
        const updatedUser = await profileResponse.json();

        // 2. Then create service provider
        const providerData = {
          userId: user.id,
          categoryId: data.categoryId,
          description: data.description,
          pricingTypes: data.pricingTypes,
          location: location,
          experience: data.experience,
          minHourlyRate: data.minHourlyRate || undefined,
          minDailyRate: data.minDailyRate || undefined,
          minFixedRate: data.minFixedRate || undefined,
        };

        const providerResponse = await authenticatedRequest('POST', '/api/providers', providerData);
        const provider = await providerResponse.json();

        return { user: updatedUser, provider };
      } finally {
        setIsCreatingProvider(false);
      }
    },
    successMessage: "Perfil criado com sucesso!",
    successDescription: "Seu perfil e serviço foram configurados. Bem-vindo ao TrampoAqui!",
    errorMessage: "Erro ao criar perfil",
    errorDescription: "Tente novamente mais tarde",
    invalidateQueries: ["/api/providers", "/api/auth/me"],
    onSuccess: ({ user: updatedUser }) => {
      // Update local auth state with new profile data
      authManager.setAuth(authManager.getToken()!, updatedUser);
      setLocation('/provider-dashboard');
    },
    onError: () => {
      setIsCreatingProvider(false);
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    // Validar cidade e estado antes de prosseguir
    const location = `${data.city} - ${data.state}`;
    const isCityStateValid = await validateCityState(location);
    if (!isCityStateValid) {
      toast({
        title: "Localização inválida",
        description: "A cidade informada não foi encontrada no estado especificado. Verifique se está correta.",
        variant: "destructive",
      });
      return;
    }
    
    createCompleteProfileMutation.mutate(data);
  };

  const isLoading = createCompleteProfileMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete seu Perfil</h1>
            <p className="text-gray-600">
              Configure seu perfil profissional para começar a receber solicitações de clientes
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Perfil Pessoal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobre você</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conte um pouco sobre você, sua experiência, especialidades..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experiência e qualificações *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva sua experiência, certificações, cursos, projetos relevantes..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-green-600" />
                        Localização de Atendimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Chavantes"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado (UF) *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: SP"
                                  maxLength={2}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Service Category Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Categoria do Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione sua categoria principal *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={categoriesLoading ? "Carregando categorias..." : "Escolha uma categoria"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoriesLoading ? (
                              <div className="p-2 text-center text-gray-500">Carregando categorias...</div>
                            ) : categories.length === 0 ? (
                              <div className="p-2 text-center text-gray-500">Nenhuma categoria disponível</div>
                            ) : (
                              categories.map((category) => {
                                console.log('Rendering category:', category);
                                return (
                                  <SelectItem key={category.id} value={category.id}>
                                    <div className="flex items-center gap-2">
                                      <i className={`${category.icon} text-sm`}></i>
                                      {category.name}
                                    </div>
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Service Description Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-green-600" />
                    Descrição do Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descreva seu serviço *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva detalhadamente o que você oferece, seus diferenciais, metodologia de trabalho..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Pricing Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Tipos de Cobrança e Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing Types */}
                  <FormField
                    control={form.control}
                    name="pricingTypes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Como você cobra pelos seus serviços? *</FormLabel>
                        <div className="space-y-3">
                          {[
                            { id: "hourly", label: "Por hora", description: "Cobrança por hora trabalhada" },
                            { id: "daily", label: "Por dia", description: "Cobrança por dia de trabalho" },
                            { id: "fixed", label: "Valor fixo", description: "Preço fechado por projeto/serviço" }
                          ].map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="pricingTypes"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="font-normal">
                                        {item.label}
                                      </FormLabel>
                                      <p className="text-sm text-gray-500">
                                        {item.description}
                                      </p>
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pricing Values */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Hourly Rate */}
                    <FormField
                      control={form.control}
                      name="minHourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor mínimo/hora (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              {...field}
                              disabled={!form.watch("pricingTypes")?.includes("hourly")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Daily Rate */}
                    <FormField
                      control={form.control}
                      name="minDailyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor mínimo/dia (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              {...field}
                              disabled={!form.watch("pricingTypes")?.includes("daily")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Fixed Rate */}
                    <FormField
                      control={form.control}
                      name="minFixedRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor mínimo fixo (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              {...field}
                              disabled={!form.watch("pricingTypes")?.includes("fixed")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando perfil...
                    </>
                  ) : (
                    'Criar Perfil Completo'
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Tips Card */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Dicas para um perfil atrativo
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Sobre Mim:</strong> Mostre sua personalidade e paixão pelo trabalho</li>
                <li>• <strong>Experiência:</strong> Mencione certificações, cursos e projetos relevantes</li>
                <li>• <strong>Localização:</strong> Seja específico sobre onde você atende</li>
                <li>• Use uma linguagem amigável e profissional</li>
                <li>• Seja autêntico e mostre seus diferenciais</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}