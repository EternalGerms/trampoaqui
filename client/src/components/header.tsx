import { Link, useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings } from "lucide-react";

export default function Header() {
  const [location, setLocation] = useLocation();
  const currentUser = authManager.getUser();

  const handleLogout = () => {
    authManager.logout();
    setLocation('/');
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
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700 hidden sm:block">
                  Olá,{" "}
                  <button
                    onClick={() => {
                      // Se for prestador, redireciona para o perfil público
                      if (currentUser.is_provider_enabled) {
                        // Buscar o primeiro provider do usuário
                        fetch(`/api/providers?userId=${currentUser.id}`)
                          .then(res => res.json())
                          .then(providers => {
                            if (providers && providers.length > 0) {
                              window.location.href = `/provider-profile/${providers[0].id}`;
                            } else {
                              window.location.href = '/provider-dashboard';
                            }
                          })
                          .catch(() => {
                            window.location.href = '/provider-dashboard';
                          });
                      } else {
                        window.location.href = '/dashboard';
                      }
                    }}
                    className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer underline decoration-dotted"
                  >
                    {currentUser.name}
                  </button>
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