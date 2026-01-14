import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  changed_by: string;
  created_at: string;
  changer_email?: string; // We'll join this manually or via view
}

export function AuditLogsTable() {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      // Fetch logs and join with user email if possible
      // Since we can't join auth.users easily from client without a view, 
      // we'll just show the ID or fetch names separately if needed.
      // For now, let's just get the raw logs.
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const getOperationColor = (op: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (op) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDataDiff = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    if (!oldData && newData) return 'Created';
    if (oldData && !newData) return 'Deleted';
    
    // Simple diff
    const changes: string[] = [];
    if (oldData && newData) {
        Object.keys(newData).forEach(key => {
            if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                changes.push(`${key}: ${JSON.stringify(oldData[key])} -> ${JSON.stringify(newData[key])}`);
            }
        });
    }
    return changes.length ? changes.join(', ') : 'No changes detected';
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Audit Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOperationColor(log.operation)}>
                      {log.operation}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.table_name}</TableCell>
                  <TableCell className="max-w-[400px] truncate" title={formatDataDiff(log.old_data, log.new_data)}>
                    {formatDataDiff(log.old_data, log.new_data)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.changed_by}
                  </TableCell>
                </TableRow>
              ))}
              {logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4 gap-2">
            <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="text-sm disabled:opacity-50"
            >
                Previous
            </button>
            <span className="text-sm">Page {page + 1}</span>
            <button 
                disabled={!logs || logs.length < pageSize}
                onClick={() => setPage(p => p + 1)}
                className="text-sm disabled:opacity-50"
            >
                Next
            </button>
        </div>
      </CardContent>
    </Card>
  );
}
