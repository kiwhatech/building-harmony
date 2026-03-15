import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ArrowLeft, Landmark, MapPin, Phone, Mail, Building2, Loader2, Pencil,
  User, StickyNote, Hash, Briefcase, Home,
} from 'lucide-react';

interface CondominiumData {
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
}

interface BuildingRow {
  id: string;
  name: string;
  address: string;
  city: string | null;
  condominium_id: string | null;
  units_count?: number;
}

export default function CondominiumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [condo, setCondo] = useState<CondominiumData | null>(null);
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [availableBuildings, setAvailableBuildings] = useState<BuildingRow[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  // Form state
  const [fName, setFName] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fCity, setFCity] = useState('');
  const [fState, setFState] = useState('');
  const [fZip, setFZip] = useState('');
  const [fCode, setFCode] = useState('');
  const [fManager, setFManager] = useState('');
  const [fManagerEmail, setFManagerEmail] = useState('');
  const [fManagerPhone, setFManagerPhone] = useState('');
  const [fServices, setFServices] = useState('');
  const [fFiscal, setFFiscal] = useState('');
  const [fNotes, setFNotes] = useState('');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      setCondo(data as CondominiumData);

      const { data: blds, error: bErr } = await supabase
        .from('buildings')
        .select('id, name, address, city, condominium_id')
        .eq('condominium_id', id!);
      if (bErr) throw bErr;

      const withCounts = await Promise.all(
        (blds || []).map(async (b: any) => {
          const { count } = await supabase
            .from('units')
            .select('*', { count: 'exact', head: true })
            .eq('building_id', b.id);
          return { ...b, units_count: count || 0 } as BuildingRow;
        })
      );
      setBuildings(withCounts);
    } catch (error) {
      console.error('Error fetching condominium:', error);
      toast.error('Failed to load condominium');
      navigate('/condominiums');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = () => {
    if (!condo) return;
    setFName(condo.name); setFAddress(condo.address);
    setFCity(condo.city || ''); setFState(condo.state || '');
    setFZip(condo.zip_code || ''); setFCode(condo.identifier_code || '');
    setFManager(condo.manager_name || ''); setFManagerEmail(condo.manager_email || '');
    setFManagerPhone(condo.manager_phone || ''); setFServices(condo.common_services || '');
    setFFiscal(condo.fiscal_code || ''); setFNotes(condo.notes || '');
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('condominiums').update({
        name: fName, address: fAddress,
        city: fCity || null, state: fState || null, zip_code: fZip || null,
        identifier_code: fCode || null, manager_name: fManager || null,
        manager_email: fManagerEmail || null, manager_phone: fManagerPhone || null,
        common_services: fServices || null, fiscal_code: fFiscal || null,
        notes: fNotes || null,
      }).eq('id', id!);
      if (error) throw error;
      toast.success('Condominium updated');
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLinkDialog = async () => {
    const { data } = await supabase
      .from('buildings')
      .select('id, name, address, city, condominium_id')
      .is('condominium_id', null);
    setAvailableBuildings((data || []) as BuildingRow[]);
    setSelectedBuildingId('');
    setIsLinkOpen(true);
  };

  const handleLinkBuilding = async () => {
    if (!selectedBuildingId) return;
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ condominium_id: id! })
        .eq('id', selectedBuildingId);
      if (error) throw error;
      toast.success('Building linked');
      setIsLinkOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link building');
    }
  };

  const handleUnlinkBuilding = async (buildingId: string) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ condominium_id: null })
        .eq('id', buildingId);
      if (error) throw error;
      toast.success('Building unlinked');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink building');
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Condominium Details">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!condo) return null;

  const fullAddress = [condo.address, condo.city, condo.state, condo.zip_code].filter(Boolean).join(', ');

  return (
    <AppLayout title="Condominium Details" description={condo.name}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/condominiums')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Back to Condominiums
        </Button>

        {/* General Info */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{condo.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{fullAddress}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem icon={<Building2 className="h-4 w-4" />} label="Buildings" value={`${buildings.length} buildings`} />
              {condo.identifier_code && <InfoItem icon={<Hash className="h-4 w-4" />} label="Identifier Code" value={condo.identifier_code} />}
              {condo.fiscal_code && <InfoItem icon={<Hash className="h-4 w-4" />} label="Fiscal Code" value={condo.fiscal_code} />}
              {condo.manager_name && <InfoItem icon={<User className="h-4 w-4" />} label="Manager" value={condo.manager_name} />}
              {condo.manager_email && <InfoItem icon={<Mail className="h-4 w-4" />} label="Manager Email" value={condo.manager_email} />}
              {condo.manager_phone && <InfoItem icon={<Phone className="h-4 w-4" />} label="Manager Phone" value={condo.manager_phone} />}
            </div>
            {condo.common_services && (
              <>
                <Separator className="my-4" />
                <div className="flex items-start gap-2">
                  <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Common Services</p>
                    <p className="text-sm whitespace-pre-wrap">{condo.common_services}</p>
                  </div>
                </div>
              </>
            )}
            {condo.notes && (
              <>
                <Separator className="my-4" />
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{condo.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Buildings list */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5" />Buildings
              </CardTitle>
              <CardDescription>{buildings.length} building(s) in this condominium</CardDescription>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={openLinkDialog}>
                Link Building
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {buildings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No buildings linked yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {buildings.map((b) => (
                  <Card key={b.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/buildings/${b.id}`)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-secondary p-2">
                          <Building2 className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{[b.address, b.city].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Home className="h-3 w-3" />{b.units_count}
                        </Badge>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleUnlinkBuilding(b.id); }}>
                            Unlink
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Condominium</DialogTitle>
            <DialogDescription>Update the condominium details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={fName} onChange={(e) => setFName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Address *</Label><Input value={fAddress} onChange={(e) => setFAddress(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={fCity} onChange={(e) => setFCity(e.target.value)} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={fState} onChange={(e) => setFState(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>ZIP Code</Label><Input value={fZip} onChange={(e) => setFZip(e.target.value)} /></div>
              <div className="space-y-2"><Label>Identifier Code</Label><Input value={fCode} onChange={(e) => setFCode(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Fiscal Code</Label><Input value={fFiscal} onChange={(e) => setFFiscal(e.target.value)} /></div>
            <Separator />
            <div className="space-y-2"><Label>Manager Name</Label><Input value={fManager} onChange={(e) => setFManager(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Manager Email</Label><Input type="email" value={fManagerEmail} onChange={(e) => setFManagerEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Manager Phone</Label><Input value={fManagerPhone} onChange={(e) => setFManagerPhone(e.target.value)} /></div>
            </div>
            <Separator />
            <div className="space-y-2"><Label>Common Services</Label><Textarea value={fServices} onChange={(e) => setFServices(e.target.value)} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Building Dialog */}
      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a Building</DialogTitle>
            <DialogDescription>Select an unlinked building to associate with this condominium.</DialogDescription>
          </DialogHeader>
          {availableBuildings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No unlinked buildings available.</p>
          ) : (
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
              <SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger>
              <SelectContent>
                {availableBuildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} — {b.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkBuilding} disabled={!selectedBuildingId}>Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
