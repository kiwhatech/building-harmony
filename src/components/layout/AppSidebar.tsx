import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Home, Users, DollarSign, Wrench, BarChart3, Megaphone,
  Settings, LogOut, Bell, ChevronDown, Vote, FolderOpen, Calculator, Sparkles, HardHat, CreditCard,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/RoleBadge';

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, roles, hasRole } = useAuth();
  const { t } = useLanguage();

  const isAdmin = hasRole('admin');
  const primaryRole = isAdmin ? 'admin' : roles.includes('resident') ? 'resident' : roles[0] || 'resident';

  const adminMainNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
    { icon: Building2, label: t('nav.buildings'), href: '/buildings' },
    { icon: Home, label: t('nav.units'), href: '/units' },
    { icon: Users, label: t('nav.residents'), href: '/residents' },
    { icon: FolderOpen, label: t('nav.documents'), href: '/documents' },
  ];
  const adminManagementNavItems = [
    { icon: Calculator, label: t('nav.feesConfig'), href: '/condo-fees' },
    { icon: DollarSign, label: t('nav.fees'), href: '/fees' },
    { icon: CreditCard, label: t('nav.payments'), href: '/payments' },
    { icon: Wrench, label: t('nav.requests'), href: '/requests' },
    { icon: HardHat, label: t('nav.providers'), href: '/providers' },
  ];
  const adminCommunicationNavItems = [
    { icon: Megaphone, label: t('nav.announcements'), href: '/announcements' },
    { icon: BarChart3, label: t('nav.reports'), href: '/reports' },
    { icon: Sparkles, label: t('nav.assistant'), href: '/assistant' },
  ];
  const residentMainNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
    { icon: Home, label: t('nav.myUnit'), href: '/units' },
    { icon: Building2, label: t('nav.myBuilding'), href: '/buildings' },
    { icon: FolderOpen, label: t('nav.documents'), href: '/documents' },
  ];
  const residentServicesNavItems = [
    { icon: Wrench, label: t('nav.requests'), href: '/requests' },
    { icon: DollarSign, label: t('nav.payments'), href: '/fees' },
  ];
  const residentCommunityNavItems = [
    { icon: Megaphone, label: t('nav.announcements'), href: '/announcements' },
    { icon: Vote, label: t('nav.polls'), href: '/polls' },
    { icon: Users, label: t('nav.neighbors'), href: '/residents' },
    { icon: Sparkles, label: t('nav.assistant'), href: '/assistant' },
  ];

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const renderNavGroup = (items: typeof adminMainNavItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={location.pathname === item.href}>
            <Link to={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Harmony</h1>
            <p className="text-xs text-muted-foreground">{t('nav.subtitle')}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {isAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.main')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(adminMainNavItems)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.management')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(adminManagementNavItems)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.communication')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(adminCommunicationNavItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.mySpace')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(residentMainNavItems)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.services')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(residentServicesNavItems)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.groups.community')}</SidebarGroupLabel>
              <SidebarGroupContent>{renderNavGroup(residentCommunityNavItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <RoleBadge role={primaryRole as any} size="sm" showIcon={false} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">{t('nav.signedInAs')}</p>
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="flex items-center">
                <Bell className="mr-2 h-4 w-4" />
                {t('nav.notifications')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
