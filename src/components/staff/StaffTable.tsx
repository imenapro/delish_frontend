import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, UserX, UserCheck, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_suspended: boolean;
  roles: { role: string; shop_id?: string }[];
  created_at: string;
}

interface StaffTableProps {
  staff: StaffMember[];
  loading: boolean;
  onSuspend: (userId: string, suspend: boolean) => void;
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (userId: string) => void;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'store_owner':
    case 'admin':
      return 'default';
    case 'branch_manager':
      return 'secondary';
    case 'seller':
      return 'outline';
    default:
      return 'outline';
  }
};

const formatRole = (role: string) => {
  return role.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export function StaffTable({ staff, loading, onSuspend, onEdit, onDelete }: StaffTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff Member</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Role(s)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              {member.phone || '-'}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {member.roles.map((role, idx) => (
                  <Badge key={idx} variant={getRoleBadgeVariant(role.role)}>
                    {formatRole(role.role)}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {member.is_suspended ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {new Date(member.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onSuspend(member.id, !member.is_suspended)}>
                    {member.is_suspended ? (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Reactivate
                      </>
                    ) : (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        Suspend
                      </>
                    )}
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(member.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
