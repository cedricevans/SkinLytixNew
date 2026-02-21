import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { OEWObservationPanel } from '@/components/reviewer/OEWObservationPanel';
import { OEWEvidencePanel } from '@/components/reviewer/OEWEvidencePanel';
import { OEWWritingPanel } from '@/components/reviewer/OEWWritingPanel';
import { ConfidenceLevelSelector } from '@/components/reviewer/ConfidenceLevelSelector';
import { VerdictSelector } from '@/components/reviewer/VerdictSelector';
import { CorrectionInput } from '@/components/reviewer/CorrectionInput';
import { InternalNotesPanel } from '@/components/reviewer/InternalNotesPanel';

// Import Citation type from CitationForm to match the component's expected interface
import type { Citation } from '@/components/reviewer/CitationForm';

interface ValidationData {
  ingredientId: string;
  validationId?: string;
  observations: {
    ingredientName: string;
    aiClaimSummary: string;
    aiRoleClassification: string;
    aiSafetyLevel: string;
    aiExplanation: string;
    pubchemCid?: string;
    molecularWeight?: number;
  };
  citations: Citation[];
  publicExplanation: string;
  confidenceLevel: 'High' | 'Moderate' | 'Limited' | '';
  verdict: 'confirm' | 'correct' | 'escalate' | '';
  correction?: string;
  escalationReason?: string;
  internalNotes?: string;
  moderatorReviewStatus: 'pending' | 'approved' | 'rejected';
}

interface IngredientValidationPanelProps {
  ingredientId: string;
  ingredientName: string;
  analysisId?: string;
  pubchemCid?: string | null;
  molecularWeight?: number | null;
  aiRole?: string;
  aiSafetyLevel?: string;
  aiExplanation?: string;
  aiClaimSummary?: string;
  onValidationComplete: () => void;
}

