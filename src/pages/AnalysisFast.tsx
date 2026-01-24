import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/functions-client";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getQuickScanSummary } from "@/lib/quick-scan";
import { useToast } from "@/hooks/use-toast";

type AnalysisPayload = {
  product_name: string;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  ingredients_list: string;
  product_price: number | null;
  user_id: string;
  image_url: string | null;
  scan_mode?: "quick" | "detailed";
  product_type?: "face" | "body" | "hair" | "auto";
};

export default function AnalysisFast() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const payload = (location.state as { payload?: AnalysisPayload } | null)?.payload || null;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Preparing analysis...");
  const analysisStartRef = useRef<number | null>(null);

  const quickScanSummary = useMemo(() => {
    if (!payload?.ingredients_list) return null;
    const type = payload.product_type === "auto" || !payload.product_type ? "face" : payload.product_type;
    return getQuickScanSummary(payload.ingredients_list, type);
  }, [payload]);

  useEffect(() => {
    if (!payload) {
      navigate("/upload");
      return;
    }

    let isCancelled = false;

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      analysisStartRef.current = Date.now();
      setAnalysisProgress(5);
      setAnalysisStatus("Running full analysis...");

      try {
        const body = {
          ...payload,
          scan_mode: "detailed",
          skip_ingredient_ai_explanations: true,
        };

        const data: any = await invokeFunction('analyze-product', body);

        if (!isCancelled) {
          navigate(`/analysis/${data.analysis_id}`);
        }
      } catch (error) {
        console.error("Analysis error:", error);
        if (!isCancelled) {
          toast({
            title: "Analysis Failed",
            description: "Could not analyze product. Please try again.",
            variant: "destructive",
          });
          navigate("/upload");
        }
      } finally {
        if (!isCancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    runAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [payload, navigate, toast]);

  useEffect(() => {
    if (!isAnalyzing || !payload) return;

    const ingredientCount = payload.ingredients_list
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean).length;

    let progressValue = 5;
    setAnalysisProgress(progressValue);

    const intervalId = window.setInterval(() => {
      if (progressValue < 85) {
        progressValue = Math.min(85, progressValue + Math.random() * 8 + 3);
      } else if (progressValue < 95) {
        progressValue = Math.min(95, progressValue + Math.random() * 2 + 1);
      }
      setAnalysisProgress(Math.round(progressValue));

      const total = Math.max(ingredientCount, 1);
      const scanned = Math.min(total, Math.max(1, Math.round((progressValue / 95) * total)));
      if (progressValue >= 95) {
        const elapsedSeconds = analysisStartRef.current
          ? Math.floor((Date.now() - analysisStartRef.current) / 1000)
          : 0;
        const waitMessage = elapsedSeconds > 20 ? "Still working on the final checks..." : "Finalizing results...";
        setAnalysisStatus(`${waitMessage} We’re finishing your report now.`);
      } else {
        setAnalysisStatus(`Detected ${total} ingredients. Scanning ${scanned} of ${total} for highest-quality results...`);
      }
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isAnalyzing, payload]);

  return (
    <AppShell
      className="bg-gradient-to-b from-background to-muted"
      contentClassName="px-[5px] lg:px-4 py-8"
      showNavigation
      showBottomNav
    >
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Fast Analysis Preview</h1>
            <p className="text-sm text-muted-foreground">
              Showing quick insights while the full report loads.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/upload")}>
            Back to Upload
          </Button>
        </div>
      </PageHeader>

      <div className="container max-w-3xl mx-auto space-y-6">
        <Card className="p-4 md:p-6 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Product</p>
            <p className="text-lg font-semibold">{payload?.product_name || "Unnamed product"}</p>
            {payload?.brand && <p className="text-sm text-muted-foreground">{payload.brand}</p>}
          </div>
          {quickScanSummary && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Quick scan preview</span>
                <span className="text-muted-foreground">{quickScanSummary.total} ingredients</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Known safe: {quickScanSummary.safeKnown}</span>
                <span>Potential concerns: {quickScanSummary.potentialConcerns}</span>
                <span>Beneficial: {quickScanSummary.beneficial}</span>
                <span>Needs verification: {quickScanSummary.unknown}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Detailed verification is running in the background.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Analysis in progress</span>
            <span className="text-muted-foreground">{analysisProgress}%</span>
          </div>
          <Progress value={analysisProgress} />
          <p className="text-xs text-muted-foreground">{analysisStatus}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing your full report now.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
