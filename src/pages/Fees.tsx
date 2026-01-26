import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DollarSign,
  Plus,
  Loader2,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

type PaymentStatus = 'pending' | 'paid' | 'overdue';

interface Fee {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  building_id: string;
  unit_id: string | null;
  building_name?: string;
  unit_number?: string;
}

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
  building_id: string;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-warning/10 text-warning' },
  paid: { label: 'Paid', icon: CheckCircle2, color: 'bg-success/10 text-success' },
  overdue: { label: 'Overdue', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
};

export default function Fees() {
  const { user } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');

  // Form state
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, building_id')
        .order('unit_number');

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Fetch fees with related data
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select(`
          *,
          buildings!inner(name),
          units(unit_number)
        `)
        .order('due_date', { ascending: false });

      if (feesError) throw feesError;

      setFees(
        (feesData || []).map((fee: any) => ({
          ...fee,
          building_name: fee.buildings?.name,
          unit_number: fee.units?.unit_number,
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load fees');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBuildingId('');
    setUnitId('');
    setDescription('');
    setAmount('');
    setDueDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('fees').insert({
        building_id: buildingId,
        unit_id: unitId || null,
        description,
        amount: parseFloat(amount),
        due_date: dueDate,
        status: 'pending',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Fee created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating fee:', error);
      toast.error(error.message || 'Failed to create fee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (feeId: string, newStatus: PaymentStatus) => {
    try {
      const { error } = await supabase
        .from('fees')
        .update({ status: newStatus })
        .eq('id', feeId);

      if (error) throw error;

      toast.success('Status updated successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredFees = fees.filter((fee) => {
    const matchesSearch =
      fee.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.building_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || fee.status === statusFilter;
    const matchesBuilding = buildingFilter === 'all' || fee.building_id === buildingFilter;
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  const filteredUnits = units.filter((unit) => unit.building_id === buildingId);

  const totals = {
    all: fees.reduce((sum, f) => sum + Number(f.amount), 0),
    pending: fees.filter((f) => f.status === 'pending').reduce((sum, f) => sum + Number(f.amount), 0),
    paid: fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + Number(f.amount), 0),
    overdue: fees.filter((f) => f.status === 'overdue').reduce((sum, f) => sum + Number(f.amount), 0),
  };

  return (
    <AppLayout title="Fees" description="Manage condominium fees and payments">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-2xl font-bold">${totals.all.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-warning">${totals.pending.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold text-success">${totals.paid.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">${totals.overdue.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search fees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={buildings.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Create Fee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Fee</DialogTitle>
                  <DialogDescription>
                    Add a new fee for a building or specific unit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="building">Building *</Label>
                    <Select value={buildingId} onValueChange={(v) => {
                      setBuildingId(v);
                      setUnitId('');
                    }} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredUnits.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit (Optional)</Label>
                      <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger>
                          <SelectValue placeholder="All units (building-wide)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All units (building-wide)</SelectItem>
                          {filteredUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Monthly maintenance fee"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !buildingId}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Fee'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fees Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No fees found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || buildingFilter !== 'all'
                  ? 'No fees match your filters.'
                  : 'No fees have been created yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Building / Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.map((fee) => {
                  const status = statusConfig[fee.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{fee.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fee.building_name}
                        {fee.unit_number && ` - Unit ${fee.unit_number}`}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(fee.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(fee.due_date), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={fee.status}
                          onValueChange={(value) => updateStatus(fee.id, value as PaymentStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={status.color} variant="secondary">
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
