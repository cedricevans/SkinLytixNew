import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, GitCompare, Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { BlurredPreview } from "@/components/paywall/BlurredPreview";

interface ProductComparisonGateProps {
  selectedProducts: Array<{ id: string; name: string; score?: number }>;
  onCompare: () => void;
  className?: string;
}

export function ProductComparisonGate({
  selectedProducts,
  onCompare,
  className,
}: ProductComparisonGateProps) {
  const { effectiveTier, canAccess } = useSubscription();
  const { usage, incrementUsage, canUse, limits, premiumLimits } = useUsageLimits();
  const [showPaywall, setShowPaywall] = useState(false);

  // Comparison limits by tier
  const COMPARISON_LIMITS = {
    free: 2,
    premium: 5,
    pro: Infinity,
  };

  const maxProducts = COMPARISON_LIMITS[effectiveTier] || 2;
  const isFree = effectiveTier === 'free';
  const isPremium = effectiveTier === 'premium';
  const canCompareMore = canAccess('product_comparison');

  const handleCompare = async () => {
    // Check if user can compare this many products
    if (selectedProducts.length > maxProducts) {
      setShowPaywall(true);
      return;
    }

    // Check usage limits for premium tier
    if (isPremium && !canUse('productComparisonsUsed', 'premium')) {
      setShowPaywall(true);
      return;
    }

    // Increment usage for premium tier
    if (isPremium && selectedProducts.length > 2) {
      await incrementUsage('productComparisonsUsed');
    }

    onCompare();
  };

  const exceedsLimit = selectedProducts.length > maxProducts;

  return (
    <>
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Compare Products</h3>
          </div>
          <Badge variant="secondary">
            {selectedProducts.length} / {maxProducts === Infinity ? '∞' : maxProducts} selected
          </Badge>
        </div>

        {selectedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Select products to compare their ingredients and scores side-by-side.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedProducts.map((product) => (
              <Badge key={product.id} variant="outline" className="py-1">
                {product.name}
                {product.score !== undefined && (
                  <span className="ml-1 text-muted-foreground">({product.score})</span>
                )}
              </Badge>
            ))}
          </div>
        )}

        {exceedsLimit && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <Lock className="w-4 h-4" />
              <span>
                {isFree 
                  ? "Free tier allows comparing up to 2 products. Upgrade for more!"
                  : `Premium allows ${maxProducts} products. Upgrade to Pro for unlimited.`
                }
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCompare}
            disabled={selectedProducts.length < 2 || exceedsLimit}
            className="flex-1"
          >
            {exceedsLimit ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Upgrade to Compare
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4 mr-2" />
                Compare {selectedProducts.length} Products
              </>
            )}
          </Button>
          
          {exceedsLimit && (
            <Button variant="cta" onClick={() => setShowPaywall(true)}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>

        {isPremium && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {premiumLimits.productComparisons - usage.productComparisonsUsed} comparisons remaining this month
          </p>
        )}
      </Card>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Product Comparison"
        featureDescription={`Compare up to ${effectiveTier === 'free' ? '5' : 'unlimited'} products side-by-side to find the best match for your skin.`}
      />
    </>
  );
}
