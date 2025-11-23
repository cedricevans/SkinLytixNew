import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnimatedScoreGaugeProps {
  score: number;
  className?: string;
}

export const AnimatedScoreGauge = ({ score, className }: AnimatedScoreGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setAnimatedScore(Math.min(Math.round(increment * currentStep), score));
      } else {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  const getScoreColor = () => {
    if (score >= 70) return "hsl(162, 41%, 72%)"; // Sage Green
    if (score >= 50) return "hsl(43, 96%, 56%)"; // Golden Amber
    return "hsl(346, 100%, 60%)"; // Hot Pink
  };

  const getScoreEmoji = () => {
    if (score >= 70) return "🌟";
    if (score >= 50) return "✨";
    return "⚠️";
  };

  const getScoreLabel = () => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Attention";
  };

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-64 h-64 mb-6">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r="90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            opacity="0.2"
          />
          {/* Animated progress circle */}
          <circle
            cx="128"
            cy="128"
            r="90"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${getScoreColor()}40)`
            }}
          />
        </svg>
        
        {/* Score and emoji in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div 
            className={cn(
              "text-6xl mb-2 transition-all duration-300",
              isVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}
          >
            {getScoreEmoji()}
          </div>
          <div 
            className="text-6xl font-bold transition-all duration-300"
            style={{ color: getScoreColor() }}
          >
            {animatedScore}
          </div>
        </div>
      </div>
      
      <Badge 
        variant="secondary" 
        className="text-lg px-6 py-2 mb-4"
      >
        {getScoreLabel()}
      </Badge>
    </div>
  );
};
