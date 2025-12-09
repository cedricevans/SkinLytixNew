import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Lock, Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { toast } from "sonner";

interface ExportAnalysisButtonProps {
  analysisId: string;
  productName: string;
  analysisData?: any;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportAnalysisButton({
  analysisId,
  productName,
  analysisData,
  variant = "outline",
  size = "sm",
  className,
}: ExportAnalysisButtonProps) {
  const { effectiveTier, canAccess } = useSubscription();
  const { usage, incrementUsage, canUse, premiumLimits } = useUsageLimits();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canExportClean = canAccess('pdf_export_clean');
  const isFree = effectiveTier === 'free';

  const handleExport = async () => {
    // Free tier: blocked with paywall
    if (isFree) {
      setShowPaywall(true);
      return;
    }

    // Premium tier: check usage limits
    if (effectiveTier === 'premium' && !canUse('pdfExportsUsed', 'premium')) {
      setShowPaywall(true);
      return;
    }

    setIsExporting(true);
    try {
      // Generate simple text export (PDF generation would require additional library)
      const exportContent = generateExportContent();
      
      // Create blob and download
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName.replace(/[^a-zA-Z0-9]/g, '_')}_analysis.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Increment usage for premium users
      if (effectiveTier === 'premium') {
        await incrementUsage('pdfExportsUsed');
      }

      toast.success("Analysis exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export analysis");
    } finally {
      setIsExporting(false);
    }
  };

  const generateExportContent = () => {
    if (!analysisData) {
      return `SkinLytix Analysis Report\n\nProduct: ${productName}\nAnalysis ID: ${analysisId}\n\nFull analysis data not available for export.`;
    }

    const { epiq_score, recommendations_json, brand, category, analyzed_at } = analysisData;
    const recs = recommendations_json || {};

    let content = `
═══════════════════════════════════════════════════════════════
                    SKINLYTIX ANALYSIS REPORT
═══════════════════════════════════════════════════════════════

PRODUCT: ${productName}
${brand ? `BRAND: ${brand}` : ''}
${category ? `CATEGORY: ${category}` : ''}
ANALYZED: ${analyzed_at ? new Date(analyzed_at).toLocaleDateString() : 'N/A'}

───────────────────────────────────────────────────────────────
                         EPIQ SCORE: ${epiq_score || 'N/A'}/100
───────────────────────────────────────────────────────────────

SUMMARY:
${recs.summary || 'No summary available.'}

`;

    if (recs.beneficial_ingredients?.length > 0) {
      content += `\n✅ BENEFICIAL INGREDIENTS (${recs.beneficial_ingredients.length}):\n`;
      recs.beneficial_ingredients.forEach((ing: any) => {
        content += `   • ${ing.name}: ${ing.benefit || 'Good for skin'}\n`;
      });
    }

    if (recs.safe_ingredients?.length > 0) {
      content += `\n✓ SAFE INGREDIENTS (${recs.safe_ingredients.length}):\n`;
      recs.safe_ingredients.slice(0, 10).forEach((ing: any) => {
        const name = typeof ing === 'string' ? ing : ing.name;
        content += `   • ${name}\n`;
      });
      if (recs.safe_ingredients.length > 10) {
        content += `   ... and ${recs.safe_ingredients.length - 10} more\n`;
      }
    }

    if (recs.problematic_ingredients?.length > 0) {
      content += `\n⚠️ INGREDIENTS OF CONCERN (${recs.problematic_ingredients.length}):\n`;
      recs.problematic_ingredients.forEach((ing: any) => {
        content += `   • ${ing.name}: ${ing.reason || 'May cause sensitivity'}\n`;
      });
    }

    if (recs.routine_suggestions?.length > 0) {
      content += `\n💡 ROUTINE SUGGESTIONS:\n`;
      recs.routine_suggestions.forEach((suggestion: string) => {
        content += `   • ${suggestion}\n`;
      });
    }

    content += `
───────────────────────────────────────────────────────────────
Generated by SkinLytix - Your Personal Skincare Analyst
https://skinlytix.com
───────────────────────────────────────────────────────────────
`;

    return content;
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={isExporting}
        className={className}
      >
        {isFree ? (
          <Lock className="w-4 h-4 mr-2" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isExporting ? "Exporting..." : isFree ? "Export (Premium)" : "Export"}
        {effectiveTier === 'premium' && canExportClean && (
          <span className="ml-1 text-xs text-muted-foreground">
            ({premiumLimits.pdfExports - usage.pdfExportsUsed} left)
          </span>
        )}
      </Button>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="PDF Export"
        featureDescription="Export your analysis as a clean, shareable report without watermarks."
      />
    </>
  );
}
