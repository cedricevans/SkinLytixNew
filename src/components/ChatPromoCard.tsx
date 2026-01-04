import { useState } from 'react';
import { MessageCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChatPromoCardProps {
  onOpenChat: () => void;
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  "Is this product good for sensitive skin?",
  "Which ingredients should I avoid combining?",
  "What's the best way to use this product?",
];

const ChatPromoCard = ({ onOpenChat, className }: ChatPromoCardProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  if (isDismissed) return null;

  return (
    <Card className={cn(
      "border-2 border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 overflow-hidden",
      className
    )}>
      <CardContent className="p-5 relative">
        {/* Dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Ask SkinLytixGPT
            </h4>
            <p className="text-xs text-muted-foreground">AI-powered skincare expert</p>
          </div>
        </div>

        {/* Sample question carousel */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div 
            className="p-3 bg-background/80 rounded-lg border border-border cursor-pointer hover:border-accent/50 transition-colors"
            onClick={onOpenChat}
          >
            <p className="text-sm italic text-foreground/80">
              "{SUGGESTED_QUESTIONS[selectedQuestion]}"
            </p>
          </div>
          
          {/* Question dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {SUGGESTED_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedQuestion(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selectedQuestion 
                    ? "w-4 bg-accent" 
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Question ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button 
          variant="default" 
          size="sm" 
          className="w-full gap-2"
          onClick={onOpenChat}
        >
          Start Chatting
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Usage hint */}
        <p className="text-xs text-center text-muted-foreground mt-3">
          Free users: 3 messages/day • Premium: 30/month
        </p>
      </CardContent>
    </Card>
  );
};

export default ChatPromoCard;
