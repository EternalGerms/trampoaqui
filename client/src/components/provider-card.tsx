import { ServiceProvider, User, ServiceCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Star, MapPin, MessageCircle } from "lucide-react";

interface ProviderCardProps {
  provider: ServiceProvider & { 
    user: User; 
    category: ServiceCategory; 
    averageRating: number; 
    reviewCount: number 
  };
  onContact: (providerId: string) => void;
}

export default function ProviderCard({ provider, onContact }: ProviderCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        <div className="text-6xl text-gray-400">
          <i className={provider.category.icon}></i>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{provider.user.name}</h3>
            <p className="text-primary-600 font-medium">{provider.category.name}</p>
          </div>
          <div className="flex items-center bg-success/10 px-2 py-1 rounded-full">
            <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
            <span className="text-gray-900 font-semibold text-sm">
              {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : "N/A"}
            </span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {provider.description}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            {Array.isArray(provider.pricingTypes) && provider.pricingTypes.length > 0 ? (
              <div className="space-y-1">
                {provider.pricingTypes.includes('hourly') && provider.minHourlyRate && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">⏰ Por hora:</span> R$ {provider.minHourlyRate}
                  </div>
                )}
                {provider.pricingTypes.includes('daily') && provider.minDailyRate && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">📅 Por dia:</span> R$ {provider.minDailyRate}
                  </div>
                )}
                {provider.pricingTypes.includes('fixed') && provider.minFixedRate && (
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">💰 Fixo:</span> R$ {provider.minFixedRate}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500 text-sm">Consultar valores</span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{provider.location}</span>
          </div>
        </div>
        
        <Button 
          onClick={() => onContact(provider.id)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Entrar em Contato
        </Button>
      </div>
    </div>
  );
}
