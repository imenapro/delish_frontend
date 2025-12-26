import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Loader2, Save, Send, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  created_at: string;
  to_email: string;
  subject: string;
  provider: string;
  status: 'sent' | 'failed';
}

export function TenantEmailSettings() {
  const { toast } = useToast();
  const { data: businesses } = useUserBusinesses();
  const business = businesses?.[0]; // Assuming single business for now

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  const [settings, setSettings] = useState({
    sender_name: '',
    sender_email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
  });

  // Fetch recent logs
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['email-logs', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('email_logs' as any) // Type assertion until types are regenerated
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  useEffect(() => {
    if (business?.id) {
      loadSettings(business.id);
    }
  }, [business?.id]);

  const loadSettings = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_email_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          sender_name: data.sender_name || '',
          sender_email: data.sender_email || '',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port?.toString() || '587',
          smtp_user: data.smtp_user || '',
          smtp_pass: data.smtp_pass || '',
        });
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenant_email_settings')
        .upsert({
          business_id: business.id,
          sender_name: settings.sender_name,
          sender_email: settings.sender_email,
          smtp_host: settings.smtp_host,
          smtp_port: parseInt(settings.smtp_port),
          smtp_user: settings.smtp_user,
          smtp_pass: settings.smtp_pass,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Email configuration has been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      const message = error instanceof Error ? error.message : "Failed to save settings";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!business?.id || !testEmail) return;
    setTesting(true);

    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from Tenant Configuration',
          html: '<h1>It Works!</h1><p>This is a test email sent using your custom SMTP configuration.</p>',
          businessId: business.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Sent to ${testEmail}. Please check your inbox.`,
      });
      
      // Refresh logs after a short delay to allow DB insert
      setTimeout(() => refetchLogs(), 2000);
      
    } catch (error) {
      console.error('Error sending test email:', error);
      const message = error instanceof Error ? error.message : "Failed to send test email";
      toast({
        title: "Test Failed",
        description: message,
        variant: "destructive",
      });
      setTimeout(() => refetchLogs(), 2000);
    } finally {
      setTesting(false);
    }
  };

  if (!business) return null;

  return (
    <div className="space-y-6">
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure your custom email sender settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              To ensure high deliverability, please ensure you have configured SPF and DKIM records for your domain with your SMTP provider.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sender Name</Label>
              <Input 
                value={settings.sender_name} 
                onChange={e => setSettings({...settings, sender_name: e.target.value})}
                placeholder="e.g. My Bakery"
              />
            </div>
            <div className="space-y-2">
              <Label>Sender Email</Label>
              <Input 
                value={settings.sender_email} 
                onChange={e => setSettings({...settings, sender_email: e.target.value})}
                placeholder="orders@mybakery.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input 
                value={settings.smtp_host} 
                onChange={e => setSettings({...settings, smtp_host: e.target.value})}
                placeholder="smtp.provider.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Port</Label>
              <Input 
                value={settings.smtp_port} 
                onChange={e => setSettings({...settings, smtp_port: e.target.value})}
                placeholder="587"
                type="number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Username</Label>
              <Input 
                value={settings.smtp_user} 
                onChange={e => setSettings({...settings, smtp_user: e.target.value})}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Password</Label>
              <Input 
                value={settings.smtp_pass} 
                onChange={e => setSettings({...settings, smtp_pass: e.target.value})}
                placeholder="password"
                type="password"
              />
            </div>
          </div>

          <div className="flex justify-between items-end pt-4 border-t">
             <div className="flex gap-2 items-end">
                <div className="space-y-2 w-64">
                  <Label>Test Email Recipient</Label>
                  <Input 
                    value={testEmail} 
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Enter email to test"
                  />
                </div>
                <Button variant="outline" onClick={handleTestEmail} disabled={testing || !testEmail}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Test
                </Button>
             </div>

             <Button onClick={handleSave} disabled={loading}>
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               Save Configuration
             </Button>
          </div>
        </CardContent>
      </Card>

      {logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Logs</CardTitle>
            <CardDescription>Status of the last 5 emails sent from your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: EmailLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell>{log.to_email}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                    <TableCell>{log.provider}</TableCell>
                    <TableCell>
                      {log.status === 'sent' ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

