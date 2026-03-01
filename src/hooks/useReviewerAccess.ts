import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useReviewerAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasAccess(false);
          setLoading(false);
          setInstitution(null);
          return;
        }

        // Reviewer access only
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const hasRole = roles?.some(r =>
          r.role === 'reviewer' || r.role === 'admin' || r.role === 'moderator'
        );

        const { data: certification } = await supabase
          .from('student_certifications')
          .select('institution')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasAccess(hasRole || !!certification);
        setInstitution(certification?.institution || null);
      } catch (error) {
        console.error('Error checking reviewer access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { hasAccess, loading, institution };
}
