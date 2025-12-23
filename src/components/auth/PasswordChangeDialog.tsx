import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PasswordChangeDialogProps {
  open: boolean;
  userId: string;
  onSuccess: () => void;
}

export function PasswordChangeDialog({ open, userId, onSuccess }: PasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update profile to mark password as changed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            You must change your password before continuing. This is required for first-time login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={loading} className="w-full">
          {loading ? "Changing Password..." : "Change Password"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
