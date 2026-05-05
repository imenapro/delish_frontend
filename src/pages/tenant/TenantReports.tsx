import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, PieChart, Download, Clipboard, ArrowLeftRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';

export default function TenantReports() {
  const navigate = useNavigate();
  const { getTenantRoute } = useStoreContext();

  return (
    <TenantPageWrapper
      title="Reports"
      description="View business analytics and generate reports"
      actions={
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Reports
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/sales'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">POS Sales</div>
            <p className="text-xs text-muted-foreground text-blue-600">Daily revenue stats →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/stock-movement'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Reports</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Movement</div>
            <p className="text-xs text-muted-foreground text-blue-600">Stock in/out history →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/transfers'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfer Reports</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Inter-shop</div>
            <p className="text-xs text-muted-foreground text-blue-600">Track stock flow →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/expenses'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Expenses</div>
            <p className="text-xs text-muted-foreground text-blue-600">Analyze spending →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/audit'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Reports</CardTitle>
            <Clipboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Detailed</div>
            <p className="text-xs text-muted-foreground text-blue-600">Click to view →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(getTenantRoute('/reports/shifts'))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shift Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">POS Shifts</div>
            <p className="text-xs text-muted-foreground text-blue-600">Staff session logs →</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Access Reports</CardTitle>
          <CardDescription>Direct links to detailed system reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/sales'))}
            >
              <BarChart3 className="h-5 w-5" />
              Sales
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/stock-movement'))}
            >
              <PieChart className="h-5 w-5" />
              Stock Movement
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/transfers'))}
            >
              <ArrowLeftRight className="h-5 w-5" />
              Transfers
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/expenses'))}
            >
              <FileText className="h-5 w-5" />
              Expenses
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/shifts'))}
            >
              <Clock className="h-5 w-5" />
              Shifts
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2"
              onClick={() => navigate(getTenantRoute('/reports/audit'))}
            >
              <Clipboard className="h-5 w-5" />
              Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </TenantPageWrapper>
  );
}
