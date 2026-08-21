import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  ShieldCheck,
  HelpCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
  X,
  FileText,
  Clock,
  Headphones,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useMembership, MEMBERSHIP_PLANS, PlanId } from "@/hooks/useMembership";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/membership")({
  head: () => ({
    meta: [
      { title: "Paket Membership — EcoGrant AI" },
      {
        name: "description",
        content:
          "Bandingkan dan pilih paket membership EcoGrant AI untuk meningkatkan kapasitas penyusunan proposal hibah lingkungan Anda.",
      },
    ],
  }),
  component: MembershipPage,
});

type ComparisonRow = {
  feature: string;
  starter: string | boolean;
  basic: string | boolean;
  premium: string | boolean;
  category?: string;
};

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: "AI Proposal Generator", starter: true, basic: true, premium: true },
  { feature: "AI Scientific Justification", starter: true, basic: true, premium: true },
  { feature: "Scope of Work Generator", starter: true, basic: true, premium: true },
  { feature: "LFA Generator", starter: true, basic: true, premium: true },
  { feature: "Ecological Indicators", starter: true, basic: true, premium: true },
  { feature: "SBM Costing Engine", starter: true, basic: true, premium: true },
  { feature: "Over-budget Warning", starter: true, basic: true, premium: true },
  { feature: "Export PDF, Word & Excel", starter: true, basic: true, premium: true },
  { feature: "Kapasitas Kuota Proposal", starter: "2 / bulan", basic: "5 / bulan", premium: "10 / bulan" },
  { feature: "Kuota Asistensi AI", starter: "Basic", basic: "Higher", premium: "Highest" },
  { feature: "Riwayat & History Proposal", starter: true, basic: true, premium: true },
  { feature: "Priority Processing", starter: false, basic: true, premium: true },
  { feature: "Advanced AI Assistance", starter: false, basic: true, premium: true },
  { feature: "Premium Support (1-on-1)", starter: false, basic: false, premium: true },
];

const FAQS = [
  {
    q: "Apa perbedaan setiap paket?",
    a: "Paket Starter dirancang untuk pengguna yang baru mulai menyusun proposal dengan kuota dasar. Paket Basic (Paling Populer) memberikan kapasitas hingga 10 proposal per bulan dengan pemrosesan prioritas dan AI tingkat lanjut. Paket Premium memberikan kapasitas tanpa batas serta dukungan prioritas penuh 1-on-1.",
  },
  {
    q: "Apakah saya dapat melakukan upgrade kapan saja?",
    a: "Ya! Anda dapat melakukan upgrade paket membership Anda kapan saja melalui halaman ini. Manfaat dan kapasitas paket baru akan langsung aktif secara otomatis.",
  },
  {
    q: "Apakah proposal yang sudah dibuat tetap aman saat saya upgrade?",
    a: "Seluruh data proposal, RAB, Logical Framework, dan dokumen yang telah Anda buat tersimpan aman dan tidak akan terpengaruh sama sekali oleh perubahan paket membership.",
  },
  {
    q: "Bagaimana cara mengelola membership saya?",
    a: "Anda dapat memantau status membership aktif, tanggal mulai, serta penggunaan kuota proposal secara langsung melalui Dashboard utama dan halaman Membership ini.",
  },
];

