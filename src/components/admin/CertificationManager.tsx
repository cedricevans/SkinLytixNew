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
import { Trash2, Plus, Edit2 } from 'lucide-react';

interface StudentCertification {
  id: string;
  user_id: string;
  institution: string;
  certification_level: string;
  created_at: string;
  user_email?: string;
}

interface CertificationManagerProps {
  onStatsUpdate?: () => void;
}

export default function CertificationManager({ onStatsUpdate }: CertificationManagerProps) {
  const { toast } = useToast();
  const [certifications, setCertifications] = useState<StudentCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    institution: '',
    level: 'associate'
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_certifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles to get emails
      if (data) {
        const certsWithEmails = await Promise.all(
          data.map(async (cert: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', cert.user_id)
              .single();
            
            return {
              id: cert.id,
              user_id: cert.user_id,
              institution: cert.institution,
              certification_level: cert.certification_level,
              created_at: cert.created_at,
              user_email: profile?.email || 'Unknown'
            };
          })
        );
        setCertifications(certsWithEmails);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertification = async () => {
    try {
      if (!formData.email || !formData.institution) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      const adminId = adminUser?.id || null;
      const adminEmail = adminUser?.email || '';

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', formData.email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.id) {
        toast({
          title: 'User Not Found',
          description: `No user found with email: ${formData.email}`,
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      if (editingId) {
        // Update existing certification
        const { error: updateError } = await supabase
          .from('student_certifications')
          .update({
            institution: formData.institution,
            certification_level: formData.level
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        await (supabase as any).from('audit_logs').insert({
          action: 'update_certification',
          admin_id: adminId,
          admin_email: adminEmail,
          target_user_id: profile.id,
          target_user_email: profile.email,
          details: { certification_id: editingId, institution: formData.institution, level: formData.level }
        });

        toast({
          title: 'Success',
          description: 'Certification updated successfully',
        });
      } else {
        // Create new certification
        const { error: insertError } = await supabase
          .from('student_certifications')
          .insert({
            user_id: profile.id,
            institution: formData.institution,
            certification_level: formData.level
          } as any);

        if (insertError) throw insertError;

        await (supabase as any).from('audit_logs').insert({
          action: 'create_certification',
          admin_id: adminId,
          admin_email: adminEmail,
          target_user_id: profile.id,
          target_user_email: profile.email,
          details: { institution: formData.institution, level: formData.level }
        });

        toast({
          title: 'Success',
          description: 'Certification added successfully',
        });
      }

      setFormData({ email: '', institution: '', level: 'associate' });
      setEditingId(null);
      setOpenDialog(false);
      await loadCertifications();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error saving certification:', error);
      toast({
        title: 'Error',
        description: 'Failed to save certification',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cert: StudentCertification) => {
    setEditingId(cert.id);
    setFormData({
      email: cert.user_email || '',
      institution: cert.institution,
      level: cert.certification_level
    });
    setOpenDialog(true);
  };

  const handleDeleteCertification = async (certId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('student_certifications')
        .delete()
        .eq('id', certId);

      if (error) throw error;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle();
        await (supabase as any).from('audit_logs').insert({
          action: 'delete_certification',
          admin_id: user.id,
          admin_email: profile?.email || '',
          details: { certification_id: certId }
        });
      }

      toast({
        title: 'Success',
        description: 'Certification deleted successfully',
      });

      await loadCertifications();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete certification',
        variant: 'destructive',
      });
    }
  };

  const filteredCertifications = certifications.filter(cert =>
    cert.user_email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'expert':
        return 'default';
      case 'specialist':
        return 'secondary';
      case 'associate':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading certifications...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="break-words">Student Certifications</CardTitle>
          <Dialog open={openDialog} onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) {
              setEditingId(null);
              setFormData({ email: '', institution: '', level: 'associate' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Add Certification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Edit Certification' : 'Add Student Certification'}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Update the certification details'
                    : 'Create a new student certification record'}
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
                    disabled={submitting || editingId !== null}
                  />
                  {editingId && <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Institution</label>
                  <Input
                    placeholder="Institution or training program name"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Certification Level</label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger disabled={submitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="associate">Associate</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddCertification}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Certification' : 'Add Certification')}
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
                <TableHead>Institution</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    No certifications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertifications.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium break-words whitespace-normal max-w-[220px]">
                      {cert.user_email}
                    </TableCell>
                    <TableCell className="break-words whitespace-normal max-w-[240px]">
                      {cert.institution}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLevelBadgeVariant(cert.certification_level)} className="whitespace-nowrap">
                        {cert.certification_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 whitespace-normal">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(cert)}
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCertification(cert.id)}
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
