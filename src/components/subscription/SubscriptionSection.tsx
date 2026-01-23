import { useState, useEffect } from 'react';
import { Crown, Sparkles, Zap, Clock, CreditCard, Check, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { PaywallModal } from '@/components/paywall/PaywallModal';
import { toast } from 'sonner';

interface SubscriptionSectionProps {
  className?: string;
}

const TIER_INFO: Record<SubscriptionTier, { 
  name: string; 
  icon: typeof Crown;
  color: string;
  bgColor: string;
}> = {
  free: { 
    name: 'Free', 
    icon: Sparkles, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
  premium: { 
    name: 'Premium', 
    icon: Crown, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  pro: { 
    name: 'Pro', 
    icon: Zap, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
};

const FEATURE_COMPARISON = [
  { feature: 'Product Analyses', free: 'Unlimited', premium: 'Unlimited', pro: 'Unlimited' },
  { feature: 'EpiQ Score Breakdown', free: false, premium: true, pro: true },
  { feature: 'AI Explanations', free: 'Summary only', premium: 'Full', pro: 'Full' },
  { feature: 'SkinLytixGPT Chat', free: '3/month', premium: '30/month', pro: 'Unlimited' },
  { feature: 'Routines', free: '1 routine', premium: '5 routines', pro: 'Unlimited' },
  { feature: 'Routine Optimization', free: 'Preview only', premium: '3/month', pro: 'Unlimited' },
  { feature: 'Product Comparison', free: '2 products', premium: '5 products', pro: 'Unlimited' },
  { feature: 'PDF Export', free: 'Watermarked', premium: 'Clean', pro: 'Clean + Batch' },
  { feature: 'Priority Support', free: false, premium: false, pro: true },
];

export function SubscriptionSection({ className }: SubscriptionSectionProps) {
  const { tier, effectiveTier, isInTrial, trialEndsAt, isLoading: subLoading, refresh } = useSubscription();
  const { usage, limits, premiumLimits, isLoading: usageLoading } = useUsageLimits();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isManagingBilling, setIsManagingBilling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const tierInfo = TIER_INFO[effectiveTier];
  const TierIcon = tierInfo.icon;

  const syncSubscription = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      await refresh();
      toast.success('Subscription status updated');
    } catch (error) {
      console.error('Error syncing subscription:', error);
      toast.error('Failed to sync subscription');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManageBilling = async () => {
    setIsManagingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (!data?.url) {
        throw new Error("Billing portal is not available for this account yet.");
      }
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      if (error.message?.includes('No Stripe customer found')) {
        toast.error('No billing account found. Please subscribe first.');
      } else {
        toast.error(error.message || 'Failed to open billing portal');
      }
    } finally {
      setIsManagingBilling(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!trialEndsAt) return 0;
    const now = new Date();
    const diffMs = trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const trialDays = getTrialDaysRemaining();

  if (subLoading || usageLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`p-6 ${className}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${tierInfo.bgColor}`}>
                <TierIcon className={`w-6 h-6 ${tierInfo.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Subscription</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={tierInfo.color}>
                    {tierInfo.name}
                  </Badge>
                  {isInTrial && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      <Clock className="w-3 h-3 mr-1" />
                      {trialDays} days left in trial
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={syncSubscription}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sync'
              )}
            </Button>
          </div>

          {/* Trial Warning Banner */}
          {isInTrial && trialDays <= 3 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Your trial ends {trialDays === 0 ? 'today' : trialDays === 1 ? 'tomorrow' : `in ${trialDays} days`}!
                  </p>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    Upgrade now to keep your Premium features
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowPaywall(true)}>
                  Upgrade
                </Button>
              </div>
            </div>
          )}

          {/* Usage Stats */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Monthly Usage
            </h3>
            
            {/* Chat Messages */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>SkinLytixGPT Chats</span>
                <span className="text-muted-foreground">
                  {usage.chatMessagesUsed} / {effectiveTier === 'pro' ? '∞' : effectiveTier === 'premium' ? premiumLimits.chatMessages : limits.chatMessages}
                </span>
              </div>
              <Progress 
                value={effectiveTier === 'pro' ? 0 : (usage.chatMessagesUsed / (effectiveTier === 'premium' ? premiumLimits.chatMessages : limits.chatMessages)) * 100} 
                className="h-2"
              />
            </div>

            {/* Routine Optimizations */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Routine Optimizations</span>
                <span className="text-muted-foreground">
                  {usage.routineOptimizationsUsed} / {effectiveTier === 'pro' ? '∞' : effectiveTier === 'premium' ? premiumLimits.routineOptimizations : limits.routineOptimizations}
                </span>
              </div>
              <Progress 
                value={effectiveTier === 'pro' ? 0 : effectiveTier === 'free' ? 100 : (usage.routineOptimizationsUsed / premiumLimits.routineOptimizations) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Features
            </h3>
            <div className="space-y-2">
              {FEATURE_COMPARISON.slice(0, 6).map((row) => (
                <div key={row.feature} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">{row.feature}</span>
                  <span className="font-medium">
                    {typeof row[effectiveTier] === 'boolean' ? (
                      row[effectiveTier] ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )
                    ) : (
                      row[effectiveTier]
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {effectiveTier === 'free' ? (
              <Button className="flex-1" onClick={() => setShowPaywall(true)}>
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            ) : effectiveTier === 'premium' ? (
              <>
                <Button variant="outline" className="flex-1" onClick={handleManageBilling} disabled={isManagingBilling}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isManagingBilling ? 'Opening...' : 'Manage Billing'}
                </Button>
                <Button className="flex-1" onClick={() => setShowPaywall(true)}>
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </>
            ) : (
              <Button variant="outline" className="flex-1" onClick={handleManageBilling} disabled={isManagingBilling}>
                <CreditCard className="w-4 h-4 mr-2" />
                {isManagingBilling ? 'Opening...' : 'Manage Billing'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall}
        feature="Premium Features"
        featureDescription="Unlock full EpiQ breakdowns, unlimited chats, and routine optimization"
        showTrial={!isInTrial && effectiveTier === 'free'}
      />
    </>
  );
}
