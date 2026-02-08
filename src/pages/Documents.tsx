import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Loader2,
  Search,
  Upload,
  Download,
  Share2,
  Trash2,
  Building2,
  Shield,
  Home,
  Calendar,
  Filter,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  File,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

type DocumentCategory = 'building' | 'insurance' | 'unit';
type DocumentStatus = 'active' | 'expired' | 'expiring_soon' | 'archived';

interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  building_id: string | null;
  unit_id: string | null;
  expires_at: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  building_name?: string;
  unit_number?: string;
  uploaded_by_name?: string;
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

const categoryConfig: Record<DocumentCategory, { label: string; icon: typeof FileText; description: string }> = {
  building: { label: 'Building Documents', icon: Building2, description: 'Certifications, fire safety, regulations' },
  insurance: { label: 'Insurances', icon: Shield, description: 'Policies, liability, coverage details' },
  unit: { label: 'My Unit Documents', icon: Home, description: 'Contracts, deeds, inspections, manuals' },
};

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  expiring_soon: { label: 'Expiring Soon', color: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Clock },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground border-muted', icon: File },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function computeStatus(doc: { status: DocumentStatus; expires_at: string | null }): DocumentStatus {
  if (doc.status === 'archived') return 'archived';
  if (!doc.expires_at) return 'active';
  const daysLeft = differenceInDays(parseISO(doc.expires_at), new Date());
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring_soon';
  return 'active';
}

