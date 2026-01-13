import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkReviewerAccess();
  }, []);

  const checkReviewerAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check user_roles for admin or moderator
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasRole = roles?.some(r => 
        r.role === 'admin' || r.role === 'moderator'
      );

      // Check student_certifications
      const { data: certification } = await supabase
        .from('student_certifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasAccess(hasRole || !!certification);
      setLoading(false);
    } catch (error) {
      console.error('Error checking reviewer access:', error);
      setHasAccess(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
};
