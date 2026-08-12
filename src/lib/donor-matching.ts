export type DonorRow = {
  id: string;
  name: string;
  category: string;
  country: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  funding_fields: string[];
  priorities: string[];
  requirements: string[];
  min_grant: number | string;
  max_grant: number | string;
  currency: string;
  deadline: string | null;
  is_active: boolean;
};

export type ProposalContext = {
  title?: string | null;
  category?: string | null;
  province?: string | null;
  location?: string | null;
  idea_summary?: string | null;
  grant_amount?: number | string | null;
  end_date?: string | null;
};

export type MatchResult = {
  donor_id: string;
  score: number;
  reasons: string[];
  met_requirements: string[];
  unmet_requirements: string[];
  risks: string[];
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

export function scoreDonor(donor: DonorRow, proposal: ProposalContext): MatchResult {
  const reasons: string[] = [];
  const risks: string[] = [];
  const met: string[] = [];
  const unmet: string[] = [];
  let score = 0;

  // Tema (maks 40)
  const haystack = tokenize(
    `${proposal.category ?? ""} ${proposal.title ?? ""} ${proposal.idea_summary ?? ""}`,
  );
  const themes = [...donor.funding_fields, ...donor.priorities];
  let themeHits = 0;
  for (const theme of themes) {
    const words = tokenize(theme);
    if (words.some((w) => haystack.includes(w))) {
      themeHits += 1;
      if (reasons.length < 4) reasons.push(`Selaras dengan bidang pendanaan "${theme}".`);
    }
  }
  const themeScore = Math.min(40, themeHits * 14);
  score += themeScore;
  if (themeHits === 0) risks.push("Tema program belum terlihat selaras dengan bidang pendanaan donor.");

  // Nilai hibah (maks 30)
  const amount = Number(proposal.grant_amount ?? 0);
  const min = Number(donor.min_grant ?? 0);
  const max = Number(donor.max_grant ?? 0);
  if (amount > 0 && max > 0) {
    if (amount >= min && amount <= max) {
      score += 30;
      reasons.push("Nilai hibah berada dalam rentang pendanaan donor.");
    } else if (amount < min) {
      score += 12;
      risks.push("Nilai hibah berada di bawah nilai minimum donor.");
    } else {
      risks.push("Nilai hibah melampaui nilai maksimum donor.");
    }
  } else {
    score += 8;
    risks.push("Nilai hibah belum diisi sehingga kecocokan pendanaan belum dapat dinilai.");
  }

  // Wilayah (maks 15)
  const region = `${proposal.province ?? ""} ${proposal.location ?? ""}`.toLowerCase();
  const donorRegion = [...donor.priorities, donor.country ?? ""].join(" ").toLowerCase();
  if (region && donorRegion.split(/\s+/).some((w) => w.length > 4 && region.includes(w))) {
    score += 15;
    reasons.push("Wilayah pelaksanaan termasuk prioritas geografis donor.");
  } else if (donor.country === "Indonesia") {
    score += 10;
    reasons.push("Donor berbasis Indonesia sehingga wilayah pelaksanaan dapat diterima.");
  } else {
    score += 6;
  }

  // Deadline (maks 15)
  if (donor.deadline) {
    const days = Math.ceil((new Date(donor.deadline).getTime() - Date.now()) / 86400000);
    if (days > 60) {
      score += 15;
      reasons.push(`Tenggat pengajuan masih ${days} hari lagi.`);
    } else if (days > 0) {
      score += 8;
      risks.push(`Tenggat pengajuan tinggal ${days} hari.`);
    } else {
      risks.push("Tenggat pengajuan donor sudah terlewati.");
    }
  } else {
    score += 8;
  }

  if (!donor.is_active) {
    score = Math.round(score * 0.4);
    risks.push("Status donor sedang tidak aktif.");
  }

  for (const req of donor.requirements) {
    const lower = req.toLowerCase();
    if (lower.includes("logical framework")) {
      met.push(req);
    } else if (lower.includes("rab") || lower.includes("anggaran")) {
      met.push(req);
    } else {
      unmet.push(req);
    }
  }

  return {
    donor_id: donor.id,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    met_requirements: met,
    unmet_requirements: unmet,
    risks,
  };
}