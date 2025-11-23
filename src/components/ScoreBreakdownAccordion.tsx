import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SubScores {
  ingredient_safety: number;
  skin_compatibility: number;
  active_quality: number;
  preservative_safety: number;
}

interface ScoreBreakdownAccordionProps {
  subScores: SubScores;
}

export const ScoreBreakdownAccordion = ({ subScores }: ScoreBreakdownAccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const scoreItems = [
    {
      icon: '🧪',
      label: 'Ingredient Safety',
      value: subScores.ingredient_safety,
      description: 'Based on problematic ingredient count',
    },
    {
      icon: '🎯',
      label: 'Skin Compatibility',
      value: subScores.skin_compatibility,
      description: 'Match with your skin profile',
    },
    {
      icon: '⚗️',
      label: 'Active Quality',
      value: subScores.active_quality,
      description: 'Beneficial ingredient content',
    },
    {
      icon: '🛡️',
      label: 'Preservative Safety',
      value: subScores.preservative_safety,
      description: 'Preservative system assessment',
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="w-full mb-8 animate-fade-in-up">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-card rounded-lg border border-border shadow-soft hover:shadow-medium transition-all p-4 flex items-center justify-between group"
        aria-expanded={isExpanded}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📊 Score Breakdown
        </h3>
        <ChevronDown 
          className={cn(
            "w-5 h-5 transition-transform duration-300",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-card rounded-lg border border-border shadow-soft p-6 space-y-6">
          {scoreItems.map((item, index) => (
            <div 
              key={index}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className={cn("text-xl font-bold", getScoreColor(item.value))}>
                  {item.value}/100
                </span>
              </div>
              <Progress value={item.value} className="h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};