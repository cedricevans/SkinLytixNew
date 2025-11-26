import { useState } from 'react';
import { ChevronDown, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SafetyLevelMeter } from '@/components/SafetyLevelMeter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface AIExplanationAccordionProps {
  aiExplanation: {
    safety_level: string;
    summary_one_liner?: string;
    professional_referral: {
      needed: boolean;
      reason?: string;
      suggested_professional_type?: string;
    };
    answer_markdown: string;
    ingredient_focus?: boolean;
    epiQ_or_score_used?: boolean;
  };
}

export const AIExplanationAccordion = ({ aiExplanation }: AIExplanationAccordionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const safetyScore = 
    aiExplanation.safety_level === 'low' ? 25 :
    aiExplanation.safety_level === 'moderate' ? 55 :
    aiExplanation.safety_level === 'high' ? 85 : 50;

  return (
    <div className="w-full mb-6 md:mb-8 animate-fade-in-up">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-border shadow-soft hover:shadow-medium transition-all p-4 md:p-6 group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 text-left">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">🤖✨ AI Explanation</h2>
              {aiExplanation.summary_one_liner && (
                <p className="text-sm text-muted-foreground mt-1 font-normal">
                  {aiExplanation.summary_one_liner}
                </p>
              )}
            </div>
          </div>
          <ChevronDown 
            className={cn(
              "w-5 h-5 transition-transform duration-300 flex-shrink-0",
              isExpanded && "rotate-180"
            )} 
          />
        </div>

        {/* Always visible safety meter */}
        <div className="mt-4">
          <SafetyLevelMeter
            safetyLevel={aiExplanation.safety_level as 'low' | 'moderate' | 'high' | 'unknown'}
            score={safetyScore}
            showScore={false}
          />
        </div>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[3000px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <Card className="shadow-md border-border p-4 md:p-6">
          {/* Professional Referral Alert (Priority Display) */}
          {aiExplanation.professional_referral.needed && (
            <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                Professional Consultation Recommended
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {aiExplanation.professional_referral.reason}
                {aiExplanation.professional_referral.suggested_professional_type !== 'none' && (
                  <span className="block mt-2 font-medium">
                    Consider consulting: {
                      aiExplanation.professional_referral.suggested_professional_type === 'dermatologist' ? '🩺 Dermatologist' :
                      aiExplanation.professional_referral.suggested_professional_type === 'esthetician' ? '💆 Licensed Esthetician' :
                      '🩺 Dermatologist or 💆 Licensed Esthetician'
                    }
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Markdown-rendered AI explanation */}
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-lg prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <ReactMarkdown>
              {aiExplanation.answer_markdown}
            </ReactMarkdown>
          </div>

          {/* Metadata Footer */}
          <div className="mt-6 pt-4 border-t flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
            {aiExplanation.ingredient_focus && (
              <Badge variant="outline" className="text-xs">
                🧪 Ingredient-focused
              </Badge>
            )}
            {aiExplanation.epiQ_or_score_used && (
              <Badge variant="outline" className="text-xs">
                📊 EpiQ Score Analysis
              </Badge>
            )}
            <span className="ml-auto text-muted-foreground">
              Powered by SkinLytix GPT
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
