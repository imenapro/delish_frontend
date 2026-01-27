import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Bell, Send } from 'lucide-react';
// removed dialog modal imports
// removed useState import
import { useStoreContext } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export default function TenantChat() {
  const { store, getTenantRoute } = useStoreContext();
  const navigate = useNavigate();
  // removed modal state

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['tenant-staff-for-chat', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', (await supabase.from('user_roles').select('user_id').eq('business_id', store.id)).data?.map((r: any) => r.user_id) || [])
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const startConversation = (userId: string) => {
    // navigate to the chat page and preselect the conversation partner via query param
    navigate(getTenantRoute(`/chat?peer=${userId}`));
    // removed setOpen(false)
  };

  return (
    <TenantPageWrapper
      title="Chat"
      description="Team communication and messaging"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Bell className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">New messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">Start a direct chat with a team member</div>
            {/* Inline staff list replacing modal dialog */}
            {isLoading ? (
              <div>Loading...</div>
            ) : staff.length > 0 ? (
              <div className="space-y-2">
                {staff.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 border-b">
                    <div>{s.name}</div>
                    <div>
                      <Button size="sm" onClick={() => startConversation(s.id)}>Message</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No team members found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantPageWrapper>
  );
}
