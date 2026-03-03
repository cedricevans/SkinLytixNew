import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import invokeFunction from "@/lib/functions-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OfferRow = {
  id: string;
  email: string;
  promo_code: string;
  status: "pending" | "sent" | "activated" | "expired" | "cancelled";
  email_sent_at: string | null;
  updated_at: string;
  user_id: string | null;
};

type SendResult = {
  email: string;
  offer_id: string;
  ok: boolean;
  message: string;
  message_id?: string | null;
};

type SendResponse = {
  ok: boolean;
  mode: "pending" | "single";
  dryRun?: boolean;
  attempted: number;
  sent: number;
  failed: number;
  redirectTo: string;
  results: SendResult[];
};

export default function WaitlistMagicLinkManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [singleEmail, setSingleEmail] = useState("");
  const [batchLimit, setBatchLimit] = useState("25");
  const [singleDialogOpen, setSingleDialogOpen] = useState(false);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [lastRun, setLastRun] = useState<SendResponse | null>(null);

  const pendingCount = useMemo(() => offers.filter((o) => o.status === "pending").length, [offers]);
  const sentCount = useMemo(() => offers.filter((o) => o.status === "sent").length, [offers]);
  const activatedCount = useMemo(() => offers.filter((o) => o.status === "activated").length, [offers]);
  const linkedCount = useMemo(() => offers.filter((o) => Boolean(o.user_id)).length, [offers]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("waitlist_special_pricing")
        .select("id,email,promo_code,status,email_sent_at,updated_at,user_id")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setOffers((data || []) as OfferRow[]);
    } catch (error: any) {
      toast({
        title: "Error loading waitlist offers",
        description: error?.message || "Unable to load waitlist data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleSendPendingBatch = async () => {
    const limit = Math.max(1, Math.min(100, Number(batchLimit) || 25));
    try {
      setSendingBatch(true);
      const response = (await invokeFunction("send-waitlist-magic-links", {
        mode: "pending",
        limit,
      })) as SendResponse;

      setLastRun(response);
      toast({
        title: "Batch send completed",
        description: `Sent: ${response.sent}, Failed: ${response.failed}, Attempted: ${response.attempted}`,
      });
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Batch send failed",
        description: error?.message || "Unable to send waitlist links.",
        variant: "destructive",
      });
    } finally {
      setSendingBatch(false);
    }
  };

  const handleSendSingle = async () => {
    const email = singleEmail.trim().toLowerCase();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter the email to send a waitlist magic link.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingSingle(true);
      const response = (await invokeFunction("send-waitlist-magic-links", {
        mode: "single",
        email,
        limit: 1,
      })) as SendResponse;

      setLastRun(response);
      toast({
        title: "Single send completed",
        description: `Sent: ${response.sent}, Failed: ${response.failed}`,
      });
      setSingleDialogOpen(false);
      setSingleEmail("");
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Single send failed",
        description: error?.message || "Unable to send the waitlist link.",
        variant: "destructive",
      });
    } finally {
      setSendingSingle(false);
    }
  };

  const openSingleSendForEmail = (email: string) => {
    setSingleEmail(email);
    setSingleDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Magic Link Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send Brevo-powered magic links to waitlisted users and track send status plus signup linkage.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{sentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Activated</p>
                <p className="text-2xl font-bold">{activatedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Linked Accounts</p>
                <p className="text-2xl font-bold">{linkedCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Input
                value={batchLimit}
                onChange={(e) => setBatchLimit(e.target.value)}
                className="w-24"
                inputMode="numeric"
              />
              <span className="text-sm text-muted-foreground">batch size</span>
            </div>

            <Button onClick={handleSendPendingBatch} disabled={sendingBatch}>
              {sendingBatch ? "Sending..." : "Send Pending Waitlist Links"}
            </Button>

            <Dialog open={singleDialogOpen} onOpenChange={setSingleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Send Single Email</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Single Waitlist Link</DialogTitle>
                  <DialogDescription>
                    Send one magic-link campaign email to a specific waitlist address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="waitlister@example.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleSendSingle} disabled={sendingSingle}>
                    {sendingSingle ? "Sending..." : "Send Waitlist Link"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle>Last Send Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Mode: <strong>{lastRun.mode}</strong>
            </p>
            <p>
              Attempted: <strong>{lastRun.attempted}</strong> | Sent: <strong>{lastRun.sent}</strong> | Failed:{" "}
              <strong>{lastRun.failed}</strong>
            </p>
            <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
              {lastRun.results.map((result) => (
                <div key={`${result.offer_id}-${result.email}`} className="flex items-start justify-between gap-2">
                  <span className="break-all">{result.email}</span>
                  <Badge variant={result.ok ? "default" : "destructive"}>{result.ok ? "sent" : "failed"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Waitlist Offers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading waitlist offers...</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No waitlist offers found.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Sent At</th>
                    <th className="text-left p-2">Linked</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.slice(0, 100).map((offer) => (
                    <tr key={offer.id} className="border-b">
                      <td className="p-2 break-all">
                        <button
                          type="button"
                          className="text-left text-primary hover:underline"
                          onClick={() => openSingleSendForEmail(offer.email)}
                        >
                          {offer.email}
                        </button>
                      </td>
                      <td className="p-2">
                        <Badge variant={offer.status === "activated" ? "default" : "secondary"}>{offer.status}</Badge>
                      </td>
                      <td className="p-2">
                        {offer.email_sent_at ? new Date(offer.email_sent_at).toLocaleString() : "Not sent"}
                      </td>
                      <td className="p-2">{offer.user_id ? "Yes" : "No"}</td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSingleSendForEmail(offer.email)}
                        >
                          Send
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
