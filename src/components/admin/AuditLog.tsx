import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface AuditLogEntry {
  id: string;
  action: string;
  admin_email: string;
  target_user?: string;
  details?: any;
  created_at: string;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    loadAuditLog();
    // Refresh every 10 seconds
    const interval = setInterval(loadAuditLog, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setEntries((data || []) as AuditLogEntry[]);
    } catch (error) {
      console.error('Error loading audit log:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const actionMatch = filterAction === 'all' || entry.action === filterAction;
    const emailMatch = !searchEmail || 
      entry.admin_email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
      entry.target_user?.toLowerCase().includes(searchEmail.toLowerCase());
    return actionMatch && emailMatch;
  });

  const uniqueActions = Array.from(new Set(entries.map(e => e.action))).sort();

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading audit log...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words">Admin Action Audit Log</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600 flex items-center">
            {filteredEntries.length} entries
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <h3 className="font-semibold mb-2">No Audit Log Available</h3>
            <p className="text-sm text-gray-600">
              Audit logging will track all admin actions once enabled.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Actions logged: add/remove roles, create/update certifications, group management, etc.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      No matching entries
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell
                        className="font-medium text-sm max-w-[180px] truncate"
                        title={entry.admin_email}
                      >
                        {entry.admin_email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getActionBadgeVariant(entry.action)}
                          className="max-w-[140px] truncate"
                          title={entry.action}
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[180px] truncate"
                        title={entry.target_user || '—'}
                      >
                        {entry.target_user || '—'}
                      </TableCell>
                      <TableCell
                        className="text-sm text-gray-600 max-w-[240px] truncate"
                        title={entry.details ? JSON.stringify(entry.details) : '—'}
                      >
                        {entry.details ? JSON.stringify(entry.details) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
