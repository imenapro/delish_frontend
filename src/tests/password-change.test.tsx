
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock Toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock UIPersistence
vi.mock('@/contexts/ui-persistence-context', () => ({
  useUIPersistence: () => ({
    isEnabled: true,
    setIsEnabled: vi.fn(),
    preventCloseOnWindowBlur: vi.fn(),
  }),
}));

describe('PasswordChangeDialog', () => {
  const mockOnSuccess = vi.fn();
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { email: 'test@example.com' } } });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ error: null });
    (supabase.rpc as any).mockResolvedValue({ error: null });
    
    // Mock chainable from().update().eq()
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    
    (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
            return { update: mockUpdate };
        }
        if (table === 'audit_logs') {
            return { insert: mockInsert };
        }
        return { select: vi.fn() };
    });
  });

  it('should render correctly when open', () => {
    render(<PasswordChangeDialog open={true} userId={userId} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Change Your Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
  });

  it('should show error if passwords do not match', async () => {
    render(<PasswordChangeDialog open={true} userId={userId} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'mismatch' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    // Toast would be called, but we mocked it.
  });

  it('should call updateUser and update profile via RPC on success', async () => {
    render(<PasswordChangeDialog open={true} userId={userId} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'newpassword123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    
    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    });

    // Check RPC call
    await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('complete_password_change');
    });
    
    // onSuccess should be called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should fallback to direct update if RPC fails', async () => {
    // Mock RPC failure
    (supabase.rpc as any).mockResolvedValue({ error: { message: 'RPC Error' } });

    render(<PasswordChangeDialog open={true} userId={userId} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'newpassword123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    
    await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('complete_password_change');
    });

    // Check fallback to direct update
    await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('profiles');
    });
    
    // onSuccess should still be called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should NOT call onSuccess if both RPC and direct update fail', async () => {
    // Mock RPC failure
    (supabase.rpc as any).mockResolvedValue({ error: { message: 'RPC Error' } });

    // Mock profile update failure
    const mockEq = vi.fn().mockResolvedValue({ error: { message: 'DB Error' } });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    
    (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
            return { update: mockUpdate };
        }
        if (table === 'audit_logs') {
             return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
    });

    render(<PasswordChangeDialog open={true} userId={userId} onSuccess={mockOnSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/New Password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'newpassword123' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    
    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalled();
    });
    
    // onSuccess should NOT be called
    await waitFor(() => {}, { timeout: 100 }); // Wait a bit
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
