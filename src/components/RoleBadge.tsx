import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'resident' | 'provider';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; className: string }> = {
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20',
  },
  resident: {
    label: 'Resident',
    icon: User,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  provider: {
    label: 'Provider',
    icon: User,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
};

const sizeConfig = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

export function RoleBadge({ role, size = 'md', showIcon = true, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.className,
        sizeConfig[size],
        className
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {config.label}
    </Badge>
  );
}

export function getRoleBadges(roles: UserRole[]) {
  // Prioritize admin role display
  if (roles.includes('admin')) {
    return <RoleBadge role="admin" />;
  }
  if (roles.includes('resident')) {
    return <RoleBadge role="resident" />;
  }
  if (roles.includes('provider')) {
    return <RoleBadge role="provider" />;
  }
  return null;
}
