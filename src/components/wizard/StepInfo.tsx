import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Calendar, CheckCircle2, DollarSign, Info, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM_CATEGORIES, PROVINCES } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./shared";

const CURRENCIES = [
  { code: "IDR", name: "Rupiah Indonesia (IDR)" },
  { code: "USD", name: "Dolar Amerika Serikat (USD)" },
  { code: "EUR", name: "Euro (EUR)" },
  { code: "AUD", name: "Dolar Australia (AUD)" },
];

export function StepInfo({ proposal, save }: StepProps) {
  const [title, setTitle] = useState(proposal.title || "");
  const [orgName, setOrgName] = useState(proposal.organization_name || "");
  const [picName, setPicName] = useState(proposal.pic_name || "");
  const [location, setLocation] = useState(proposal.location || "");
  const [province, setProvince] = useState(proposal.province || "");
  const [startDate, setStartDate] = useState(proposal.start_date || "");
  const [endDate, setEndDate] = useState(proposal.end_date || "");
  const [grantAmount, setGrantAmount] = useState(String(proposal.grant_amount || 0));
  const [currency, setCurrency] = useState(proposal.currency || "IDR");
  const [donorId, setDonorId] = useState(proposal.donor_id || "");
  const [category, setCategory] = useState(proposal.category || "");
  const [ideaSummary, setIdeaSummary] = useState(proposal.idea_summary || "");

  // Compute automatic duration in months
  const computeDurationMonths = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    return Math.max(1, years * 12 + months + 1);
  };

  const durationMonths = computeDurationMonths(startDate, endDate);

  // Fetch donors for select option
  const { data: donors = [] } = useQuery({
    queryKey: ["donors-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("donors")
        .select("id, name, category")
        .is("deleted_at", null)
        .order("name");
      return data ?? [];
    },
  });

  // Validations
  const isTitleValid = title.trim().length >= 10 && title.trim().length <= 250;
  const isOrgValid = orgName.trim().length > 0;
  const isLocationValid = location.trim().length > 0;
  const isDatesValid = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
  const isGrantValid = Number(grantAmount) >= 0;

  // Auto-trigger save on change
  const handleChange = (field: string, value: string | number | null) => {
    save({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="size-5 text-primary" /> Step 1: Informasi Dasar Proposal
              </CardTitle>
              <CardDescription>
                Isi parameter utama proposal, organisasi pelaksana, durasi program, dan target
                pendanaan.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="gap-1 bg-primary/10 text-primary border-primary/20 font-mono"
            >
              Durasi: {durationMonths} Bulan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Real-time Validations Summary */}
          {(!isTitleValid || !isOrgValid || !isLocationValid || !isDatesValid || !isGrantValid) && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Periksa Kembali Input Anda</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                {!isTitleValid && <div>• Judul proposal wajib diisi (10–250 karakter).</div>}
                {!isOrgValid && <div>• Nama organisasi pelaksana wajib diisi.</div>}
                {!isLocationValid && <div>• Lokasi kegiatan wajib diisi.</div>}
                {!isDatesValid && <div>• Tanggal selesai harus setelah tanggal mulai.</div>}
                {!isGrantValid && <div>• Nilai hibah tidak boleh negatif.</div>}
              </AlertDescription>
            </Alert>
          )}

          {/* Section 1: Identitas Proposal & Organisasi */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title" className="font-semibold">
                  Judul Proposal <span className="text-destructive">*</span>
                </Label>
                <span
                  className={`text-xs ${isTitleValid ? "text-muted-foreground" : "text-destructive font-medium"}`}
                >
                  {title.length}/250 karakter
                </span>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  handleChange("title", e.target.value);
                }}
                placeholder="Contoh: Restorasi Ekosistem Mangrove Berbasis Masyarakat di Pesisir Banjar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgName" className="font-semibold">
                Nama Organisasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  handleChange("organization_name", e.target.value);
                }}
                placeholder="Nama Lembaga / Yayasan / Komunitas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="picName">Penanggung Jawab (PIC)</Label>
              <Input
                id="picName"
                value={picName}
                onChange={(e) => {
                  setPicName(e.target.value);
                  handleChange("pic_name", e.target.value);
                }}
                placeholder="Nama Ketua Tim / Manajer Program"
              />
            </div>
          </div>

          {/* Section 2: Lokasi & Durasi Pelaksanaan */}
          <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="province">Provinsi Pelaksanaan</Label>
              <Select
                value={province}
                onValueChange={(v) => {
                  setProvince(v);
                  handleChange("province", v);
                }}
              >
                <SelectTrigger id="province">
                  <SelectValue placeholder="Pilih Provinsi" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="location" className="font-semibold">
                Detail Lokasi / Desa / Kecamatan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  handleChange("location", e.target.value);
                }}
                placeholder="Desa Teluk Sampit, Kab. Kotawaringin Timur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleChange("start_date", e.target.value);
                  const dur = computeDurationMonths(e.target.value, endDate);
                  handleChange("duration_months", dur);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Selesai</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleChange("end_date", e.target.value);
                  const dur = computeDurationMonths(startDate, e.target.value);
                  handleChange("duration_months", dur);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Kalkulasi Durasi</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/40 font-mono text-sm font-semibold">
                {durationMonths} Bulan Operasional
              </div>
            </div>
          </div>

          {/* Section 3: Target Anggaran & Donor */}
          <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="grantAmount" className="font-semibold">
                Nilai Pengajuan Hibah <span className="text-destructive">*</span>
              </Label>
              <Input
                id="grantAmount"
                type="number"
                min={0}
                value={grantAmount}
                onChange={(e) => {
                  setGrantAmount(e.target.value);
                  handleChange("grant_amount", Number(e.target.value));
                }}
                placeholder="500000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold">
                Mata Uang <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currency}
                onValueChange={(v) => {
                  setCurrency(v);
                  handleChange("currency", v);
                }}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donor">Lembaga Donor Sasaran</Label>
              <Select
                value={donorId}
                onValueChange={(v) => {
                  setDonorId(v);
                  handleChange("donor_id", v);
                }}
              >
                <SelectTrigger id="donor">
                  <SelectValue placeholder="Pilih Donor (Opsional di Step 1)" />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 4: Kategori Program & Ringkasan Ide */}
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori Program Utama</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  handleChange("category", v);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Pilih Kategori Program" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ideaSummary">Ringkasan Gagasan Program</Label>
              <Textarea
                id="ideaSummary"
                rows={4}
                value={ideaSummary}
                onChange={(e) => {
                  setIdeaSummary(e.target.value);
                  handleChange("idea_summary", e.target.value);
                }}
                placeholder="Uraikan gagasan singkat mengenai permasalahan yang dihadapi, solusi yang ditawarkan, dan dampak utama yang ingin dicapai..."
              />
              <p className="text-xs text-muted-foreground">
                Ringkasan gagasan ini digunakan oleh Asisten AI untuk membantu menyusun narasi dan
                Logical Framework pada langkah berikutnya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
