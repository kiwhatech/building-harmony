import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  Home,
  Users,
  DollarSign,
  Wrench,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  buildings: number;
  units: number;
  residents: number;
  pendingFees: number;
  openRequests: number;
  pendingEstimates: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    buildings: 0,
    units: 0,
    residents: 0,
    pendingFees: 0,
    openRequests: 0,
    pendingEstimates: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch counts in parallel
      const [
        { count: buildings },
        { count: units },
        { count: residents },
        { count: pendingFees },
        { count: openRequests },
        { count: pendingEstimates },
      ] = await Promise.all([
        supabase.from('buildings').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('*', { count: 'exact', head: true }),
        supabase.from('unit_residents').select('*', { count: 'exact', head: true }),
        supabase.from('fees').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['requested', 'under_review', 'in_progress']),
        supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        buildings: buildings || 0,
        units: units || 0,
        residents: residents || 0,
        pendingFees: pendingFees || 0,
        openRequests: openRequests || 0,
        pendingEstimates: pendingEstimates || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Buildings',
      value: stats.buildings,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/buildings',
    },
    {
      title: 'Units',
      value: stats.units,
      icon: Home,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      href: '/units',
    },
    {
      title: 'Residents',
      value: stats.residents,
      icon: Users,
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary',
      href: '/residents',
    },
    {
      title: 'Pending Fees',
      value: stats.pendingFees,
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      href: '/fees',
    },
    {
      title: 'Open Requests',
      value: stats.openRequests,
      icon: Wrench,
      color: 'text-info',
      bgColor: 'bg-info/10',
      href: '/maintenance',
    },
    {
      title: 'Pending Estimates',
      value: stats.pendingEstimates,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      href: '/estimates',
    },
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <AppLayout title="Dashboard" description={`Welcome back, ${userName}`}>
      <div className="space-y-8">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-2xl font-bold">
                        {isLoading ? '...' : stat.value}
                      </p>
                    </div>
                    <div className={`rounded-full p-3 ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/buildings">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Building
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/maintenance">
                  <Wrench className="mr-2 h-4 w-4" />
                  View Maintenance Requests
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/fees">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Manage Fees
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/announcements">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Post Announcement
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates across your buildings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.buildings === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No buildings yet</p>
                    <Button asChild className="mt-4" size="sm">
                      <Link to="/buildings">
                        <Plus className="mr-2 h-4 w-4" />
                        Add your first building
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="rounded-full bg-success/10 p-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">System Ready</p>
                        <p className="text-xs text-muted-foreground">
                          You have {stats.buildings} building(s) with {stats.units} unit(s)
                        </p>
                      </div>
                    </div>
                    {stats.openRequests > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="rounded-full bg-warning/10 p-2">
                          <Clock className="h-4 w-4 text-warning" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Pending Requests</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.openRequests} maintenance request(s) need attention
                          </p>
                        </div>
                        <Badge variant="secondary">{stats.openRequests}</Badge>
                      </div>
                    )}
                    {stats.pendingFees > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="rounded-full bg-destructive/10 p-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Outstanding Fees</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.pendingFees} fee(s) pending payment
                          </p>
                        </div>
                        <Badge variant="destructive">{stats.pendingFees}</Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Getting Started</CardTitle>
              <CardDescription>Complete these steps to set up your condominium</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 rounded-lg border p-3 ${stats.buildings > 0 ? 'bg-success/5 border-success/20' : ''}`}>
                  <div className={`rounded-full p-2 ${stats.buildings > 0 ? 'bg-success/10' : 'bg-muted'}`}>
                    {stats.buildings > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Add a Building</p>
                    <p className="text-xs text-muted-foreground">Create your first condominium</p>
                  </div>
                  {stats.buildings === 0 && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/buildings">Add</Link>
                    </Button>
                  )}
                </div>

                <div className={`flex items-center gap-3 rounded-lg border p-3 ${stats.units > 0 ? 'bg-success/5 border-success/20' : ''}`}>
                  <div className={`rounded-full p-2 ${stats.units > 0 ? 'bg-success/10' : 'bg-muted'}`}>
                    {stats.units > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Home className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Create Units</p>
                    <p className="text-xs text-muted-foreground">Add apartments to your building</p>
                  </div>
                  {stats.units === 0 && stats.buildings > 0 && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/units">Add</Link>
                    </Button>
                  )}
                </div>

                <div className={`flex items-center gap-3 rounded-lg border p-3 ${stats.residents > 0 ? 'bg-success/5 border-success/20' : ''}`}>
                  <div className={`rounded-full p-2 ${stats.residents > 0 ? 'bg-success/10' : 'bg-muted'}`}>
                    {stats.residents > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Assign Residents</p>
                    <p className="text-xs text-muted-foreground">Add residents to units</p>
                  </div>
                  {stats.residents === 0 && stats.units > 0 && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/residents">Add</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
