import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Loader2, Search, AlertTriangle, CheckCircle2, Clock, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { FeePaymentModal } from "@/components/fees/FeePaymentModal";

type PaymentStatus = "pending" | "paid" | "overdue";

interface Fee {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  building_id: string;
  unit_id: string | null;
  building_name?: string;
  unit_number?: string;
}

interface Building {
  id: string;
  name: string;
  bank_details?: Record<string, string> | null;
}

const statusConfig: Record<PaymentStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning" },
  paid: { label: "Paid", icon: CheckCircle2, color: "bg-success/10 text-success" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
};

export default function Fees() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bRes, fRes] = await Promise.all([
        supabase.from("buildings").select("id, name, bank_details").order("name"),
        supabase
          .from("fees")
          .select(`*, buildings!inner(name), units(unit_number)`)
          .order("due_date", { ascending: false }),
      ]);
      if (bRes.error) throw bRes.error;
      if (fRes.error) throw fRes.error;
      setBuildings((bRes.data || []) as any);
      setFees(
        (fRes.data || []).map((fee: any) => ({
          ...fee,
          building_name: fee.buildings?.name,
          unit_number: fee.units?.unit_number,
        })),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load fees");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (feeId: string, newStatus: PaymentStatus) => {
    try {
      const { error } = await supabase.from("fees").update({ status: newStatus }).eq("id", feeId);
      if (error) throw error;
      toast.success("Status updated");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  const handlePayFee = (fee: Fee) => {
    setSelectedFee(fee);
    setPayModalOpen(true);
  };

  const selectedBankDetails = useMemo(() => {
    if (!selectedFee) return null;
    const building = buildings.find((b) => b.id === selectedFee.building_id);
    return (building?.bank_details as Record<string, string>) || null;
  }, [selectedFee, buildings]);

  const filteredFees = useMemo(
    () =>
      fees.filter((fee) => {
        const matchesSearch =
          fee.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fee.building_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fee.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || fee.status === statusFilter;
        const matchesBuilding = buildingFilter === "all" || fee.building_id === buildingFilter;
        return matchesSearch && matchesStatus && matchesBuilding;
      }),
    [fees, searchQuery, statusFilter, buildingFilter],
  );

  const totals = useMemo(
    () => ({
      all: fees.reduce((sum, f) => sum + Number(f.amount), 0),
      pending: fees.filter((f) => f.status === "pending").reduce((sum, f) => sum + Number(f.amount), 0),
      paid: fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + Number(f.amount), 0),
      overdue: fees.filter((f) => f.status === "overdue").reduce((sum, f) => sum + Number(f.amount), 0),
    }),
    [fees],
  );

  return (
    <AppLayout title="Fees" description="Condominium fees generated from building configuration">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-2xl font-bold">
                    {totals.all.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-warning">
                    {totals.pending.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold text-success">
                    {totals.paid.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">
                    {totals.overdue.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search fees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fees Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No fees found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery || statusFilter !== "all" || buildingFilter !== "all"
                  ? "No fees match your filters."
                  : "No fees have been generated yet. Go to Fees Configuration to calculate and save a fee plan."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Building / Unit</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.map((fee) => {
                  const status = statusConfig[fee.status];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{new Date(fee.due_date).getFullYear()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fee.building_name}
                        {fee.unit_number && ` — Unit ${fee.unit_number}`}
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(fee.amount).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(fee.due_date), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={fee.status}
                          onValueChange={(value) => updateStatus(fee.id, value as PaymentStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={status.color} variant="secondary">
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {fee.status !== "paid" && (
                          <Button size="sm" onClick={() => handlePayFee(fee)}>
                            <CreditCard className="mr-1 h-3 w-3" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <FeePaymentModal
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        fee={selectedFee}
        bankDetails={selectedBankDetails}
        onPaymentSubmitted={fetchData}
      />
    </AppLayout>
  );
}
