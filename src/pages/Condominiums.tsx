import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Landmark, Plus, MapPin, Phone, Mail, Building2, Loader2, Search,
  MoreVertical, Pencil, Trash2, LayoutGrid, List, User,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Condominium {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  identifier_code: string | null;
  manager_name: string | null;
  manager_email: string | null;
  manager_phone: string | null;
  common_services: string | null;
  fiscal_code: string | null;
  notes: string | null;
  created_at: string;
  buildings_count?: number;
}

export default function Condominiums() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole('admin');
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [identifierCode, setIdentifierCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [commonServices, setCommonServices] = useState('');
  const [fiscalCode, setFiscalCode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCondominiums();
  }, []);

  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const withCounts = await Promise.all(
        (data || []).map(async (condo: any) => {
          const { count } = await supabase
            .from('buildings')
            .select('*', { count: 'exact', head: true })
            .eq('condominium_id', condo.id);
          return { ...condo, buildings_count: count || 0 } as Condominium;
        })
      );

      setCondominiums(withCounts);
    } catch (error) {
      console.error('Error fetching condominiums:', error);
      toast.error('Failed to load condominiums');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setAddress(''); setCity(''); setState(''); setZipCode('');
    setIdentifierCode(''); setManagerName(''); setManagerEmail(''); setManagerPhone('');
    setCommonServices(''); setFiscalCode(''); setNotes('');
    setEditingCondo(null);
  };

  const openEditDialog = (condo: Condominium) => {
    setEditingCondo(condo);
    setName(condo.name);
    setAddress(condo.address);
    setCity(condo.city || '');
    setState(condo.state || '');
    setZipCode(condo.zip_code || '');
    setIdentifierCode(condo.identifier_code || '');
    setManagerName(condo.manager_name || '');
    setManagerEmail(condo.manager_email || '');
    setManagerPhone(condo.manager_phone || '');
    setCommonServices(condo.common_services || '');
    setFiscalCode(condo.fiscal_code || '');
    setNotes(condo.notes || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const condoData = {
        name,
        address,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        identifier_code: identifierCode || null,
        manager_name: managerName || null,
        manager_email: managerEmail || null,
        manager_phone: managerPhone || null,
        common_services: commonServices || null,
        fiscal_code: fiscalCode || null,
        notes: notes || null,
      };

      if (editingCondo) {
        const { error } = await supabase
          .from('condominiums')
          .update(condoData)
          .eq('id', editingCondo.id);
        if (error) throw error;
        toast.success('Condominium updated successfully');
      } else {
        const { error } = await supabase
          .from('condominiums')
          .insert({ ...condoData, created_by: user.id });
        if (error) throw error;
        toast.success('Condominium created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCondominiums();
    } catch (error: any) {
      console.error('Error saving condominium:', error);
      toast.error(error.message || 'Failed to save condominium');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this condominium? Buildings will be unlinked but not deleted.')) return;
    try {
      const { error } = await supabase.from('condominiums').delete().eq('id', id);
      if (error) throw error;
      toast.success('Condominium deleted successfully');
      fetchCondominiums();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete condominium');
    }
  };

  const filtered = condominiums.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Condominiums" description="Manage your condominiums">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search condominiums..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center rounded-md border bg-muted p-0.5">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Condominium</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingCondo ? 'Edit Condominium' : 'Add New Condominium'}</DialogTitle>
                    <DialogDescription>{editingCondo ? 'Update the condominium information.' : 'Enter the details for your new condominium.'}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Residence Park" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ZIP Code</Label>
                        <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Identifier Code</Label>
                        <Input value={identifierCode} onChange={(e) => setIdentifierCode(e.target.value)} placeholder="COND-001" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fiscal Code</Label>
                      <Input value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Name</Label>
                      <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Manager Email</Label>
                        <Input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Manager Phone</Label>
                        <Input value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Common Services</Label>
                      <Textarea value={commonServices} onChange={(e) => setCommonServices(e.target.value)} rows={2} placeholder="Pool, Gym, Garden..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : editingCondo ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Landmark className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No condominiums found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery ? 'No condominiums match your search.' : isAdmin ? 'Get started by adding your first condominium.' : 'No condominiums available yet.'}
              </p>
              {!searchQuery && isAdmin && (
                <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Condominium</Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((condo) => (
              <Card key={condo.id} className="transition-all hover:shadow-md cursor-pointer" onClick={() => navigate(`/condominiums/${condo.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Landmark className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{condo.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {condo.city && condo.state ? `${condo.city}, ${condo.state}` : condo.address}
                        </CardDescription>
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(condo); }}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(condo.id); }} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{condo.address}</p>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {condo.buildings_count} buildings
                      </Badge>
                      {condo.identifier_code && (
                        <Badge variant="outline">{condo.identifier_code}</Badge>
                      )}
                    </div>
                    {condo.manager_name && (
                      <div className="pt-2 border-t">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {condo.manager_name}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Buildings</TableHead>
                      <TableHead>Code</TableHead>
                      {isAdmin && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((condo) => (
                      <TableRow key={condo.id} className="cursor-pointer" onClick={() => navigate(`/condominiums/${condo.id}`)}>
                        <TableCell className="font-medium">{condo.name}</TableCell>
                        <TableCell>{[condo.address, condo.city].filter(Boolean).join(', ')}</TableCell>
                        <TableCell>{condo.manager_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{condo.buildings_count}</Badge>
                        </TableCell>
                        <TableCell>{condo.identifier_code || '—'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(condo); }}>
                                  <Pencil className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(condo.id); }} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
