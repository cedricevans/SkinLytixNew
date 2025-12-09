import { useState, useEffect } from 'react';
import { X, Crown, Sparkles, Check, Clock, Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  featureDescription?: string;
  showTrial?: boolean;
}

const PREMIUM_FEATURES = [
  'Full EpiQ Score breakdown',
  'Complete AI explanations',
  '30 SkinLytixGPT chats/month',
  '5 routines (unlimited products)',
  '3 routine optimizations/month',
  'Compare up to 5 products',
  'Clean PDF exports',
];

const PRO_FEATURES = [
  'Everything in Premium',
  'Unlimited SkinLytixGPT chats',
  'Unlimited routine optimizations',
  'Batch analysis (10 products)',
  'Priority support (24hr)',
  'Early access to new features',
];

export function PaywallModal({ 
  open, 
  onOpenChange, 
  feature,
  featureDescription,
  showTrial = true,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'pro'>('premium');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [socialProofCount, setSocialProofCount] = useState(847);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate real-time social proof updates
  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        setSocialProofCount(prev => prev + Math.floor(Math.random() * 3));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const getPricing = () => {
    if (selectedPlan === 'premium') {
      return billingCycle === 'monthly' 
        ? { price: '$7.99', period: '/month', savings: null }
        : { price: '$6.58', period: '/month', savings: 'Save $17/year' };
    }
    return billingCycle === 'monthly'
      ? { price: '$14.99', period: '/month', savings: null }
      : { price: '$12.42', period: '/month', savings: 'Save $31/year' };
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to upgrade');
        onOpenChange(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: selectedPlan, 
          billingCycle: billingCycle 
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to start checkout. Please try again.');
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        onOpenChange(false);
        toast.success('Checkout opened in new tab');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pricing = getPricing();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Premium Feature
              </Badge>
              <button 
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogTitle className="text-2xl mt-3">
              Unlock {feature}
            </DialogTitle>
            {featureDescription && (
              <p className="text-muted-foreground text-sm mt-1">
                {featureDescription}
              </p>
            )}
          </DialogHeader>
        </div>

        <div className="p-6 pt-4 space-y-5">
          {/* Social Proof Banner */}
          <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">
              <strong>{socialProofCount.toLocaleString()}</strong> users upgraded this month
            </span>
          </div>

          {/* Plan Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlan('premium')}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                selectedPlan === 'premium' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold">Premium</span>
              </div>
              <div className="text-2xl font-bold">$7.99</div>
              <div className="text-xs text-muted-foreground">/month</div>
            </button>

            <button
              onClick={() => setSelectedPlan('pro')}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden",
                selectedPlan === 'pro' 
                  ? "border-amber-500 bg-amber-500/5" 
                  : "border-border hover:border-amber-500/50"
              )}
            >
              <Badge className="absolute top-2 right-2 bg-amber-500 text-xs">
                Best Value
              </Badge>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="font-semibold">Pro</span>
              </div>
              <div className="text-2xl font-bold">$14.99</div>
              <div className="text-xs text-muted-foreground">/month</div>
            </button>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                billingCycle === 'monthly' 
                  ? "bg-background shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                billingCycle === 'annual' 
                  ? "bg-background shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                Save 17%
              </Badge>
            </button>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            {(selectedPlan === 'premium' ? PREMIUM_FEATURES : PRO_FEATURES).map((feat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-base font-semibold gap-2" 
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening checkout...
                </>
              ) : showTrial ? (
                <>
                  <Clock className="h-4 w-4" />
                  Start 7-Day Free Trial
                </>
              ) : (
                <>
                  Upgrade to {selectedPlan === 'premium' ? 'Premium' : 'Pro'}
                </>
              )}
            </Button>

            {/* Price anchoring */}
            <div className="text-center text-sm text-muted-foreground">
              {billingCycle === 'annual' && pricing.savings && (
                <span className="text-green-600 font-medium">{pricing.savings} • </span>
              )}
              That's just <strong>{pricing.price}</strong>{pricing.period}
              {billingCycle === 'annual' && (
                <span className="block text-xs mt-1">
                  Less than your morning coffee ☕
                </span>
              )}
            </div>
          </div>

          {/* Guarantee */}
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime • No questions asked • Money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
