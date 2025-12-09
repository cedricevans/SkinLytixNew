import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UsageLimits {
  chatMessagesUsed: number;
  routineOptimizationsUsed: number;
  productComparisonsUsed: number;
  pdfExportsUsed: number;
}

export interface FreeTierLimits {
  chatMessages: number;
  routineOptimizations: number;
  productComparisons: number;
  pdfExports: number;
  routines: number;
  productsPerRoutine: number;
}

const FREE_TIER_LIMITS: FreeTierLimits = {
  chatMessages: 3,
  routineOptimizations: 0, // Preview only for free
  productComparisons: 2,
  pdfExports: 0, // Watermarked only for free
  routines: 1,
  productsPerRoutine: 3,
};

const PREMIUM_TIER_LIMITS: FreeTierLimits = {
  chatMessages: 30,
  routineOptimizations: 3,
  productComparisons: 5,
  pdfExports: 10,
  routines: 5,
  productsPerRoutine: 999,
};

export function useUsageLimits() {
  const [usage, setUsage] = useState<UsageLimits>({
    chatMessagesUsed: 0,
    routineOptimizationsUsed: 0,
    productComparisonsUsed: 0,
    pdfExportsUsed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsageLimits();
  }, []);

  const loadUsageLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

      // Get or create usage record for current month
      let { data: usageData } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .gte('period_start', currentMonth)
        .maybeSingle();

      if (!usageData) {
        // Create new usage record for this month
        const { data: newUsage } = await supabase
          .from('usage_limits')
          .insert({
            user_id: user.id,
            period_start: currentMonth,
          })
          .select()
          .single();
        usageData = newUsage;
      }

      if (usageData) {
        setUsage({
          chatMessagesUsed: usageData.chat_messages_used || 0,
          routineOptimizationsUsed: usageData.routine_optimizations_used || 0,
          productComparisonsUsed: usageData.product_comparisons_used || 0,
          pdfExportsUsed: usageData.pdf_exports_used || 0,
        });
      }
    } catch (error) {
      console.error('Error loading usage limits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const incrementUsage = async (type: keyof UsageLimits) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const newValue = usage[type] + 1;

    // Update local state optimistically
    setUsage(prev => ({
      ...prev,
      [type]: newValue,
    }));

    // Update database
    const columnMap: Record<keyof UsageLimits, string> = {
      chatMessagesUsed: 'chat_messages_used',
      routineOptimizationsUsed: 'routine_optimizations_used',
      productComparisonsUsed: 'product_comparisons_used',
      pdfExportsUsed: 'pdf_exports_used',
    };

    await supabase
      .from('usage_limits')
      .update({ [columnMap[type]]: newValue })
      .eq('user_id', user.id)
      .gte('period_start', currentMonth);
  };

  const getRemainingUsage = (type: keyof UsageLimits, tier: 'free' | 'premium' | 'pro'): number => {
    const limits = tier === 'free' ? FREE_TIER_LIMITS : PREMIUM_TIER_LIMITS;
    
    const limitMap = {
      chatMessagesUsed: limits.chatMessages,
      routineOptimizationsUsed: limits.routineOptimizations,
      productComparisonsUsed: limits.productComparisons,
      pdfExportsUsed: limits.pdfExports,
    };

    if (tier === 'pro') return Infinity;
    
    return Math.max(0, limitMap[type] - usage[type]);
  };

  const canUse = (type: keyof UsageLimits, tier: 'free' | 'premium' | 'pro'): boolean => {
    if (tier === 'pro') return true;
    return getRemainingUsage(type, tier) > 0;
  };

  return {
    usage,
    isLoading,
    incrementUsage,
    getRemainingUsage,
    canUse,
    limits: FREE_TIER_LIMITS,
    premiumLimits: PREMIUM_TIER_LIMITS,
    refresh: loadUsageLimits,
  };
}
