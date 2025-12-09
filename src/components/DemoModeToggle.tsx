import { useState } from 'react';
import { Eye, EyeOff, Crown, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

const TIER_CONFIG: Record<SubscriptionTier | 'off', { label: string; icon: React.ReactNode; color: string }> = {
  off: { label: 'Admin Mode', icon: <Crown className="h-4 w-4" />, color: 'bg-amber-500' },
  free: { label: 'Free User', icon: <User className="h-4 w-4" />, color: 'bg-muted' },
  premium: { label: 'Premium', icon: <Sparkles className="h-4 w-4" />, color: 'bg-primary' },
  pro: { label: 'Pro', icon: <Crown className="h-4 w-4" />, color: 'bg-gradient-to-r from-amber-500 to-orange-500' },
};

export function DemoModeToggle() {
  const { isAdmin, demoModeTier, setDemoMode, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  // Only show for admins
  if (!isAdmin || isLoading) return null;

  const currentMode = demoModeTier || 'off';
  const config = TIER_CONFIG[currentMode];

  const handleSelectTier = async (tier: SubscriptionTier | null) => {
    await setDemoMode(tier);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "fixed bottom-6 left-6 z-50 gap-2 shadow-lg border-2",
            "hover:scale-105 transition-transform",
            demoModeTier ? "border-primary animate-pulse" : "border-amber-500"
          )}
        >
          {demoModeTier ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-amber-500" />
          )}
          <span className="hidden sm:inline">
            {demoModeTier ? `Demo: ${TIER_CONFIG[demoModeTier].label}` : 'Demo Mode'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-64 p-3"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            Demo Mode
          </div>
          <p className="text-xs text-muted-foreground">
            Simulate different subscription tiers for demos and testing.
          </p>
          
          <div className="space-y-1">
            {/* Admin Mode (Off) */}
            <button
              onClick={() => handleSelectTier(null)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                "hover:bg-muted",
                !demoModeTier && "bg-amber-500/10 border border-amber-500"
              )}
            >
              <div className={cn("p-1.5 rounded-full text-white", TIER_CONFIG.off.color)}>
                {TIER_CONFIG.off.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{TIER_CONFIG.off.label}</div>
                <div className="text-xs text-muted-foreground">Full access (no simulation)</div>
              </div>
            </button>

            {/* Free Tier */}
            <button
              onClick={() => handleSelectTier('free')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                "hover:bg-muted",
                demoModeTier === 'free' && "bg-primary/10 border border-primary"
              )}
            >
              <div className={cn("p-1.5 rounded-full", TIER_CONFIG.free.color)}>
                {TIER_CONFIG.free.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{TIER_CONFIG.free.label}</div>
                <div className="text-xs text-muted-foreground">Limited features & usage</div>
              </div>
            </button>

            {/* Premium Tier */}
            <button
              onClick={() => handleSelectTier('premium')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                "hover:bg-muted",
                demoModeTier === 'premium' && "bg-primary/10 border border-primary"
              )}
            >
              <div className={cn("p-1.5 rounded-full text-white", TIER_CONFIG.premium.color)}>
                {TIER_CONFIG.premium.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{TIER_CONFIG.premium.label}</div>
                <div className="text-xs text-muted-foreground">$7.99/mo features</div>
              </div>
            </button>

            {/* Pro Tier */}
            <button
              onClick={() => handleSelectTier('pro')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                "hover:bg-muted",
                demoModeTier === 'pro' && "bg-primary/10 border border-primary"
              )}
            >
              <div className={cn("p-1.5 rounded-full text-white", TIER_CONFIG.pro.color)}>
                {TIER_CONFIG.pro.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{TIER_CONFIG.pro.label}</div>
                <div className="text-xs text-muted-foreground">$14.99/mo features</div>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t text-xs text-center text-muted-foreground">
            👁️ Partner demo mode — your data is safe
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