function MembershipPage() {
  const navigate = useNavigate();
  const { currentPlan, proposalCount, upgradePlan } = useMembership();

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<PlanId | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [upgradedPlanName, setUpgradedPlanName] = useState("");

  const handleConfirmUpgrade = async () => {
    if (!selectedPlanForUpgrade) return;
    setIsUpgrading(true);
    const targetPlan = MEMBERSHIP_PLANS[selectedPlanForUpgrade];
    const success = await upgradePlan(selectedPlanForUpgrade);
    setIsUpgrading(false);

    if (success) {
      setUpgradedPlanName(targetPlan.name);
      setSelectedPlanForUpgrade(null);
      setShowSuccessDialog(true);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      {/* Header & Status Banner */}
      <div className="space-y-6">
        <PageHeader
          title="Pilih Membership yang Sesuai dengan Kebutuhan Anda"
          description="Gunakan AI EcoGrant untuk menyusun proposal lingkungan dengan workflow yang lebih cepat, terstruktur, dan profesional."
        />

        {/* Current Plan Status Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Membership Aktif Anda
                </p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2">
                  AKTIF
                </Badge>
              </div>
              <p className="font-display text-xl font-bold text-foreground mt-0.5">
                Paket {currentPlan.name} — {formatCurrency(currentPlan.priceMonthly)} <span className="text-xs font-normal text-muted-foreground">/bulan</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="text-right hidden sm:block">
              <p className="font-medium text-foreground">Penggunaan Kuota Proposal</p>
              <p>
                {proposalCount} dari {currentPlan.limits.proposalQuota === 999 ? "Tanpa Batas" : `${currentPlan.limits.proposalQuota} proposal`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground">Pilih Paket Membership</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mulai dari kebutuhan dasar hingga workflow proposal yang lebih intensif. Upgrade kapan saja sesuai pertumbuhan organisasi Anda.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-stretch pt-4">
          {(Object.keys(MEMBERSHIP_PLANS) as PlanId[]).map((planId) => {
            const plan = MEMBERSHIP_PLANS[planId];
            const isCurrent = currentPlan.id === planId;
            const isPopular = plan.popular;

            return (
              <Card
                key={planId}
                className={`relative flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-primary shadow-lg ring-1 ring-primary/20 scale-[1.02] bg-card"
                    : isCurrent
                    ? "border-emerald-500/50 bg-emerald-500/[0.02]"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground font-semibold text-[11px] px-3 py-1 shadow-md gap-1">
                      <Sparkles className="size-3" />
                      {plan.badgeText}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-xl font-bold text-foreground">
                      {plan.name}
                    </CardTitle>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Paket Saat Ini
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-1 min-h-[36px]">
                    {plan.description}
                  </CardDescription>

                  <div className="pt-4 border-t border-border mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-extrabold text-foreground">
                        {formatCurrency(plan.priceMonthly)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/bulan</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 text-xs">
                  <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Fitur & Kapasitas Termasuk:
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        Kapasitas Proposal:{" "}
                        <strong className="font-semibold text-foreground">
                          {plan.limits.proposalQuota === 999 ? "Tanpa Batas" : `${plan.limits.proposalQuota} proposal / bulan`}
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        Asistensi AI:{" "}
                        <strong className="font-semibold text-foreground">
                          {plan.limits.aiQuota} kali / bulan
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Generator Proposal, LFA & Costing SBM</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Ekspor Dokumen PDF, Word & Excel</span>
                    </li>

                    {plan.limits.priorityProcessing && (
                      <li className="flex items-start gap-2.5 font-medium text-foreground">
                        <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>Pemrosesan Generasi AI Prioritas</span>
                      </li>
                    )}

                    {plan.limits.advancedAi && (
                      <li className="flex items-start gap-2.5 font-medium text-foreground">
                        <Sparkles className="size-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span>Analisis Narasi AI Tingkat Lanjut</span>
                      </li>
                    )}

                    {plan.limits.premiumSupport && (
                      <li className="flex items-start gap-2.5 font-medium text-foreground">
                        <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Dukungan Teknis Prioritas 1-on-1</span>
                      </li>
                    )}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border">
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full h-11 text-xs font-semibold">
                      <Check className="mr-1.5 size-4 text-emerald-600" />
                      Paket Saat Ini
                    </Button>
                  ) : planId === "starter" && (currentPlan.id === "basic" || currentPlan.id === "premium") ? (
                    <Button variant="ghost" disabled className="w-full h-11 text-xs text-muted-foreground">
                      Paket Saat Ini: {currentPlan.name}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className={`w-full h-11 text-xs font-semibold ${
                        isPopular ? "bg-primary hover:bg-primary/90" : ""
                      }`}
                      onClick={() => setSelectedPlanForUpgrade(planId)}
                    >
                      Upgrade ke {plan.name}
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="space-y-4 pt-6">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-bold text-foreground">Bandingkan Fitur Paket</h3>
          <p className="text-xs text-muted-foreground">
            Perbandingan detail kapabilitas dan fitur pada setiap tingkat membership EcoGrant AI.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 font-semibold text-foreground min-w-[220px] sticky left-0 bg-muted/50 z-10">
                    Fitur / Kapabilitas
                  </th>
                  <th className="p-4 font-semibold text-foreground text-center min-w-[120px]">Starter</th>
                  <th className="p-4 font-semibold text-primary text-center min-w-[140px] bg-primary/5">
                    Basic <span className="text-[10px] font-normal block text-muted-foreground">(Paling Populer)</span>
                  </th>
                  <th className="p-4 font-semibold text-foreground text-center min-w-[120px]">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARISON_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground sticky left-0 bg-card z-10">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )
                      ) : (
                        <span className="font-semibold">{row.starter}</span>
                      )}
                    </td>
                    <td className="p-4 text-center bg-primary/5">
                      {typeof row.basic === "boolean" ? (
                        row.basic ? (
                          <Check className="mx-auto size-4 text-emerald-600 font-bold" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )
                      ) : (
                        <span className="font-bold text-primary">{row.basic}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.premium === "boolean" ? (
                        row.premium ? (
                          <Check className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )
                      ) : (
                        <span className="font-semibold">{row.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4 pt-6 border-t">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-bold text-foreground">Pertanyaan Umum (FAQ)</h3>
          <p className="text-xs text-muted-foreground">
            Informasi mengenai sistem subscription, perombakan paket, dan keamanan data proposal Anda.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-xs font-semibold hover:no-underline py-3.5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* DIALOG: CONFIRMATION UPGRADE */}
      <Dialog open={!!selectedPlanForUpgrade} onOpenChange={(open) => !open && setSelectedPlanForUpgrade(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedPlanForUpgrade && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg font-bold">
                  Konfirmasi Upgrade Membership
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Anda akan memperbarui paket membership EcoGrant AI Anda.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Paket Saat Ini:</span>
                    <span className="font-semibold">{currentPlan.name} ({formatCurrency(currentPlan.priceMonthly)}/bln)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t pt-2">
                    <span className="text-muted-foreground">Paket Baru:</span>
                    <span className="font-bold text-primary">
                      {MEMBERSHIP_PLANS[selectedPlanForUpgrade].name} ({formatCurrency(MEMBERSHIP_PLANS[selectedPlanForUpgrade].priceMonthly)}/bln)
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-foreground">Keunggulan Paket {MEMBERSHIP_PLANS[selectedPlanForUpgrade].name}:</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600" />
                      Kapasitas hingga {MEMBERSHIP_PLANS[selectedPlanForUpgrade].limits.proposalQuota === 999 ? "Tanpa Batas" : `${MEMBERSHIP_PLANS[selectedPlanForUpgrade].limits.proposalQuota} proposal / bulan`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600" />
                      {MEMBERSHIP_PLANS[selectedPlanForUpgrade].limits.aiQuota} kali asistensi AI per bulan
                    </li>
                    {MEMBERSHIP_PLANS[selectedPlanForUpgrade].limits.priorityProcessing && (
                      <li className="flex items-center gap-2 text-foreground font-medium">
                        <Zap className="size-3.5 text-amber-500" />
                        Pemrosesan Generasi AI Prioritas
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  disabled={isUpgrading}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmUpgrade}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Memproses Upgrade…
                    </>
                  ) : (
                    "Konfirmasi Upgrade"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: SUCCESS UPGRADE */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="size-8" />
            </div>
            <DialogTitle className="font-display text-xl font-bold">
              Membership Berhasil Diperbarui!
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Selamat! Akun Anda telah resmi ditingkatkan ke paket <strong className="font-semibold text-foreground">{upgradedPlanName}</strong>. Seluruh kapasitas dan keunggulan baru dapat langsung Anda gunakan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-10 text-xs"
              onClick={() => {
                setShowSuccessDialog(false);
                void navigate({ to: "/dashboard" });
              }}
            >
              Kembali ke Dashboard
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto h-10 text-xs"
              onClick={() => {
                setShowSuccessDialog(false);
                void navigate({ to: "/proposals" });
              }}
            >
              Mulai Membuat Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
