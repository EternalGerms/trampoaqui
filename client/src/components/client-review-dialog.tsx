import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";

const clientReviewSchema = z.object({
  rating: z.number().min(1, "Avaliação deve ser de 1 a 5 estrelas").max(5),
  comment: z.string().min(10, "Comentário deve ter pelo menos 10 caracteres"),
});

type ClientReviewFormData = z.infer<typeof clientReviewSchema>;

interface ClientReviewDialogProps {
  requestId: string;
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientReviewDialog({ 
  requestId, 
  clientId, 
  clientName, 
  isOpen, 
  onOpenChange 
}: ClientReviewDialogProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<ClientReviewFormData>({
    resolver: zodResolver(clientReviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const createReviewMutation = useMutationWithToast({
    mutationFn: async (data: ClientReviewFormData) => {
      const response = await apiRequest("POST", "/api/reviews", {
        requestId,
        revieweeId: clientId,
        rating: data.rating,
        comment: data.comment,
      });
      return response.json();
    },
    successMessage: "Avaliação enviada!",
    successDescription: "Sua avaliação do cliente foi registrada com sucesso.",
    errorMessage: "Erro ao enviar avaliação",
    errorDescription: "Tente novamente mais tarde.",
    invalidateQueries: ["/api/requests/provider"],
    onSuccess: () => {
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = (data: ClientReviewFormData) => {
    createReviewMutation.mutate(data);
  };

  const handleRatingClick = (rating: number) => {
    form.setValue("rating", rating);
  };

  const currentRating = form.watch("rating");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar {clientName}</DialogTitle>
          <DialogDescription>
            Como foi sua experiência trabalhando com este cliente?
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Avaliação</FormLabel>
                  <FormControl>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingClick(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          {(hoveredRating >= star || currentRating >= star) ? (
                            <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <Star className="w-8 h-8 text-gray-300 hover:text-yellow-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentário</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte como foi trabalhar com este cliente..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createReviewMutation.isPending}
              >
                {createReviewMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
