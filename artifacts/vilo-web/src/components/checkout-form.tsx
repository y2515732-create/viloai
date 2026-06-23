import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCheckout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const checkoutSchema = z.object({
  userName: z.string().min(2, "Name is required"),
  userEmail: z.string().email("Invalid email address"),
  userPhone: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutForm() {
  const { toast } = useToast();
  const createCheckout = useCreateCheckout();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      userName: "",
      userEmail: "",
      userPhone: "",
    },
  });

  const onSubmit = (data: CheckoutFormValues) => {
    createCheckout.mutate(
      { data },
      {
        onSuccess: (result) => {
          sessionStorage.setItem("vilo_session_id", result.sessionId);
          window.location.href = result.url;
        },
        onError: () => {
          toast({
            title: "Failed to initialize checkout",
            description: "Please try again later.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-md mx-auto relative z-10" data-testid="form-checkout">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input 
                    placeholder="YOUR NAME" 
                    className="h-14 bg-background/50 border-border/50 text-lg uppercase tracking-wider backdrop-blur-md focus:border-primary/50 transition-colors" 
                    data-testid="input-name"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userEmail"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="EMAIL ADDRESS" 
                    className="h-14 bg-background/50 border-border/50 text-lg uppercase tracking-wider backdrop-blur-md focus:border-primary/50 transition-colors" 
                    data-testid="input-email"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userPhone"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder="CURRENT PHONE (OPTIONAL)" 
                    className="h-14 bg-background/50 border-border/50 text-lg uppercase tracking-wider backdrop-blur-md focus:border-primary/50 transition-colors" 
                    data-testid="input-phone"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={createCheckout.isPending}
          className="w-full h-16 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(20,255,100,0.3)] hover:shadow-[0_0_60px_rgba(20,255,100,0.5)]"
          data-testid="button-submit-checkout"
        >
          {createCheckout.isPending ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-6 w-6" />
          )}
          Get Your AI Number — $3.98
        </Button>
        <p className="text-center text-sm text-muted-foreground font-mono mt-4 uppercase tracking-widest">
          One-time payment. No subscriptions.
        </p>
      </form>
    </Form>
  );
}
