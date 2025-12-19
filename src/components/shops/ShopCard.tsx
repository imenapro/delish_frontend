import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Edit, MoreHorizontal, Users, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Shop {
  id: string;
  name: string;
  address: string;
  phone?: string;
  open_hours?: string;
  is_active: boolean;
  logo_url?: string;
  staff_count?: number;
  product_count?: number;
}

interface ShopCardProps {
  shop: Shop;
  onEdit?: (shop: Shop) => void;
  onViewDetails?: (shop: Shop) => void;
}

export function ShopCard({ shop, onEdit, onViewDetails }: ShopCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-10 w-10 object-cover rounded" />
            ) : (
              <span className="text-xl font-bold text-primary">
                {shop.name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <CardTitle className="text-lg">{shop.name}</CardTitle>
            <Badge variant={shop.is_active ? 'secondary' : 'destructive'} className="mt-1">
              {shop.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(shop)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Shop
              </DropdownMenuItem>
            )}
            {onViewDetails && (
              <DropdownMenuItem onClick={() => onViewDetails(shop)}>
                View Details
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{shop.address}</span>
        </div>
        
        {shop.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{shop.phone}</span>
          </div>
        )}
        
        {shop.open_hours && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{shop.open_hours}</span>
          </div>
        )}

        <div className="flex gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{shop.staff_count || 0} Staff</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{shop.product_count || 0} Products</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
