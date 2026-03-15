import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Home,
  Calendar,
  StickyNote,
  Loader2,
  Pencil,
  UserCog,
  Landmark,
  FileText,
  Scale,
} from 'lucide-react';

interface BuildingData {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  year_of_construction: number | null;
  notes: string | null;
  admin_name: string | null;
  fiscal_code: string | null;
  bank_details: Record<string, string> | null;
  contract_info: string | null;
  legal_notes: string | null;
  image_url: string | null;
  condominium_id: string | null;
  created_at: string;
}

type EditSection = 'general' | 'admin' | null;

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [condominiumName, setCondominiumName] = useState<string | null>(null);
  const [unitsCount, setUnitsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General form
  const [gName, setGName] = useState('');
  const [gAddress, setGAddress] = useState('');
  const [gCity, setGCity] = useState('');
  const [gState, setGState] = useState('');
  const [gZip, setGZip] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gYear, setGYear] = useState('');
  const [gNotes, setGNotes] = useState('');

  // Admin form
  const [aAdminName, setAAdminName] = useState('');
  const [aFiscalCode, setAFiscalCode] = useState('');
  const [aIban, setAIban] = useState('');
  const [aBankName, setABankName] = useState('');
  const [aAccountHolder, setAAccountHolder] = useState('');
  const [aPaymentRef, setAPaymentRef] = useState('');
  const [aContractInfo, setAContractInfo] = useState('');
  const [aLegalNotes, setALegalNotes] = useState('');

  useEffect(() => {
    if (id) fetchBuilding();
  }, [id]);

  const fetchBuilding = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*, condominiums(name)')
        .eq('id', id!)
        .single();

      if (error) throw error;

      const bank = (data.bank_details ?? {}) as Record<string, string>;
      const b: BuildingData = { ...data, bank_details: bank } as BuildingData;
      setBuilding(b);
      setCondominiumName((data as any).condominiums?.name || null);

      const { count } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', id!);
      setUnitsCount(count || 0);
    } catch (error) {
      console.error('Error fetching building:', error);
      toast.error('Failed to load building');
      navigate('/buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (section: EditSection) => {
    if (!building) return;
    if (section === 'general') {
      setGName(building.name);
      setGAddress(building.address);
      setGCity(building.city || '');
      setGState(building.state || '');
      setGZip(building.zip_code || '');
      setGPhone(building.phone || '');
      setGEmail(building.email || '');
      setGYear(building.year_of_construction?.toString() || '');
      setGNotes(building.notes || '');
    } else if (section === 'admin') {
      const bank = building.bank_details || {};
      setAAdminName(building.admin_name || '');
      setAFiscalCode(building.fiscal_code || '');
      setAIban(bank.iban || '');
      setABankName(bank.bank_name || '');
      setAAccountHolder(bank.account_holder || '');
      setAPaymentRef(bank.payment_reference || '');
      setAContractInfo(building.contract_info || '');
      setALegalNotes(building.legal_notes || '');
    }
    setEditSection(section);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      let updateData: Record<string, unknown> = {};

      if (editSection === 'general') {
        updateData = {
          name: gName,
          address: gAddress,
          city: gCity || null,
          state: gState || null,
          zip_code: gZip || null,
          phone: gPhone || null,
          email: gEmail || null,
          year_of_construction: gYear ? parseInt(gYear) : null,
          notes: gNotes || null,
        };
      } else if (editSection === 'admin') {
        updateData = {
          admin_name: aAdminName || null,
          fiscal_code: aFiscalCode || null,
          bank_details: {
            iban: aIban || '',
            bank_name: aBankName || '',
            account_holder: aAccountHolder || '',
            payment_reference: aPaymentRef || '',
          },
          contract_info: aContractInfo || null,
          legal_notes: aLegalNotes || null,
        };
      }

      const { error } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', id!);

      if (error) throw error;

      toast.success('Building updated successfully');
      setEditSection(null);
      fetchBuilding();
    } catch (error: any) {
      console.error('Error updating building:', error);
      toast.error(error.message || 'Failed to update building');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Building Details">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!building) return null;

  const bank = building.bank_details || {};
  const fullAddress = [building.address, building.city, building.state, building.zip_code]
    .filter(Boolean)
    .join(', ');

  return (
    <AppLayout title="Building Details" description={building.name}>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/buildings')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Buildings
        </Button>

        {/* ─── General Information ─── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{building.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {fullAddress}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => openEdit('general')} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem icon={<Home className="h-4 w-4" />} label="Units" value={`${unitsCount} units`} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Year of Construction" value={building.year_of_construction?.toString() || '—'} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={building.phone || '—'} />
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={building.email || '—'} />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="ZIP Code" value={building.zip_code || '—'} />
            </div>
            {building.notes && (
              <>
                <Separator className="my-4" />
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{building.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Administrative Information ─── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-secondary p-3">
                <UserCog className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Administrative Information</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Administration, fiscal &amp; banking details
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => openEdit('admin')} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Administrator */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                Administrator
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label="Administrator Name" value={building.admin_name || '—'} />
                <InfoItem label="Fiscal Code" value={building.fiscal_code || '—'} />
              </div>
            </div>

            <Separator />

            {/* Bank Information */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                Bank Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label="IBAN" value={bank.iban || '—'} />
                <InfoItem label="Bank Name" value={bank.bank_name || '—'} />
                <InfoItem label="Account Holder" value={bank.account_holder || '—'} />
                <InfoItem label="Payment Reference" value={bank.payment_reference || '—'} />
              </div>
            </div>

            <Separator />

            {/* Contractual & Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Contractual &amp; Legal
              </h4>
              <div className="grid gap-4 sm:grid-cols-1">
                <InfoItem icon={<FileText className="h-4 w-4" />} label="Contract Info" value={building.contract_info || '—'} multiline />
                <InfoItem icon={<Scale className="h-4 w-4" />} label="Legal Notes" value={building.legal_notes || '—'} multiline />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editSection !== null} onOpenChange={(open) => { if (!open) setEditSection(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSection === 'general' ? 'Edit General Information' : 'Edit Administrative Information'}
            </DialogTitle>
            <DialogDescription>
              Update the fields below and save your changes.
            </DialogDescription>
          </DialogHeader>

          {editSection === 'general' && (
            <div className="grid gap-4 py-2">
              <Field label="Building Name *" value={gName} onChange={setGName} />
              <Field label="Address *" value={gAddress} onChange={setGAddress} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" value={gCity} onChange={setGCity} />
                <Field label="State" value={gState} onChange={setGState} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ZIP Code" value={gZip} onChange={setGZip} />
                <Field label="Year of Construction" value={gYear} onChange={setGYear} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone" value={gPhone} onChange={setGPhone} />
                <Field label="Email" value={gEmail} onChange={setGEmail} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={gNotes} onChange={(e) => setGNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          {editSection === 'admin' && (
            <div className="grid gap-4 py-2">
              <Field label="Administrator Name" value={aAdminName} onChange={setAAdminName} />
              <Field label="Fiscal Code" value={aFiscalCode} onChange={setAFiscalCode} />
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Bank Details</p>
              <Field label="IBAN" value={aIban} onChange={setAIban} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bank Name" value={aBankName} onChange={setABankName} />
                <Field label="Account Holder" value={aAccountHolder} onChange={setAAccountHolder} />
              </div>
              <Field label="Payment Reference Notes" value={aPaymentRef} onChange={setAPaymentRef} />
              <Separator />
              <div className="space-y-2">
                <Label>Contract Info</Label>
                <Textarea value={aContractInfo} onChange={(e) => setAContractInfo(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Legal Notes</Label>
                <Textarea value={aLegalNotes} onChange={(e) => setALegalNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSection(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

/* ─── Reusable sub-components ─── */

function InfoItem({ icon, label, value, multiline }: { icon?: React.ReactNode; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${value === '—' ? 'text-muted-foreground/60' : ''} ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
