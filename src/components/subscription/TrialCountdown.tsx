import { useState, useEffect } from 'react';
import { Clock, Crown, Sparkles, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PaywallModal } from '@/components/paywall/PaywallModal';
import { useSubscription } from '@/hooks/useSubscription';

interface TrialCountdownProps {
  className?: string;
  variant?: 'banner' | 'card' | 'floating';
}

export function TrialCountdown({ className = '', variant = 'banner' }: TrialCountdownProps) {
  const { isInTrial, trialEndsAt, effectiveTier, isLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!trialEndsAt) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = trialEndsAt.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [trialEndsAt]);

  if (isLoading || isDismissed || !isInTrial || !trialEndsAt) return null;

  const totalTrialDays = 7;
  const daysUsed = totalTrialDays - timeLeft.days;
  const progressPercent = Math.min(100, (daysUsed / totalTrialDays) * 100);

  const getUrgencyLevel = () => {
    if (timeLeft.days === 0) return 'critical';
    if (timeLeft.days <= 1) return 'high';
    if (timeLeft.days <= 3) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel();

  const urgencyStyles = {
    critical: {
      bg: 'bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      icon: AlertTriangle,
      pulse: true,
    },
    high: {
      bg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-400',
      icon: Clock,
      pulse: true,
    },
    medium: {
      bg: 'bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30',
      text: 'text-primary',
      icon: Clock,
      pulse: false,
    },
    low: {
      bg: 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 border-green-500/30',
      text: 'text-green-700 dark:text-green-400',
      icon: Sparkles,
      pulse: false,
    },
  };

  const style = urgencyStyles[urgency];
  const Icon = style.icon;

  const getMessage = () => {
    if (timeLeft.days === 0 && timeLeft.hours === 0) {
      return { title: '🔥 Trial expires in minutes!', subtitle: 'Upgrade now to keep Premium features' };
    }
    if (timeLeft.days === 0) {
      return { title: `⚠️ Trial expires in ${timeLeft.hours}h ${timeLeft.minutes}m`, subtitle: "Don't lose your Premium access!" };
    }
    if (timeLeft.days === 1) {
      return { title: '⏰ Last day of your trial!', subtitle: 'Upgrade now to keep all features' };
    }
    if (timeLeft.days <= 3) {
      return { title: `${timeLeft.days} days left in your trial`, subtitle: 'Enjoying Premium? Keep it forever!' };
    }
    return { title: `${timeLeft.days} days of Premium Trial`, subtitle: 'Explore all features - upgrade anytime' };
  };

  const message = getMessage();

  if (variant === 'floating') {
    return (
      <>
        <div className={`fixed bottom-20 right-4 z-40 max-w-sm ${style.pulse ? 'animate-pulse' : ''} ${className}`}>
          <Card className={`p-4 ${style.bg} shadow-lg`}>
            <button 
              onClick={() => setIsDismissed(true)}
              className="absolute top-2 right-2 p-1 hover:bg-background/50 rounded"
            >
              <X className="w-3 h-3 opacity-60" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background/50 rounded-full">
                <Icon className={`w-5 h-5 ${style.text}`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${style.text}`}>{message.title}</p>
                <p className="text-xs text-muted-foreground">{message.subtitle}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowPaywall(true)}
              className="w-full mt-3"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </Card>
        </div>

        <PaywallModal 
          open={showPaywall} 
          onOpenChange={setShowPaywall}
          feature="Premium Access"
          featureDescription="Keep all Premium features forever with an upgrade"
          showTrial={false}
        />
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <Card className={`p-6 ${style.bg} ${className}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-background/50 rounded-full ${style.pulse ? 'animate-pulse' : ''}`}>
                <Icon className={`w-6 h-6 ${style.text}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${style.text}`}>{message.title}</h3>
                <p className="text-sm text-muted-foreground">{message.subtitle}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-background/50 rounded"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Trial Progress</span>
              <span className="font-medium">{daysUsed} of {totalTrialDays} days</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-background/50 rounded-lg p-2">
              <span className="text-2xl font-bold block">{timeLeft.days}</span>
              <span className="text-xs text-muted-foreground">Days</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <span className="text-2xl font-bold block">{timeLeft.hours}</span>
              <span className="text-xs text-muted-foreground">Hours</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <span className="text-2xl font-bold block">{timeLeft.minutes}</span>
              <span className="text-xs text-muted-foreground">Minutes</span>
            </div>
          </div>

          <Button onClick={() => setShowPaywall(true)} className="w-full" size="lg">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        </Card>

        <PaywallModal 
          open={showPaywall} 
          onOpenChange={setShowPaywall}
          feature="Premium Access"
          featureDescription="Keep all Premium features forever with an upgrade"
          showTrial={false}
        />
      </>
    );
  }

  // Banner variant (default)
  return (
    <>
      <div className={`${style.bg} border-b px-4 py-3 ${className}`}>
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 bg-background/50 rounded-full ${style.pulse ? 'animate-pulse' : ''}`}>
              <Icon className={`w-4 h-4 ${style.text}`} />
            </div>
            <div className="text-center sm:text-left">
              <span className={`font-medium ${style.text}`}>{message.title}</span>
              <span className="hidden sm:inline text-muted-foreground"> • {message.subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowPaywall(true)}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-background/50 rounded"
            >
              <X className="w-4 h-4 opacity-60" />
            </button>
          </div>
        </div>
      </div>

      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall}
        feature="Premium Access"
        featureDescription="Keep all Premium features forever with an upgrade"
        showTrial={false}
      />
    </>
  );
}
