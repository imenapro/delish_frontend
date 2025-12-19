import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface BusinessTypeCardProps {
  icon: LucideIcon;
  label: string;
}

export function BusinessTypeCard({ icon: Icon, label }: BusinessTypeCardProps) {
  return (
    <Card className="p-6 text-center hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
      <Icon className="h-8 w-8 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
      <p className="text-sm font-medium text-foreground">{label}</p>
    </Card>
  );
}
