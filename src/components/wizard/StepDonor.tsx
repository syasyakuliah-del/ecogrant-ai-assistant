import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  Globe,
  Info,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scoreDonor, type DonorRow } from "@/lib/donor-matching";
import { formatCurrency, formatDate } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StepProps } from "./shared";

export function StepDonor({ proposal, save }: StepProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [selectedDonorDetail, setSelectedDonorDetail] = useState<DonorRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["donors-step4"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as DonorRow[];
    },
  });

  const ranked = useMemo(() => {
    const donors = data ?? [];
    return donors
      .map((donor) => ({ donor, match: scoreDonor(donor, proposal) }))
      .filter(({ donor }) => {
        const matchesSearch =
          !search.trim() ||
          [donor.name, donor.category, donor.country].some((f) => (f ?? "").toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === "semua" || donor.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [data, proposal, search, categoryFilter]);

  const categories = Array.from(new Set((data ?? []).map((d) => d.category)));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Memuat data donor dan kalkulasi matching...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="size-4 text-primary" /> Step 4: Pemilihan Lembaga Donor & Matching Engine
          </h3>
          <p className="text-xs text-muted-foreground">
            Sistem mencocokkan tema program, lokasi, tenggat waktu, dan rentang hibah secara otomatis.
          </p>
        </div>
        {proposal.donor_id && (
          <Badge variant="default" className="bg-emerald-600 gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="size-3.5" /> Donor Terpilih
          </Badge>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama lembaga donor, negara, atau kata kunci..."
            className="pl-9 text-xs sm:text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="text-xs sm:text-sm">
            <SelectValue placeholder="Kategori Donor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Donor Match Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {ranked.map(({ donor, match }) => {
          const isSelected = proposal.donor_id === donor.id;
          return (
            <Card
              key={donor.id}
              className={`transition-all ${
                isSelected ? "border-2 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-md" : "hover:border-primary/50"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {donor.name}
                      {isSelected && <Badge className="bg-emerald-600 text-[10px]">TERPILIH</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {donor.category} · {donor.country || "Internasional"}
                    </p>
                  </div>
                  <Badge
                    variant={match.score >= 70 ? "default" : match.score >= 45 ? "secondary" : "outline"}
                    className={`font-mono text-xs ${
                      match.score >= 70 ? "bg-emerald-600" : match.score >= 45 ? "bg-amber-600" : ""
                    }`}
                  >
                    Match {match.score}%
                  </Badge>
                </div>
                <Progress value={match.score} className="mt-2 h-1.5" />
              </CardHeader>

              <CardContent className="space-y-3.5 text-xs">
                <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>Rentang Hibah:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(donor.min_grant, donor.currency)} – {formatCurrency(donor.max_grant, donor.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Tenggat Pengajuan:</span>
                    <span className="font-medium text-foreground">{formatDate(donor.deadline)}</span>
                  </div>
                </div>

                {/* PRD 11.4: Matching Results breakdown */}
                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Analisis Kecocokan Matching Engine:</span>
                  <div className="space-y-1.5">
                    {match.reasons.slice(0, 2).map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                    {match.unmet_requirements.slice(0, 1).map((u, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                        <span>Belum memenuhi syarat: {u}</span>
                      </div>
                    ))}
                    {match.risks.slice(0, 1).map((rk, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400">
                        <XCircle className="size-3.5 shrink-0 mt-0.5" />
                        <span>Risiko: {rk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-1/2 text-xs gap-1"
                    onClick={() => setSelectedDonorDetail(donor)}
                  >
                    <Info className="size-3.5" /> Detail & Syarat
                  </Button>
                  <Button
                    size="sm"
                    variant={isSelected ? "secondary" : "default"}
                    className="w-1/2 text-xs gap-1"
                    onClick={() => save({ donor_id: isSelected ? null : donor.id }, true)}
                  >
                    {isSelected ? "Batalkan Pilihan" : "Pilih Donor Ini"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Detail Donor Complete */}
      <Dialog open={!!selectedDonorDetail} onOpenChange={(open) => !open && setSelectedDonorDetail(null)}>
        {selectedDonorDetail && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                <Building2 className="size-4" /> Informasi Lembaga Donor
              </div>
              <DialogTitle className="text-lg">{selectedDonorDetail.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kategori: {selectedDonorDetail.category} · Negara: {selectedDonorDetail.country || "Internasional"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block">Rentang Hibah</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(selectedDonorDetail.min_grant, selectedDonorDetail.currency)} – {formatCurrency(selectedDonorDetail.max_grant, selectedDonorDetail.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tenggat Pengajuan</span>
                  <span className="font-medium">{formatDate(selectedDonorDetail.deadline)}</span>
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-1.5">
                <span className="font-semibold text-foreground block">Website & Kontak Resmi:</span>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  {selectedDonorDetail.website && (
                    <a
                      href={selectedDonorDetail.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="size-3.5" /> Website Resmi <ExternalLink className="size-3" />
                    </a>
                  )}
                  {selectedDonorDetail.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" /> {selectedDonorDetail.email}
                    </span>
                  )}
                  {selectedDonorDetail.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3.5" /> {selectedDonorDetail.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Priorities & Requirements */}
              <div className="space-y-2">
                <span className="font-semibold text-foreground block">Prioritas Pendanaan:</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedDonorDetail.priorities || []).map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-foreground block">Persyaratan Dokumen & Administrasi:</span>
                <ul className="space-y-1">
                  {(selectedDonorDetail.requirements || []).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                      <FileCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}