import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  DollarSign,
  Wrench,
  FileText,
  BarChart3,
  Megaphone,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Buildings', href: '/buildings' },
  { icon: Home, label: 'Units', href: '/units' },
  { icon: Users, label: 'Residents', href: '/residents' },
];

const managementNavItems = [
  { icon: DollarSign, label: 'Fees', href: '/fees' },
  { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
  { icon: FileText, label: 'Estimates', href: '/estimates' },
];

const communicationNavItems = [
  { icon: Megaphone, label: 'Announcements', href: '/announcements' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Harmony</h1>
            <p className="text-xs text-muted-foreground">Management Platform</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Communication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="flex items-center">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
