import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StepProps } from "./shared";

type Props = StepProps & { source: "sbm" | "sbu" };

export function StepStandards({ source, proposal }: Props) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["standards", source],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(source)
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("category")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const rows = data ?? [];
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    const matchTerm =
      !term ||
      `${r.code} ${r.description} ${r.category} ${r.unit}`.toLowerCase().includes(term.toLowerCase());
    const matchCategory = category === "all" || r.category === category;
    return matchTerm && matchCategory;
  });

  const label = source === "sbm" ? "Standar Biaya Masukan" : "Standar Biaya Umum";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {label} menjadi acuan harga satuan pada Rencana Anggaran Biaya. Item RAB yang melebihi standar akan ditandai
        dan wajib disertai alasan override.
        {proposal.province ? ` Wilayah pelaksanaan: ${proposal.province}.` : ""}
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari kode, uraian, atau satuan"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="self-center">{filtered.length} item</Badge>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-32">Kode</TableHead>
                <TableHead>Uraian</TableHead>
                <TableHead className="w-40">Kategori</TableHead>
                <TableHead className="w-24">Satuan</TableHead>
                <TableHead className="w-40 text-right">Harga Satuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="text-sm">{r.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.unit}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(r.price)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada standar biaya yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}