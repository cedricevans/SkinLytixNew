import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'premium' | 'pro';

export type Feature = 
  | 'score_breakdown'
  | 'full_ai_explanation'
  | 'chat_unlimited'
  | 'routine_optimization'
  | 'multiple_routines'
  | 'product_comparison'
  | 'pdf_export_clean'
  | 'batch_analysis'
  | 'priority_support';

const FEATURE_ACCESS: Record<Feature, SubscriptionTier[]> = {
  score_breakdown: ['premium', 'pro'],
  full_ai_explanation: ['premium', 'pro'],
  chat_unlimited: ['pro'],
  routine_optimization: ['premium', 'pro'],
  multiple_routines: ['premium', 'pro'],
  product_comparison: ['premium', 'pro'],
  pdf_export_clean: ['premium', 'pro'],
  batch_analysis: ['pro'],
  priority_support: ['pro'],
};

interface SubscriptionState {
  tier: SubscriptionTier;
  isAdmin: boolean;
  demoModeTier: SubscriptionTier | null;
  isLoading: boolean;
  trialEndsAt: Date | null;
  isInTrial: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    isAdmin: false,
    demoModeTier: null,
    isLoading: true,
    trialEndsAt: null,
    isInTrial: false,
  });

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Check admin status
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdmin = !!adminRole;

      // Get profile with subscription info
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, demo_mode_tier, trial_ends_at')
        .eq('id', user.id)
        .single();

      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      const isInTrial = trialEndsAt ? trialEndsAt > new Date() : false;

      setState({
        tier: (profile?.subscription_tier as SubscriptionTier) || 'free',
        isAdmin,
        demoModeTier: profile?.demo_mode_tier as SubscriptionTier | null,
        isLoading: false,
        trialEndsAt,
        isInTrial,
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Get effective tier (considers admin bypass and demo mode)
  const getEffectiveTier = (): SubscriptionTier => {
    // Admin in demo mode: use demo tier
    if (state.isAdmin && state.demoModeTier) {
      return state.demoModeTier;
    }
    
    // Admin NOT in demo mode: full Pro access
    if (state.isAdmin) {
      return 'pro';
    }
    
    // In trial: use Premium access
    if (state.isInTrial && state.tier === 'free') {
      return 'premium';
    }
    
    // Regular user: actual subscription tier
    return state.tier;
  };

  // Check if user can access a feature
  const canAccess = (feature: Feature): boolean => {
    const effectiveTier = getEffectiveTier();
    const allowedTiers = FEATURE_ACCESS[feature];
    return allowedTiers.includes(effectiveTier);
  };

  // Set demo mode tier (admin only)
  const setDemoMode = async (tier: SubscriptionTier | null) => {
    if (!state.isAdmin) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ demo_mode_tier: tier })
      .eq('id', user.id);

    setState(prev => ({ ...prev, demoModeTier: tier }));
  };

  return {
    ...state,
    effectiveTier: getEffectiveTier(),
    canAccess,
    setDemoMode,
    refresh: loadSubscriptionStatus,
  };
}
