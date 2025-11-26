import { Home, Plus, Microscope, TrendingUp, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ResponsiveBottomNavProps {
  onAddToRoutine?: () => void;
  showAddToRoutine?: boolean;
  onChatOpen?: () => void;
}

export const ResponsiveBottomNav = ({ onAddToRoutine, showAddToRoutine = true, onChatOpen }: ResponsiveBottomNavProps) => {
  const navigate = useNavigate();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      action: () => navigate('/'),
      show: true,
    },
    {
      icon: Plus,
      label: "Add",
      action: onAddToRoutine,
      show: showAddToRoutine && !!onAddToRoutine,
    },
    {
      icon: Microscope,
      label: "Analyze",
      action: () => navigate('/upload'),
      show: true,
    },
    {
      icon: TrendingUp,
      label: "Routine",
      action: () => navigate('/routine'),
      show: true,
    },
    {
      icon: MessageSquare,
      label: "Feedback",
      action: () => navigate('/beta-feedback'),
      show: true, // Always show feedback button
    },
    {
      icon: Sparkles,
      label: "Chat",
      action: onChatOpen,
      show: !!onChatOpen,
    },
  ].filter(item => item.show);

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className={`grid grid-cols-${navItems.length} gap-1 px-2 py-3`}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={item.action}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg",
                "transition-all duration-200 active:scale-95",
                "hover:bg-accent/50 active:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 text-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};