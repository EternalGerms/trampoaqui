import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authenticatedRequest, authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Lock, Trash2, AlertTriangle } from "lucide-react";
import type { User } from "@shared/schema";

// Lista dos estados brasileiros
const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

// Schema para atualização de perfil
const updateProfileSchema = z.object({
  phone: z.string().optional(),
  cep: z.string().optional().refine((cep) => {
    if (!cep) return true;
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  }, "CEP deve ter 8 dígitos"),
  city: z.string().optional(),
  state: z.string().optional().refine((state) => {
    if (!state) return true;
    const validStates = BRAZILIAN_STATES.map(s => s.value);
    return validStates.includes(state.toUpperCase());
  }, "Estado deve ser uma UF válida do Brasil"),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  bio: z.string().optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
});

// Schema para alteração de senha
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Senha antiga é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para exclusão de conta
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória para confirmar a exclusão"),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
type DeleteAccountForm = z.infer<typeof deleteAccountSchema>;

interface EditProfileDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ user, isOpen, onOpenChange }: EditProfileDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("address");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Formulário de endereço
  const addressForm = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: user.phone || "",
      cep: user.cep || "",
      city: user.city || "",
      state: user.state || "",
      street: user.street || "",
      neighborhood: user.neighborhood || "",
      number: user.number || "",
      complement: user.complement || "",
      bio: user.bio || "",
      experience: user.experience || "",
      location: user.location || "",
    },
  });

  // Formulário de senha
  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Formulário de exclusão
  const deleteForm = useForm<DeleteAccountForm>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: "",
    },
  });

  // Reset forms when user changes or dialog opens
  useEffect(() => {
    if (user && isOpen) {
      // Se location não estiver definido mas city e state estiverem, criar location
      const locationValue = user.location || (user.city && user.state ? `${user.city} - ${user.state}` : "");
      
      addressForm.reset({
        phone: user.phone || "",
        cep: user.cep || "",
        city: user.city || "",
        state: user.state || "",
        street: user.street || "",
        neighborhood: user.neighborhood || "",
        number: user.number || "",
        complement: user.complement || "",
        bio: user.bio || "",
        experience: user.experience || "",
        location: locationValue,
      });
      passwordForm.reset({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      deleteForm.reset({
        password: "",
      });
      setActiveTab("address");
      setShowDeleteConfirm(false);
      
      // Se for prestador e location ainda não estiver preenchido, criar a partir de city e state
      if (user.isProviderEnabled && !locationValue && user.city && user.state) {
        // Usar setTimeout para evitar problemas de sincronização
        setTimeout(() => {
          addressForm.setValue('location', `${user.city} - ${user.state}`, { shouldValidate: false });
        }, 0);
      }
    }
  }, [user, isOpen]);

  // Função auxiliar para atualizar location quando city ou state mudarem
  const updateLocationFromCityState = (city: string, state: string) => {
    if (user?.isProviderEnabled && city && state) {
      const expectedLocation = `${city} - ${state}`;
      const currentLocation = addressForm.getValues('location');
      
      // Atualizar location apenas se ainda não estiver no formato correto ou estiver vazio
      if (!currentLocation || (!currentLocation.includes(' - '))) {
        addressForm.setValue('location', expectedLocation, { shouldValidate: false });
      }
    }
  };

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        addressForm.setValue('city', data.localidade);
        addressForm.setValue('state', data.uf);
        addressForm.setValue('street', data.logradouro);
        addressForm.setValue('neighborhood', data.bairro);
        
        // Atualizar location se for prestador
        if (user?.isProviderEnabled && data.localidade && data.uf) {
          updateLocationFromCityState(data.localidade, data.uf);
        }
        
        toast({
          title: "Endereço encontrado!",
          description: "Os campos foram preenchidos automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileForm) => {
      const response = await authenticatedRequest('PUT', '/api/auth/profile', data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      authManager.setAuth(authManager.getToken()!, updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      let errorMessage = "Tente novamente mais tarde.";
      if (error instanceof Error) {
        // Try to parse error message from response
        try {
          const match = error.message.match(/^(\d+):\s*(.+)$/);
          if (match) {
            const errorText = match[2];
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } else {
            errorMessage = error.message || errorMessage;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Erro ao atualizar perfil",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation para alterar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const response = await authenticatedRequest('PUT', '/api/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      let errorMessage = "Tente novamente mais tarde.";
      if (error instanceof Error) {
        // Try to parse error message from response
        try {
          const match = error.message.match(/^(\d+):\s*(.+)$/);
          if (match) {
            const errorText = match[2];
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } else {
            errorMessage = error.message || errorMessage;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir conta
  const deleteAccountMutation = useMutation({
    mutationFn: async (data: DeleteAccountForm) => {
      const response = await authenticatedRequest('DELETE', '/api/auth/account', {
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso.",
      });
      authManager.logout();
      setLocation('/');
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      let errorMessage = "Tente novamente mais tarde.";
      if (error instanceof Error) {
        // Try to parse error message from response
        try {
          const match = error.message.match(/^(\d+):\s*(.+)$/);
          if (match) {
            const errorText = match[2];
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } else {
            errorMessage = error.message || errorMessage;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
      }
      toast({
        title: "Erro ao excluir conta",
        description: errorMessage,
        variant: "destructive",
      });
      setShowDeleteConfirm(false);
    },
  });

  const handleUpdateProfile = (data: UpdateProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleChangePassword = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  const handleDeleteAccount = (data: DeleteAccountForm) => {
    deleteAccountMutation.mutate(data);
  };

  const handleResendVerificationEmail = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Email não disponível.",
        variant: "destructive",
      });
      return;
    }

    setIsResendingEmail(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast({
          title: "Email reenviado!",
          description: data.message ?? "Verifique sua caixa de entrada (e a pasta de spam).",
        });
      } else {
        toast({
          title: "Não foi possível reenviar",
          description: data.message ?? "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao reenviar verificação:", error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais, altere sua senha ou exclua sua conta.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="address">
                <MapPin className="w-4 h-4 mr-2" />
                Endereço
              </TabsTrigger>
              <TabsTrigger value="password">
                <Lock className="w-4 h-4 mr-2" />
                Senha
              </TabsTrigger>
              <TabsTrigger value="delete">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </TabsTrigger>
            </TabsList>

            {/* Tab: Informações de Endereço */}
            <TabsContent value="address" className="space-y-4">
              <Form {...addressForm}>
                <form onSubmit={addressForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
                  <FormField
                    control={addressForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addressForm.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                placeholder="00000-000" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const cleanCep = e.target.value.replace(/\D/g, '');
                                  if (cleanCep.length === 8) {
                                    fetchAddressByCep(cleanCep);
                                  }
                                }}
                              />
                              {isLoadingCep && (
                                <Button type="button" variant="outline" disabled>
                                  Buscando...
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addressForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Atualizar location se for prestador
                              if (user?.isProviderEnabled) {
                                const city = addressForm.getValues('city');
                                if (city) {
                                  updateLocationFromCityState(city, value);
                                }
                              }
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BRAZILIAN_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label} ({state.value})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addressForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite sua cidade" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Atualizar location se for prestador
                              if (user?.isProviderEnabled) {
                                const state = addressForm.getValues('state');
                                if (state) {
                                  updateLocationFromCityState(e.target.value, state);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addressForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rua</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite a rua" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addressForm.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addressForm.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o número" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addressForm.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Apartamento, bloco, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campos de prestador (exibidos apenas se for prestador) */}
                  {user.isProviderEnabled && (
                    <>
                      <div className="pt-4 border-t">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Informações Profissionais</h3>
                      </div>

                      <FormField
                        control={addressForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Localização de Atendimento</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Cidade - Estado (ex: São Paulo - SP)" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Se o formato for "Cidade - Estado", atualizar city e state
                                  const value = e.target.value;
                                  const parts = value.split(' - ');
                                  if (parts.length === 2) {
                                    addressForm.setValue('city', parts[0].trim());
                                    addressForm.setValue('state', parts[1].trim());
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1">
                              Formato: Cidade - Estado (ex: São Paulo - SP)
                            </p>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addressForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sobre Mim</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Conte um pouco sobre você, suas especialidades e o que te motiva..."
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addressForm.control}
                        name="experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Experiência</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descreva sua experiência profissional, formação, certificações e trabalhos realizados..."
                                rows={4}
                                {...field}
                                value={field.value || ''} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Tab: Alterar Senha */}
            <TabsContent value="password" className="space-y-4">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="oldPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Antiga</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Digite sua senha antiga" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Digite sua nova senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirme sua nova senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reenviar email de verificação */}
                  {user && !user.emailVerified && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">
                        Não recebeu o email de confirmação? Reenvie para continuar.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleResendVerificationEmail}
                        disabled={isResendingEmail}
                      >
                        {isResendingEmail ? "Reenviando..." : "Reenviar email de verificação"}
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Tab: Excluir Conta */}
            <TabsContent value="delete" className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Atenção: Esta ação é irreversível</h3>
                    <p className="text-sm text-red-700">
                      Ao excluir sua conta, todos os seus dados serão permanentemente removidos. 
                      Esta ação não pode ser desfeita. Certifique-se de que não há serviços ativos 
                      antes de continuar.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...deleteForm}>
                <form onSubmit={deleteForm.handleSubmit((data) => setShowDeleteConfirm(true))} className="space-y-4">
                  <FormField
                    control={deleteForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirme sua senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Digite sua senha para confirmar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? "Excluindo..." : "Excluir Conta"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir sua conta? Esta ação é permanente e não pode ser desfeita. 
              Todos os seus dados serão removidos do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const password = deleteForm.getValues('password');
                handleDeleteAccount({ password });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, excluir conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

