import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ProviderCard from "@/components/provider-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Filter } from "lucide-react";
import { ServiceCategory, ServiceProvider, User } from "@shared/schema";

type ProviderWithDetails = ServiceProvider & { 
  user: User; 
  category: ServiceCategory; 
  averageRating: number; 
  reviewCount: number 
};

export default function Services() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [location, setLocationState] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  // Get initial filters from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const searchParam = urlParams.get('search');
    const locationParam = urlParams.get('location');
    
    if (categoryParam) setSelectedCategory(categoryParam);
    if (searchParam) setSearchQuery(searchParam);
    if (locationParam) setLocationState(locationParam);
  }, []);

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProviders = [], isLoading } = useQuery<ProviderWithDetails[]>({
    queryKey: selectedCategory && selectedCategory !== 'all' ? ["/api/providers", { categoryId: selectedCategory }] : ["/api/providers"],
  });

  const filteredProviders = useMemo(() => {
    let filtered = allProviders;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(provider => 
        provider.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by location
    if (location) {
      filtered = filtered.filter(provider => 
        provider.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Sort providers
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "price_low":
        filtered.sort((a, b) => {
          const getMinPrice = (provider: any) => {
            const prices = [];
            if (provider.minHourlyRate) prices.push(parseFloat(provider.minHourlyRate));
            if (provider.minDailyRate) prices.push(parseFloat(provider.minDailyRate));
            if (provider.minFixedRate) prices.push(parseFloat(provider.minFixedRate));
            return prices.length > 0 ? Math.min(...prices) : Infinity;
          };
          return getMinPrice(a) - getMinPrice(b);
        });
        break;
      case "price_high":
        filtered.sort((a, b) => {
          const getMinPrice = (provider: any) => {
            const prices = [];
            if (provider.minHourlyRate) prices.push(parseFloat(provider.minHourlyRate));
            if (provider.minDailyRate) prices.push(parseFloat(provider.minDailyRate));
            if (provider.minFixedRate) prices.push(parseFloat(provider.minFixedRate));
            return prices.length > 0 ? Math.min(...prices) : -Infinity;
          };
          return getMinPrice(b) - getMinPrice(a);
        });
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return filtered;
  }, [allProviders, searchQuery, location, sortBy]);

  const handleContactProvider = (providerId: string) => {
    setLocation(`/provider/${providerId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Encontre Profissionais</h1>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Buscar profissionais..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              
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
                  placeholder="Localização"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocationState(e.target.value)}
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Melhor avaliados</SelectItem>
                  <SelectItem value="price_low">Menor preço</SelectItem>
                  <SelectItem value="price_high">Maior preço</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <p className="text-gray-600">
                {filteredProviders.length} profissionais encontrados
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setLocationState("");
                  setSortBy("rating");
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                  <div className="w-full h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onContact={handleContactProvider}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">
                <Search />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum profissional encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Tente ajustar seus filtros ou buscar por outros termos
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setLocationState("");
                  setSortBy("rating");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
