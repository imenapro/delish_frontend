import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  FileText, 
  CreditCard,
  Plus,
  BarChart3
} from 'lucide-react';

export function QuickActions() {
  const { store } = useStoreContext();
  const { roles } = useAuth();
  const navigate = useNavigate();

  const hasRole = (roleNames: string[]) => {
    return roles.some(r => roleNames.includes(r.role));
  };

  const actions = [
    {
      label: 'New Order',
      icon: ShoppingCart,
      onClick: () => navigate(`/${store?.slug}/pos`),
      color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
      show: hasRole(['seller', 'admin', 'branch_manager', 'store_owner']),
    },
    {
      label: 'Add Product',
      icon: Plus,
      onClick: () => navigate(`/${store?.slug}/products`),
      color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
      show: hasRole(['admin', 'branch_manager', 'store_owner']),
    },
    {
      label: "Today's Sales",
      icon: TrendingUp,
      onClick: () => navigate(`/${store?.slug}/reports`),
      color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
      show: hasRole(['accountant', 'admin', 'branch_manager', 'store_owner']),
    },
    {
      label: 'View Orders',
      icon: FileText,
      onClick: () => navigate(`/${store?.slug}/orders`),
      color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
      show: true,
    },
    {
      label: 'Manage Staff',
      icon: Users,
      onClick: () => navigate(`/${store?.slug}/staff`),
      color: 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20',
      show: hasRole(['branch_manager', 'store_owner']),
    },
    {
      label: 'Inventory',
      icon: Package,
      onClick: () => navigate(`/${store?.slug}/inventory`),
      color: 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20',
      show: hasRole(['store_keeper', 'admin', 'branch_manager', 'store_owner']),
    },
    {
      label: 'Reports',
      icon: BarChart3,
      onClick: () => navigate(`/${store?.slug}/reports`),
      color: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20',
      show: hasRole(['accountant', 'admin', 'branch_manager', 'store_owner']),
    },
    {
      label: 'Payments',
      icon: CreditCard,
      onClick: () => navigate(`/${store?.slug}/finance`),
      color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
      show: hasRole(['accountant', 'admin', 'store_owner']),
    },
  ].filter(action => action.show);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="ghost"
                className={`h-auto flex-col gap-2 py-4 ${action.color}`}
                onClick={action.onClick}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
