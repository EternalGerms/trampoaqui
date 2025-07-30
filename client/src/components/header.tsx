import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthenticated = authManager.isAuthenticated();
  const user = authManager.getUser();

  const handleLogout = () => {
    authManager.logout();
    setLocation("/");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary-600">TrampoAqui</h1>
            </Link>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              <Link href="/services" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors">
                Serviços
              </Link>
              <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors">
                Como Funciona
              </a>
              <a href="#providers" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors">
                Profissionais
              </a>
              <a href="#about" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors">
                Sobre
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700 text-sm">Olá, {user?.name}</span>
                {user?.userType === 'provider' && (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={handleLogout} size="sm">
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Cadastrar-se
                  </Button>
                </Link>
              </>
            )}
            
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Link href="/services" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Serviços
              </Link>
              <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Como Funciona
              </a>
              <a href="#providers" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Profissionais
              </a>
              <a href="#about" className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Sobre
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
