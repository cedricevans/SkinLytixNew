import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PaywallModal } from './PaywallModal';
import { cn } from '@/lib/utils';

interface UsageCounterProps {
  used: number;
  limit: number;
  label: string;
  feature: string;
  className?: string;
  showUpgradeAt?: number; // Show upgrade prompt at this percentage
}

export function UsageCounter({
  used,
  limit,
  label,
  feature,
  className,
  showUpgradeAt = 66, // Show at 2/3 usage by default
}: UsageCounterProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  
  const remaining = Math.max(0, limit - used);
  const percentage = (used / limit) * 100;
  const isLow = percentage >= showUpgradeAt;
  const isExhausted = remaining === 0;

  return (
    <>
      <div className={cn(
        "p-3 rounded-lg border",
        isExhausted ? "bg-destructive/5 border-destructive/20" : 
        isLow ? "bg-amber-500/5 border-amber-500/20" : 
        "bg-muted/50 border-border",
        className
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-2">
            {isExhausted && <AlertCircle className="h-4 w-4 text-destructive" />}
            {label}
          </span>
          <span className={cn(
            "text-sm font-bold",
            isExhausted ? "text-destructive" : 
            isLow ? "text-amber-600" : 
            "text-foreground"
          )}>
            {remaining} / {limit}
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isExhausted && "[&>div]:bg-destructive",
            isLow && !isExhausted && "[&>div]:bg-amber-500"
          )}
        />

        {isLow && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isExhausted 
                ? "You've used all your free messages" 
                : `Only ${remaining} remaining this month`
              }
            </span>
            <Button 
              size="sm" 
              variant={isExhausted ? "default" : "ghost"}
              className="h-7 text-xs gap-1"
              onClick={() => setShowPaywall(true)}
            >
              <Sparkles className="h-3 w-3" />
              {isExhausted ? "Unlock More" : "Get More"}
            </Button>
          </div>
        )}
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={feature}
        featureDescription={`Upgrade to get ${limit === 3 ? '30' : 'unlimited'} ${label.toLowerCase()} per month`}
      />
    </>
  );
}
