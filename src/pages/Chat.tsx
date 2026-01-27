import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
// removed Dialog imports
import { useStoreContext } from '@/contexts/StoreContext';
import { useSearchParams } from 'react-router-dom';

type Conversation = {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
};

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  // selectedType: 'dm' | 'group'
  const [selectedType, setSelectedType] = useState<'dm' | 'group' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // removed showStaffPicker state

  const { store } = useStoreContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // support legacy ?peer= (direct message) and ?room= (group)
    const peer = searchParams.get('peer');
    const room = searchParams.get('room');
    if (peer) {
      setSelectedType('dm');
      setSelectedId(peer);
    } else if (room) {
      setSelectedType('group');
      setSelectedId(room);
    }
  }, [searchParams]);

  // Fetch unread direct messages for current user (group unread may not be supported if no rooms table)
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['chat-unreads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, from_user_id, to_user_id, is_read')
        .eq('to_user_id', user.id)
        .eq('is_read', false);
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const unreadCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (unreadMessages || []).forEach((m: any) => {
      const from = m.from_user_id;
      map[from] = (map[from] || 0) + 1;
    });
    return map;
  }, [unreadMessages]);

  // Fetch direct conversations (unique users who exchanged with current user)
  const { data: conversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          from_user_id,
          to_user_id,
          from_user:profiles!chat_messages_from_user_id_fkey(name, avatar_url),
          to_user:profiles!chat_messages_to_user_id_fkey(name, avatar_url),
          created_at,
          message
        `)
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueUsers = new Map<string, Conversation>();
      (data || []).forEach((msg: any) => {
        const otherUserId = msg.from_user_id === user?.id ? msg.to_user_id : msg.from_user_id;
        const otherUserName = msg.from_user_id === user?.id ? msg.to_user?.name : msg.from_user?.name;

        if (!uniqueUsers.has(otherUserId)) {
          uniqueUsers.set(otherUserId, {
            id: otherUserId,
            name: otherUserName,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
          });
        }
      });
      return Array.from(uniqueUsers.values());
    },
    enabled: !!user,
  });

  // Attempt to fetch group/room data if the table exists. If not, gracefully fallback.
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['chat-groups', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('business_id', store.id)
          .order('updated_at', { ascending: false });

        if (error) return [];
        return data || [];
      } catch (err) {
        // table doesn't exist or other issue - return empty
        return [];
      }
    },
    enabled: !!store?.id && !!user,
  });

  // Fetch messages - handles both DM and group (if supported)
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedType, selectedId],
    queryFn: async () => {
      if (!selectedId || !user || !selectedType) return [];

      if (selectedType === 'dm') {
        const peer = selectedId;
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            from_user:profiles!chat_messages_from_user_id_fkey(name, avatar_url),
            to_user:profiles!chat_messages_to_user_id_fkey(name, avatar_url)
          `)
          .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${peer}),and(from_user_id.eq.${peer},to_user_id.eq.${user?.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // group
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`*, from_user:profiles!chat_messages_from_user_id_fkey(name, avatar_url)`)
          .eq('room_id', selectedId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!selectedId && !!user && !!selectedType,
  });

  // Mutation to send a message (DM only for now)
  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: string) => {
      if (!selectedId || !user || selectedType !== 'dm') return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedId,
          message: newMessage,
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-unreads', user?.id] });
      setMessage('');
      toast({ title: 'Message sent successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const openDM = async (userId: string) => {
    setSelectedType('dm');
    setSelectedId(userId);
    setSearchParams({ peer: userId });

    // mark unread messages as read for this conversation
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('to_user_id', user?.id)
        .eq('from_user_id', userId)
        .eq('is_read', false);
    } catch (err) {
      // ignore
    }

    // refresh queries
    queryClient.invalidateQueries({ queryKey: ['chat-messages', 'dm'] });
    queryClient.invalidateQueries({ queryKey: ['chat-unreads', user?.id] });
  };

  const openGroup = (roomId: string) => {
    setSelectedType('group');
    setSelectedId(roomId);
    setSearchParams({ room: roomId });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex h-[calc(100vh-4rem)]">
          {/* LEFT SIDEBAR */}
          <aside className="w-80 md:w-80 lg:w-96 border-r border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Chats</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Groups Section */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground font-medium">Groups</div>
                </div>
                {groupsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading groups...</div>
                ) : groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No groups</div>
                ) : (
                  groups.map((g: any) => (
                    <button
                      key={g.id}
                      onClick={() => openGroup(g.id)}
                      className={`w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-accent transition-colors text-left ${selectedType === 'group' && selectedId === g.id ? 'bg-accent' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{(g.name || 'Group').split(' ').map((s: string) => s[0]).slice(0,2).join('')}</div>
                        <div className="truncate">
                          <div className="font-medium text-foreground truncate">{g.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{g.last_message || ''}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs text-muted-foreground">{g.updated_at ? format(new Date(g.updated_at), 'HH:mm') : ''}</div>
                        {/* group unread not implemented if schema lacks per-user reads */}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground font-medium">Direct Messages</div>
                </div>
                <div className="flex flex-col gap-1">
                  {conversations && conversations.length > 0 ? (
                    conversations.map((conv: any) => (
                      <button
                        key={conv.id}
                        onClick={() => openDM(conv.id)}
                        className={`w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-accent transition-colors text-left ${selectedType === 'dm' && selectedId === conv.id ? 'bg-accent' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{conv.name ? conv.name.split(' ').map((s: string) => s[0]).slice(0,2).join('') : 'U'}</div>
                          <div className="truncate">
                            <div className="font-medium text-foreground truncate">{conv.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{conv.lastMessage}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs text-muted-foreground">{conv.lastMessageTime ? format(new Date(conv.lastMessageTime), 'HH:mm') : ''}</div>
                          {unreadCounts[conv.id] > 0 && (
                            <div className="text-xs bg-rose-600 text-white rounded-full px-2 py-0.5">{unreadCounts[conv.id]}</div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                      {/* removed inline staff picker toggle and list */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* CHAT VIEW */}
          <main className="flex-1 flex flex-col">
            {selectedId && selectedType ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    (messages || []).map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <Card className={`max-w-[70%] ${msg.from_user_id === user?.id ? 'bg-primary text-primary-foreground' : ''}`}>
                          <CardContent className="p-3">
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{format(new Date(msg.created_at), 'HH:mm')}</p>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>

                {/* Message input only for DMs until group sending is clearly supported */}
                {selectedType === 'dm' ? (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card">
                    <div className="flex gap-2">
                      <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="flex-1" />
                      <Button type="submit" disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground border-t border-border">Group chat interface not yet available for posting messages.</div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a conversation or group to start messaging</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

// removed StaffListForDialog helper component
