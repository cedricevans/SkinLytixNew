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
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';

interface ReviewerGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count?: number;
}

interface ReviewerGroupManagerProps {
  onStatsUpdate?: () => void;
}

export default function ReviewerGroupManager({ onStatsUpdate }: ReviewerGroupManagerProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<ReviewerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ReviewerGroup | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('reviewer_groups')
        .select('id, name, description, created_at, reviewer_group_members(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        created_at: group.created_at,
        member_count: Array.isArray(group.reviewer_group_members)
          ? Number(group.reviewer_group_members[0]?.count ?? 0)
          : 0
      }));

      setGroups(mapped);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Group name is required',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase as any)
        .from('reviewer_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          created_by: user?.id || null
        });

      if (error) throw error;

      await (supabase as any).from('audit_logs').insert({
        action: 'create_reviewer_group',
        admin_id: user?.id || null,
        admin_email: user?.email || '',
        details: { name: formData.name.trim() }
      });

      toast({
        title: 'Success',
        description: 'Reviewer group created',
      });

      setFormData({ name: '', description: '' });
      setOpenDialog(false);
      await loadGroups();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('reviewer_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await (supabase as any).from('audit_logs').insert({
        action: 'delete_reviewer_group',
        admin_id: user?.id || null,
        admin_email: user?.email || '',
        details: { group_id: groupId }
      });

      toast({
        title: 'Success',
        description: 'Reviewer group deleted',
      });

      await loadGroups();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;
    if (!memberEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Member email is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setMemberSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', memberEmail.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.id) {
        toast({
          title: 'User Not Found',
          description: `No user found with email: ${memberEmail}`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await (supabase as any)
        .from('reviewer_group_members')
        .insert({
          group_id: selectedGroup.id,
          user_id: profile.id,
          added_by: user?.id || null
        });

      if (error) throw error;

      await (supabase as any).from('audit_logs').insert({
        action: 'add_reviewer_group_member',
        admin_id: user?.id || null,
        admin_email: user?.email || '',
        target_user_id: profile.id,
        target_user_email: profile.email,
        details: { group_id: selectedGroup.id }
      });

      toast({
        title: 'Success',
        description: 'Member added to group',
      });

      setMemberEmail('');
      setMemberDialogOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setMemberSubmitting(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchName.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading reviewer groups...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reviewer Groups</CardTitle>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reviewer Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize reviewers and assign review batches.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Group Name</label>
                  <Input
                    placeholder="e.g., Hair Care Reviewers"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Input
                    placeholder="Description of the group's focus or scope"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <Button
                  onClick={handleAddGroup}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {groups.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Badge className="mb-4 mx-auto block w-fit">Setup Required</Badge>
            <h3 className="font-semibold mb-2">No Reviewer Groups Created</h3>
            <p className="text-sm text-gray-600 mb-4">
              Reviewer groups allow you to organize reviewers and assign review batches to teams.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Once created, you can add reviewers and manage batch assignments through this interface.
            </p>
            <Button onClick={() => setOpenDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Input
                placeholder="Search by group name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        No groups found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.description || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {group.member_count || 0} members
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(group.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setMemberDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
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
          </>
        )}

        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Group Member</DialogTitle>
              <DialogDescription>
                Add a reviewer to {selectedGroup?.name || 'this group'} by email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="reviewer@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                disabled={memberSubmitting}
              />
              <Button
                onClick={handleAddMember}
                disabled={memberSubmitting}
                className="w-full"
              >
                {memberSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
