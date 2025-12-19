import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          from_user:profiles!chat_messages_from_user_id_fkey(name),
          to_user:profiles!chat_messages_to_user_id_fkey(name)
        `)
        .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${selectedConversation}),and(from_user_id.eq.${selectedConversation},to_user_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversation && !!user,
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          from_user_id,
          to_user_id,
          from_user:profiles!chat_messages_from_user_id_fkey(name),
          to_user:profiles!chat_messages_to_user_id_fkey(name),
          created_at,
          message
        `)
        .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const uniqueUsers = new Map();
      data?.forEach((msg) => {
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

  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: string) => {
      if (!selectedConversation || !user) return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedConversation,
          message: newMessage,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex h-[calc(100vh-4rem)]">
          <div className="w-80 border-r border-border bg-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Messages</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-5rem)]">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors border-b border-border ${
                    selectedConversation === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="font-medium text-foreground">{conv.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{conv.lastMessage}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(conv.lastMessageTime), 'MMM dd, HH:mm')}
                  </div>
                </button>
              ))}
              {(!conversations || conversations.length === 0) && (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No conversations yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <Card className={`max-w-[70%] ${msg.from_user_id === user?.id ? 'bg-primary text-primary-foreground' : ''}`}>
                          <CardContent className="p-3">
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
