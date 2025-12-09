import { useState, useEffect } from 'react';
import { Clock, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaywallModal } from './PaywallModal';
import { cn } from '@/lib/utils';

interface UrgencyBannerProps {
  discountPercent?: number;
  expiresInDays?: number;
  className?: string;
  onDismiss?: () => void;
}

export function UrgencyBanner({
  discountPercent = 40,
  expiresInDays = 7,
  className,
  onDismiss,
}: UrgencyBannerProps) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: expiresInDays,
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <>
      <div 
        className={cn(
          "relative overflow-hidden rounded-lg p-4",
          "bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20",
          "border border-primary/20",
          className
        )}
      >
        {/* Animated background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-primary">
                {discountPercent}% OFF
              </span>
              <span className="text-sm text-muted-foreground">
                First-Week Special
              </span>
            </div>
            
            {/* Countdown */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span>Expires in</span>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span className="bg-background/80 px-1.5 py-0.5 rounded">{timeLeft.days}d</span>
                <span>:</span>
                <span className="bg-background/80 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-background/80 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-background/80 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button 
            onClick={() => setShowPaywall(true)}
            className="gap-2 shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Claim Discount
          </Button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Premium"
        featureDescription={`Get ${discountPercent}% off your first month!`}
        showTrial={false}
      />
    </>
  );
}
