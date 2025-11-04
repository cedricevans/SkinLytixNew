import { useState, useEffect } from "react";
import { Sparkles, TrendingDown, Lightbulb, Target } from "lucide-react";

const tips = [
  {
    icon: Sparkles,
    text: "Did you know? Analyzing multiple products unlocks our Routine Optimizer",
    highlight: "Save money by finding cheaper alternatives"
  },
  {
    icon: TrendingDown,
    text: "Users save an average of $47/month on personal care",
    highlight: "Optimize your routine to find the best value"
  },
  {
    icon: Target,
    text: "Add products to your routine to see cost breakdowns",
    highlight: "Track spending and discover savings opportunities"
  },
  {
    icon: Lightbulb,
    text: "Our AI compares ingredients to find better alternatives",
    highlight: "Build a complete routine to unlock optimization"
  }
];

interface OCRLoadingTipsProps {
  progress: number;
  message?: string;
}

const OCRLoadingTips = ({ progress, message }: OCRLoadingTipsProps) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = tips[currentTipIndex].icon;

  return (
    <div className="space-y-6 py-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{message || "Extracting ingredients..."}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-accent to-cta transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rotating Tips */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/10 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <CurrentIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium leading-relaxed">
              {tips[currentTipIndex].text}
            </p>
            <p className="text-xs text-muted-foreground font-semibold">
              💡 {tips[currentTipIndex].highlight}
            </p>
          </div>
        </div>
      </div>

      {/* Indicator Dots */}
      <div className="flex justify-center gap-2">
        {tips.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentTipIndex 
                ? 'w-8 bg-primary' 
                : 'w-2 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default OCRLoadingTips;
