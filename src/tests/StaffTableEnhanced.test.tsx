
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StaffTable, StaffMember } from '@/components/staff/StaffTableEnhanced';
import { UIPersistenceProvider } from '@/contexts/ui-persistence-context';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Select component to avoid Radix UI issues in JSDOM
vi.mock('@/components/ui/select', () => {
  const React = require('react');
  const SelectContext = React.createContext({ value: '', onValueChange: () => {} });

  const Select = ({ value, onValueChange, children }: any) => {
    return React.createElement(SelectContext.Provider, { value: { value, onValueChange } }, 
      React.createElement('div', { 'data-testid': 'select-root' }, children)
    );
  };

  const SelectTrigger = ({ children }: any) => {
    // Render trigger as a button that does nothing in this mock (content is always visible)
    return React.createElement('button', { 'data-testid': 'select-trigger' }, children);
  };

  const SelectValue = ({ placeholder }: any) => {
    // If value is selected, we might want to show it, but placeholder is enough for finding trigger
    return React.createElement('span', {}, placeholder);
  };

  const SelectContent = ({ children }: any) => {
    // Render content directly
    return React.createElement('div', { 'data-testid': 'select-content' }, children);
  };

  const SelectItem = ({ value, children }: any) => {
    const { onValueChange } = React.useContext(SelectContext);
    return React.createElement('div', { 
      role: 'option', 
      onClick: () => onValueChange(value),
      'data-value': value,
      style: { cursor: 'pointer' }
    }, children);
  };

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    Search: () => <div data-testid="search-icon" />,
    ChevronDown: () => <div data-testid="chevron-down" />,
    Filter: () => <div data-testid="filter-icon" />,
  };
});

const mockData: StaffMember[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    is_suspended: false,
    roles: [{ role: 'admin', shop: { name: 'Headquarters' } }],
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Staff User',
    email: 'staff@example.com',
    is_suspended: false,
    roles: [{ role: 'staff', shop: { name: 'Shop A' } }],
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Suspended User',
    email: 'suspended@example.com',
    is_suspended: true,
    roles: [{ role: 'staff', shop: { name: 'Shop B' } }],
    created_at: new Date().toISOString(),
  },
];

describe('StaffTableEnhanced Filters', () => {
  const defaultProps = {
    data: mockData,
    isLoading: false,
    onSuspend: vi.fn(),
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <UIPersistenceProvider>
        {ui}
      </UIPersistenceProvider>
    );
  };

  it('renders all rows initially', () => {
    renderWithProviders(<StaffTable {...defaultProps} />);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Staff User')).toBeInTheDocument();
    expect(screen.getByText('Suspended User')).toBeInTheDocument();
  });

  it('filters by Role', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffTable {...defaultProps} />);

    // In our mock, the content is always visible, so we don't need to click the trigger
    // But we can verify the trigger is there
    expect(screen.getByText('Role')).toBeInTheDocument();

    // Verify options are present
    expect(screen.getByText('All Roles')).toBeInTheDocument();
    
    // Select Admin
    const adminOption = screen.getByRole('option', { name: 'ADMIN' });
    await user.click(adminOption);

    // Check results
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.queryByText('Staff User')).not.toBeInTheDocument();
    expect(screen.queryByText('Suspended User')).not.toBeInTheDocument();
  });

  it('filters by Shop', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffTable {...defaultProps} />);

    // In our mock, content is always visible
    
    // Select Shop A
    const shopOption = screen.getByRole('option', { name: 'Shop A' });
    await user.click(shopOption);

    // Check results
    expect(screen.getByText('Staff User')).toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.queryByText('Suspended User')).not.toBeInTheDocument();
  });

  it('filters by Status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffTable {...defaultProps} />);

    // In our mock, content is always visible

    // Select Suspended
    const suspendedOption = screen.getByRole('option', { name: 'Suspended' });
    await user.click(suspendedOption);

    // Check results
    expect(screen.getByText('Suspended User')).toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff User')).not.toBeInTheDocument();
  });

  it('resets filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffTable {...defaultProps} />);

    // Apply filter
    const adminOption = screen.getByRole('option', { name: 'ADMIN' });
    await user.click(adminOption);

    expect(screen.queryByText('Staff User')).not.toBeInTheDocument();

    // Click Reset
    const resetBtn = screen.getByText('Reset');
    await user.click(resetBtn);

    // Check results
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Staff User')).toBeInTheDocument();
    expect(screen.getByText('Suspended User')).toBeInTheDocument();
  });
});
