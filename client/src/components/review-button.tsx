import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle } from "lucide-react";

interface ReviewResponse {
  hasReview: boolean;
  review?: any;
}

interface ReviewButtonProps {
  requestId: string;
  onOpenReview: () => void;
}

export default function ReviewButton({ requestId, onOpenReview }: ReviewButtonProps) {
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
        className="mt-2"
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
        className="mt-2 bg-green-50 text-green-700 border-green-200"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Já Avaliado
      </Button>
    );
  }

  return (
    <Button 
      size="sm"
      variant="outline"
      onClick={onOpenReview}
      className="mt-2"
    >
      <Star className="w-4 h-4 mr-2" />
      Avaliar Serviço
    </Button>
  );
}
