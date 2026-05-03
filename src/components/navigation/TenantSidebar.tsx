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
  User,
  LucideIcon,
} from 'lucide-react';

import { useMenus } from '@/hooks/useMenus';

interface TenantSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function TenantSidebar({ collapsed, onToggle }: TenantSidebarProps) {
  const { store, daysUntilExpiration, isExpired, getTenantRoute } = useStoreContext();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: menus = [] } = useMenus();

  const iconMap: Record<string, LucideIcon> = {
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
    ClipboardList,
    Receipt,
  };

  const navigationItems = menus
    .filter(menu => menu.can_view !== false)
    .map(menu => ({
      name: menu.label,
      href: getTenantRoute(menu.path),
      icon: iconMap[menu.icon] || LayoutDashboard,
      show: true,
      permissions: {
        canCreate: menu.can_create,
        canEdit: menu.can_edit,
        canDelete: menu.can_delete
      }
    }));

  const handleLogout = async () => {
    await signOut();
    navigate(getTenantRoute('/login'));
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getPrimaryRole = () => {
    if (roles.length === 0) return 'User';
    const roleNames: Record<string, string> = {
      'super_admin': 'Super Admin',
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
              {store?.status !== 'Bought' && (
                <Badge 
                  variant={isExpired ? 'destructive' : daysUntilExpiration <= 7 ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {isExpired ? 'Expired' : `${daysUntilExpiration}d left`}
                </Badge>
              )}
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
          <div className="space-y-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(getTenantRoute('/profile'))}
                  className="w-full"
                >
                  <User className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Profile
              </TooltipContent>
            </Tooltip>

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
                  <p className="text-xs text-red-500 mt-1">Click to Logout</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
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
              className="w-full justify-start mb-2"
              onClick={() => navigate(getTenantRoute('/profile'))}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
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
