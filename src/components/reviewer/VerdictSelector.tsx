import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2,
  Edit3,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

type Verdict = 'confirm' | 'correct' | 'escalate';

interface VerdictSelectorProps {
  value: Verdict | null;
  onChange: (verdict: Verdict) => void;
  hasCorrections?: boolean;
  isEscalated?: boolean;
}

const VERDICTS = [
  {
    value: 'confirm' as const,
    icon: <CheckCircle2 className="w-6 h-6" />,
    color: 'text-green-600 bg-green-500/10 border-green-500/30',
    title: 'Confirm',
    subtitle: 'AI claim is 100% accurate',
    description: 'The peer-reviewed evidence fully supports the AI\'s claim exactly as stated.',
    when: [
      'Multiple independent studies confirm the claim',
      'AI statement matches the evidence perfectly',
      'No corrections or nuance needed',
      'Safety and efficacy are well-established'
    ],
    example: 'AI: "Retinol reduces wrinkles" + Evidence: Studies confirm this = CONFIRM'
  },
  {
    value: 'correct' as const,
    icon: <Edit3 className="w-6 h-6" />,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
    title: 'Correct',
    subtitle: 'AI claim needs revision',
    description: 'The evidence requires a specific correction or adds important nuance to the AI claim.',
    when: [
      'AI claim is mostly right but missing nuance',
      'Evidence contradicts part of the claim',
      'Concentration or concentration ranges differ',
      'AI overstated or understated something',
      'Important caveats (pregnancy, sensitive skin, etc.) are missing'
    ],
    example: 'AI: "Niacinamide reduces pore size" + Evidence: Actually improves appearance only = CORRECT to "improves pore appearance"',
    requiresInput: true,
    inputLabel: 'What needs to be corrected?'
  },
  {
    value: 'escalate' as const,
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'text-red-600 bg-red-500/10 border-red-500/30',
    title: 'Escalate',
    subtitle: 'Insufficient or conflicting evidence',
    description: 'The evidence is too weak, conflicting, or missing to make a confident assessment. Flag for moderator review.',
    when: [
      'Found no peer-reviewed evidence',
      'Only found conflicting studies with no clear consensus',
      'Evidence is too new (ingredient just discovered)',
      'Only manufacturer claims, no independent research',
      'Very limited evidence (single small study)',
      'Evidence is inconclusive or contradictory'
    ],
    example: 'New ingredient with only 1 small study, conflicting results, no consensus = ESCALATE for expert review',
    requiresInput: true,
    inputLabel: 'Why are you escalating? What evidence is missing?'
  }
];

export function VerdictSelector({
  value,
  onChange,
  hasCorrections = false,
  isEscalated = false
}: VerdictSelectorProps) {
  const selectedVerdict = VERDICTS.find(v => v.value === value);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Step 5: Verdict</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          What is your professional assessment of the AI claim?
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructions */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-600">
          <p className="font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Based on Your Evidence
          </p>
          <p className="text-xs mt-2">
            Choose one of three verdicts based on what the peer-reviewed sources show about the AI claim.
          </p>
        </div>

        {/* Verdict Options */}
        <div className="space-y-3">
          {VERDICTS.map((verdict) => (
            <label
              key={verdict.value}
              className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                value === verdict.value
                  ? `border-primary ${verdict.color}`
                  : 'border-muted bg-muted/30 hover:border-muted-foreground/30'
              }`}
            >
              {/* Radio Button */}
              <div className="flex items-center h-6 mr-4">
                <input
                  type="radio"
                  name="verdict"
                  value={verdict.value}
                  checked={value === verdict.value}
                  onChange={() => onChange(verdict.value)}
                  className="w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-center gap-3 mb-1">
                  <div className={verdict.color}>
                    {verdict.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{verdict.title}</p>
                    <p className="text-xs text-muted-foreground">{verdict.subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 ml-10">
                  {verdict.description}
                </p>

                {/* When to Choose */}
                <div className="ml-10 mb-3">
                  <p className="text-xs font-medium text-foreground mb-1">When to choose this:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc ml-5">
                    {verdict.when.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Example */}
                <div className="ml-10 p-2 bg-muted/50 rounded text-xs italic text-muted-foreground">
                  Example: {verdict.example}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Selection Confirmation */}
        {value && selectedVerdict && (
          <div className={`p-4 rounded-lg border-2 ${selectedVerdict.color}`}>
            <p className="font-medium text-sm flex items-center gap-2">
              {selectedVerdict.icon}
              {selectedVerdict.title}
            </p>
            <p className="text-xs mt-2">
              {selectedVerdict.description}
            </p>
            {selectedVerdict.value === 'escalate' && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600">
                <p className="font-medium mb-1">⚠️ Escalation Impact</p>
                <p>
                  Escalated validations will be sent to moderators for expert review. 
                  They may approve, request revisions, or provide additional guidance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Decision Tree */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <p className="font-medium text-sm">Quick Decision Guide</p>
          <div className="text-xs space-y-2 text-muted-foreground font-mono">
            <div className="space-y-1">
              <p>Does evidence SUPPORT AI claim 100%?</p>
              <p className="ml-4 text-green-600">✓ YES → CONFIRM</p>
            </div>
            <div className="space-y-1">
              <p>Does evidence mostly support but need changes?</p>
              <p className="ml-4 text-amber-600">⚠ PARTIALLY → CORRECT</p>
            </div>
            <div className="space-y-1">
              <p>Is evidence weak, conflicting, or missing?</p>
              <p className="ml-4 text-red-600">✗ NO → ESCALATE</p>
            </div>
          </div>
        </div>

        {/* Evidence Reminder */}
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-600">
          <p className="font-medium">💡 Remember:</p>
          <p className="mt-1">
            Your verdict should be based ONLY on what the peer-reviewed sources show, 
            not on personal opinion or anecdotal evidence.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
