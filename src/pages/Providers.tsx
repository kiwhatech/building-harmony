import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, Star, Pencil, Power, Mail, Phone, MapPin } from 'lucide-react';

type ProviderCategory = 'general' | 'plumbing' | 'electrical' | 'structural';

interface Provider {
  id: string;
  name: string;
  category: ProviderCategory;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  rating: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const PROVIDER_CATEGORIES: { value: ProviderCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'structural', label: 'Structural' },
];

const categoryColors: Record<ProviderCategory, string> = {
  general: 'bg-muted text-muted-foreground',
  plumbing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  electrical: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  structural: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

const emptyForm = {
  name: '',
  category: 'general' as ProviderCategory,
  contact_email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Providers() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('providers' as any)
      .select('*')
      .order('name');
    if (error) {
      toast.error('Failed to load providers');
      console.error(error);
    } else {
      setProviders((data as any[]) || []);
    }
    setLoading(false);
  };

  const filtered = providers.filter((p) => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterActive === 'active' && !p.is_active) return false;
    if (filterActive === 'inactive' && p.is_active) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.contact_email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Provider) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      contact_email: p.contact_email || '',
      phone: p.phone || '',
      address: p.address || '',
      notes: p.notes || '',
    });
    setDialogOpen(true);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.contact_email.trim() && !isValidEmail(form.contact_email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      category: form.category,
      contact_email: form.contact_email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('providers' as any).update(payload).eq('id', editingId);
      if (error) toast.error('Failed to update');
      else { toast.success('Provider updated'); setDialogOpen(false); fetchProviders(); }
    } else {
      const { error } = await supabase.from('providers' as any).insert(payload);
      if (error) toast.error('Failed to create');
      else { toast.success('Provider created'); setDialogOpen(false); fetchProviders(); }
    }
    setSaving(false);
  };

  const toggleActive = async (p: Provider) => {
    const { error } = await supabase
      .from('providers' as any)
      .update({ is_active: !p.is_active })
      .eq('id', p.id);
    if (error) toast.error('Failed to update');
    else { toast.success(p.is_active ? 'Provider deactivated' : 'Provider activated'); fetchProviders(); }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">Access restricted to administrators.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Provider Registry</h1>
            <p className="text-muted-foreground">Manage external vendors and service providers</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Provider
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PROVIDER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No providers found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryColors[p.category]}>
                          {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-sm">
                          {p.contact_email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {p.contact_email}
                            </div>
                          )}
                          {p.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {p.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(p.rating)}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'default' : 'secondary'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(p)}>
                            <Power className={`h-4 w-4 ${p.is_active ? 'text-destructive' : 'text-success'}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider name" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProviderCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City" />
            </div>
            <div className="space-y-2">
              <Label>Notes (admin only)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Internal notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
