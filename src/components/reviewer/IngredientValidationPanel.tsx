import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { OEWObservationPanel } from '@/components/reviewer/OEWObservationPanel';
import { OEWEvidencePanel } from '@/components/reviewer/OEWEvidencePanel';
import { OEWWritingPanel } from '@/components/reviewer/OEWWritingPanel';
import { ConfidenceLevelSelector } from '@/components/reviewer/ConfidenceLevelSelector';
import { VerdictSelector } from '@/components/reviewer/VerdictSelector';
import { CorrectionInput } from '@/components/reviewer/CorrectionInput';
import { InternalNotesPanel } from '@/components/reviewer/InternalNotesPanel';
import { invokeFunction } from '@/lib/functions-client';

// Import Citation type from CitationForm to match the component's expected interface
import type { Citation } from '@/components/reviewer/CitationForm';

const normalizeLoadedCitationType = (value?: string): Citation['type'] => {
  if (value === 'pubmed' || value === 'pubchem' || value === 'cir' || value === 'dermatology_textbook' || value === 'request_source_type' || value === 'other') {
    return value;
  }
  if (value === 'cir_monograph') return 'cir';
  if (value === 'peer_reviewed' || value === 'clinical_study' || value === 'systematic_review') return 'pubmed';
  return 'other';
};

type SafetyLabel = 'safe' | 'concern' | 'needs_more_data' | '';

const normalizeSafetyLabel = (value?: string | null): SafetyLabel => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['safe', 'low_risk', 'low risk'].includes(normalized)) return 'safe';
  if (['concern', 'unsafe', 'caution', 'avoid', 'high_risk', 'high risk'].includes(normalized)) return 'concern';
  if (['needs_more_data', 'needs more data', 'needs_data', 'unknown', 'unverified', 'pending'].includes(normalized)) {
    return 'needs_more_data';
  }
  return '';
};

const deriveValidationStatus = (
  verdict: 'confirm' | 'correct' | 'escalate' | '',
  correctedSafetyLevel: SafetyLabel
): 'validated' | 'needs_correction' | 'pending' => {
  if (correctedSafetyLevel === 'safe') return 'validated';
  if (correctedSafetyLevel === 'concern') return 'needs_correction';
  if (correctedSafetyLevel === 'needs_more_data') return 'pending';

  if (verdict === 'confirm') return 'validated';
  if (verdict === 'correct' || verdict === 'escalate') return 'needs_correction';
  return 'pending';
};

const getSafetyBadgeClass = (value: SafetyLabel) => {
  if (value === 'safe') return 'bg-green-500/10 text-green-700 border-green-500/30';
  if (value === 'concern') return 'bg-red-500/10 text-red-700 border-red-500/30';
  if (value === 'needs_more_data') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-muted text-muted-foreground';
};

