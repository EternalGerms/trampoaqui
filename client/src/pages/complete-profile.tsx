import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Loader2, User, Star, Heart, Briefcase } from "lucide-react";
import { authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateProviderProfileSchema } from "@shared/schema";

type ProfileForm = {
  bio?: string;
  experience: string;
  location: string;
};

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = authManager.getUser();

  // Redirect if not authenticated or provider not enabled
  if (!user || !user.isProviderEnabled) {
    setLocation('/');
    return null;
  }

  const form = useForm<ProfileForm>({
    resolver: zodResolver(updateProviderProfileSchema),
    defaultValues: {
      bio: user.bio || "",
      experience: user.experience || "",
      location: user.location || "",
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        bio: user.bio || "",
        experience: user.experience || "",
        location: user.location || "",
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest('PUT', '/api/auth/profile', data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update local auth state with new profile data
      authManager.setAuth(authManager.getToken()!, updatedUser);
      
      toast({
        title: "Perfil atualizado com sucesso!",
        description: "Suas informações pessoais foram salvas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
    updateProfileMutation.mutate(data);
  };

  const isLoading = updateProfileMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete seu Perfil de Prestador
            </h1>
            <p className="text-gray-600">
              Preencha suas informações pessoais e profissionais para que os clientes possam conhecer você melhor
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* About Me Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-blue-600" />
                    Sobre Mim
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apresentação Pessoal</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conte um pouco sobre você, sua personalidade, o que te motiva no trabalho..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Professional Experience Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-green-600" />
                    Experiência Profissional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sua Experiência *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva sua experiência profissional, certificações, cursos, projetos importantes que já realizou..."
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

              {/* Location Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Onde você atende *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: São Paulo - SP, Região Sul, Bairro Centro"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar Perfil'
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