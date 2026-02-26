import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import invokeFunction from '@/lib/functions-client';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
  user_email?: string;
}

interface UserRoleManagerProps {
  onStatsUpdate?: () => void;
}

export default function UserRoleManager({ onStatsUpdate }: UserRoleManagerProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'moderator' });
  const [submitting, setSubmitting] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles to get emails
      if (data) {
        const rolesWithEmails = await Promise.all(
          data.map(async (role) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', role.user_id)
              .single();
            
            return {
              ...role,
              user_email: profile?.email || 'Unknown'
            };
          })
        );
        setRoles(rolesWithEmails);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      if (!formData.email) {
        toast({
          title: 'Validation Error',
          description: 'Please enter an email address',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Call Edge Function to add role (service role bypasses RLS)
      await invokeFunction('add-user-role', {
        userEmail: formData.email,
        role: formData.role,
      });

      await (supabase as any).from('audit_logs').insert({
        action: 'create_role',
        admin_id: user?.id || null,
        admin_email: user?.email || '',
        target_user_email: formData.email,
        details: { role: formData.role }
      });

      toast({
        title: 'Success',
        description: `Role added: ${formData.email} is now a ${formData.role}`,
      });

      setFormData({ email: '', role: 'moderator' });
      setOpenDialog(false);
      await loadRoles();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: 'Failed to add role',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      await (supabase as any).from('audit_logs').insert({
        action: 'delete_role',
        admin_id: user?.id || null,
        admin_email: user?.email || '',
        details: { role_id: roleId }
      });

      toast({
        title: 'Success',
        description: 'Role removed successfully',
      });

      await loadRoles();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive',
      });
    }
  };

  const filteredRoles = roles.filter(role =>
    role.user_email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading user roles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Roles Management</CardTitle>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User Role</DialogTitle>
                <DialogDescription>
                  Assign a role to a user. The user must already have a SkinLytix account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Address</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger disabled={submitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full system access</SelectItem>
                      <SelectItem value="moderator">Moderator - Can validate ingredients</SelectItem>
                      <SelectItem value="user">User - Regular user</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddRole}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Adding...' : 'Add Role'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium break-words whitespace-normal max-w-[220px]">
                      {role.user_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(role.role)} className="whitespace-nowrap">
                        {role.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 whitespace-normal">
                      {new Date(role.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
