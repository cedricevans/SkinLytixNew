import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Smartphone, ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import invokeFunction from "@/lib/functions-client";
import { isKioskEmail } from "@/lib/kiosk";

type ClaimResponse = {
  ok: boolean;
  alreadyClaimed?: boolean;
  transferredCount: number;
  sessionId: string;
};

export default function KioskClaim() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const token = searchParams.get("token")?.trim() || "";

  const authNextUrl = useMemo(() => {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return `/auth?tab=signin&next=${next}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setIsAuthed(Boolean(user));
      setCurrentUserEmail(user?.email || null);
      setIsCheckingAuth(false);
    };

    checkUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session?.user));
      setCurrentUserEmail(session?.user?.email || null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleClaim = async () => {
    if (!token) {
      toast({
        title: "Missing transfer token",
        description: "Open this page from a valid kiosk claim link.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsClaiming(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(authNextUrl, { replace: true });
        return;
      }

      if (isKioskEmail(user.email)) {
        toast({
          title: "Invalid account",
          description: "Kiosk account cannot claim transfer sessions.",
          variant: "destructive",
        });
        return;
      }

      const response = await invokeFunction("claim-kiosk-transfer", { token }) as ClaimResponse;
      toast({
        title: response.alreadyClaimed ? "Session already claimed" : "Session claimed",
        description: response.alreadyClaimed
          ? "This transfer was already attached to your account."
          : `${response.transferredCount} scan(s) moved to your account.`,
      });
      navigate("/home", { replace: true });
    } catch (error: any) {
      toast({
        title: "Claim failed",
        description: error?.message || "Unable to claim kiosk session.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <AppShell showNavigation>
        <div className="container mx-auto py-16">
          <div className="flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking account session...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNavigation>
      <div className="container max-w-2xl mx-auto py-10">
        <Card className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-2 w-fit">
              <Smartphone className="h-4 w-4" />
              Kiosk Claim
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold">Claim Your Kiosk Session</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to attach your kiosk scans to your personal SkinLytix account.
            </p>
          </div>

          {!token && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              This link is missing a token. Please scan a fresh kiosk QR or request a new magic link.
            </div>
          )}

          {!isAuthed ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are not signed in yet. Continue to login, then return automatically to complete claim.
              </p>
              <Button onClick={() => navigate(authNextUrl)}>
                Continue To Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : isKioskEmail(currentUserEmail) ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                This browser is signed in as the kiosk account. Claim on your personal account instead.
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(authNextUrl, { replace: true });
                }}
              >
                Sign Out Kiosk And Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ready to claim this session to your current account.
              </p>
              <Button onClick={handleClaim} disabled={isClaiming || !token}>
                {isClaiming ? "Claiming..." : "Claim Session"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
