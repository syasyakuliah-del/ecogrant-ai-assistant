import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scoreDonor, type DonorRow } from "@/lib/donor-matching";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StepProps } from "./shared";

export function StepDonor({ proposal, save }: StepProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["donors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const ranked = useMemo(() => {
    const donors = (data ?? []) as unknown as DonorRow[];
    return donors
      .map((donor) => ({ donor, match: scoreDonor(donor, proposal) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [data, proposal]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Peringkat donor dihitung dari kesesuaian tema, rentang nilai hibah, wilayah prioritas, dan tenggat pengajuan.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {ranked.map(({ donor, match }) => {
          const selected = proposal.donor_id === donor.id;
          return (
            <Card key={donor.id} className={selected ? "border-primary shadow-sm" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{donor.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {donor.category} · {donor.country ?? "-"}
                    </p>
                  </div>
                  <Badge variant={match.score >= 70 ? "default" : match.score >= 45 ? "secondary" : "outline"}>
                    Skor {match.score}
                  </Badge>
                </div>
                <Progress value={match.score} className="mt-2 h-1.5" />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Rentang hibah {formatCurrency(donor.min_grant, donor.currency)} sampai{" "}
                  {formatCurrency(donor.max_grant, donor.currency)} · Tenggat {formatDate(donor.deadline)}
                </p>
                <ul className="space-y-1">
                  {match.reasons.slice(0, 3).map((r) => (
                    <li key={r} className="flex gap-2 text-xs">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>{r}</span>
                    </li>
                  ))}
                  {match.risks.slice(0, 2).map((r) => (
                    <li key={r} className="flex gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1">
                  {donor.funding_fields.slice(0, 4).map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] font-normal">
                      {f}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={selected ? "secondary" : "default"}
                  className="w-full"
                  onClick={() => save({ donor_id: selected ? null : donor.id }, true)}
                >
                  {selected ? "Donor terpilih — batalkan" : "Pilih donor ini"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}