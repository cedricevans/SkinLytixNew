import { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { BlurredPreview, PaywallModal } from '@/components/paywall';

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
  const [showPaywall, setShowPaywall] = useState(false);
  const { canAccess, effectiveTier } = useSubscription();
  
  const hasAccess = canAccess('score_breakdown');

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

  const handleExpand = () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div className="w-full mb-8 animate-fade-in-up">
        <button
          onClick={handleExpand}
          className="w-full bg-card rounded-lg border border-border shadow-soft hover:shadow-medium transition-all p-4 flex items-center justify-between group"
          aria-expanded={isExpanded}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📊 Score Breakdown
            {!hasAccess && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Premium
              </span>
            )}
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

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Score Breakdown"
        featureDescription="See detailed sub-scores for ingredient safety, skin compatibility, active quality, and preservative safety."
      />
    </>
  );
};