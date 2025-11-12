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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const authResponse = await authManager.login(data.email, data.password);
      const isEmailVerified = authResponse?.user?.emailVerified ?? false;

      toast({
        title: "Login realizado com sucesso!",
        description: isEmailVerified
          ? "Bem-vindo de volta."
          : "Bem-vindo de volta! Confirme seu e-mail para aproveitar todos os recursos.",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Email ou senha incorretos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const emailValue = form.getValues("email")?.trim();

    if (!emailValue) {
      toast({
        title: "Informe seu email",
        description: "Digite o email que deseja verificar antes de reenviar.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailValue }),
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
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="text-center mb-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary-600">TrampoAqui</h1>
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">Entrar na sua conta</CardTitle>
          <CardDescription className="text-center">
            Digite seu email e senha para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button 
                type="submit" 
                className="w-full bg-primary-600 hover:bg-primary-700"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="pt-2 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  Não recebeu o email de confirmação? Reenvie para continuar.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? "Reenviando..." : "Reenviar email de verificação"}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Cadastre-se aqui
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
