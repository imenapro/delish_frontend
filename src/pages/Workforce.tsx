import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShiftDialog } from '@/components/workforce/ShiftDialog';
import { LeaveRequestDialog } from '@/components/workforce/LeaveRequestDialog';
import { format } from 'date-fns';

export default function Workforce() {
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          shop:shops(name)
        `)
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: leaveRequests, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-primary text-primary-foreground',
      completed: 'bg-success text-success-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
      no_show: 'bg-warning text-warning-foreground',
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  const getShiftBadge = (type: string) => {
    const types: Record<string, string> = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      full_day: 'Full Day',
    };
    return types[type] || type;
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'branch_manager']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-8 w-8" />
                Workforce Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage staff schedules and leave requests
              </p>
            </div>
            <div className="flex gap-2">
              <ShiftDialog />
              <LeaveRequestDialog />
            </div>
          </div>

          <Tabs defaultValue="shifts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="shifts">Shifts Schedule</TabsTrigger>
              <TabsTrigger value="leave">Leave Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="shifts" className="space-y-4">
              {shiftsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : shifts && shifts.length > 0 ? (
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <Card key={shift.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">
                              {format(new Date(shift.shift_date), 'EEEE, MMM dd, yyyy')}
                            </span>
                            <Badge className={getStatusColor(shift.status)}>
                              {shift.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {shift.start_time} - {shift.end_time} | {getShiftBadge(shift.shift_type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Shop: {shift.shop?.name}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No shifts scheduled</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="leave" className="space-y-4">
              {leaveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : leaveRequests && leaveRequests.length > 0 ? (
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <Card key={request.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold capitalize">{request.leave_type} Leave</span>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {request.days_count} {request.days_count === 1 ? 'day' : 'days'}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground italic">
                              {request.reason}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Requested: {format(new Date(request.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No leave requests</p>
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
