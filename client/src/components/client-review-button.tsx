import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle } from "lucide-react";

interface ReviewResponse {
  hasReview: boolean;
  review?: any;
}

interface ClientReviewButtonProps {
  requestId: string;
  onOpenReview: () => void;
}

export default function ClientReviewButton({ requestId, onOpenReview }: ClientReviewButtonProps) {
  const { data: reviewData, isLoading } = useQuery<ReviewResponse>({
    queryKey: ["/api/reviews/request", requestId],
    enabled: !!requestId,
  });

  const hasReview = reviewData?.hasReview;

  if (isLoading) {
    return (
      <Button 
        size="sm" 
        variant="outline"
        disabled
        className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
      >
        Carregando...
      </Button>
    );
  }

  if (hasReview) {
    return (
      <Button 
        size="sm" 
        variant="outline"
        disabled
        className="bg-green-50 text-green-700 border-green-200"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Cliente Já Avaliado
      </Button>
    );
  }

  return (
    <Button 
      size="sm" 
      variant="outline"
      onClick={onOpenReview}
      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
    >
      <Star className="w-4 h-4 mr-2" />
      Avaliar Cliente
    </Button>
  );
}
