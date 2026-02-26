import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Award,
  Users2,
  BarChart3,
  Shield,
  Lock
} from 'lucide-react';
import UserRoleManager from '@/components/admin/UserRoleManager';
import CertificationManager from '@/components/admin/CertificationManager';
import ReviewerGroupManager from '@/components/admin/ReviewerGroupManager';
import AuditLog from '@/components/admin/AuditLog';

// Authorized admin emails
const ADMIN_EMAILS = [
  'alicia@xiosolutionsllc.com',
  'cedric.evans@gmail.com',
  'pte295@gmail.com'
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    moderators: 0,
    certifiedReviewers: 0,
    reviewerGroups: 0
  });

  useEffect(() => {
    checkAuthAndAccess();
  }, []);

  const checkAuthAndAccess = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/auth');
        return;
      }

      const emailIsAdmin = ADMIN_EMAILS.includes(authUser.email || '');
      // Check role-based admin access (preferred) with email fallback
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!emailIsAdmin && !role) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setUser(authUser);
      setIsAuthorized(true);
      await loadStats();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/auth');
    }
  };

  const loadStats = async () => {
    try {
      // Get moderator count
      const { data: moderatorData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('role', 'moderator');

      // Get total certified reviewers (count all certifications)
      const { data: certData } = await supabase
        .from('student_certifications')
        .select('id', { count: 'estimated', head: true });

      setStats({
        totalUsers: (moderatorData?.length || 0) + 1,
        moderators: moderatorData?.length || 0,
        certifiedReviewers: certData?.length || 0,
        reviewerGroups: 0
      });
    } catch (error) {
      console.error('Stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell showNavigation>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading admin dashboard...</p>
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
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">System administration and control</p>
          </div>
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <h3 className="font-semibold mb-2">Access Denied</h3>
              <p>
                You do not have permission to access the Admin Dashboard. Only authorized administrators can access this section.
              </p>
              <p className="mt-2 text-sm">
                Current user: <span className="font-mono">{user?.email}</span>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, roles, certifications, and reviewer groups</p>
        </div>

        {/* Admin Banner */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Administrator Access</h3>
                <p className="text-sm">You have full access to system administration controls.</p>
              </div>
              <Badge variant="secondary" className="ml-4">
                {user?.email}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-2">With assigned roles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Moderators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.moderators}</div>
              <p className="text-xs text-gray-500 mt-2">Active moderators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Certified Reviewers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.certifiedReviewers}</div>
              <p className="text-xs text-gray-500 mt-2">Active certifications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reviewer Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.reviewerGroups}</div>
              <p className="text-xs text-gray-500 mt-2">Review groups</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users & Roles</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="certifications" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Certifications</span>
              <span className="sm:hidden">Certs</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              <span className="hidden sm:inline">Groups</span>
              <span className="sm:hidden">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Log</span>
              <span className="sm:hidden">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Users & Roles Tab */}
          <TabsContent value="users" className="mt-6">
            <UserRoleManager onStatsUpdate={loadStats} />
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications" className="mt-6">
            <CertificationManager onStatsUpdate={loadStats} />
          </TabsContent>

          {/* Reviewer Groups Tab */}
          <TabsContent value="groups" className="mt-6">
            <ReviewerGroupManager onStatsUpdate={loadStats} />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="mt-6">
            <AuditLog />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
