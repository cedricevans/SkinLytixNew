import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const AIExplanationLoader = () => {
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    { text: '🔍 Analyzing ingredients...', progress: 25 },
    { text: '🧪 Cross-referencing safety data...', progress: 50 },
    { text: '🤖 Generating personalized insights...', progress: 75 },
    { text: '✨ Finalizing recommendations...', progress: 100 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-card rounded-lg border border-border p-8 shadow-soft">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-center">
          Generating AI Analysis
        </h3>
        
        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
            style={{ width: `${stages[currentStage].progress}%` }}
          />
        </div>

        {/* Loading Stages */}
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                index <= currentStage 
                  ? "bg-primary/10 text-foreground" 
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                index < currentStage 
                  ? "bg-success text-success-foreground" 
                  : index === currentStage
                  ? "bg-primary text-primary-foreground animate-pulse"
                  : "bg-muted text-muted-foreground"
              )}>
                {index < currentStage ? '✓' : index + 1}
              </div>
              <span className={cn(
                "text-sm transition-all duration-300",
                index === currentStage && "font-semibold"
              )}>
                {stage.text}
              </span>
              {index === currentStage && (
                <div className="ml-auto flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};