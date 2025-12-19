import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExpenseDialog } from '@/components/finance/ExpenseDialog';
import { format } from 'date-fns';

export default function Finance() {
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          shop:shops(name)
        `)
        .order('expense_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .order('period_end', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .in('status', ['delivered', 'ready']);
      
      if (error) throw error;
      const total = data.reduce((sum, order) => sum + Number(order.total_amount), 0);
      return { total, count: data.length };
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
      paid: 'bg-primary text-primary-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'accountant']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-8 w-8" />
                Financial Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Track revenue, expenses, and payroll
              </p>
            </div>
            <ExpenseDialog />
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {revenue?.total.toFixed(2)} RWF
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {revenue?.count} completed orders
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)} RWF
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {expenses?.filter(e => e.status === 'approved').length} approved expenses
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {payrollLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {payroll?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.total_amount), 0).toFixed(2)} RWF
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payroll?.filter(p => p.status === 'paid').length} payments processed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="expenses" className="space-y-6">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="space-y-4">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : expenses && expenses.length > 0 ? (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <Card key={expense.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{expense.description}</span>
                            <Badge className={getStatusColor(expense.status)}>
                              {expense.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Category: {expense.category}
                          </p>
                          {expense.shop && (
                            <p className="text-sm text-muted-foreground">
                              Shop: {expense.shop.name}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Date: {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-destructive">
                            -{Number(expense.amount).toFixed(2)} {expense.currency}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No expenses recorded</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4">
              {payrollLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : payroll && payroll.length > 0 ? (
                <div className="space-y-4">
                  {payroll.map((record) => (
                    <Card key={record.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              Payroll Period: {format(new Date(record.period_start), 'MMM dd')} - {format(new Date(record.period_end), 'MMM dd, yyyy')}
                            </span>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Base: {Number(record.base_salary).toFixed(2)} | 
                            Bonuses: {Number(record.bonuses).toFixed(2)} | 
                            Deductions: {Number(record.deductions).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {Number(record.total_amount).toFixed(2)} {record.currency}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payroll records</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
