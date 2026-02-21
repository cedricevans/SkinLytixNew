import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Gauge,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

type ConfidenceLevel = 'High' | 'Moderate' | 'Limited';

interface ConfidenceLevelSelectorProps {
  value: ConfidenceLevel | null;
  onChange: (level: ConfidenceLevel) => void;
  evidenceCount?: number;
}

const CONFIDENCE_LEVELS = [
  {
    value: 'High' as const,
    icon: '🟢',
    title: 'High Confidence',
    description: 'Strong peer-reviewed evidence from multiple sources; AI claim is accurate',
    indicators: [
      'Multiple independent peer-reviewed studies confirm the claim',
      'Systematic reviews or meta-analyses support the evidence',
      'Clinical consensus supports it',
      'No conflicting evidence found'
    ],
    example: 'Retinol for wrinkles, Salicylic acid for acne, Hyaluronic acid for hydration'
  },
  {
    value: 'Moderate' as const,
    icon: '🟡',
    title: 'Moderate Confidence',
    description: 'Single solid study or clinical evidence; AI claim is mostly accurate but nuance missing',
    indicators: [
      'One high-quality peer-reviewed RCT confirms the claim',
      'Clinical consensus supports it but research is limited',
      'No conflicting evidence found',
      'Some nuance or conditions apply'
    ],
    example: 'Niacinamide for sebum control, Vitamin E as antioxidant'
  },
  {
    value: 'Limited' as const,
    icon: '🔴',
    title: 'Limited Confidence',
    description: 'Weak evidence, conflicting studies, or missing peer-reviewed data; needs escalation',
    indicators: [
      'Only anecdotal evidence available',
      'Single small case study (not RCT)',
      'Conflicting peer-reviewed sources',
      'Very new ingredient with no long-term data',
      'Only manufacturer claims, no independent research'
    ],
    example: 'Very new trending ingredients, proprietary complexes without research',
    requiresEscalation: true
  }
];

export function ConfidenceLevelSelector({
  value,
  onChange,
  evidenceCount = 0
}: ConfidenceLevelSelectorProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Step 4: Confidence Level</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Rate your confidence in the evidence you found
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evidence Quality Summary */}
        {evidenceCount > 0 && (
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-600">
            <p className="font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Evidence Quality Assessment
            </p>
            <p className="text-xs mt-2">
              You found {evidenceCount} citation{evidenceCount !== 1 ? 's' : ''}. 
              {evidenceCount === 1 && ' This is the minimum. Consider finding more for higher confidence.'}
              {evidenceCount >= 2 && ' Multiple sources strengthen your confidence level.'}
            </p>
          </div>
        )}

        {/* Selection Instructions */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg text-sm text-amber-600">
          <p className="font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            How to Choose
          </p>
          <p className="text-xs mt-2">
            Based on the number and quality of peer-reviewed sources you found, select the confidence 
            level that best reflects your assessment.
          </p>
        </div>

        {/* Confidence Levels */}
        <div className="space-y-3">
          {CONFIDENCE_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                value === level.value
                  ? 'border-primary bg-primary/5'
                  : 'border-muted bg-muted/30 hover:border-muted-foreground/30'
              }`}
            >
              {/* Radio Button */}
              <div className="flex items-center h-5 mr-3 mt-0.5">
                <input
                  type="radio"
                  name="confidence"
                  value={level.value}
                  checked={value === level.value}
                  onChange={() => onChange(level.value)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title and Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{level.icon}</span>
                  <span className="font-medium">{level.title}</span>
                  {level.requiresEscalation && (
                    <Badge variant="destructive" className="text-xs">
                      Requires Escalation
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-2">
                  {level.description}
                </p>

                {/* Indicators */}
                <div className="text-xs space-y-1 ml-6">
                  <p className="font-medium text-foreground">When to choose this:</p>
                  <ul className="list-disc text-muted-foreground space-y-1">
                    {level.indicators.map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                </div>

                {/* Example */}
                <p className="text-xs mt-2 italic text-muted-foreground">
                  Example: {level.example}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* Selection Confirmation */}
        {value && (
          <div className={`p-4 rounded-lg border-2 ${
            value === 'High' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
            value === 'Moderate' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
            'bg-red-500/10 border-red-500/30 text-red-600'
          }`}>
            <p className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {CONFIDENCE_LEVELS.find(l => l.value === value)?.title}
            </p>
            <p className="text-xs mt-2">
              You've selected "{value}" confidence based on your evidence assessment.
            </p>
          </div>
        )}

        {/* Confidence Requirements by Evidence Count */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="font-medium text-sm">Evidence Quality Hierarchy</p>
          <div className="text-xs space-y-2 text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-fit">Tier 1 (Strongest):</span>
              <span>Systematic reviews, meta-analyses, CIR expert panel</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-fit">Tier 2 (Moderate):</span>
              <span>Single RCT, clinical studies from dermatology clinics, multiple in vitro studies</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-fit">Tier 3 (Weak):</span>
              <span>Case studies, in vitro only, manufacturer-funded studies, anecdotal reports</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
