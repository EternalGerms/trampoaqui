import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export interface UseMutationWithToastOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage: string;
  successDescription?: string;
  errorMessage: string;
  errorDescription?: string;
  invalidateQueries?: string[];
  skipDefaultErrorToast?: boolean; // Pula toast padrão de erro se onError custom já tratar
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void | Promise<void>;
  // Permite encaminhar outras opções do useMutation
  mutationOptions?: Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn' | 'onSuccess' | 'onError'>;
}

export function useMutationWithToast<TData, TVariables, TContext = unknown>(
  options: UseMutationWithToastOptions<TData, TVariables, TContext>
): UseMutationResult<TData, Error, TVariables, TContext> {
  const { toast } = useToast();
  const {
    mutationFn,
    successMessage,
    successDescription,
    errorMessage,
    errorDescription,
    invalidateQueries,
    skipDefaultErrorToast,
    onSuccess: customOnSuccess,
    onError: customOnError,
    mutationOptions,
  } = options;

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      toast({
        title: successMessage,
        description: successDescription,
      });

      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      if (customOnSuccess) {
        await customOnSuccess(data, variables, context);
      }
    },
    onError: async (error, variables, context) => {
      if (skipDefaultErrorToast && customOnError) {
        await customOnError(error, variables, context);
        return;
      }

      toast({
        title: errorMessage,
        description: errorDescription || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });

      if (customOnError) {
        await customOnError(error, variables, context);
      }
    },
  });
}

