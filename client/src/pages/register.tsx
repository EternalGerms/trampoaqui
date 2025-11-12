import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Link } from "wouter";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),
  cpf: z.string()
    .min(11, "CPF deve ter pelo menos 11 dígitos")
    .max(14, "CPF deve ter no máximo 14 caracteres")
    .refine((cpf) => {
      const cleanCPF = cpf.replace(/\D/g, '');
      if (cleanCPF.length !== 11) return false;
      
      // Verifica se todos os dígitos são iguais
      if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
      
      // Validação do primeiro dígito verificador
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
      }
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
      
      // Validação do segundo dígito verificador
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
      
      return true;
    }, "CPF inválido"),
  birthDate: z.string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 18;
      }
      return age >= 18;
    }, "Usuário deve ter pelo menos 18 anos"),
  // Campos de endereço
  cep: z.string().min(8, "CEP deve ter pelo menos 8 dígitos"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  state: z.string().min(2, "Estado deve ter pelo menos 2 caracteres")
    .refine((state) => {
      const validStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
      ];
      return validStates.includes(state.toUpperCase());
    }, "Estado deve ser uma UF válida do Brasil"),
  street: z.string().min(2, "Rua deve ter pelo menos 2 caracteres"),
  neighborhood: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres"),
  number: z.string().optional(),
  hasNumber: z.boolean().default(true),
  complement: z.string().optional(),
}).refine((data) => {
  // Se hasNumber é true, o campo number deve estar preenchido
  if (data.hasNumber && (!data.number || data.number.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "O número do endereço é obrigatório quando o endereço possui número",
  path: ["number"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { toast } = useToast();

  // Função para buscar endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue('city', data.localidade);
        form.setValue('state', data.uf);
        form.setValue('street', data.logradouro);
        form.setValue('neighborhood', data.bairro);
        
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

  // Função para validar cidade e estado
  const validateCityState = async (city: string, state: string) => {
    if (!city || !state) return true;
    
    try {
      // Usar a API do IBGE para validar cidade e estado
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.toUpperCase()}/municipios`);
      const cities = await response.json();
      
      const cityExists = cities.some((c: any) => 
        c.nome.toLowerCase() === city.toLowerCase()
      );
      
      if (!cityExists) {
        toast({
          title: "Cidade não encontrada",
          description: `A cidade "${city}" não foi encontrada no estado ${state.toUpperCase()}.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    } catch (error) {
      // Se a API falhar, permitir o envio mas mostrar aviso
      toast({
        title: "Aviso",
        description: "Não foi possível validar a cidade/estado. Verifique se estão corretos.",
        variant: "default",
      });
      return true;
    }
  };

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      cpf: "",
      birthDate: "",
      cep: "",
      city: "",
      state: "",
      street: "",
      neighborhood: "",
      number: "",
      hasNumber: true,
      complement: "",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    
    // Validar cidade e estado antes de prosseguir
    const isCityStateValid = await validateCityState(data.city, data.state);
    if (!isCityStateValid) {
      setIsLoading(false);
      return;
    }
    
    try {
      await authManager.register(data);
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao TrampoAqui.",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="text-center mb-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary-600">TrampoAqui</h1>
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">Criar conta</CardTitle>
          <CardDescription className="text-center">
            Preencha os dados abaixo para criar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Sua senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          const cleanValue = value.replace(/\D/g, '');
                          if (cleanValue.length <= 11) {
                            const formatted = cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                            field.onChange(formatted);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento *</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        max={(() => {
                          const today = new Date();
                          const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                          return minDate.toISOString().split('T')[0];
                        })()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Seção de Endereço */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
                
                {/* CEP */}
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="00000-000" 
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              const cleanValue = value.replace(/\D/g, '');
                              if (cleanValue.length <= 8) {
                                const formatted = cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2');
                                field.onChange(formatted);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.length >= 8) {
                                fetchAddressByCep(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        {isLoadingCep && (
                          <div className="flex items-center text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                            Buscando...
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cidade e Estado */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Sua cidade" {...field} />
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
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="UF" {...field} maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Rua */}
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da rua" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bairro e Número */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123" 
                            {...field} 
                            disabled={!form.watch('hasNumber')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Checkbox para residência sem número */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasNumber"
                    checked={!form.watch('hasNumber')}
                    onChange={(e) => {
                      form.setValue('hasNumber', !e.target.checked);
                      if (e.target.checked) {
                        form.setValue('number', '');
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="hasNumber" className="text-sm text-gray-600">
                    Sem número
                  </label>
                </div>

                {/* Complemento */}
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Apartamento, bloco, andar, etc." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary-600 hover:bg-primary-700"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Entre aqui
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
