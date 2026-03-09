import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { subDays, differenceInHours, format, startOfWeek } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────
interface RequestRow {
  id: string;
  building_id: string;
  status: string;
  estimated_amount: number | null;
  created_at: string;
  priority: number;
  request_type: string;
}

interface ActivityRow {
  request_id: string;
  activity_type: string;
  created_at: string;
  old_status: string | null;
  new_status: string | null;
}

interface BuildingRow { id: string; name: string; }

// ── Constants ──────────────────────────────────────────────────────
const TIME_PERIODS = [
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
];

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: '1', label: 'Low' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Critical' },
];

const CHART_BLUE = 'hsl(217, 91%, 60%)';
const CHART_ORANGE = 'hsl(38, 92%, 50%)';
const CHART_GREEN = 'hsl(142, 71%, 45%)';
const CHART_RED = 'hsl(0, 72%, 51%)';

// ── Component ──────────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod] = useState('30');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const cutoff = useMemo(() => subDays(new Date(), Number(period)).toISOString(), [period]);

  // ── Fetch data ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [bRes, rRes, aRes] = await Promise.all([
        supabase.from('buildings').select('id, name'),
        supabase.from('unified_requests').select('id, building_id, status, estimated_amount, created_at, priority, request_type').gte('created_at', cutoff),
        supabase.from('request_activities').select('request_id, activity_type, created_at, old_status, new_status').gte('created_at', cutoff),
      ]);
      setBuildings((bRes.data as BuildingRow[]) || []);
      setRequests((rRes.data as RequestRow[]) || []);
      setActivities((aRes.data as ActivityRow[]) || []);
      setLoading(false);
    };
    load();
  }, [cutoff]);

  // ── Bar chart data: grouped by building ──────────────────────────
  const barData = useMemo(() => {
    const interventions = requests.filter(r => r.request_type === 'intervention');
    const grouped = new Map<string, { count: number; totalAmount: number }>();
    for (const r of interventions) {
      const entry = grouped.get(r.building_id) || { count: 0, totalAmount: 0 };
      entry.count += 1;
      entry.totalAmount += r.estimated_amount || 0;
      grouped.set(r.building_id, entry);
    }
    return buildings
      .map(b => {
        const g = grouped.get(b.id);
        if (!g) return null;
        return {
          name: b.name.length > 18 ? b.name.slice(0, 16) + '…' : b.name,
          count: g.count,
          avgPrice: g.count > 0 ? Math.round(g.totalAmount / g.count) : 0,
          totalSpend: Math.round(g.totalAmount),
        };
      })
      .filter(Boolean);
  }, [requests, buildings]);

  // ── Line chart data: avg response time per week ──────────────────
  const lineData = useMemo(() => {
    // Filter requests by building & priority
    let filtered = requests;
    if (buildingFilter !== 'all') filtered = filtered.filter(r => r.building_id === buildingFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(r => r.priority === Number(priorityFilter));

    // For each request, find the first activity after creation (first status change = response)
    const requestCreatedMap = new Map(filtered.map(r => [r.id, new Date(r.created_at)]));
    const responseHours = new Map<string, number[]>(); // weekKey → hours[]

    for (const a of activities) {
      const createdAt = requestCreatedMap.get(a.request_id);
      if (!createdAt) continue;
      if (a.activity_type !== 'status_change') continue;
      const actDate = new Date(a.created_at);
      const hours = differenceInHours(actDate, createdAt);
      if (hours < 0) continue;
      const weekKey = format(startOfWeek(actDate, { weekStartsOn: 1 }), 'MMM d');
      const arr = responseHours.get(weekKey) || [];
      // Only keep the shortest response per request per week
      arr.push(hours);
      responseHours.set(weekKey, arr);
    }

    return Array.from(responseHours.entries())
      .map(([week, hrs]) => ({
        week,
        avgHours: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [requests, activities, buildingFilter, priorityFilter]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Intervention analytics and response-time KPIs</p>
        </div>

        {/* ─── Chart 1: Interventions by Building ──────────────────── */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Interventions by Building</CardTitle>
              <CardDescription>Count, average price &amp; total spending</CardDescription>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : barData.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">No intervention data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar yAxisId="left" dataKey="count" name="Interventions" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="avgPrice" name="Avg Price (€)" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="totalSpend" name="Total Spend (€)" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ─── Chart 2: Response Time KPI ──────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Response Time KPI</CardTitle>
              <CardDescription>Average hours to first response by week — target &lt; 48 h</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full rounded-lg" />
            ) : lineData.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">No response-time data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    formatter={(value: number) => [`${value} h`, 'Avg Response']}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <ReferenceLine y={48} stroke={CHART_RED} strokeDasharray="6 4" label={{ value: '48h Target', position: 'right', fill: CHART_RED, fontSize: 12 }} />
                  <Line type="monotone" dataKey="avgHours" name="Avg Response Time" stroke={CHART_BLUE} strokeWidth={2.5} dot={{ r: 4, fill: CHART_BLUE }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

