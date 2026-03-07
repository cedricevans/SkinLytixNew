import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle2, RotateCcw, Search, XCircle } from "lucide-react";

type QueueStatus = "pending" | "needs_revision" | "approved" | "rejected";

interface ModerationQueueItem {
  id: string;
  analysis_id: string | null;
  ingredient_name: string;
  verdict: string | null;
  corrected_safety_level: string | null;
  compatibility_assessment: string | null;
  compatibility_notes: string | null;
  nuance_flags: string[] | null;
  public_explanation: string | null;
  internal_notes: string | null;
  moderator_review_status: QueueStatus | null;
  updated_at: string | null;
  validator_id: string;
  user_analyses?: {
    id: string;
    product_name: string | null;
    brand: string | null;
    user_id: string;
  } | null;
}

export default function ModerationQueueManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [ownerSkinTypeMap, setOwnerSkinTypeMap] = useState<Map<string, string>>(new Map());
  const [reviewerEmailMap, setReviewerEmailMap] = useState<Map<string, string>>(new Map());

  const loadQueue = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("ingredient_validations")
        .select(
          "id, analysis_id, ingredient_name, verdict, corrected_safety_level, compatibility_assessment, compatibility_notes, nuance_flags, public_explanation, internal_notes, moderator_review_status, updated_at, validator_id, user_analyses:analysis_id (id, product_name, brand, user_id)"
        )
        .in("moderator_review_status", ["pending", "needs_revision"])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const queueItems = (data || []) as ModerationQueueItem[];
      setItems(queueItems);

      const ownerIds = Array.from(
        new Set(queueItems.map((item) => item.user_analyses?.user_id).filter(Boolean))
      ) as string[];

      const reviewerIds = Array.from(
        new Set(queueItems.map((item) => item.validator_id).filter(Boolean))
      ) as string[];

      const [ownerProfiles, reviewerProfiles] = await Promise.all([
        ownerIds.length
          ? supabase.from("profiles").select("id, skin_type").in("id", ownerIds)
          : Promise.resolve({ data: [] as any[] }),
        reviewerIds.length
          ? supabase.from("profiles").select("id, email").in("id", reviewerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const ownerMap = new Map<string, string>();
      (ownerProfiles.data || []).forEach((row: any) => {
        if (!row?.id) return;
        ownerMap.set(row.id, row.skin_type ? String(row.skin_type) : "Unknown");
      });
      setOwnerSkinTypeMap(ownerMap);

      const reviewerMap = new Map<string, string>();
      (reviewerProfiles.data || []).forEach((row: any) => {
        if (!row?.id) return;
        reviewerMap.set(row.id, row.email ? String(row.email) : "Unknown");
      });
      setReviewerEmailMap(reviewerMap);
    } catch (error: any) {
      console.error("Failed to load moderation queue:", error);
      toast({
        title: "Error loading moderation queue",
        description: error?.message || "Unable to load pending validations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const product = item.user_analyses?.product_name?.toLowerCase() || "";
      const brand = item.user_analyses?.brand?.toLowerCase() || "";
      const ingredient = item.ingredient_name.toLowerCase();
      const reviewer = (reviewerEmailMap.get(item.validator_id) || "").toLowerCase();
      return product.includes(q) || brand.includes(q) || ingredient.includes(q) || reviewer.includes(q);
    });
  }, [items, search, reviewerEmailMap]);

  const applyDecision = async (status: QueueStatus) => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const updates: Record<string, any> = {
        moderator_review_status: status,
      };
      if (feedback.trim()) {
        updates.moderator_feedback = feedback.trim();
      }

      const { error } = await (supabase as any)
        .from("ingredient_validations")
        .update(updates)
        .eq("id", selectedItem.id);

      if (error) throw error;

      toast({
        title: "Moderation updated",
        description: `Validation marked as ${status.replace("_", " ")}.`,
      });

      setSelectedItem(null);
      setFeedback("");
      await loadQueue();
    } catch (error: any) {
      console.error("Failed to update moderation status:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Could not update moderation decision.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status?: string | null) => {
    if (status === "needs_revision") return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    return "bg-blue-500/10 text-blue-700 border-blue-500/30";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Validation Moderation Queue</CardTitle>
            <CardDescription>
              Review and approve reviewer submissions before user-facing updates are treated as final.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadQueue()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, ingredient, reviewer..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading moderation queue...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending moderation items.</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Product</TableHead>
                  <TableHead className="whitespace-nowrap">Ingredient</TableHead>
                  <TableHead className="whitespace-nowrap">Reviewer Label</TableHead>
                  <TableHead className="whitespace-nowrap">Compatibility</TableHead>
                  <TableHead className="whitespace-nowrap">User Skin Type</TableHead>
                  <TableHead className="whitespace-nowrap">Reviewer</TableHead>
                  <TableHead className="whitespace-nowrap">Updated</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const ownerId = item.user_analyses?.user_id || "";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={getStatusBadgeClass(item.moderator_review_status)}>
                          {item.moderator_review_status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="font-medium truncate">{item.user_analyses?.product_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.user_analyses?.brand || "—"}</p>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{item.ingredient_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{item.corrected_safety_level || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{item.compatibility_assessment || "unknown"}</TableCell>
                      <TableCell className="whitespace-nowrap">{ownerSkinTypeMap.get(ownerId) || "Unknown"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {reviewerEmailMap.get(item.validator_id) || "Unknown"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Moderate Validation</DialogTitle>
            <DialogDescription>
              Confirm reviewer output before final status is trusted for user-facing workflow.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Product</p>
                  <p className="font-medium">{selectedItem.user_analyses?.product_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ingredient</p>
                  <p className="font-medium">{selectedItem.ingredient_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reviewer Label</p>
                  <p className="font-medium">{selectedItem.corrected_safety_level || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Compatibility</p>
                  <p className="font-medium">{selectedItem.compatibility_assessment || "unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User Skin Type</p>
                  <p className="font-medium">
                    {ownerSkinTypeMap.get(selectedItem.user_analyses?.user_id || "") || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reviewer</p>
                  <p className="font-medium">{reviewerEmailMap.get(selectedItem.validator_id) || "Unknown"}</p>
                </div>
              </div>

              {selectedItem.nuance_flags && selectedItem.nuance_flags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Nuance Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.nuance_flags.map((flag) => (
                      <Badge key={flag} variant="outline">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.compatibility_notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Compatibility Notes</p>
                  <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                    {selectedItem.compatibility_notes}
                  </p>
                </div>
              )}

              {selectedItem.public_explanation && (
                <div>
                  <p className="text-sm font-medium mb-1">Public Explanation</p>
                  <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                    {selectedItem.public_explanation}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Moderator Feedback</p>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Optional feedback for reviewer..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => void applyDecision("needs_revision")}
              disabled={submitting}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Needs Revision
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => void applyDecision("rejected")}
                disabled={submitting}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button onClick={() => void applyDecision("approved")} disabled={submitting} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
