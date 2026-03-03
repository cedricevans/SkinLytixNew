import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

type TransferSessionRow = {
  id: string;
  status: "created" | "magic_link_sent" | "claimed" | "expired" | "cancelled";
  recipient_email: string | null;
  created_at: string;
  expires_at: string;
  claimed_at: string | null;
  magic_link_sent_at: string | null;
};

type TransferItemRow = {
  session_id: string;
  created_at: string;
  transferred_at: string | null;
};

type KioskMetrics = {
  sessions7d: number;
  claims7d: number;
  magicLinks7d: number;
  claimRate7d: number;
  scansCaptured7d: number;
  scansTransferred7d: number;
  activeTransfers: number;
};

const initialMetrics: KioskMetrics = {
  sessions7d: 0,
  claims7d: 0,
  magicLinks7d: 0,
  claimRate7d: 0,
  scansCaptured7d: 0,
  scansTransferred7d: 0,
  activeTransfers: 0,
};

const startOfLookback = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default function KioskAnalyticsManager() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<TransferSessionRow[]>([]);
  const [items, setItems] = useState<TransferItemRow[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: sessionsData, error: sessionsError }, { data: itemsData, error: itemsError }] =
        await Promise.all([
          (supabase as any)
            .from("kiosk_transfer_sessions")
            .select("id,status,recipient_email,created_at,expires_at,claimed_at,magic_link_sent_at")
            .order("created_at", { ascending: false })
            .limit(500),
          (supabase as any)
            .from("kiosk_transfer_items")
            .select("session_id,created_at,transferred_at")
            .order("created_at", { ascending: false })
            .limit(2000),
        ]);

      if (sessionsError) throw sessionsError;
      if (itemsError) throw itemsError;

      setSessions((sessionsData || []) as TransferSessionRow[]);
      setItems((itemsData || []) as TransferItemRow[]);
    } catch (error) {
      console.error("Failed to load kiosk analytics:", error);
      setSessions([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const itemCountBySession = useMemo(() => {
    const counts = new Map<string, number>();
    const transferred = new Map<string, number>();

    for (const item of items) {
      counts.set(item.session_id, (counts.get(item.session_id) || 0) + 1);
      if (item.transferred_at) {
        transferred.set(item.session_id, (transferred.get(item.session_id) || 0) + 1);
      }
    }

    return { counts, transferred };
  }, [items]);

  const metrics = useMemo<KioskMetrics>(() => {
    const since = startOfLookback().getTime();
    const now = Date.now();

    const sessions7d = sessions.filter((row) => new Date(row.created_at).getTime() >= since).length;
    const claims7d = sessions.filter((row) => row.claimed_at && new Date(row.claimed_at).getTime() >= since).length;
    const magicLinks7d = sessions.filter(
      (row) => row.magic_link_sent_at && new Date(row.magic_link_sent_at).getTime() >= since,
    ).length;
    const scansCaptured7d = items.filter((row) => new Date(row.created_at).getTime() >= since).length;
    const scansTransferred7d = items.filter(
      (row) => row.transferred_at && new Date(row.transferred_at).getTime() >= since,
    ).length;
    const activeTransfers = sessions.filter((row) =>
      (row.status === "created" || row.status === "magic_link_sent") && new Date(row.expires_at).getTime() > now,
    ).length;

    return {
      sessions7d,
      claims7d,
      magicLinks7d,
      claimRate7d: sessions7d > 0 ? Math.round((claims7d / sessions7d) * 1000) / 10 : 0,
      scansCaptured7d,
      scansTransferred7d,
      activeTransfers,
    };
  }, [items, sessions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Kiosk Transfer Analytics (7 Days)</CardTitle>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Kiosk Sessions</p>
              <p className="text-2xl font-bold">{metrics.sessions7d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Claims</p>
              <p className="text-2xl font-bold">{metrics.claims7d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Claim Rate</p>
              <p className="text-2xl font-bold">{metrics.claimRate7d}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Active Transfers</p>
              <p className="text-2xl font-bold">{metrics.activeTransfers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Magic Links Sent</p>
              <p className="text-2xl font-bold">{metrics.magicLinks7d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Scans Captured</p>
              <p className="text-2xl font-bold">{metrics.scansCaptured7d}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Scans Transferred</p>
              <p className="text-2xl font-bold">{metrics.scansTransferred7d}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Kiosk Transfer Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading kiosk analytics...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No kiosk transfer sessions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Created</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Scans</TableHead>
                    <TableHead className="whitespace-nowrap">Transferred</TableHead>
                    <TableHead className="whitespace-nowrap">Claimed At</TableHead>
                    <TableHead className="whitespace-nowrap">Expires At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 50).map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(session.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.status === "claimed" ? "default" : "secondary"}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">{session.recipient_email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{itemCountBySession.counts.get(session.id) || 0}</TableCell>
                      <TableCell className="whitespace-nowrap">{itemCountBySession.transferred.get(session.id) || 0}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {session.claimed_at ? new Date(session.claimed_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(session.expires_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