export default function Documents() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentCategory>('building');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<DocumentCategory>('building');
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Detail
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [buildingsRes, unitsRes, docsRes] = await Promise.all([
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('units').select('id, unit_number, building_id').order('unit_number'),
        supabase.from('documents').select('*').order('created_at', { ascending: false }),
      ]);

      if (buildingsRes.error) throw buildingsRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (docsRes.error) throw docsRes.error;

      setBuildings(buildingsRes.data || []);
      setUnits(unitsRes.data || []);

      // Enrich with building/unit names and profile names
      const buildingsMap = Object.fromEntries((buildingsRes.data || []).map(b => [b.id, b.name]));
      const unitsMap = Object.fromEntries((unitsRes.data || []).map(u => [u.id, u.unit_number]));

      const uploaderIds = [...new Set((docsRes.data || []).map(d => d.uploaded_by))];
      let profilesMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uploaderIds);
        profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || 'Unknown']));
      }

      setDocuments(
        (docsRes.data || []).map((doc: any) => {
          const computed = computeStatus(doc);
          return {
            ...doc,
            status: computed,
            building_name: doc.building_id ? buildingsMap[doc.building_id] : undefined,
            unit_number: doc.unit_id ? unitsMap[doc.unit_id] : undefined,
            uploaded_by_name: profilesMap[doc.uploaded_by] || 'Unknown',
          };
        })
      );
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('building');
    setFormBuildingId('');
    setFormUnitId('');
    setFormExpiresAt('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !formBuildingId) return;

    setIsSubmitting(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('documents').insert({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        file_url: filePath,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        building_id: formBuildingId,
        unit_id: formCategory === 'unit' && formUnitId ? formUnitId : null,
        expires_at: formExpiresAt || null,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.file_url);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast.error('Failed to download document');
    }
  };

  const handleShare = async (doc: DocumentItem) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 3600);
      if (error) throw error;
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success('Share link copied to clipboard (valid for 1 hour)');
    } catch {
      toast.error('Failed to generate share link');
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await supabase.storage.from('documents').remove([doc.file_url]);
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      toast.success('Document deleted');
      setIsDetailOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete document');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBuildingFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || buildingFilter !== 'all';

  const filteredDocs = documents.filter(doc => {
    if (doc.category !== activeTab) return false;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesBuilding = buildingFilter === 'all' || doc.building_id === buildingFilter;
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  const expiringDocs = documents.filter(d => d.status === 'expiring_soon' || d.status === 'expired');

  const filteredUnitsForForm = formBuildingId ? units.filter(u => u.building_id === formBuildingId) : [];

  return (
    <AppLayout title="Documents" description="Manage building, insurance, and unit documents">
      <div className="space-y-6">
        {/* Expiry Alerts */}
        {expiringDocs.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Document Alerts</p>
                <p className="text-sm text-muted-foreground">
                  {expiringDocs.filter(d => d.status === 'expired').length > 0 &&
                    `${expiringDocs.filter(d => d.status === 'expired').length} expired. `}
                  {expiringDocs.filter(d => d.status === 'expiring_soon').length > 0 &&
                    `${expiringDocs.filter(d => d.status === 'expiring_soon').length} expiring within 30 days.`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters & Upload */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:w-64"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleUpload}>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>Add a new document to the system.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formCategory} onValueChange={(v) => setFormCategory(v as DocumentCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="building">Building Document</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="unit">Unit Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Document title" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Building *</Label>
                      <Select value={formBuildingId} onValueChange={setFormBuildingId}>
                        <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                        <SelectContent>
                          {buildings.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formCategory === 'unit' && (
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select value={formUnitId} onValueChange={setFormUnitId} disabled={!formBuildingId}>
                          <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                          <SelectContent>
                            {filteredUnitsForForm.map(u => (
                              <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>File *</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || !formTitle || !formBuildingId || !selectedFile}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter row */}
        {showFilters && (
          <Card>
            <CardContent className="flex flex-wrap gap-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Building</Label>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentCategory)}>
          <TabsList className="grid w-full grid-cols-3">
            {(Object.entries(categoryConfig) as [DocumentCategory, typeof categoryConfig.building][]).map(([key, config]) => {
              const count = documents.filter(d => d.category === key).length;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <config.icon className="h-4 w-4 hidden sm:block" />
                  <span className="truncate">{config.label}</span>
                  {count > 0 && <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['building', 'insurance', 'unit'] as DocumentCategory[]).map(cat => (
            <TabsContent key={cat} value={cat}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDocs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="font-medium">No documents found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasActiveFilters ? 'Try adjusting your filters.' : `Upload your first ${categoryConfig[cat].label.toLowerCase()}.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredDocs.map(doc => {
                    const st = statusConfig[doc.status];
                    return (
                      <Card
                        key={doc.id}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => { setSelectedDoc(doc); setIsDetailOpen(true); }}
                      >
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{doc.title}</p>
                              <Badge variant="outline" className={`shrink-0 text-xs ${st.color}`}>
                                {st.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{doc.file_name}</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              {doc.building_name && <span>{doc.building_name}</span>}
                              {doc.unit_number && <span>Unit {doc.unit_number}</span>}
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleShare(doc); }}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            {selectedDoc && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedDoc.title}</SheetTitle>
                  <SheetDescription>{selectedDoc.file_name}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="outline" className={statusConfig[selectedDoc.status].color}>
                      {statusConfig[selectedDoc.status].label}
                    </Badge>
                    <Badge variant="secondary">{categoryConfig[selectedDoc.category].label}</Badge>
                  </div>

                  {selectedDoc.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedDoc.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Building</p>
                      <p className="font-medium">{selectedDoc.building_name || '—'}</p>
                    </div>
                    {selectedDoc.unit_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Unit</p>
                        <p className="font-medium">Unit {selectedDoc.unit_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">File Size</p>
                      <p className="font-medium">{formatFileSize(selectedDoc.file_size)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium">{selectedDoc.file_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Uploaded</p>
                      <p className="font-medium">{format(new Date(selectedDoc.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Uploaded By</p>
                      <p className="font-medium">{selectedDoc.uploaded_by_name}</p>
                    </div>
                    {selectedDoc.expires_at && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Expires</p>
                        <p className="font-medium">{format(parseISO(selectedDoc.expires_at), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <Button onClick={() => handleDownload(selectedDoc)} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" onClick={() => handleShare(selectedDoc)} className="w-full">
                      <Share2 className="mr-2 h-4 w-4" />
                      Copy Share Link
                    </Button>
                    {(isAdmin || selectedDoc.uploaded_by === user?.id) && (
                      <Button variant="destructive" onClick={() => handleDelete(selectedDoc)} className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
