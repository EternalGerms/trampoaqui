import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function EmailVerifiedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Obter token da URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('success');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
        });

        if (response.ok) {
          setStatus('success');
        } else {
          const data = await response.json();
          setErrorMessage(data.message || 'Erro ao verificar e-mail');
          setStatus('error');
        }
      } catch (error) {
        console.error('Erro ao verificar e-mail:', error);
        setErrorMessage('Erro de conexão ao verificar e-mail');
        setStatus('error');
      }
    };

    verifyEmail();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verificando...</CardTitle>
            <CardDescription>
              Aguarde enquanto verificamos seu e-mail.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Erro na Verificação</CardTitle>
            <CardDescription>
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-gray-600">
              O link de verificação pode estar expirado ou inválido.
            </p>
            <Link href="/login">
              <Button>Ir para o Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Conta Validada!</CardTitle>
          <CardDescription>
            Seu endereço de e-mail foi verificado com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-gray-600">
            Obrigado por confirmar seu e-mail. Agora você pode aproveitar todos os recursos da nossa plataforma.
          </p>
          <Link href="/login">
            <Button>Ir para o Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
