import { Home, Plus, Microscope, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FloatingActionBubblesProps {
  onAddToRoutine?: () => void;
  showAddToRoutine?: boolean;
}

export const FloatingActionBubbles = ({
  onAddToRoutine,
  showAddToRoutine = true,
}: FloatingActionBubblesProps) => {
  const navigate = useNavigate();

  const bubbles = [
    {
      icon: Home,
      label: "Home",
      position: "top-4 left-4",
      gradient: "from-primary to-primary-glow",
      action: () => navigate('/'),
      show: true,
    },
    {
      icon: Plus,
      label: "Add to Routine",
      position: "top-4 right-4",
      gradient: "from-accent to-accent/80",
      action: onAddToRoutine,
      show: showAddToRoutine && !!onAddToRoutine,
    },
    {
      icon: Microscope,
      label: "Analyze Another",
      position: "bottom-4 right-4",
      gradient: "from-secondary to-secondary/80",
      action: () => navigate('/upload'),
      show: true,
    },
    {
      icon: TrendingUp,
      label: "Optimize Routine",
      position: "bottom-4 left-4",
      gradient: "from-primary-glow to-primary",
      action: () => navigate('/routine'),
      show: true,
    },
  ];

  return (
    <TooltipProvider>
      {bubbles.map((bubble, index) => {
        if (!bubble.show) return null;
        
        const Icon = bubble.icon;
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                onClick={bubble.action}
                className={cn(
                  "fixed z-50 w-14 h-14 md:w-16 md:h-16 rounded-full",
                  "bg-gradient-to-br shadow-elegant",
                  "flex items-center justify-center",
                  "transition-all duration-300 hover:scale-110 hover:shadow-glow",
                  "animate-fade-in",
                  bubble.gradient,
                  bubble.position
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm font-medium">{bubble.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
};
