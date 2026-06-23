import { useEffect } from "react";
import { useGetProvisioningStatus, getGetProvisioningStatusQueryKey } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Success() {
  const sessionId = sessionStorage.getItem("vilo_session_id") ?? "";

  // Clean any leftover query params from the URL bar immediately
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { data, isLoading } = useGetProvisioningStatus(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetProvisioningStatusQueryKey(sessionId),
      refetchInterval: (q) => (q?.state?.data?.status !== "active" ? 3000 : false),
    },
  });

  // Clear sessionStorage once the number is active so a refresh shows "no session"
  useEffect(() => {
    if (data?.status === "active") {
      sessionStorage.removeItem("vilo_session_id");
    }
  }, [data?.status]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold uppercase tracking-tight mb-4 text-destructive">Invalid Request</h1>
          <p className="text-muted-foreground mb-8">No session found. Please complete checkout first.</p>
          <Link href="/">
            <Button className="w-full font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPending = !data || data.status === "pending" || isLoading;
  const isActive = data?.status === "active";
  const isFailed = data?.status === "failed";

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="max-w-xl w-full bg-card border border-border p-12 rounded-2xl relative z-10 shadow-2xl backdrop-blur-sm text-center">

        {isPending && (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20" />
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>

            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Activating</h1>
              <p className="text-muted-foreground">
                We are configuring your Vilo agent and acquiring your dedicated phone number. This usually takes less than 30 seconds.
              </p>
            </div>

            <div className="p-4 bg-background/50 border border-border rounded-lg font-mono text-sm text-left space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">{`>`}</span> Payment confirmed.
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">{`>`}</span> Searching available numbers...
              </div>
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <span className="text-primary">{`>`}</span> Binding agent...
              </div>
            </div>
          </div>
        )}

        {isActive && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/20 border border-primary flex items-center justify-center shadow-[0_0_40px_rgba(20,255,100,0.3)]">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Number Active</h1>
              <p className="text-muted-foreground mb-8">
                Your AI agent is live. Save this number.
              </p>

              <div className="p-6 bg-black border border-primary/30 rounded-xl mb-8">
                <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Your Vilo Number</div>
                <div className="text-4xl sm:text-5xl font-black text-primary tracking-tighter">
                  {data.viloNumber}
                </div>
              </div>

              <Link href="/">
                <Button className="w-full h-14 font-bold uppercase tracking-widest bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Back to Home
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <div className="w-10 h-10 text-destructive text-4xl font-black">!</div>
            </div>

            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Setup Failed</h1>
              <p className="text-muted-foreground mb-8">
                Something went wrong while setting up your number. Please contact support.
              </p>

              <Link href="/">
                <Button className="w-full h-14 font-bold uppercase tracking-widest bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
