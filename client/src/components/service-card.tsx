import { ServiceCategory } from "@shared/schema";

interface ServiceCardProps {
  category: ServiceCategory;
  providerCount: number;
  onSelect: (categoryId: string) => void;
}

export default function ServiceCard({ category, providerCount, onSelect }: ServiceCardProps) {
  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer group"
      onClick={() => onSelect(category.id)}
    >
      <div className="text-center">
        <div className="bg-primary-50 group-hover:bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
          <i className={`${category.icon} text-primary-600 text-2xl`}></i>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
        <p className="text-sm text-gray-600">{providerCount} profissionais</p>
      </div>
    </div>
  );
}
