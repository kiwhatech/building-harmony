import { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Loader2,
  Home,
  Users,
  Car,
  TreePine,
  Droplets,
  Zap,
  Wind,
  Hammer,
  Wrench,
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
  Phone,
  History,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  DoorOpen,
  ShieldAlert,
  Thermometer,
  Plug,
  PaintBucket,
  Lock,
  Building2,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Schema ───
const maintenanceSchema = z.object({
  buildingId: z.string().min(1, 'Building is required'),
  unitId: z.string().min(1, 'Unit is required'),
  location: z.enum(['private_unit', 'common_area', 'garage', 'exterior']),
  category: z.enum(['plumbing', 'electrical', 'construction', 'general']),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.number().min(1).max(4),
  accessInstructions: z.string().optional(),
});

type FormData = z.infer<typeof maintenanceSchema>;

// ─── Config Maps ───
const locationOptions = [
  { value: 'private_unit' as const, label: 'Private Unit', icon: Home, description: 'Inside your apartment' },
  { value: 'common_area' as const, label: 'Common Area', icon: Users, description: 'Hallways, lobby, stairs' },
  { value: 'garage' as const, label: 'Garage', icon: Car, description: 'Parking & storage' },
  { value: 'exterior' as const, label: 'Exterior', icon: TreePine, description: 'Garden, facade, roof' },
];

const categoryOptions = [
  { value: 'plumbing' as const, label: 'Plumbing', icon: Droplets, description: 'Water, pipes, drains' },
  { value: 'electrical' as const, label: 'Electrical', icon: Zap, description: 'Wiring, lights, power' },
  { value: 'construction' as const, label: 'Structural', icon: Hammer, description: 'Walls, floors, doors' },
  { value: 'general' as const, label: 'General', icon: Wrench, description: 'Other maintenance' },
];

const categorySuggestions: Record<string, { label: string; icon: typeof Lightbulb }[]> = {
  plumbing: [
    { label: 'Leaking faucet', icon: Droplets },
    { label: 'Clogged drain', icon: Droplets },
    { label: 'Running toilet', icon: Droplets },
    { label: 'Low water pressure', icon: Droplets },
  ],
  electrical: [
    { label: 'Light bulb', icon: Lightbulb },
    { label: 'Intercom', icon: Phone },
    { label: 'Gate', icon: DoorOpen },
    { label: 'Power outlet', icon: Plug },
  ],
  construction: [
    { label: 'Wall crack', icon: Hammer },
    { label: 'Door repair', icon: DoorOpen },
    { label: 'Paint peeling', icon: PaintBucket },
    { label: 'Window issue', icon: Hammer },
  ],
  general: [
    { label: 'Lock issue', icon: Lock },
    { label: 'Pest control', icon: ShieldAlert },
    { label: 'Heating/AC', icon: Thermometer },
    { label: 'Cleaning', icon: Wind },
  ],
};

const priorityOptions = [
  { value: 1, label: 'Low', color: 'border-muted-foreground/30 text-muted-foreground', description: 'Can wait a few days' },
  { value: 2, label: 'Medium', color: 'border-info text-info', description: 'Should be addressed soon' },
  { value: 3, label: 'High', color: 'border-warning text-warning', description: 'Needs prompt attention' },
  { value: 4, label: 'Critical', color: 'border-destructive text-destructive', description: 'Emergency situation' },
];

interface Building { id: string; name: string; }
interface Unit { id: string; unit_number: string; building_id: string; }
interface HistoryItem { id: string; title: string; status: string; created_at: string; category: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: Building[];
  units: Unit[];
  onSuccess: () => void;
}

export function MaintenanceRequestWizard({ open, onOpenChange, buildings, units, onSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCriticalWarning, setShowCriticalWarning] = useState(false);
  const [unitHistory, setUnitHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState<Partial<FormData>>({
    location: undefined,
    category: undefined,
    priority: 2,
    title: '',
    description: '',
    buildingId: '',
    unitId: '',
    accessInstructions: '',
  });

  const filteredUnits = units.filter(u => u.building_id === form.buildingId);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm({ location: undefined, category: undefined, priority: 2, title: '', description: '', buildingId: '', unitId: '', accessInstructions: '' });
      setErrors({});
      setAttachments([]);
      setPreviews([]);
      setUnitHistory([]);
      setShowHistory(false);
    }
  }, [open]);

  // Fetch unit history when unit changes
  useEffect(() => {
    if (form.unitId) {
      fetchUnitHistory(form.unitId);
    } else {
      setUnitHistory([]);
    }
  }, [form.unitId]);

  const fetchUnitHistory = async (unitId: string) => {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('id, title, status, created_at, category')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(5);
    setUnitHistory(data || []);
  };

  const updateForm = (patch: Partial<FormData>) => {
    setForm(prev => ({ ...prev, ...patch }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(patch).forEach(k => delete clearedErrors[k]);
    setErrors(clearedErrors);
  };

  // ── File handling ──
  const addFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length + attachments.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setAttachments(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [attachments]);

  // ── Suggestion chip click ──
  const applySuggestion = (label: string) => {
    updateForm({ title: label, description: form.description || '' });
  };

  // ── Step validation ──
  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.buildingId) errs.buildingId = 'Required';
      if (!form.unitId) errs.unitId = 'Required';
      if (!form.location) errs.location = 'Select a location';
      if (!form.category) errs.category = 'Select a category';
    }
    if (s === 1) {
      if (!form.title || form.title.length < 3) errs.title = 'Title must be at least 3 characters';
      if (!form.description || form.description.length < 10) errs.description = 'Description must be at least 10 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === 2 && form.priority === 4) {
      setShowCriticalWarning(true);
      return;
    }
    if (step < 2) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!user || !form.unitId) return;
    setIsSubmitting(true);
    try {
      // Validate full form
      const parsed = maintenanceSchema.parse(form);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      let adminEmails: string[] = [];
      if (adminRoles && adminRoles.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', adminRoles.map(r => r.user_id));
        adminEmails = (adminProfiles || []).map(p => p.email).filter(Boolean);
      }

      const selectedUnit = units.find(u => u.id === parsed.unitId);
      const selectedBuilding = buildings.find(b => b.id === parsed.buildingId);
      const priorityLabel = priorityOptions.find(p => p.value === parsed.priority)?.label || 'Medium';

      const { data: insertedRequest, error } = await supabase
        .from('maintenance_requests')
        .insert({
          unit_id: parsed.unitId,
          title: parsed.title.trim(),
          description: `[${locationOptions.find(l => l.value === parsed.location)?.label}] ${parsed.description.trim()}${parsed.accessInstructions ? `\n\nAccess: ${parsed.accessInstructions}` : ''}`,
          category: parsed.category,
          priority: parsed.priority,
          requested_by: user.id,
          status: 'requested',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      if (adminEmails.length > 0) {
        try {
          await supabase.functions.invoke('send-maintenance-notification', {
            body: {
              requestId: insertedRequest.id,
              requesterName: profileData?.full_name || user.email || 'Unknown',
              requesterEmail: profileData?.email || user.email || '',
              buildingName: selectedBuilding?.name || 'Unknown Building',
              unitNumber: selectedUnit?.unit_number || 'Unknown',
              title: parsed.title.trim(),
              description: parsed.description.trim(),
              priority: priorityLabel,
              createdAt: insertedRequest.created_at,
              appUrl: window.location.origin,
              adminEmails,
            },
          });
        } catch (emailErr) {
          console.error('Email notification failed:', emailErr);
        }
      }

      toast.success('Request submitted successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errs: Record<string, string> = {};
        error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
        setErrors(errs);
        toast.error('Please fix validation errors');
      } else {
        toast.error(error.message || 'Failed to create request');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabels: Record<string, string> = {
    requested: 'Open', under_review: 'Review', approved: 'Approved',
    in_progress: 'In Progress', completed: 'Done', paid: 'Closed',
  };

  const steps = ['Location & Category', 'Details & Photos', 'Priority & Submit'];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
            <DialogDescription>
              Step {step + 1} of 3 — {steps[step]}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {/* ═══ STEP 0: Location & Category ═══ */}
          {step === 0 && (
            <div className="space-y-6 py-2">
              {/* Building & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Building *</Label>
                  <Select value={form.buildingId} onValueChange={v => updateForm({ buildingId: v, unitId: '' })}>
                    <SelectTrigger className={errors.buildingId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.buildingId && <p className="text-xs text-destructive">{errors.buildingId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Select value={form.unitId} onValueChange={v => updateForm({ unitId: v })} disabled={!form.buildingId}>
                    <SelectTrigger className={errors.unitId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={form.buildingId ? 'Select unit' : 'Select building first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.unitId && <p className="text-xs text-destructive">{errors.unitId}</p>}
                </div>
              </div>

              {/* Unit History Button */}
              {form.unitId && unitHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="w-full">
                  <History className="mr-2 h-4 w-4" />
                  {showHistory ? 'Hide' : 'Show'} Previous Requests ({unitHistory.length})
                </Button>
              )}
              {showHistory && unitHistory.length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent requests for this unit:</p>
                  {unitHistory.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{h.title}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs">{statusLabels[h.status] || h.status}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'MMM d')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Location */}
              <div className="space-y-2">
                <Label>Location *</Label>
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                <div className="grid grid-cols-2 gap-3">
                  {locationOptions.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.location === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateForm({ location: opt.value })}
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className={`rounded-lg p-2 ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
                <div className="grid grid-cols-2 gap-3">
                  {categoryOptions.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateForm({ category: opt.value })}
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm ${
                          selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className={`rounded-lg p-2 ${selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Description & Photos ═══ */}
          {step === 1 && (
            <div className="space-y-6 py-2">
              {/* Common issue suggestions */}
              {form.category && categorySuggestions[form.category] && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Common issues — click to autofill</Label>
                  <div className="flex flex-wrap gap-2">
                    {categorySuggestions[form.category].map(sug => (
                      <button
                        key={sug.label}
                        type="button"
                        onClick={() => applySuggestion(sug.label)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-primary/10 hover:border-primary ${
                          form.title === sug.label ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'
                        }`}
                      >
                        <sug.icon className="h-3 w-3" />
                        {sug.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => updateForm({ title: e.target.value })}
                  placeholder="Brief summary of the issue"
                  className={errors.title ? 'border-destructive' : ''}
                  maxLength={100}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label>Description * <span className="text-muted-foreground font-normal">(min 10 chars)</span></Label>
                <Textarea
                  value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  placeholder="Describe the issue in detail — what, where, when..."
                  rows={4}
                  className={errors.description ? 'border-destructive' : ''}
                  maxLength={1000}
                />
                <div className="flex justify-between">
                  {errors.description ? (
                    <p className="text-xs text-destructive">{errors.description}</p>
                  ) : <span />}
                  <p className="text-xs text-muted-foreground">{form.description?.length || 0}/1000</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={form.accessInstructions}
                  onChange={e => updateForm({ accessInstructions: e.target.value })}
                  placeholder="Key location, entry codes, best time to visit..."
                  maxLength={200}
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photos <span className="text-muted-foreground font-normal">(max 5)</span></Label>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drag & drop images or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB each</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && addFiles(e.target.files)}
                  />
                </div>
                {previews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt={`Attachment ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Priority ═══ */}
          {step === 2 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <div className="grid grid-cols-2 gap-3">
                  {priorityOptions.map(opt => {
                    const selected = form.priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateForm({ priority: opt.value })}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 text-center transition-all ${
                          selected ? opt.color + ' bg-background shadow-sm' : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                        }`}
                      >
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs opacity-80">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Request Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{locationOptions.find(l => l.value === form.location)?.label}</span>
                  <span className="text-muted-foreground">Category:</span>
                  <span>{categoryOptions.find(c => c.value === form.category)?.label}</span>
                  <span className="text-muted-foreground">Title:</span>
                  <span className="truncate">{form.title}</span>
                  <span className="text-muted-foreground">Photos:</span>
                  <span>{attachments.length} attached</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div>
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={goNext} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : step < 2 ? (
                  <>Next<ChevronRight className="ml-1 h-4 w-4" /></>
                ) : (
                  <><Check className="mr-1 h-4 w-4" />Submit Request</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Critical Priority Warning Modal */}
      <Dialog open={showCriticalWarning} onOpenChange={setShowCriticalWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Emergency
            </DialogTitle>
            <DialogDescription>
              For critical emergencies that pose immediate danger, please call the emergency number directly.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-semibold">Emergency Line</p>
                <p className="text-lg font-bold text-destructive">112 / Building Admin</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              If this is not a life-threatening emergency, you can still submit your request as critical priority.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={() => {
                setShowCriticalWarning(false);
                handleSubmit();
              }}
            >
              Submit as Critical Anyway
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCriticalWarning(false);
                updateForm({ priority: 3 });
              }}
            >
              Change to High Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
