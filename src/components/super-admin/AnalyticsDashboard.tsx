import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const endDate = new Date();
        const startDate = subMonths(endDate, 6);

        // Fetch businesses for growth chart
        const { data: businesses } = await supabase
          .from('businesses')
          .select('created_at')
          .gte('created_at', startDate.toISOString());

        // Fetch payments for revenue chart
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, payment_date')
          .gte('payment_date', startDate.toISOString());

        // Process data
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        const growth = months.map(month => {
          const monthStr = format(month, 'MMM yyyy');
          const count = businesses?.filter(b => 
            b.created_at && format(new Date(b.created_at), 'MMM yyyy') === monthStr
          ).length || 0;
          return { name: monthStr, businesses: count };
        });

        const revenue = months.map(month => {
          const monthStr = format(month, 'MMM yyyy');
          const total = payments?.filter(p => 
            p.payment_date && format(new Date(p.payment_date), 'MMM yyyy') === monthStr
          ).reduce((sum, p) => sum + p.amount, 0) || 0;
          return { name: monthStr, revenue: total };
        });

        setGrowthData(growth);
        setRevenueData(revenue);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Business Growth</CardTitle>
          <CardDescription>New businesses registered over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorBusinesses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="businesses" stroke="#8884d8" fillOpacity={1} fill="url(#colorBusinesses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Total revenue collected over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
