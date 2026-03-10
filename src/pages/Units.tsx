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
  Home,
  Plus,
  Building2,
  Loader2,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Bed,
  Bath,
  Ruler,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Unit {
  id: string;
  unit_number: string;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  building_id: string;
  building_name?: string;
  residents_count?: number;
}

interface Building {
  id: string;
  name: string;
}

export default function Units() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form state
  const [buildingId, setBuildingId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [areaSqft, setAreaSqft] = useState('');

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

      // Fetch units with building names
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          buildings!inner(name)
        `)
        .order('unit_number');

      if (unitsError) throw unitsError;

      const unitsWithDetails = await Promise.all(
        (unitsData || []).map(async (unit: any) => {
          const { count } = await supabase
            .from('residents')
            .select('*', { count: 'exact', head: true })
            .eq('unit_id', unit.id);
          
          return {
            ...unit,
            building_name: unit.buildings?.name,
            residents_count: count || 0,
          };
        })
      );

      setUnits(unitsWithDetails);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load units');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBuildingId('');
    setUnitNumber('');
    setFloor('');
    setBedrooms('');
    setBathrooms('');
    setAreaSqft('');
    setEditingUnit(null);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setBuildingId(unit.building_id);
    setUnitNumber(unit.unit_number);
    setFloor(unit.floor?.toString() || '');
    setBedrooms(unit.bedrooms?.toString() || '');
    setBathrooms(unit.bathrooms?.toString() || '');
    setAreaSqft(unit.area_sqft?.toString() || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const unitData = {
        building_id: buildingId,
        unit_number: unitNumber,
        floor: floor ? parseInt(floor) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        area_sqft: areaSqft ? parseFloat(areaSqft) : null,
      };

      if (editingUnit) {
        const { error } = await supabase
          .from('units')
          .update(unitData)
          .eq('id', editingUnit.id);

        if (error) throw error;
        toast.success('Unit updated successfully');
      } else {
        const { error } = await supabase
          .from('units')
          .insert(unitData);

        if (error) throw error;
        toast.success('Unit created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('A unit with this number already exists in this building');
      } else {
        toast.error(error.message || 'Failed to save unit');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;

      toast.success('Unit deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      toast.error(error.message || 'Failed to delete unit');
    }
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.building_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding =
      selectedBuilding === 'all' || unit.building_id === selectedBuilding;
    return matchesSearch && matchesBuilding;
  });

  return (
    <AppLayout title="Units" description="Manage apartments and units across your buildings">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:w-64"
              />
            </div>
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Buildings" />
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
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button disabled={buildings.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                  <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
                  <DialogDescription>
                    {editingUnit
                      ? 'Update the unit information below.'
                      : 'Enter the details for the new unit.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="building">Building *</Label>
                    <Select value={buildingId} onValueChange={setBuildingId} required>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitNumber">Unit Number *</Label>
                      <Input
                        id="unitNumber"
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.target.value)}
                        placeholder="101"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        type="number"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        step="0.5"
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        placeholder="1.5"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaSqft">Area (sq ft)</Label>
                    <Input
                      id="areaSqft"
                      type="number"
                      value={areaSqft}
                      onChange={(e) => setAreaSqft(e.target.value)}
                      placeholder="850"
                    />
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
                        Saving...
                      </>
                    ) : editingUnit ? (
                      'Update Unit'
                    ) : (
                      'Create Unit'
                    )}
                  </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Units Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : buildings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No buildings yet</h3>
              <p className="mb-4 text-center text-muted-foreground">
                You need to create a building before adding units.
              </p>
              <Button asChild>
                <a href="/buildings">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Building
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : filteredUnits.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No units found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery || selectedBuilding !== 'all'
                  ? 'No units match your filters.'
                  : isAdmin
                  ? 'Get started by adding your first unit.'
                  : 'No units available yet.'}
              </p>
              {!searchQuery && selectedBuilding === 'all' && isAdmin && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Residents</TableHead>
                  {isAdmin && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-accent/10 p-2">
                          <Home className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium">{unit.unit_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {unit.building_name}
                    </TableCell>
                    <TableCell>{unit.floor || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {unit.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {unit.bedrooms}
                          </span>
                        )}
                        {unit.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {unit.bathrooms}
                          </span>
                        )}
                        {unit.area_sqft && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" />
                            {unit.area_sqft} sqft
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={unit.residents_count ? 'default' : 'secondary'}>
                        {unit.residents_count || 0}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(unit)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(unit.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
