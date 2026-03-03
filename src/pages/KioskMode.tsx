import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, ShieldCheck, LogOut, ChevronRight, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isKioskEmail, KIOSK_EMAIL } from "@/lib/kiosk";
import { requestKioskFullscreen, exitKioskFullscreen } from "@/lib/kiosk-display";
import { clearKioskBrowserState, purgeCurrentKioskSessionData } from "@/lib/kiosk-session";

const KioskMode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCheckingKioskAccess, setIsCheckingKioskAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const enforceKioskAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (!user) {
        navigate("/auth?tab=signin", { replace: true });
        return;
      }

      if (!isKioskEmail(user.email)) {
        await supabase.auth.signOut();
        if (!isMounted) return;
        toast({
          title: "Kiosk Account Required",
          description: `Sign in with ${KIOSK_EMAIL} to use kiosk mode.`,
          variant: "destructive",
        });
        navigate("/auth?tab=signin", { replace: true });
        return;
      }

      setIsCheckingKioskAccess(false);
    };

    enforceKioskAccount();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  useEffect(() => {
    if (isCheckingKioskAccess) return;
    requestKioskFullscreen();
  }, [isCheckingKioskAccess]);

  const handleEndKioskSession = async () => {
    setIsSigningOut(true);
    try {
      const purgeResult = await purgeCurrentKioskSessionData();
      clearKioskBrowserState();
      if (purgeResult.failed > 0) {
        toast({
          title: "Kiosk Session Ended",
          description: `${purgeResult.deleted}/${purgeResult.total} scans were purged.`,
          variant: "destructive",
        });
      }
      await exitKioskFullscreen();
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to purge kiosk session data:", error);
      await exitKioskFullscreen();
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isCheckingKioskAccess) {
    return (
      <AppShell showFooter={false} className="bg-background">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying kiosk account...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      showFooter={false}
      className="bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_42%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--muted)))]"
      contentClassName="px-4 md:px-8 py-8 md:py-12"
    >
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Kiosk Session
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Kiosk Mode</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Touch-friendly scan flow for in-person demos and events.
            </p>
          </div>
          <Button variant="outline" onClick={handleEndKioskSession} disabled={isSigningOut}>
            {isSigningOut ? "Ending session..." : "Exit Kiosk"}
          </Button>
        </div>

        <Card className="border-primary/30 bg-card/85 p-6 md:p-8 shadow-soft">
          <div className="space-y-5">
            <h2 className="text-xl md:text-2xl font-semibold">Start a New Demo Scan</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Launch scanner with simplified controls and kiosk-safe navigation.
            </p>
            <Button
              size="lg"
              className="w-full md:w-auto min-w-[260px] text-base"
              onClick={async () => {
                await requestKioskFullscreen();
                toast({
                  title: "Kiosk scan started",
                  description: "Scanner is now running in kiosk mode.",
                });
                navigate("/upload?kiosk=1");
              }}
            >
              <ScanLine className="mr-2 h-5 w-5" />
              Start Scan
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">End Kiosk Session</h3>
              <p className="text-sm text-muted-foreground">
                Sign out this device after events or public use.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleEndKioskSession}
              disabled={isSigningOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign Out Device"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default KioskMode;
