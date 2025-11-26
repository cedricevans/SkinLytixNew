import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface SafetyLevelMeterProps {
  safetyLevel: 'low' | 'moderate' | 'high' | 'unknown';
  score: number; // 0-100 risk score
  className?: string;
  showScore?: boolean; // Optional: hide the numeric score (defaults to true)
}

export const SafetyLevelMeter = ({ safetyLevel, score, className, showScore = true }: SafetyLevelMeterProps) => {
  const getIcon = () => {
    switch (safetyLevel) {
      case 'low':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getLabel = () => {
    switch (safetyLevel) {
      case 'low':
        return 'Low Risk';
      case 'moderate':
        return 'Moderate Risk';
      case 'high':
        return 'High Risk';
      default:
        return 'Unknown Risk';
    }
  };

  const getColor = () => {
    switch (safetyLevel) {
      case 'low':
        return 'bg-success';
      case 'moderate':
        return 'bg-warning';
      case 'high':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-semibold">{getLabel()}</span>
        </div>
        {showScore && (
          <span className="text-xs text-muted-foreground">{score}/100</span>
        )}
      </div>
      
      {/* Meter with color zones */}
      <div className="relative h-3 w-full bg-secondary rounded-full overflow-hidden">
        {/* Background zones */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 bg-success/20" />
          <div className="w-1/3 bg-warning/20" />
          <div className="w-1/3 bg-destructive/20" />
        </div>
        
        {/* Animated fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-full",
            getColor()
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};
