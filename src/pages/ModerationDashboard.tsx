import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';
import AppShell from '@/components/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Lock, Shield } from 'lucide-react';
import ModerationQueueManager from '@/components/admin/ModerationQueueManager';

const ADMIN_EMAILS = [
  'cedric.evans@gmail.com',
  'pte295@gmail.com',
];

export default function ModerationDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate('/auth');
          return;
        }

        const email = user.email || null;
        setUserEmail(email);
        const emailIsAdmin = email ? ADMIN_EMAILS.includes(email) : false;

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator']);

        const isAdmin = emailIsAdmin || Boolean(roles?.some((row) => row.role === 'admin'));
        const isModerator = Boolean(roles?.some((row) => row.role === 'moderator'));
        const canModerate = isAdmin || isModerator;

        setHasAdminRole(isAdmin);
        setIsAuthorized(canModerate);
      } catch (error) {
        console.error('Moderation access check failed:', error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (loading) {
    return (
      <AppShell showNavigation>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading moderation dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AppShell showNavigation>
        <div className="container mx-auto py-12">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Moderation Dashboard</h1>
            <p className="text-gray-600">Ingredient validation moderation controls</p>
          </div>
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <h3 className="font-semibold mb-2">Access Denied</h3>
              <p>Only moderator or admin roles can access this section.</p>
              <p className="mt-2 text-sm">
                Current user: <span className="font-mono">{userEmail || 'Unknown'}</span>
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNavigation>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Moderation Dashboard</h1>
            <p className="text-gray-600">Review, approve, reject, or request revisions for reviewer submissions</p>
          </div>
          {hasAdminRole && (
            <Button variant="outline" onClick={() => navigate('/admin')} className="gap-2">
              <Shield className="h-4 w-4" />
              Open Admin
            </Button>
          )}
        </div>

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <ClipboardCheck className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold mb-1">Moderator Access</h3>
                <p className="text-sm">
                  Only moderation workflow tools are shown here.
                </p>
              </div>
              <Badge variant="secondary" className="sm:ml-4 break-words">
                {userEmail}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        <ModerationQueueManager />
      </div>
    </AppShell>
  );
}
