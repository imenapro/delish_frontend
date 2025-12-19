import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store as StoreType } from '@/contexts/StoreContext';
import { Edit, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StoreTableProps {
  stores: StoreType[];
  onEdit: (store: StoreType) => void;
  onDelete: (storeId: string) => void;
}

export function StoreTable({ stores, onEdit, onDelete }: StoreTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; emoji: string }> = {
      active: { variant: 'default', emoji: '🟢' },
      expiring_soon: { variant: 'secondary', emoji: '🟡' },
      expired: { variant: 'destructive', emoji: '🔴' },
      suspended: { variant: 'outline', emoji: '⚫' },
    };

    const config = variants[status] || variants.active;

    return (
      <Badge variant={config.variant}>
        {config.emoji} {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Store Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <TableRow key={store.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {store.logoUrl && (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  {store.name}
                </div>
              </TableCell>
              <TableCell>
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  /{store.slug}
                </code>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {store.ownerEmail}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{store.planType.toUpperCase()}</Badge>
              </TableCell>
              <TableCell>{getStatusBadge(store.status)}</TableCell>
              <TableCell className="text-sm">
                {formatDate(store.subscriptionEndDate)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(store)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <Link to={`/${store.slug}/login`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(store.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
