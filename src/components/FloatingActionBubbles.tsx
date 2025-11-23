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
      gradient: "from-[hsl(197,75%,24%)] to-[hsl(197,75%,32%)]",
      action: () => navigate('/'),
      show: true,
    },
    {
      icon: Plus,
      label: "Add to Routine",
      position: "top-20 left-4",
      gradient: "from-[hsl(197,75%,28%)] to-[hsl(192,51%,48%)]",
      action: onAddToRoutine,
      show: showAddToRoutine && !!onAddToRoutine,
    },
    {
      icon: TrendingUp,
      label: "Optimize Routine",
      position: "top-36 left-4",
      gradient: "from-[hsl(192,51%,52%)] to-[hsl(192,51%,44%)]",
      action: () => navigate('/routine'),
      show: true,
    },
    {
      icon: Microscope,
      label: "Analyze Another",
      position: "top-52 left-4",
      gradient: "from-[hsl(192,51%,48%)] to-[hsl(192,51%,56%)]",
      action: () => navigate('/upload'),
      show: true,
    },
  ];

  return (
    <TooltipProvider>
      <div className="hidden lg:block">
      {bubbles.map((bubble, index) => {
        if (!bubble.show) return null;
        
        const Icon = bubble.icon;
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <button
                onClick={bubble.action}
                className={cn(
                  "fixed z-50 w-10 h-10 md:w-12 md:h-12 rounded-full",
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
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm font-medium">{bubble.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      </div>
    </TooltipProvider>
  );
};
