import { NavLink, useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CreditCard, 
  Store, 
  Package, 
  ShoppingCart, 
  ChefHat, 
  PackageOpen, 
  DollarSign, 
  Calendar, 
  FileText, 
  Truck, 
  Users, 
  Shield, 
  MessageSquare, 
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Receipt,
} from 'lucide-react';

interface TenantSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function TenantSidebar({ collapsed, onToggle }: TenantSidebarProps) {
  const { store, daysUntilExpiration, isExpired } = useStoreContext();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const hasRole = (roleNames: string[]) => {
    return roles.some(r => roleNames.includes(r.role));
  };

  const navigationItems = [
    { name: 'Dashboard', href: `/${store?.slug}/dashboard`, icon: LayoutDashboard, show: true },
    { name: 'POS', href: `/${store?.slug}/pos`, icon: CreditCard, show: hasRole(['seller', 'admin', 'branch_manager', 'store_owner']) },
    { name: 'Shifts', href: `/${store?.slug}/shifts`, icon: ClipboardList, show: hasRole(['admin', 'store_owner', 'branch_manager', 'seller']) },
    { name: 'Invoices', href: `/${store?.slug}/invoices`, icon: Receipt, show: hasRole(['admin', 'store_owner', 'branch_manager', 'seller']) },
    { name: 'Shops', href: `/${store?.slug}/shops`, icon: Store, show: hasRole(['admin', 'store_owner', 'branch_manager']) },
    { name: 'Products', href: `/${store?.slug}/products`, icon: Package, show: hasRole(['admin', 'branch_manager', 'store_owner']) },
    { name: 'Orders', href: `/${store?.slug}/orders`, icon: ShoppingCart, show: true },
    { name: 'Kitchen', href: `/${store?.slug}/kitchen`, icon: ChefHat, show: hasRole(['admin', 'branch_manager', 'store_owner']) },
    { name: 'Inventory', href: `/${store?.slug}/inventory`, icon: PackageOpen, show: hasRole(['store_keeper', 'admin', 'branch_manager', 'store_owner']) },
    { name: 'Finance', href: `/${store?.slug}/finance`, icon: DollarSign, show: hasRole(['accountant', 'admin', 'store_owner']) },
    { name: 'Workforce', href: `/${store?.slug}/workforce`, icon: Calendar, show: hasRole(['admin', 'branch_manager', 'store_owner']) },
    { name: 'Reports', href: `/${store?.slug}/reports`, icon: FileText, show: hasRole(['accountant', 'admin', 'branch_manager', 'store_owner']) },
    { name: 'Delivery', href: `/${store?.slug}/delivery`, icon: Truck, show: hasRole(['delivery', 'admin', 'store_owner']) },
    { name: 'Staff', href: `/${store?.slug}/staff`, icon: Users, show: hasRole(['branch_manager', 'store_owner']) },
    { name: 'Admin', href: `/${store?.slug}/admin`, icon: Shield, show: hasRole(['admin', 'store_owner']) },
    { name: 'Chat', href: `/${store?.slug}/chat`, icon: MessageSquare, show: true },
    { name: 'Wallet', href: `/${store?.slug}/wallet`, icon: Wallet, show: true },
  ].filter(item => item.show);

  const handleLogout = async () => {
    await signOut();
    if (store?.slug) {
      navigate(`/${store.slug}/login`);
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getPrimaryRole = () => {
    if (roles.length === 0) return 'User';
    const roleNames: Record<string, string> = {
      'store_owner': 'Owner',
      'admin': 'Admin',
      'branch_manager': 'Manager',
      'seller': 'Seller',
      'store_keeper': 'Store Keeper',
      'accountant': 'Accountant',
      'delivery': 'Delivery',
      'manpower': 'Worker',
      'customer': 'Customer',
    };
    return roleNames[roles[0].role] || roles[0].role;
  };

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    
    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.href}
              className={({ isActive }) => cn(
                "flex items-center justify-center p-2 rounded-md transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        to={item.href}
        className={({ isActive }) => cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <aside className={cn(
      "border-r bg-card flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Store Branding */}
      <div className={cn("p-4 border-b", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          {store?.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.name}
              className="h-10 w-10 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{store?.name}</h2>
              <Badge 
                variant={isExpired ? 'destructive' : daysUntilExpiration <= 7 ? 'secondary' : 'default'}
                className="text-xs"
              >
                {isExpired ? 'Expired' : `${daysUntilExpiration}d left`}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "absolute top-20 -right-3 h-6 w-6 rounded-full border bg-background p-0 shadow-md",
          "hover:bg-muted"
        )}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Profile */}
      <div className={cn("p-4", collapsed && "p-2")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className="w-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{getPrimaryRole()}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{getPrimaryRole()}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
