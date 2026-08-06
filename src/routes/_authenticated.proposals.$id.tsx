import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useProposalData, useAutosave, computeProgress } from "@/hooks/useProposalData";
import { WIZARD_STEPS, PROVINCES, PROGRAM_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/proposals/$id")({
  head: () => ({
    meta: [
      { title: "Wizard Proposal — EcoGrant AI" },
      { name: "description", content: "Susun proposal hibah melalui wizard sepuluh langkah dengan bantuan AI." },
      { property: "og:title", content: "Wizard Proposal — EcoGrant AI" },
      { property: "og:description", content: "Susun narasi, Logical Framework, dan RAB proposal hibah Anda." },
    ],
  }),
  component: WizardPage,
});

function WizardPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useProposalData(id);
  const { save, state } = useAutosave(id);

  if (isLoading || !data?.proposal) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const p = data.proposal;
  const progress = computeProgress({ proposal: p, sections: data.sections, lfa: data.lfa, budget: data.budget });

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title}
        description="Wizard penyusunan proposal hibah sepuluh langkah."
        actions={
          <Badge variant="secondary">
            {state === "saving" ? "Menyimpan…" : state === "saved" ? "Tersimpan" : "Autosave aktif"}
          </Badge>
        }
      />

      <Card>
        <CardContent className="space-y-2 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progres penyusunan</span>
            <span className="font-medium">{progress.percent} persen</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
          <div className="flex flex-wrap gap-2 pt-2">
            {WIZARD_STEPS.map((s) => (
              <Badge key={s.step} variant={progress.checks[s.step - 1] ? "default" : "outline"}>
                {s.step}. {s.short}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 1 — Informasi Proposal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Judul Proposal</Label>
            <Input id="title" defaultValue={p.title} onChange={(e) => save({ title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org">Nama Organisasi</Label>
            <Input
              id="org"
              defaultValue={p.organization_name ?? ""}
              onChange={(e) => save({ organization_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pic">Penanggung Jawab</Label>
            <Input id="pic" defaultValue={p.pic_name ?? ""} onChange={(e) => save({ pic_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Provinsi</Label>
            <Select defaultValue={p.province ?? ""} onValueChange={(v) => save({ province: v }, true)}>
              <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
              <SelectContent>
                {PROVINCES.map((prov) => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kategori Program</Label>
            <Select defaultValue={p.category ?? ""} onValueChange={(v) => save({ category: v }, true)}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {PROGRAM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc">Lokasi Pelaksanaan</Label>
            <Input id="loc" defaultValue={p.location ?? ""} onChange={(e) => save({ location: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Nilai Hibah Diajukan</Label>
            <Input
              id="amount"
              type="number"
              defaultValue={Number(p.grant_amount)}
              onChange={(e) => save({ grant_amount: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">{formatCurrency(p.grant_amount, p.currency)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Tanggal Mulai</Label>
            <Input
              id="start"
              type="date"
              defaultValue={p.start_date ?? ""}
              onChange={(e) => save({ start_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Tanggal Selesai</Label>
            <Input
              id="end"
              type="date"
              defaultValue={p.end_date ?? ""}
              onChange={(e) => save({ end_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="idea">Ringkasan Ide Program</Label>
            <Textarea
              id="idea"
              rows={5}
              defaultValue={p.idea_summary ?? ""}
              onChange={(e) => save({ idea_summary: e.target.value })}
              placeholder="Jelaskan gagasan program, masalah yang diatasi, dan penerima manfaat."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}