const getSafetyLabelText = (value: SafetyLabel) => {
  if (value === 'safe') return 'Safe';
  if (value === 'concern') return 'Concern';
  if (value === 'needs_more_data') return 'Needs More Data';
  return 'Not set';
};

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
  correctedSafetyLevel: SafetyLabel;
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
  onBackToList?: () => void;
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
  onBackToList,
  onValidationComplete
}: IngredientValidationPanelProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiApprovalActive, setAiApprovalActive] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [existingValidatorId, setExistingValidatorId] = useState<string | null>(null);
  const [existingValidationStatus, setExistingValidationStatus] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState(false);
  const [allowExtendedSourceTypes, setAllowExtendedSourceTypes] = useState(false);
  const draftSavingRef = useRef(false);
  const lastDraftHashRef = useRef<string>('');
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
    correctedSafetyLevel: '',
    moderatorReviewStatus: 'pending'
  });

  // Keep observation data in sync with latest ingredient/AI context
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ingredientId,
      observations: {
        ...prev.observations,
        ingredientName,
        aiClaimSummary: aiClaimSummary || prev.observations.aiClaimSummary || '',
        aiRoleClassification: aiRole || prev.observations.aiRoleClassification || '',
        aiSafetyLevel: aiSafetyLevel || prev.observations.aiSafetyLevel || '',
        aiExplanation: aiExplanation || prev.observations.aiExplanation || '',
        pubchemCid: pubchemCid || undefined,
        molecularWeight: molecularWeight || undefined
      }
    }));
  }, [
    ingredientId,
    ingredientName,
    aiClaimSummary,
    aiRole,
    aiSafetyLevel,
    aiExplanation,
    pubchemCid,
    molecularWeight
  ]);

  useEffect(() => {
    setAiApprovalActive(false);
  }, [ingredientId, analysisId]);

  // Load existing validation if editing
  useEffect(() => {
    const loadExistingValidation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setViewerId(user.id);

        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator']);

        const isAdmin = roleRows?.some((row) => row.role === 'admin') ?? false;
        const canUseExtendedSources = Boolean(roleRows?.length);
        setViewerIsAdmin(isAdmin);
        setAllowExtendedSourceTypes(canUseExtendedSources);

        const { data, error } = await (supabase as any)
          .from('ingredient_validations')
          .select('*')
          .eq('ingredient_name', ingredientName)
          .eq('analysis_id', analysisId || null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setExistingValidatorId(null);
          setExistingValidationStatus(null);
          setDisplayMode(false);
          setFormData(prev => ({
            ...prev,
            validationId: undefined,
            citations: [],
            publicExplanation: '',
            confidenceLevel: '',
            verdict: '',
            correctedSafetyLevel: '',
            correction: undefined,
            escalationReason: undefined,
            internalNotes: ''
          }));
          return;
        }

        const canEditExisting = isAdmin || data.validator_id === user.id;
        const validationStatus = data.validation_status || null;
        setExistingValidatorId(data.validator_id || null);
        setExistingValidationStatus(validationStatus);
        setDisplayMode(validationStatus === 'validated' || !canEditExisting);

        const citationData = await (supabase as any)
          .from('ingredient_validation_citations')
          .select('*')
          .eq('validation_id', data.id);

        setFormData(prev => ({
          ...prev,
          observations: {
            ...prev.observations,
            aiClaimSummary: data.ai_claim_summary || prev.observations.aiClaimSummary
          },
          validationId: data.id,
          publicExplanation: data.public_explanation || '',
          confidenceLevel: data.confidence_level || '',
          verdict: data.verdict || '',
          correctedSafetyLevel: normalizeSafetyLabel(data.corrected_safety_level),
          correction: data.correction_notes,
          escalationReason: data.escalation_reason,
          internalNotes: data.internal_notes || '',
          moderatorReviewStatus: data.moderator_review_status || 'pending',
          citations: (citationData.data || []).map((c: any) => ({
            type: normalizeLoadedCitationType(c.citation_type),
            title: c.title,
            authors: c.authors,
            journal_name: c.journal_name,
            publication_year: c.publication_year,
            source_id: c.source_id || c.doi_or_pmid || '',
            requested_source_type: c.requested_source_type || '',
            source_url: c.source_url
          }))
        }));

      } catch (error) {
        console.error('Error loading existing validation:', error);
      }
    };

    if (ingredientId && analysisId) {
      loadExistingValidation();
    }
  }, [ingredientId, analysisId, ingredientName]);

  const canEditValidation =
    !existingValidatorId || viewerIsAdmin || (viewerId !== null && viewerId === existingValidatorId);

  const hasDraftContent = () => {
    return (
      formData.citations.length > 0 ||
      formData.publicExplanation.trim().length > 0 ||
      formData.confidenceLevel !== '' ||
      formData.verdict !== '' ||
      formData.correctedSafetyLevel !== '' ||
      Boolean(formData.correction?.trim()) ||
      Boolean(formData.escalationReason?.trim()) ||
      Boolean(formData.internalNotes?.trim())
    );
  };

  const buildDraftHash = () =>
    JSON.stringify({
      ingredientId,
      analysisId,
      aiClaimSummary: formData.observations.aiClaimSummary,
      publicExplanation: formData.publicExplanation,
      confidenceLevel: formData.confidenceLevel,
      verdict: formData.verdict,
      correctedSafetyLevel: formData.correctedSafetyLevel,
      correction: formData.correction,
      escalationReason: formData.escalationReason,
      internalNotes: formData.internalNotes,
      citations: formData.citations
    });

  const saveDraft = async () => {
    if (!analysisId || !ingredientId || !ingredientName) return;
    if (loading) return;
    if (!canEditValidation) return;
    if (!hasDraftContent()) return;
    const draftHash = buildDraftHash();
    if (draftHash === lastDraftHashRef.current) return;
    if (draftSavingRef.current) return;

    draftSavingRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const validationStatus = deriveValidationStatus(formData.verdict, formData.correctedSafetyLevel);

      const validationRecord = {
        ingredient_name: ingredientName,
        analysis_id: analysisId,
        validator_id: existingValidatorId || user.id,
        ai_claim_summary: formData.observations.aiClaimSummary || null,
        public_explanation: formData.publicExplanation || null,
        confidence_level: formData.confidenceLevel || null,
        verdict: formData.verdict || null,
        correction_notes: formData.correction || null,
        escalation_reason: formData.escalationReason || null,
        internal_notes: formData.internalNotes || null,
        is_escalated: formData.verdict === 'escalate',
        moderator_review_status: formData.moderatorReviewStatus,
        corrected_safety_level: formData.correctedSafetyLevel || null,
        validation_status: validationStatus,
        updated_at: new Date().toISOString()
      };

      let validationId = formData.validationId;
      if (validationId) {
        let updateQuery = (supabase as any)
          .from('ingredient_validations')
          .update(validationRecord)
          .eq('id', validationId);

        if (!viewerIsAdmin) {
          updateQuery = updateQuery.eq('validator_id', user.id);
        }

        const { error } = await updateQuery;
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('ingredient_validations')
          .insert([validationRecord])
          .select('id')
          .single();
        if (error) throw error;
        validationId = data.id;
        setFormData(prev => ({ ...prev, validationId }));
      }

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
            journal_name: c.journal_name,
            publication_year: c.publication_year,
            source_id: c.source_id || null,
            doi_or_pmid: c.source_id || null,
            requested_source_type: c.requested_source_type || null,
            source_url: c.source_url
          }));

          const { error } = await (supabase as any)
            .from('ingredient_validation_citations')
            .insert(citationRecords);
          if (error) throw error;
        }
      }

      lastDraftHashRef.current = draftHash;
    } catch (error) {
      console.warn('Draft autosave failed:', error);
    } finally {
      draftSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!analysisId || !ingredientId) return;
    if (!hasDraftContent()) return;
    const timer = setTimeout(() => {
      void saveDraft();
    }, 1000);
    return () => clearTimeout(timer);
  }, [analysisId, ingredientId, ingredientName, formData]);

  // Validation helpers
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1: // Observation (always can proceed)
        return true;
      case 2: // Evidence (requires ≥1 citation)
        return formData.citations.length > 0;
      case 3: // Writing (requires some content)
        return formData.publicExplanation.trim().length > 0;
      case 4: // Confidence (requires selection)
        return formData.confidenceLevel !== '';
      case 5: // Verdict (requires selection)
        return formData.verdict !== '' && formData.correctedSafetyLevel !== '';
      case 6: // Notes (optional, can always save)
        return true;
      default:
        return false;
    }
  };

  const handleSave = async (options?: {
    overrides?: Partial<ValidationData>;
    allowMissingCitations?: boolean;
    allowEmptyExplanation?: boolean;
    aiApprove?: boolean;
  }) => {
    if (!canEditValidation) {
      toast({
        title: 'Read-only validation',
        description: 'Only the original verifier or an admin can edit this entry.',
        variant: 'destructive'
      });
      return;
    }

    const mergedData: ValidationData = {
      ...formData,
      ...options?.overrides,
      observations: {
        ...formData.observations,
        ...options?.overrides?.observations
      }
    };

    // Validate all required fields
    if (!options?.allowMissingCitations && mergedData.citations.length === 0) {
      toast({ title: "Missing evidence", description: "Add at least one citation.", variant: "destructive" });
      return;
    }
    if (!options?.allowEmptyExplanation && mergedData.publicExplanation.trim().length === 0) {
      toast({ title: "Missing explanation", description: "Add a public explanation before saving.", variant: "destructive" });
      return;
    }
    if (mergedData.confidenceLevel === '') {
      toast({ title: "Missing confidence", description: "Select confidence level.", variant: "destructive" });
      return;
    }
    if (mergedData.verdict === '') {
      toast({ title: "Missing verdict", description: "Select a verdict.", variant: "destructive" });
      return;
    }
    if (!mergedData.correctedSafetyLevel) {
      toast({ title: "Missing final label", description: "Select Safe, Concern, or Needs More Data.", variant: "destructive" });
      return;
    }
    if (
      mergedData.verdict !== 'escalate' &&
      mergedData.correctedSafetyLevel !== 'safe' &&
      mergedData.correctedSafetyLevel !== 'concern'
    ) {
      toast({
        title: "Final label required",
        description: "Select Safe or Concern to finalize this review.",
        variant: "destructive"
      });
      return;
    }

    if (!analysisId) {
      toast({ title: "Missing analysis", description: "Select a product before saving.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert/update ingredient_validations using any to bypass type checking
      const validationStatus = deriveValidationStatus(mergedData.verdict, mergedData.correctedSafetyLevel);

      const validationRecord = {
        ingredient_name: ingredientName,
        analysis_id: analysisId,
        validator_id: existingValidatorId || user.id,
        ai_claim_summary: mergedData.observations.aiClaimSummary,
        public_explanation: mergedData.publicExplanation,
        confidence_level: mergedData.confidenceLevel,
        verdict: mergedData.verdict,
        correction_notes: mergedData.correction,
        escalation_reason: mergedData.escalationReason,
        internal_notes: mergedData.internalNotes,
        is_escalated: mergedData.verdict === 'escalate',
        moderator_review_status: mergedData.moderatorReviewStatus,
        corrected_safety_level: mergedData.correctedSafetyLevel || null,
        validation_status: validationStatus,
        updated_at: new Date().toISOString(),
        ...(options?.aiApprove ? { ai_explanation_accurate: true } : {})
      };

      let validationId = mergedData.validationId;
      if (validationId) {
        let updateQuery = (supabase as any)
          .from('ingredient_validations')
          .update(validationRecord)
          .eq('id', validationId);

        if (!viewerIsAdmin) {
          updateQuery = updateQuery.eq('validator_id', user.id);
        }

        const { error } = await updateQuery;
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

        if (mergedData.citations.length > 0) {
          const citationRecords = mergedData.citations.map(c => ({
            validation_id: validationId,
            citation_type: c.type,
            title: c.title,
            authors: c.authors,
            journal_name: c.journal_name,
            publication_year: c.publication_year,
            source_id: c.source_id || null,
            doi_or_pmid: c.source_id || null,
            requested_source_type: c.requested_source_type || null,
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

      setCurrentStep(1);
      setFormData(prev => ({
        ...prev,
        ...mergedData,
        validationId
      }));
      setExistingValidatorId(user.id);
      setExistingValidationStatus(validationStatus);
      if (validationStatus === 'validated') {
        setDisplayMode(true);
      }

      onValidationComplete();

      // Fire-and-forget reviewer update email for scan owner, but surface failures/skips.
      void (async () => {
        try {
          const emailResult = await invokeFunction('send-review-update-email', {
            analysisId,
            ingredientName,
            validationStatus,
            finalLabel: mergedData.correctedSafetyLevel,
            verdict: mergedData.verdict
          });

          if (emailResult?.skipped === 'owner_email_missing') {
            toast({
              title: "Email skipped",
              description: "Scan owner email is missing, so no notification email was sent."
            });
          }
        } catch (emailError: any) {
          console.warn('review update email send failed:', emailError);
          toast({
            title: "Email send failed",
            description: emailError?.message || "Could not send reviewer update email.",
            variant: "destructive"
          });
        }
      })();
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

  const handleAiApprove = async () => {
    const summary = formData.publicExplanation.trim();
    if (!summary) {
      toast({
        title: "Summary required",
        description: "Add a brief reviewer summary before approving the AI explanation.",
        variant: "destructive"
      });
      return;
    }

    if (formData.correctedSafetyLevel !== 'safe' && formData.correctedSafetyLevel !== 'concern') {
      toast({
        title: "Decision required",
        description: "When agreeing with AI, choose Safe or Concern before validating.",
        variant: "destructive"
      });
      return;
    }

    const aiLabel = normalizeSafetyLabel(formData.observations.aiSafetyLevel);
    const quickVerdict =
      aiLabel && aiLabel === formData.correctedSafetyLevel
        ? 'confirm'
        : formData.correctedSafetyLevel === 'safe'
          ? 'confirm'
          : 'correct';

    await handleSave({
      overrides: {
        publicExplanation: summary,
        confidenceLevel: 'High',
        verdict: quickVerdict,
        correctedSafetyLevel: formData.correctedSafetyLevel
      },
      allowMissingCitations: true,
      aiApprove: true
    });
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
            showAiApproval={
              Boolean(
                formData.observations.aiExplanation?.trim() ||
                formData.observations.aiClaimSummary?.trim()
              )
            }
            aiApprovalChecked={aiApprovalActive}
            aiApprovalSummary={formData.publicExplanation}
            onToggleAiApproval={(checked) => setAiApprovalActive(checked)}
            onAiApprovalSummaryChange={(value) => setFormData(prev => ({ ...prev, publicExplanation: value }))}
            aiApprovalFinalLabel={formData.correctedSafetyLevel}
            onAiApprovalFinalLabelChange={(value) => setFormData(prev => ({ ...prev, correctedSafetyLevel: value }))}
            onApproveAi={handleAiApprove}
            aiApprovalLoading={loading}
          />
        );
      case 2:
        return (
          <OEWEvidencePanel
            citations={formData.citations}
            onCitationsChange={(citations) => setFormData(prev => ({ ...prev, citations }))}
            ingredientName={formData.observations.ingredientName}
            allowExtendedSourceTypes={allowExtendedSourceTypes}
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
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Final Consumer Label</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This label updates the user scan buckets and score. Choose Safe or Concern to finalize.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'safe', title: 'Safe' },
                    { value: 'concern', title: 'Concern' },
                    { value: 'needs_more_data', title: 'Needs More Data' }
                  ] as const).map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.correctedSafetyLevel === option.value ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, correctedSafetyLevel: option.value }))}
                      disabled={option.value === 'needs_more_data' && formData.verdict !== 'escalate'}
                      className="justify-start"
                    >
                      {option.title}
                    </Button>
                  ))}
                </div>
                {formData.verdict !== 'escalate' && (
                  <p className="text-xs text-muted-foreground">
                    Use Needs More Data only when Escalate is selected.
                  </p>
                )}
                <div className="text-xs">
                  <Badge variant="outline" className={getSafetyBadgeClass(formData.correctedSafetyLevel)}>
                    Final: {getSafetyLabelText(formData.correctedSafetyLevel)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
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

  if (displayMode) {
    return (
      <Card className="border-l-4 border-l-primary">
        {onBackToList && (
          <div className="px-6 pt-4 sm:hidden">
            <Button variant="outline" size="sm" onClick={onBackToList} className="w-full">
              Back to Ingredients
            </Button>
          </div>
        )}
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg leading-snug break-words">
              Verification Summary
            </CardTitle>
            <Badge
              variant="outline"
              className={
                existingValidationStatus === 'validated'
                  ? 'bg-green-500/10 text-green-700 border-green-500/30'
                  : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
              }
            >
              {existingValidationStatus === 'validated' ? 'Verified' : 'In Progress'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {canEditValidation
              ? 'This entry is currently in display mode. Reopen the wizard only when revalidation is needed.'
              : 'This entry is locked. Only the original verifier or an admin can edit it.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.publicExplanation && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Public Explanation</p>
              <p className="text-sm rounded-md border bg-muted/30 p-3">{formData.publicExplanation}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-sm font-medium">{formData.confidenceLevel || 'Not set'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Verdict</p>
              <p className="text-sm font-medium">{formData.verdict || 'Not set'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Citations</p>
              <p className="text-sm font-medium">{formData.citations.length}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Final Label</p>
              <Badge variant="outline" className={`mt-1 ${getSafetyBadgeClass(formData.correctedSafetyLevel)}`}>
                {getSafetyLabelText(formData.correctedSafetyLevel)}
              </Badge>
            </div>
          </div>
          {formData.citations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Source IDs</p>
              <div className="flex flex-wrap gap-2">
                {formData.citations.map((citation, index) => (
                  <code key={`${citation.source_id}-${index}`} className="rounded bg-muted px-2 py-1 text-xs">
                    {citation.source_id || citation.requested_source_type || citation.type}
                  </code>
                ))}
              </div>
            </div>
          )}

          {canEditValidation && (
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">
                Reopen only when the ingredient changed, formulation changed, or scheduled revalidation is due.
              </p>
              <Button variant="outline" onClick={() => setDisplayMode(false)}>
                Reopen Validation Wizard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      {onBackToList && (
        <div className="px-6 pt-4 sm:hidden">
          <Button variant="outline" size="sm" onClick={onBackToList} className="w-full">
            Back to Ingredients
          </Button>
        </div>
      )}
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg leading-snug break-words">
            Step {currentStep} of 6: {
              currentStep === 1 ? 'Observation' :
              currentStep === 2 ? 'Evidence' :
              currentStep === 3 ? 'Writing' :
              currentStep === 4 ? 'Confidence' :
              currentStep === 5 ? 'Verdict' :
              'Internal Notes'
            }
          </CardTitle>
          <div className="text-sm text-muted-foreground shrink-0">
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
              onClick={async () => {
                if (canProceedFromStep(currentStep)) {
                  await saveDraft();
                  setCurrentStep(currentStep + 1);
                } else {
                  const messages = {
                    1: 'Cannot proceed from observation step',
                    2: 'Add at least one citation to proceed',
                    3: 'Add a public explanation to proceed',
                    4: 'Select a confidence level',
                    5: 'Select a verdict and final consumer label'
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
