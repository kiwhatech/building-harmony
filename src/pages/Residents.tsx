import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  Plus,
  Building2,
  Home,
  Loader2,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

interface Resident {
  id: string;
  unit_id: string;
  name: string;
  surname: string;
  email: string;
  fiscal_code: string | null;
  telephone: string | null;
  additional_info: string | null;
  is_owner: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
  created_at: string;
  unit_number?: string;
  building_name?: string;
  building_id?: string;
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

export default function Residents() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  // Form state
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSurname, setFormSurname] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFiscalCode, setFormFiscalCode] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formAdditionalInfo, setFormAdditionalInfo] = useState('');
  const [formIsOwner, setFormIsOwner] = useState(false);
  const [formMoveInDate, setFormMoveInDate] = useState('');
  const [formMoveOutDate, setFormMoveOutDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Update filtered units when building selection changes in form
  useEffect(() => {
    if (formBuildingId) {
      setFilteredUnits(units.filter(u => u.building_id === formBuildingId));
      // Reset unit selection if current unit doesn't belong to selected building
      const currentUnit = units.find(u => u.id === formUnitId);
      if (currentUnit && currentUnit.building_id !== formBuildingId) {
        setFormUnitId('');
      }
    } else {
      setFilteredUnits([]);
      setFormUnitId('');
    }
  }, [formBuildingId, units]);

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

      // Fetch residents with unit and building info
      const { data: residentsData, error: residentsError } = await supabase
        .from('residents')
        .select(`
          *,
          units!inner(
            unit_number,
            building_id,
            buildings!inner(name)
          )
        `)
        .order('surname');

      if (residentsError) throw residentsError;

      const residentsWithDetails = (residentsData || []).map((resident: any) => ({
        ...resident,
        unit_number: resident.units?.unit_number,
        building_id: resident.units?.building_id,
        building_name: resident.units?.buildings?.name,
      }));

      setResidents(residentsWithDetails);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load residents');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormBuildingId('');
    setFormUnitId('');
    setFormName('');
    setFormSurname('');
    setFormEmail('');
    setFormFiscalCode('');
    setFormTelephone('');
    setFormAdditionalInfo('');
    setFormIsOwner(false);
    setFormMoveInDate('');
    setFormMoveOutDate('');
    setEditingResident(null);
  };

  const openEditDialog = (resident: Resident) => {
    setEditingResident(resident);
    // Set building first so units get filtered
    setFormBuildingId(resident.building_id || '');
    setFormUnitId(resident.unit_id);
    setFormName(resident.name);
    setFormSurname(resident.surname);
    setFormEmail(resident.email);
    setFormFiscalCode(resident.fiscal_code || '');
    setFormTelephone(resident.telephone || '');
    setFormAdditionalInfo(resident.additional_info || '');
    setFormIsOwner(resident.is_owner || false);
    setFormMoveInDate(resident.move_in_date || '');
    setFormMoveOutDate(resident.move_out_date || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const residentData = {
        unit_id: formUnitId,
        name: formName.trim(),
        surname: formSurname.trim(),
        email: formEmail.trim(),
        fiscal_code: formFiscalCode.trim() || null,
        telephone: formTelephone.trim() || null,
        additional_info: formAdditionalInfo.trim() || null,
        is_owner: formIsOwner,
        move_in_date: formMoveInDate || null,
        move_out_date: formMoveOutDate || null,
      };

      if (editingResident) {
        const { error } = await supabase
          .from('residents')
          .update(residentData)
          .eq('id', editingResident.id);

        if (error) throw error;
        toast.success('Resident updated successfully');
      } else {
        const { error } = await supabase
          .from('residents')
          .insert({ ...residentData, created_by: user.id });

        if (error) throw error;
        toast.success('Resident added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving resident:', error);
      toast.error(error.message || 'Failed to save resident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (residentId: string) => {
    if (!confirm('Are you sure you want to delete this resident?')) return;

    try {
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentId);

      if (error) throw error;

      toast.success('Resident deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting resident:', error);
      toast.error(error.message || 'Failed to delete resident');
    }
  };

  const filteredResidents = residents.filter((resident) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      resident.name.toLowerCase().includes(searchLower) ||
      resident.surname.toLowerCase().includes(searchLower) ||
      resident.email.toLowerCase().includes(searchLower) ||
      resident.building_name?.toLowerCase().includes(searchLower) ||
      resident.unit_number?.toLowerCase().includes(searchLower) ||
      resident.fiscal_code?.toLowerCase().includes(searchLower);
    const matchesBuilding =
      selectedBuilding === 'all' || resident.building_id === selectedBuilding;
    return matchesSearch && matchesBuilding;
  });

  return (
    <AppLayout title="Residents" description="Manage residents across your buildings and units">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search residents..."
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
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={buildings.length === 0 || units.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingResident ? 'Edit Resident' : 'Add New Resident'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingResident
                      ? 'Update the resident information below.'
                      : 'Enter the details for the new resident.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Building and Unit Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="building">Building *</Label>
                      <Select value={formBuildingId} onValueChange={setFormBuildingId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select building" />
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
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <Select
                        value={formUnitId}
                        onValueChange={setFormUnitId}
                        required
                        disabled={!formBuildingId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="John"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Surname *</Label>
                      <Input
                        id="surname"
                        value={formSurname}
                        onChange={(e) => setFormSurname(e.target.value)}
                        placeholder="Doe"
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      required
                      maxLength={255}
                    />
                  </div>

                  {/* Fiscal code and telephone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fiscalCode">Fiscal Code</Label>
                      <Input
                        id="fiscalCode"
                        value={formFiscalCode}
                        onChange={(e) => setFormFiscalCode(e.target.value.toUpperCase())}
                        placeholder="RSSMRA85M01H501Z"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Telephone</Label>
                      <Input
                        id="telephone"
                        value={formTelephone}
                        onChange={(e) => setFormTelephone(e.target.value)}
                        placeholder="+39 123 456 7890"
                        maxLength={20}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moveInDate">Move-in Date</Label>
                      <Input
                        id="moveInDate"
                        type="date"
                        value={formMoveInDate}
                        onChange={(e) => setFormMoveInDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moveOutDate">Move-out Date</Label>
                      <Input
                        id="moveOutDate"
                        type="date"
                        value={formMoveOutDate}
                        onChange={(e) => setFormMoveOutDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Is Owner */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isOwner"
                      checked={formIsOwner}
                      onCheckedChange={(checked) => setFormIsOwner(checked === true)}
                    />
                    <Label htmlFor="isOwner" className="font-normal cursor-pointer">
                      This resident is the unit owner
                    </Label>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Information</Label>
                    <Textarea
                      id="additionalInfo"
                      value={formAdditionalInfo}
                      onChange={(e) => setFormAdditionalInfo(e.target.value)}
                      placeholder="Any additional notes about this resident..."
                      rows={3}
                      maxLength={1000}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formUnitId}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingResident ? (
                      'Update Resident'
                    ) : (
                      'Add Resident'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Residents Table */}
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
                You need to create a building and units before adding residents.
              </p>
              <Button asChild>
                <a href="/buildings">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Building
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : units.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No units yet</h3>
              <p className="mb-4 text-center text-muted-foreground">
                You need to create units before adding residents.
              </p>
              <Button asChild>
                <a href="/units">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : filteredResidents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No residents found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery || selectedBuilding !== 'all'
                  ? 'No residents match your filters.'
                  : 'Get started by adding your first resident.'}
              </p>
              {!searchQuery && selectedBuilding === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Resident
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Building / Unit</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fiscal Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResidents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {resident.name} {resident.surname}
                          </p>
                          {resident.is_owner && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Owner
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{resident.building_name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          Unit {resident.unit_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {resident.email}
                        </span>
                        {resident.telephone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {resident.telephone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {resident.fiscal_code || '-'}
                    </TableCell>
                    <TableCell>
                      {resident.move_out_date ? (
                        <Badge variant="secondary">Moved out</Badge>
                      ) : resident.move_in_date ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(resident)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(resident.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
