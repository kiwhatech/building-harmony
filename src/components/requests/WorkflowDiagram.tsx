import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowRight, Circle, CheckCircle2, Clock, XCircle, AlertTriangle,
  FileText, Eye, Send, DollarSign, Wrench, CreditCard, Filter, X,
} from 'lucide-react';
import type { UnifiedRequestStatus, UnifiedRequestType } from '@/types/requests';

/* ─── Status metadata ─── */
interface StepMeta {
  label: string;
  description: string;
  approver: string;
  transitions: { to: UnifiedRequestStatus; label: string }[];
  icon: React.ReactNode;
  colorClass: string;        // semantic token-based
  legendGroup: 'initial' | 'active' | 'approval' | 'final' | 'blocked';
}

const STEPS: Record<UnifiedRequestStatus, StepMeta> = {
  draft: {
    label: 'Draft',
    description: 'Request has been created but not yet submitted. The resident can still edit all fields.',
    approver: 'Resident (creator)',
    transitions: [{ to: 'submitted', label: 'Submit' }],
    icon: <FileText className="h-5 w-5" />,
    colorClass: 'bg-muted text-muted-foreground border-border',
    legendGroup: 'initial',
  },
  submitted: {
    label: 'Submitted',
    description: 'Request has been submitted and is awaiting admin review.',
    approver: 'Admin',
    transitions: [
      { to: 'in_review', label: 'Start Review' },
      { to: 'rejected', label: 'Reject' },
    ],
    icon: <Send className="h-5 w-5" />,
    colorClass: 'bg-info/15 text-info border-info/30',
    legendGroup: 'active',
  },
  in_review: {
    label: 'In Review',
    description: 'An admin is reviewing the request and may assign a provider or request a quotation.',
    approver: 'Admin',
    transitions: [
      { to: 'quoted', label: 'Send Quotation' },
      { to: 'intervention', label: 'Convert to Intervention' },
      { to: 'rejected', label: 'Reject' },
    ],
    icon: <Eye className="h-5 w-5" />,
    colorClass: 'bg-info/15 text-info border-info/30',
    legendGroup: 'active',
  },
  quoted: {
    label: 'Quoted',
    description: 'A cost quotation has been prepared and sent to the resident for review.',
    approver: 'Admin → Resident',
    transitions: [{ to: 'waiting_approval', label: 'Await Approval' }],
    icon: <DollarSign className="h-5 w-5" />,
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    legendGroup: 'approval',
  },
  waiting_approval: {
    label: 'Waiting Approval',
    description: 'The resident must approve or reject the proposed quotation before work can begin.',
    approver: 'Resident',
    transitions: [
      { to: 'intervention', label: 'Approve → Schedule' },
      { to: 'rejected', label: 'Reject' },
    ],
    icon: <Clock className="h-5 w-5" />,
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    legendGroup: 'approval',
  },
  intervention: {
    label: 'Intervention',
    description: 'Work is scheduled or in progress. Admin must set a date/time for the intervention.',
    approver: 'Admin / Provider',
    transitions: [{ to: 'ready_for_payment', label: 'Complete Work' }],
    icon: <Wrench className="h-5 w-5" />,
    colorClass: 'bg-primary/15 text-primary border-primary/30',
    legendGroup: 'active',
  },
  ready_for_payment: {
    label: 'Ready for Payment',
    description: 'Work is done. The request awaits payment confirmation before it can be marked complete.',
    approver: 'Resident / Admin',
    transitions: [{ to: 'completed', label: 'Confirm Payment' }],
    icon: <CreditCard className="h-5 w-5" />,
    colorClass: 'bg-warning/15 text-warning border-warning/30',
    legendGroup: 'approval',
  },
  completed: {
    label: 'Completed',
    description: 'The request has been fully resolved and payment confirmed.',
    approver: '—',
    transitions: [],
    icon: <CheckCircle2 className="h-5 w-5" />,
    colorClass: 'bg-success/15 text-success border-success/30',
    legendGroup: 'final',
  },
  rejected: {
    label: 'Rejected',
    description: 'The request was rejected by an admin or the resident declined the quotation.',
    approver: '—',
    transitions: [],
    icon: <XCircle className="h-5 w-5" />,
    colorClass: 'bg-destructive/15 text-destructive border-destructive/30',
    legendGroup: 'blocked',
  },
};

const MAIN_FLOW: UnifiedRequestStatus[] = [
  'draft', 'submitted', 'in_review', 'quoted', 'waiting_approval', 'intervention', 'ready_for_payment', 'completed',
];

