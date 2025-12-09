import { useState, useEffect } from 'react';
import { Users, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProofType = 'upgrades' | 'savings' | 'rating';

interface SocialProofBadgeProps {
  type?: ProofType;
  className?: string;
  animated?: boolean;
}

const PROOF_DATA: Record<ProofType, { icon: React.ReactNode; getMessage: (count: number) => string }> = {
  upgrades: {
    icon: <Users className="h-3.5 w-3.5" />,
    getMessage: (count) => `${count.toLocaleString()} users upgraded this month`,
  },
  savings: {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    getMessage: () => `Users save avg $25/month with routine optimization`,
  },
  rating: {
    icon: <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />,
    getMessage: () => `4.9/5 rating from Premium users`,
  },
};

export function SocialProofBadge({
  type = 'upgrades',
  className,
  animated = true,
}: SocialProofBadgeProps) {
  const [count, setCount] = useState(847);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates for upgrades
  useEffect(() => {
    if (type === 'upgrades' && animated) {
      const interval = setInterval(() => {
        setCount(prev => prev + Math.floor(Math.random() * 2));
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [type, animated]);

  const proof = PROOF_DATA[type];

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-accent/50 text-accent-foreground text-sm",
        "transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
    >
      <span className="text-primary">{proof.icon}</span>
      <span>{proof.getMessage(count)}</span>
    </div>
  );
}
