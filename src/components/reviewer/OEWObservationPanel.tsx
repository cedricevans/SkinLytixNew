import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Bot,
  AlertCircle
} from 'lucide-react';

interface OEWObservationPanelProps {
  ingredientName: string;
  aiClaimSummary: string;
  aiRoleClassification?: string;
  aiSafetyLevel?: string;
  aiExplanation?: string;
  pubchemCid?: string | null;
  molecularWeight?: number | null;
}

export function OEWObservationPanel({
  ingredientName,
  aiClaimSummary,
  aiRoleClassification,
  aiSafetyLevel,
  aiExplanation,
  pubchemCid,
  molecularWeight
}: OEWObservationPanelProps) {
  const getSafetyLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'safe':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'caution':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'avoid':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Step 1: Observation</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review what the AI claims about this ingredient
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ingredient Name - Main Header */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
            Ingredient Being Validated
          </p>
          <h2 className="text-3xl font-bold text-foreground break-words leading-tight">
            {ingredientName}
          </h2>
        </div>

        {/* AI Claim Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <p className="font-medium text-sm">AI Claim Summary</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border border-muted">
            <p className="text-sm leading-relaxed break-words">
              {aiClaimSummary || 'No claim summary available'}
            </p>
          </div>
        </div>

        {/* AI Classification Details */}
        {(aiRoleClassification || aiSafetyLevel) && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Role Classification */}
            {aiRoleClassification && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  AI Role Classification
                </p>
                <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                  <Badge variant="secondary" className="capitalize">
                    {aiRoleClassification}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    How AI categorized this ingredient's primary function
                  </p>
                </div>
              </div>
            )}

            {/* Safety Level */}
            {aiSafetyLevel && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  AI Safety Level
                </p>
                <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                  <Badge 
                    variant="outline"
                    className={`capitalize ${getSafetyLevelColor(aiSafetyLevel)}`}
                  >
                    {aiSafetyLevel}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    AI's initial safety assessment
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full AI Explanation */}
        {aiExplanation && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <p className="font-medium text-sm">Full AI Explanation</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border border-muted/50 space-y-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {aiExplanation}
              </p>
              <div className="text-xs text-muted-foreground flex items-center gap-2 pt-3 border-t border-muted/50">
                <AlertCircle className="w-3 h-3" />
                Your job in the next steps: verify this claim against peer-reviewed evidence
              </div>
            </div>
          </div>
        )}

        {/* PubChem Data Context */}
        {(pubchemCid || molecularWeight) && (
          <div className="space-y-3 pt-2 border-t border-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              PubChem Reference Data
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {pubchemCid && (
                <div>
                  <span className="text-muted-foreground">CID:</span>
                  <p className="font-mono text-xs mt-1 break-all">{pubchemCid}</p>
                </div>
              )}
              {molecularWeight && (
                <div>
                  <span className="text-muted-foreground">Molecular Weight:</span>
                  <p className="font-mono text-xs mt-1">{molecularWeight} g/mol</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions for Next Step */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Next Step: Find Evidence
          </p>
          <p className="text-xs text-blue-600/80 mt-2">
            Search for at least 1 peer-reviewed source (PubMed, journal article, CIR monograph, etc.) 
            that either confirms or contradicts this AI claim.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
