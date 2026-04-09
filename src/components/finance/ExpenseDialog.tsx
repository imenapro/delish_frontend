import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExpenseFormDialog } from '@/components/finance/ExpenseFormDialog';

export function ExpenseDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Record Expense
      </Button>
      <ExpenseFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Record New Expense"
        description="Add a new expense record for tracking"
      />
    </>
  );
}
