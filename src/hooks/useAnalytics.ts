import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCTAPerformance = () => {
  return useQuery({
    queryKey: ['cta-performance'],
    queryFn: async () => {
      // Verify admin access before querying
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roles) throw new Error('Unauthorized: Admin access required');
      
      const { data, error } = await supabase
        .from('cta_performance_metrics')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
};

export const useConversionFunnel = () => {
  return useQuery({
    queryKey: ['conversion-funnel'],
    queryFn: async () => {
      // Verify admin access before querying
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roles) throw new Error('Unauthorized: Admin access required');
      
      const { data, error } = await supabase
        .from('conversion_funnel_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
};

export const useUserJourney = () => {
  return useQuery({
    queryKey: ['user-journey'],
    queryFn: async () => {
      // Verify admin access before querying
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roles) throw new Error('Unauthorized: Admin access required');
      
      const { data, error } = await supabase
        .from('user_journey_analysis')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
};

export const useEngagementMetrics = () => {
  return useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: async () => {
      // Verify admin access before querying
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roles) throw new Error('Unauthorized: Admin access required');
      
      const { data, error } = await supabase
        .from('engagement_metrics_summary')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
};
