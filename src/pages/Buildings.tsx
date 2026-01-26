import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Home,
  Users,
  Loader2,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Building {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  units_count?: number;
}

export default function Buildings() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch unit counts for each building
      const buildingsWithCounts = await Promise.all(
        (data || []).map(async (building) => {
          const { count } = await supabase
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('building_id', building.id);
          return { ...building, units_count: count || 0 };
        })
      );

      setBuildings(buildingsWithCounts);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast.error('Failed to load buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setPhone('');
    setEmail('');
    setEditingBuilding(null);
  };

  const openEditDialog = (building: Building) => {
    setEditingBuilding(building);
    setName(building.name);
    setAddress(building.address);
    setCity(building.city || '');
    setState(building.state || '');
    setZipCode(building.zip_code || '');
    setPhone(building.phone || '');
    setEmail(building.email || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const buildingData = {
        name,
        address,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        phone: phone || null,
        email: email || null,
      };

      if (editingBuilding) {
        // Update existing building
        const { error } = await supabase
          .from('buildings')
          .update(buildingData)
          .eq('id', editingBuilding.id);

        if (error) throw error;
        toast.success('Building updated successfully');
      } else {
        // Create new building
        const { data: building, error: buildingError } = await supabase
          .from('buildings')
          .insert({ ...buildingData, created_by: user.id })
          .select()
          .single();

        if (buildingError) throw buildingError;

        // Add the current user as an admin of this building
        const { error: memberError } = await supabase
          .from('building_members')
          .insert({
            building_id: building.id,
            user_id: user.id,
            role: 'admin',
            invited_by: user.id,
          });

        if (memberError) throw memberError;

        toast.success('Building created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBuildings();
    } catch (error: any) {
      console.error('Error saving building:', error);
      toast.error(error.message || 'Failed to save building');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (buildingId: string) => {
    if (!confirm('Are you sure you want to delete this building? This will also delete all units and data associated with it.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', buildingId);

      if (error) throw error;

      toast.success('Building deleted successfully');
      fetchBuildings();
    } catch (error: any) {
      console.error('Error deleting building:', error);
      toast.error(error.message || 'Failed to delete building');
    }
  };

  const filteredBuildings = buildings.filter((building) =>
    building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Buildings" description="Manage your condominiums and buildings">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search buildings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingBuilding ? 'Edit Building' : 'Add New Building'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBuilding
                      ? 'Update the building information below.'
                      : 'Enter the details for your new condominium or building.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Building Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sunset Towers"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@building.com"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingBuilding ? (
                      'Update Building'
                    ) : (
                      'Create Building'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Buildings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBuildings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No buildings found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery
                  ? 'No buildings match your search criteria.'
                  : 'Get started by adding your first building.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Building
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings.map((building) => (
              <Card key={building.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{building.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {building.city && building.state
                            ? `${building.city}, ${building.state}`
                            : building.address}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(building)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(building.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{building.address}</p>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Home className="h-3 w-3" />
                        {building.units_count} units
                      </Badge>
                    </div>

                    {(building.phone || building.email) && (
                      <div className="space-y-1 pt-2 border-t">
                        {building.phone && (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {building.phone}
                          </p>
                        )}
                        {building.email && (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {building.email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
