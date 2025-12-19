import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, ChefHat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { SetQuotaDialog } from '@/components/kitchen/SetQuotaDialog';

export default function Kitchen() {
  const { data: quotas, isLoading } = useQuery({
    queryKey: ['kitchen-quotas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_quotas')
        .select(`
          *,
          product:products(name, category),
          shop:shops(name)
        `)
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('shift');
      
      if (error) throw error;
      return data;
    },
  });

  const getShiftBadgeColor = (shift: string) => {
    const colors: Record<string, string> = {
      morning: 'bg-warning text-warning-foreground',
      afternoon: 'bg-primary text-primary-foreground',
      evening: 'bg-accent text-accent-foreground',
      all_day: 'bg-secondary text-secondary-foreground',
    };
    return colors[shift] || 'bg-secondary';
  };

  const getUsagePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'manager', 'branch_manager']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ChefHat className="h-8 w-8" />
                Kitchen Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage daily production quotas and track kitchen capacity
              </p>
            </div>
            <SetQuotaDialog />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : quotas && quotas.length > 0 ? (
            <div className="space-y-6">
              {quotas.map((quota) => {
                const percentage = getUsagePercentage(quota.quota_used, quota.quota_total);
                const isLow = percentage < 50;
                const isMedium = percentage >= 50 && percentage < 80;
                const isHigh = percentage >= 80;

                return (
                  <Card key={quota.id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{quota.product?.name}</CardTitle>
                          <CardDescription className="mt-2 space-y-1">
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="secondary">{quota.product?.category}</Badge>
                              <Badge className={getShiftBadgeColor(quota.shift)}>
                                {quota.shift.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm mt-2">
                              <span className="font-medium">Shop:</span> {quota.shop?.name}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Date:</span> {format(new Date(quota.date), 'MMM dd, yyyy')}
                            </p>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Production Progress</span>
                          <span className="font-bold text-foreground">
                            {quota.quota_used} / {quota.quota_total} units
                          </span>
                        </div>
                        <Progress 
                          value={percentage} 
                          className={`h-3 ${
                            isLow ? '[&>div]:bg-success' : 
                            isMedium ? '[&>div]:bg-warning' : 
                            '[&>div]:bg-destructive'
                          }`}
                        />
                        <div className="flex items-center justify-between pt-2">
                          <Badge variant={isHigh ? 'destructive' : 'outline'}>
                            {percentage}% Complete
                          </Badge>
                          <Button variant="outline" size="sm">
                            Update
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="shadow-[var(--shadow-medium)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No production quotas set</p>
                <SetQuotaDialog />
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
