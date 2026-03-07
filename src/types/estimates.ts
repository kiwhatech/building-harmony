export type EstimateCategory = 'electrical' | 'plumbing' | 'cleaning' | 'other';
export type EstimatePriority = 'low' | 'normal' | 'urgent';
export type EstimateStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';

export interface EstimateRequest {
  id: string;
  building_id: string;
  unit_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: EstimateCategory;
  priority: EstimatePriority;
  estimated_amount: number | null;
  provider: string | null;
  status: EstimateStatus;
  internal_notes: string | null;
  linked_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateWithRelations extends EstimateRequest {
  buildings?: { name: string };
  units?: { unit_number: string };
}

export const ESTIMATE_CATEGORIES: { value: EstimateCategory; label: string }[] = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

export const ESTIMATE_PRIORITIES: { value: EstimatePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
];

export const ESTIMATE_STATUSES: { value: EstimateStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
];
