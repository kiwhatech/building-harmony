export type UnifiedRequestType = 'quotation' | 'intervention';

export type UnifiedRequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'quoted'
  | 'waiting_approval'
  | 'intervention'
  | 'completed'
  | 'rejected';

export type MaintenanceCategory = 'plumbing' | 'electrical' | 'construction' | 'general';

export interface UnifiedRequest {
  id: string;
  building_id: string;
  unit_id: string;
  created_by: string;
  request_type: UnifiedRequestType;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: number;
  status: UnifiedRequestStatus;
  estimated_amount: number | null;
  provider: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  attachment_urls: string[];
  completed_at: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnifiedRequestWithRelations extends UnifiedRequest {
  buildings?: { name: string };
  units?: { unit_number: string };
  created_by_profile?: { full_name: string | null; email: string };
  assigned_to_profile?: { full_name: string | null };
}

export const REQUEST_STATUSES: { value: UnifiedRequestStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In Review' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'waiting_approval', label: 'Waiting Approval' },
  { value: 'intervention', label: 'Intervention' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export const REQUEST_TYPES: { value: UnifiedRequestType; label: string; description: string }[] = [
  { value: 'quotation', label: 'Quotation Only', description: 'Request a cost estimate before any work begins' },
  { value: 'intervention', label: 'Immediate Intervention', description: 'Request direct maintenance action' },
];

export const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'construction', label: 'Structural' },
  { value: 'general', label: 'General' },
];

export const PRIORITIES: { value: number; label: string }[] = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
];
