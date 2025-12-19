import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useRef } from 'react';

export function TimeTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: activeSession } = useQuery({
    queryKey: ['active-session', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .gte('check_in', today.toISOString())
        .order('check_in', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const checkInMutation = useMutation({
    mutationFn: async (imageUrl?: string) => {
      const { error } = await supabase
        .from('time_tracking')
        .insert({
          user_id: user!.id,
          method: imageUrl ? 'image_snap' : 'qr_code',
          image_url: imageUrl,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
      toast({ title: 'Checked in successfully!' });
      setCapturedImage(null);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const { error } = await supabase
        .from('time_tracking')
        .update({ check_out: new Date().toISOString() })
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
      toast({ title: 'Checked out successfully!' });
    },
  });

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `${user!.id}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('time-tracking-images')
      .upload(filePath, file);

    if (error) {
      toast({ title: 'Failed to upload image', variant: 'destructive' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('time-tracking-images')
      .getPublicUrl(data.path);

    setCapturedImage(publicUrl);
    checkInMutation.mutate(publicUrl);
  };

  return (
    <Card className="shadow-[var(--shadow-medium)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracking
        </CardTitle>
        <CardDescription>Track your work hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {!activeSession ? (
            <>
              <Button 
                onClick={() => checkInMutation.mutate(undefined)} 
                className="flex-1"
                disabled={checkInMutation.isPending}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={checkInMutation.isPending}
              >
                <Camera className="mr-2 h-4 w-4" />
                Check In with Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleImageCapture}
              />
            </>
          ) : (
            <Button 
              onClick={() => checkOutMutation.mutate()} 
              variant="destructive"
              className="w-full"
              disabled={checkOutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          )}
        </div>

        {activeSession && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Currently Checked In</p>
            <p className="text-xs text-muted-foreground">
              Since {format(new Date(activeSession.check_in), 'HH:mm')}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Today's Sessions</h4>
          {todaySessions && todaySessions.length > 0 ? (
            <div className="space-y-2">
              {todaySessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {session.method.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm">
                      {format(new Date(session.check_in), 'HH:mm')}
                    </span>
                  </div>
                  {session.check_out && (
                    <span className="text-sm text-muted-foreground">
                      → {format(new Date(session.check_out), 'HH:mm')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sessions today</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}