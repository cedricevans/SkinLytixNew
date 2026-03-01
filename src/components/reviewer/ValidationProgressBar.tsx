import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface ValidationProgressBarProps {
  total: number;
  validated: number;
  needsCorrection: number;
  flagged?: number;
}

export function ValidationProgressBar({
  total,
  validated,
  needsCorrection,
  flagged = 0
}: ValidationProgressBarProps) {
  const completed = validated + needsCorrection + flagged;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Validation Progress</span>
        <span className="text-muted-foreground">{completed}/{total} ingredients</span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant="outline" 
          className="bg-green-500/10 text-green-600 border-green-500/20"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {validated} Validated
        </Badge>
        {needsCorrection > 0 && (
          <Badge 
            variant="outline" 
            className="bg-amber-500/10 text-amber-600 border-amber-500/20"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {needsCorrection} In Progress
          </Badge>
        )}
        {remaining > 0 && (
          <Badge 
            variant="outline" 
            className="bg-muted text-muted-foreground"
          >
            <Clock className="w-3 h-3 mr-1" />
            {remaining} Remaining
          </Badge>
        )}
      </div>

      {percentage === 100 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          All ingredients validated! You can complete this review.
        </div>
      )}
    </div>
  );
}
