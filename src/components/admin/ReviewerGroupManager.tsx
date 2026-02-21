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
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      // Note: reviewer_groups table may not exist yet
      // This is a placeholder for when the table is created
      
      // For now, show an empty state with instructions
      setGroups([]);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    try {
      toast({
        title: 'Coming Soon',
        description: 'Reviewer groups feature will be available after database migration. Contact your administrator.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Placeholder for when table exists
      console.log('Delete group:', groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
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
      </CardContent>
    </Card>
  );
}