export function IngredientValidationPanel({
  ingredientId,
  ingredientName,
  analysisId,
  pubchemCid,
  molecularWeight,
  aiRole,
  aiSafetyLevel,
  aiExplanation,
  aiClaimSummary,
  onValidationComplete
}: IngredientValidationPanelProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ValidationData>({
    ingredientId,
    observations: {
      ingredientName,
      aiClaimSummary: aiClaimSummary || '',
      aiRoleClassification: aiRole || '',
      aiSafetyLevel: aiSafetyLevel || '',
      aiExplanation: aiExplanation || '',
      pubchemCid,
      molecularWeight
    },
    citations: [],
    publicExplanation: '',
    confidenceLevel: '',
    verdict: '',
    moderatorReviewStatus: 'pending'
  });

  // Load existing validation if editing
  useEffect(() => {
    const loadExistingValidation = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('ingredient_validations')
          .select('*')
          .eq('ingredient_id', ingredientId)
          .eq('analysis_id', analysisId || null)
          .single();

        if (data) {
          const citationData = await (supabase as any)
            .from('ingredient_validation_citations')
            .select('*')
            .eq('validation_id', data.id);

          setFormData(prev => ({
            ...prev,
            validationId: data.id,
            publicExplanation: data.public_explanation || '',
            confidenceLevel: data.confidence_level || '',
            verdict: data.verdict || '',
            correction: data.correction,
            escalationReason: data.escalation_reason,
            internalNotes: data.internal_notes || '',
            citations: (citationData.data || []).map((c: any) => ({
              type: c.citation_type as any,
              title: c.title,
              authors: c.authors,
              journal_name: c.journal,
              publication_year: c.year,
              doi_or_pmid: c.doi_or_pmid,
              source_url: c.source_url
            }))
          }));
        }
      } catch (error) {
        console.error('Error loading existing validation:', error);
      }
    };

    if (ingredientId && analysisId) {
      loadExistingValidation();
    }
  }, [ingredientId, analysisId]);

  // Validation helpers
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1: // Observation (always can proceed)
        return true;
      case 2: // Evidence (requires ≥1 citation)
        return formData.citations.length > 0;
      case 3: // Writing (requires 150-300 words)
        const wordCount = formData.publicExplanation.trim().split(/\s+/).length;
        return wordCount >= 150 && wordCount <= 300;
      case 4: // Confidence (requires selection)
        return formData.confidenceLevel !== '';
      case 5: // Verdict (requires selection)
        return formData.verdict !== '';
      case 6: // Notes (optional, can always save)
        return true;
      default:
        return false;
    }
  };

  const handleRemoveCitation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      citations: prev.citations.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    // Validate all required fields
    if (formData.citations.length === 0) {
      toast({ title: "Missing evidence", description: "Add at least one citation.", variant: "destructive" });
      return;
    }
    const wordCount = formData.publicExplanation.trim().split(/\s+/).length;
    if (wordCount < 150 || wordCount > 300) {
      toast({ title: "Invalid word count", description: "Explanation must be 150-300 words.", variant: "destructive" });
      return;
    }
    if (formData.confidenceLevel === '') {
      toast({ title: "Missing confidence", description: "Select confidence level.", variant: "destructive" });
      return;
    }
    if (formData.verdict === '') {
      toast({ title: "Missing verdict", description: "Select a verdict.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert/update ingredient_validations using any to bypass type checking
      const validationRecord = {
        ingredient_id: formData.ingredientId,
        analysis_id: analysisId || null,
        validator_id: user.id,
        ingredient_name: ingredientName,
        ai_claim_summary: formData.observations.aiClaimSummary,
        public_explanation: formData.publicExplanation,
        confidence_level: formData.confidenceLevel,
        verdict: formData.verdict,
        correction: formData.correction,
        escalation_reason: formData.escalationReason,
        internal_notes: formData.internalNotes,
        is_escalated: formData.verdict === 'escalate',
        moderator_review_status: formData.moderatorReviewStatus,
        updated_at: new Date().toISOString()
      };

      let validationId = formData.validationId;
      if (validationId) {
        const { error } = await (supabase as any)
          .from('ingredient_validations')
          .update(validationRecord)
          .eq('id', validationId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('ingredient_validations')
          .insert([validationRecord])
          .select('id')
          .single();
        if (error) throw error;
        validationId = data.id;
      }

      // Delete old citations and insert new ones
      if (validationId) {
        await (supabase as any)
          .from('ingredient_validation_citations')
          .delete()
          .eq('validation_id', validationId);

        if (formData.citations.length > 0) {
          const citationRecords = formData.citations.map(c => ({
            validation_id: validationId,
            citation_type: c.type,
            title: c.title,
            authors: c.authors,
            journal: c.journal_name,
            year: c.publication_year,
            doi_or_pmid: c.doi_or_pmid,
            source_url: c.source_url
          }));

          const { error } = await (supabase as any)
            .from('ingredient_validation_citations')
            .insert(citationRecords);
          if (error) throw error;
        }
      }

      toast({
        title: "Validation saved!",
        description: `${ingredientName} has been validated successfully.`
      });

      // Reset form
      setCurrentStep(1);
      setFormData(prev => ({
        ...prev,
        validationId,
        publicExplanation: '',
        confidenceLevel: '',
        verdict: '',
        correction: undefined,
        escalationReason: undefined,
        internalNotes: '',
        citations: []
      }));

      onValidationComplete();
    } catch (error: any) {
      console.error('Error saving validation:', error);
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step content rendering
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OEWObservationPanel
            ingredientName={formData.observations.ingredientName}
            aiClaimSummary={formData.observations.aiClaimSummary}
            aiRoleClassification={formData.observations.aiRoleClassification}
            aiSafetyLevel={formData.observations.aiSafetyLevel}
            aiExplanation={formData.observations.aiExplanation}
            pubchemCid={formData.observations.pubchemCid}
            molecularWeight={formData.observations.molecularWeight}
          />
        );
      case 2:
        return (
          <OEWEvidencePanel
            citations={formData.citations}
            onCitationsChange={(citations) => setFormData(prev => ({ ...prev, citations }))}
            ingredientName={formData.observations.ingredientName}
          />
        );
      case 3:
        return (
          <OEWWritingPanel
            value={formData.publicExplanation}
            onChange={(value) => setFormData(prev => ({ ...prev, publicExplanation: value }))}
            ingredientName={formData.observations.ingredientName}
          />
        );
      case 4:
        return (
          <ConfidenceLevelSelector
            value={formData.confidenceLevel as any}
            onChange={(value) => setFormData(prev => ({ ...prev, confidenceLevel: value as any }))}
          />
        );
      case 5:
        return (
          <div className="space-y-6">
            <VerdictSelector
              value={formData.verdict as any}
              onChange={(value) => setFormData(prev => ({ ...prev, verdict: value as any }))}
            />
            {formData.verdict === 'correct' && (
              <CorrectionInput
                value={formData.correction || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, correction: value }))}
                isVisible={true}
              />
            )}
            {formData.verdict === 'escalate' && (
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium">Escalation Reason</label>
                <textarea
                  placeholder="Explain why this requires escalation..."
                  value={formData.escalationReason || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, escalationReason: e.target.value }))}
                  className="w-full mt-2 p-3 border border-input rounded-md"
                  rows={3}
                />
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <InternalNotesPanel
            value={formData.internalNotes || ''}
            onChange={(value) => setFormData(prev => ({ ...prev, internalNotes: value }))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Step {currentStep} of 6: {
              currentStep === 1 ? 'Observation' :
              currentStep === 2 ? 'Evidence' :
              currentStep === 3 ? 'Writing' :
              currentStep === 4 ? 'Confidence' :
              currentStep === 5 ? 'Verdict' :
              'Internal Notes'
            }
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {Math.round((currentStep / 6) * 100)}% complete
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep === 6 ? (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Validation'
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (canProceedFromStep(currentStep)) {
                  setCurrentStep(currentStep + 1);
                } else {
                  const messages = {
                    1: 'Cannot proceed from observation step',
                    2: 'Add at least one citation to proceed',
                    3: 'Explanation must be 150-300 words',
                    4: 'Select a confidence level',
                    5: 'Select a verdict'
                  };
                  toast({
                    title: "Cannot proceed",
                    description: messages[currentStep as keyof typeof messages] || '',
                    variant: "destructive"
                  });
                }
              }}
              disabled={loading}
              className="ml-auto"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