const LEGEND: { group: string; color: string; label: string }[] = [
  { group: 'initial', color: 'bg-muted', label: 'Initial / Draft' },
  { group: 'active', color: 'bg-info/20', label: 'Active / In Progress' },
  { group: 'approval', color: 'bg-warning/20', label: 'Pending Approval / Payment' },
  { group: 'final', color: 'bg-success/20', label: 'Completed' },
  { group: 'blocked', color: 'bg-destructive/20', label: 'Rejected / Blocked' },
];

/* ─── Props ─── */
interface Props {
  requests: {
    id: string;
    status: UnifiedRequestStatus;
    request_type: UnifiedRequestType;
    building_id: string;
    created_at: string;
  }[];
  buildings: { id: string; name: string }[];
}

export function WorkflowDiagram({ requests, buildings }: Props) {
  const [selectedStep, setSelectedStep] = useState<UnifiedRequestStatus | null>(null);
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterType, setFilterType] = useState<'all' | UnifiedRequestType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Count requests per status
  const statusCounts = useMemo(() => {
    const filtered = requests.filter((r) => {
      if (filterBuilding !== 'all' && r.building_id !== filterBuilding) return false;
      if (filterType !== 'all' && r.request_type !== filterType) return false;
      return true;
    });
    const counts: Partial<Record<UnifiedRequestStatus, number>> = {};
    filtered.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests, filterBuilding, filterType]);

  const step = selectedStep ? STEPS[selectedStep] : null;
  const hasFilters = filterBuilding !== 'all' || filterType !== 'all';

  return (
    <>
      {/* Header & filter controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Request Lifecycle</h3>
          <Badge variant="secondary" className="text-xs">{requests.length} total</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3 mr-1" /> Filters
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterBuilding('all'); setFilterType('all'); }}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="All Buildings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="quotation">Quotation</SelectItem>
              <SelectItem value="intervention">Intervention</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ─── Flow Diagram ─── */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max">
          {MAIN_FLOW.map((status, i) => {
            const s = STEPS[status];
            const count = statusCounts[status] || 0;
            const isLast = i === MAIN_FLOW.length - 1;
            return (
              <div key={status} className="flex items-center">
                {/* Node */}
                <button
                  onClick={() => setSelectedStep(status)}
                  className={`
                    relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3
                    transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer
                    min-w-[100px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                    ${s.colorClass}
                    ${selectedStep === status ? 'ring-2 ring-ring shadow-md scale-105' : ''}
                  `}
                >
                  {s.icon}
                  <span className="text-[11px] font-semibold leading-tight text-center">{s.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[18px] px-1">
                      {count}
                    </Badge>
                  )}
                </button>

                {/* Arrow */}
                {!isLast && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Rejected branch indicator */}
        <div className="flex items-center gap-2 mt-3 ml-[110px]">
          <div className="h-px w-8 bg-destructive/40" />
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span className="text-[10px] text-destructive font-medium">
            Can be rejected from: Submitted, In Review, Waiting Approval
          </span>
        </div>
      </div>

      {/* ─── Legend ─── */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
        {LEGEND.map((l) => (
          <div key={l.group} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm ${l.color}`} />
            <span className="text-[11px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ─── Step Detail Modal ─── */}
      <Dialog open={!!selectedStep} onOpenChange={(open) => !open && setSelectedStep(null)}>
        <DialogContent className="sm:max-w-lg">
          {step && selectedStep && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`rounded-lg p-1.5 ${step.colorClass}`}>{step.icon}</span>
                  {step.label}
                  {(statusCounts[selectedStep] || 0) > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {statusCounts[selectedStep]} request{(statusCounts[selectedStep] || 0) !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>{step.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Approver */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Responsible</span>
                    <span className="font-medium">{step.approver}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Count</span>
                    <span className="font-medium">{statusCounts[selectedStep] || 0}</span>
                  </div>
                </div>

                {/* Transitions */}
                {step.transitions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Possible Transitions</h4>
                    <div className="grid gap-2">
                      {step.transitions.map((t) => {
                        const target = STEPS[t.to];
                        return (
                          <button
                            key={t.to}
                            onClick={() => setSelectedStep(t.to)}
                            className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                          >
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{t.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">→ {target.label}</span>
                            </div>
                            <span className={`rounded-md p-1 ${target.colorClass}`}>{target.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step.transitions.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    This is a terminal state — no further transitions.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
