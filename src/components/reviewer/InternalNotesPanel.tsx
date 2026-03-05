import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle } from 'lucide-react';

interface InternalNotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  nuanceFlags: string[];
  onNuanceFlagsChange: (flags: string[]) => void;
  compatibilityAssessment: 'compatible' | 'caution' | 'avoid' | 'needs_more_data' | 'unknown';
  onCompatibilityAssessmentChange: (value: 'compatible' | 'caution' | 'avoid' | 'needs_more_data' | 'unknown') => void;
  compatibilityNotes: string;
  onCompatibilityNotesChange: (value: string) => void;
  maxLength?: number;
}

export function InternalNotesPanel({
  value,
  onChange,
  nuanceFlags,
  onNuanceFlagsChange,
  compatibilityAssessment,
  onCompatibilityAssessmentChange,
  compatibilityNotes,
  onCompatibilityNotesChange,
  maxLength = 500
}: InternalNotesPanelProps) {
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Internal Notes for Moderators
        </CardTitle>
        <CardDescription>
          Optional: Add context, concerns, or guidance for the review team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Compatibility Assessment</label>
          <Select
            value={compatibilityAssessment}
            onValueChange={(value) =>
              onCompatibilityAssessmentChange(
                value as 'compatible' | 'caution' | 'avoid' | 'needs_more_data' | 'unknown'
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select compatibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compatible">Compatible</SelectItem>
              <SelectItem value="caution">Use With Caution</SelectItem>
              <SelectItem value="avoid">Avoid Pairing</SelectItem>
              <SelectItem value="needs_more_data">Needs More Data</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Compatibility Notes</label>
          <Textarea
            value={compatibilityNotes}
            onChange={(e) => onCompatibilityNotesChange(e.target.value.slice(0, maxLength))}
            maxLength={maxLength}
            placeholder="Explain pairings, conflicts, or sequencing considerations."
            className="w-full min-h-[80px] p-3 border rounded-md resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Nuance Flags (comma-separated)</label>
          <Input
            value={nuanceFlags.join(', ')}
            onChange={(e) =>
              onNuanceFlagsChange(
                e.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
              )
            }
            placeholder="e.g., concentration-sensitive, pregnancy caution, photo-instability"
          />
        </div>

        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          maxLength={maxLength}
          placeholder="e.g., 'Found conflicting studies on concentration', 'May need expert dermatologist review', 'New ingredient - limited data available'"
          className="w-full min-h-[100px] p-3 border rounded-md resize-none"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium ${
              isAtLimit
                ? 'text-red-600'
                : isNearLimit
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {characterCount}/{maxLength} characters
          </span>
          {isAtLimit && <span className="text-xs text-red-600">Character limit reached</span>}
        </div>
        <p className="text-xs text-gray-600">
          Use this to flag concerns, conflicting evidence, requests for expert review, or important context for moderators.
        </p>
      </CardContent>
    </Card>
  );
}
