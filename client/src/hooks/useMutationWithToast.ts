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
  skipDefaultErrorToast?: boolean; // Skip default error toast if custom onError handles it
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void | Promise<void>;
  // Allow passing through other useMutation options
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
      // Show success toast
      toast({
        title: successMessage,
        description: successDescription,
      });

      // Invalidate queries if provided
      if (invalidateQueries) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      // Call custom onSuccess if provided
      if (customOnSuccess) {
        await customOnSuccess(data, variables, context);
      }
    },
    onError: async (error, variables, context) => {
      // If skipDefaultErrorToast is true and customOnError exists, only call customOnError
      if (skipDefaultErrorToast && customOnError) {
        await customOnError(error, variables, context);
        return;
      }

      // Show default error toast
      toast({
        title: errorMessage,
        description: errorDescription || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });

      // Call custom onError if provided (after showing default toast)
      if (customOnError) {
        await customOnError(error, variables, context);
      }
    },
  });
}

