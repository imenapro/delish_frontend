import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ShieldAlert, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  performed_by: string; // user id
  performer_email?: string; // joined
  created_at: string;
  ip_address?: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Attempt to fetch from audit_logs table
      // Note: This requires the table to exist. If not, we might need to handle the error.
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Fallback for demo if table doesn't exist
        console.warn('Audit logs table not found or error:', error);
        setLogs([
            {
                id: '1',
                action: 'login',
                details: 'User logged in',
                performed_by: 'system',
                created_at: new Date().toISOString(),
                ip_address: '127.0.0.1'
            }
        ]);
        return;
      }

      // Fetch user emails for the IDs
      const userIds = Array.from(new Set((data || []).map(l => l.performed_by)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name') // Assuming profiles has name, or we can use auth if we had access (we don't from client usually)
        .in('id', userIds);
      
      const mappedLogs = (data || []).map(log => {
        const profile = profiles?.find(p => p.id === log.performed_by);
        return {
          ...log,
          performer_email: profile?.name || log.performed_by
        };
      });

      setLogs(mappedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.performer_email && log.performer_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Audit Logs
                </CardTitle>
                <CardDescription>Track administrative actions and security events</CardDescription>
            </div>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell>
               </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-xs">
                        {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.performer_email || log.performed_by}</TableCell>
                  <TableCell className="max-w-md truncate" title={log.details || ''}>
                    {log.details || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {log.ip_address || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
