import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help Center — EcoGrant AI" },
      { name: "description", content: "Panduan wizard, AI, LFA, SBM, SBU, RAB, serta pertanyaan yang sering diajukan." },
      { property: "og:title", content: "Help Center — EcoGrant AI" },
      { property: "og:description", content: "Kumpulan panduan lengkap penggunaan EcoGrant AI." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const term = q.trim().toLowerCase();
  const rows = term
    ? data.filter((a) =>
        [a.title, a.excerpt, a.content, a.category].some((f) => (f ?? "").toLowerCase().includes(term)),
      )
    : data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Help Center" description="Cari panduan penggunaan seluruh modul EcoGrant AI." />

      <div className="relative mb-5">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari panduan, misalnya RAB atau donor"
          className="pl-9"
          aria-label="Cari artikel bantuan"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat artikel…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Artikel tidak ditemukan" description="Ubah kata kunci pencarian atau hubungi tim dukungan pada dukungan@ecogrant.ai." />
      ) : (
        <Accordion type="single" collapsible className="surface-panel px-4">
          {rows.map((a) => (
            <AccordionItem key={a.id} value={a.id}>
              <AccordionTrigger className="text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{a.category}</Badge>
                  <span className="font-medium">{a.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-sm text-muted-foreground">{a.excerpt}</p>
                <p className="text-sm leading-relaxed whitespace-pre-line">{a.content}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}