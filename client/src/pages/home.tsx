import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ServiceCard from "@/components/service-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Shield, Star, MessageCircle, Headphones } from "lucide-react";
import { ServiceCategory, ServiceProvider, User } from "@shared/schema";

type ProviderWithDetails = ServiceProvider & { 
  user: User; 
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [location, setLocationState] = useState("");

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: providers = [] } = useQuery<ProviderWithDetails[]>({
    queryKey: ["/api/providers"],
  });

  const handleCategorySelect = (categoryId: string) => {
    setLocation(`/services?category=${categoryId}`);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    if (location) params.set('location', location);
    
    setLocation(`/services?${params.toString()}`);
  };

  const handleFindServices = () => {
    setLocation('/services');
  };

  const handleRegisterProvider = () => {
    setLocation('/register?type=provider');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Conecte-se aos <span className="text-primary-600">melhores profissionais</span> da sua comunidade
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Encontre rapidamente serviços de qualidade perto de você. Eletricistas, encanadores, faxineiras, marido de aluguel e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleFindServices} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors inline-flex items-center justify-center">
                  <Search className="w-5 h-5 mr-2" />
                  Encontrar Serviços
                </Button>
                <Button onClick={handleRegisterProvider} variant="outline" className="border-2 border-primary-600 text-primary-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-medium transition-colors">
                  Oferecer Serviços
                </Button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Profissionais trabalhando em comunidade" 
                className="rounded-2xl shadow-2xl w-full" 
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg hidden lg:block">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Star className="w-5 h-5 text-green-600 fill-current" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">4.8/5</p>
                    <p className="text-sm text-gray-600">Avaliação média</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Encontre o profissional ideal</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Use nossa busca inteligente para encontrar profissionais qualificados na sua região
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Sua localização"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocationState(e.target.value)}
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <Button onClick={handleSearch} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-lg text-lg font-medium transition-colors flex items-center justify-center">
                <Search className="w-5 h-5 mr-2" />
                Buscar Profissionais
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Serviços Disponíveis</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre o profissional certo para qualquer necessidade da sua casa ou negócio
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const providerCount = providers.filter(p => p.categoryId === category.id).length;
              return (
                <ServiceCard
                  key={category.id}
                  category={category}
                  providerCount={providerCount}
                  onSelect={handleCategorySelect}
                />
              );
            })}
          </div>
        </div>
      </section>



      {/* Trust & Safety */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Segurança e Confiança</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sua segurança é nossa prioridade. Conheça nossas medidas de proteção
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Verificação de Perfis</h3>
              <p className="text-gray-600 text-sm">
                Todos os profissionais passam por verificação de identidade e qualificações
              </p>
            </div>

            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Star className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sistema de Avaliações</h3>
              <p className="text-gray-600 text-sm">
                Avaliações reais de clientes ajudam você a escolher os melhores profissionais
              </p>
            </div>

            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Chat Seguro</h3>
              <p className="text-gray-600 text-sm">
                Comunique-se com segurança através da nossa plataforma protegida
              </p>
            </div>

            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Headphones className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Suporte 24/7</h3>
              <p className="text-gray-600 text-sm">
                Nossa equipe está sempre disponível para ajudar com qualquer questão
              </p>
            </div>
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}
