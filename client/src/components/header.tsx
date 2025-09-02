import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Shield, Wallet } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Header() {
  const [location, setLocation] = useLocation();
  const currentUser = authManager.getUser();
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ["/api/users/me/balance"],
    queryFn: async () => {
      const response = await fetch('/api/users/me/balance', {
        headers: {
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });
      if (!response.ok) return { balance: 0 };
      return response.json();
    },
    enabled: !!currentUser?.isProviderEnabled,
  });

  const handleLogout = () => {
    authManager.logout();
    setLocation('/');
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) return;
    
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getToken()}`
        },
        body: JSON.stringify({ amount: parseFloat(withdrawalAmount) })
      });
      
      if (response.ok) {
        setWithdrawalAmount('');
        setIsWithdrawalDialogOpen(false);
        // Refresh balance
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating withdrawal:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <h1 className="text-2xl font-bold text-primary-600 cursor-pointer">
              TrampoAqui
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/services">
              <span className={`text-gray-600 hover:text-primary-600 cursor-pointer ${
                location === '/services' ? 'text-primary-600 font-medium' : ''
              }`}>
                Profissionais
              </span>
            </Link>
            {currentUser && (
              <Link href="/dashboard">
                <span className={`text-gray-600 hover:text-primary-600 cursor-pointer ${
                  location === '/dashboard' ? 'text-primary-600 font-medium' : ''
                }`}>
                  Dashboard
                </span>
              </Link>
            )}
            {currentUser && (
              <button
                onClick={() => {
                  setLocation(`/profile/${currentUser.id}`);
                }}
                className={`text-gray-600 hover:text-primary-600 cursor-pointer ${
                  location.includes('/profile/') ? 'text-primary-600 font-medium' : ''
                }`}
              >
                Meu Perfil
              </button>
            )}
            {currentUser?.isAdmin && (
              <Link href="/admin">
                <span className={`text-gray-600 hover:text-primary-600 cursor-pointer ${
                  location === '/admin' ? 'text-primary-600 font-medium' : ''
                }`}>
                  Admin
                </span>
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Balance for providers */}
                {currentUser.isProviderEnabled && (
                  <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        <span className="hidden sm:block">
                          R$ {balanceData?.balance?.toFixed(2) || '0,00'}
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Saque do Saldo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">Valor do Saque</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={balanceData?.balance || 0}
                            value={withdrawalAmount}
                            onChange={(e) => setWithdrawalAmount(e.target.value)}
                            placeholder="Digite o valor"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          Saldo disponível: R$ {balanceData?.balance?.toFixed(2) || '0,00'}
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsWithdrawalDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleWithdrawal}
                            disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                          >
                            Sacar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                <span className="text-gray-700 hidden sm:block">
                  Olá, <span className="font-medium">{currentUser.name}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Sair</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}