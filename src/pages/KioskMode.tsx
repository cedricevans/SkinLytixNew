import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, ShieldCheck, LogOut, ChevronRight, Loader2, Link2, QrCode, Copy } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import invokeFunction from "@/lib/functions-client";
import { isKioskEmail, KIOSK_EMAIL } from "@/lib/kiosk";
import { requestKioskFullscreen, exitKioskFullscreen } from "@/lib/kiosk-display";
import { clearKioskBrowserState, purgeCurrentKioskSessionData } from "@/lib/kiosk-session";

const KIOSK_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type KioskTransferResponse = {
  ok: boolean;
  sessionId: string;
  scansCount: number;
  claimUrl: string;
  qrUrl: string;
  expiresAt: string;
  recipientEmail: string | null;
  emailSent: boolean;
  messageId: string | null;
};

const KioskMode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCheckingKioskAccess, setIsCheckingKioskAccess] = useState(true);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [activeTransferCount, setActiveTransferCount] = useState(0);
  const [latestTransfer, setLatestTransfer] = useState<KioskTransferResponse | null>(null);

  const loadKioskSnapshot = useCallback(async (kioskUserId?: string) => {
    const userId = kioskUserId || (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const [{ count }, { data: activeSessions }] = await Promise.all([
      supabase
        .from("user_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      (supabase as any)
        .from("kiosk_transfer_sessions")
        .select("id")
        .eq("kiosk_user_id", userId)
        .in("status", ["created", "magic_link_sent"])
        .gt("expires_at", new Date().toISOString()),
    ]);

    setScanCount(count || 0);
    setActiveTransferCount((activeSessions || []).length);
  }, []);

  const trackKioskEvent = useCallback(async (eventName: string, eventProperties: Record<string, unknown> = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_events").insert({
        user_id: user.id,
        event_name: eventName,
        event_category: "kiosk",
        event_properties: eventProperties,
        page_url: typeof window !== "undefined" ? window.location.pathname : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
    } catch {
      // no-op for analytics insert failures
    }
  }, []);

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
          title: "Switched to Kiosk Mode",
          description: "Your personal account has been securely logged out for privacy and security. Kiosk mode runs in isolation to protect your data.",
          variant: "default",
        });
        navigate("/auth?tab=signin", { replace: true });
        return;
      }

      await loadKioskSnapshot(user.id);
      await trackKioskEvent("kiosk_mode_opened");
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

  const handleEndKioskSession = useCallback(async (reason: "manual" | "timeout" = "manual") => {
    setIsSigningOut(true);
    try {
      const purgeResult = await purgeCurrentKioskSessionData();
      clearKioskBrowserState();
      await trackKioskEvent("kiosk_session_ended", {
        reason,
        deleted: purgeResult.deleted,
        failed: purgeResult.failed,
        skipped_protected: purgeResult.skippedProtected,
      });
      const summary = `${purgeResult.deleted}/${purgeResult.total} purged${purgeResult.skippedProtected > 0 ? `, ${purgeResult.skippedProtected} protected for transfer` : ""}.`;
      toast({
        title: "Kiosk Session Ended",
        description: summary,
        variant: purgeResult.failed > 0 ? "destructive" : "default",
      });
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
  }, [navigate, toast, trackKioskEvent]);

  useEffect(() => {
    if (isCheckingKioskAccess) return;

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    let timeoutId: number | undefined;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(async () => {
        toast({
          title: "Session Timed Out",
          description: "Kiosk session expired after 30 minutes of inactivity.",
        });
        await handleEndKioskSession("timeout");
      }, KIOSK_SESSION_TIMEOUT_MS);
    };

    resetTimer();
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [handleEndKioskSession, isCheckingKioskAccess, toast]);

  const createTransfer = async (sendEmail: boolean) => {
    if (scanCount <= 0) {
      toast({
        title: "No scans to transfer",
        description: "Run at least one kiosk scan before creating a transfer link.",
        variant: "destructive",
      });
      return;
    }

    const normalizedEmail = transferEmail.trim().toLowerCase();
    if (sendEmail && !normalizedEmail) {
      toast({
        title: "Email required",
        description: "Enter a customer email to send a magic link.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingTransfer(true);
      const response = await invokeFunction("create-kiosk-transfer", {
        email: sendEmail ? normalizedEmail : undefined,
        expiresInMinutes: 30,
        redirectBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      }) as KioskTransferResponse;

      setLatestTransfer(response);
      await loadKioskSnapshot();

      toast({
        title: sendEmail ? "Magic link sent" : "QR transfer ready",
        description: sendEmail
          ? `Session transfer sent to ${normalizedEmail}.`
          : "Scan the QR code from a mobile device to continue.",
      });
    } catch (error: any) {
      toast({
        title: "Unable to create transfer",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const copyClaimLink = async () => {
    if (!latestTransfer?.claimUrl) return;
    try {
      await navigator.clipboard.writeText(latestTransfer.claimUrl);
      toast({
        title: "Link copied",
        description: "Claim URL copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link. Copy it manually.",
        variant: "destructive",
      });
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
            <p className="text-xs text-muted-foreground">
              Active scans: <span className="font-semibold text-foreground">{scanCount}</span> • Open transfers:{" "}
              <span className="font-semibold text-foreground">{activeTransferCount}</span>
            </p>
          </div>
          <Button variant="outline" onClick={() => handleEndKioskSession("manual")} disabled={isSigningOut}>
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
                await trackKioskEvent("kiosk_scan_started");
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

        <Card className="border-primary/20 p-5 md:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Send Session To Customer Phone</h3>
            <p className="text-sm text-muted-foreground">
              Send a magic link or generate a QR handoff. Claimed scans move from kiosk account to customer account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kiosk-transfer-email">Customer Email (for magic link)</Label>
            <Input
              id="kiosk-transfer-email"
              type="email"
              value={transferEmail}
              onChange={(event) => setTransferEmail(event.target.value)}
              placeholder="customer@example.com"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => createTransfer(true)}
              disabled={isCreatingTransfer || isSigningOut || scanCount <= 0}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {isCreatingTransfer ? "Preparing..." : "Send Magic Link"}
            </Button>
            <Button
              variant="outline"
              onClick={() => createTransfer(false)}
              disabled={isCreatingTransfer || isSigningOut || scanCount <= 0}
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isCreatingTransfer ? "Preparing..." : "Generate QR Claim Link"}
            </Button>
          </div>

          {latestTransfer && (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-background/70">
              <p className="text-sm">
                Transfer ready. Expires at{" "}
                <span className="font-medium">{new Date(latestTransfer.expiresAt).toLocaleString()}</span>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs break-all bg-muted px-2 py-1 rounded">
                  {latestTransfer.claimUrl}
                </code>
                <Button variant="secondary" size="sm" onClick={copyClaimLink}>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <div className="w-full md:w-[220px]">
                <img src={latestTransfer.qrUrl} alt="Kiosk transfer QR code" className="rounded border w-full h-auto" />
              </div>
            </div>
          )}
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
              onClick={() => handleEndKioskSession("manual")}
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
