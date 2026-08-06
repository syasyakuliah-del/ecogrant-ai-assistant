-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.proposal_status AS ENUM ('draft','sedang_disusun','siap_ditinjau','perlu_revisi','disetujui','selesai','diarsipkan');

-- HELPER
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  position TEXT,
  organization_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'aktif',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization_name, phone)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DONORS
CREATE TABLE public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  country TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  funding_fields TEXT[] NOT NULL DEFAULT '{}',
  priorities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  min_grant NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_grant NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  deadline DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donors TO authenticated;
GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donors_read" ON public.donors FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donors_admin_write" ON public.donors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_donors_updated BEFORE UPDATE ON public.donors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SBM
CREATE TABLE public.sbm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  region_code TEXT NOT NULL DEFAULT 'NASIONAL',
  regulation_source TEXT,
  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (year, version, code, region_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sbm TO authenticated;
GRANT ALL ON public.sbm TO service_role;
ALTER TABLE public.sbm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sbm_read" ON public.sbm FOR SELECT TO authenticated USING (true);
CREATE POLICY "sbm_admin_write" ON public.sbm FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sbm_updated BEFORE UPDATE ON public.sbm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SBU
CREATE TABLE public.sbu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  code TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL CHECK (price >= 0),
  province_code TEXT NOT NULL,
  city_code TEXT NOT NULL DEFAULT 'SEMUA',
  source TEXT,
  effective_from DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (year, version, code, province_code, city_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sbu TO authenticated;
GRANT ALL ON public.sbu TO service_role;
ALTER TABLE public.sbu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sbu_read" ON public.sbu FOR SELECT TO authenticated USING (true);
CREATE POLICY "sbu_admin_write" ON public.sbu FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sbu_updated BEFORE UPDATE ON public.sbu FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROPOSALS
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  organization_name TEXT,
  location TEXT,
  province TEXT,
  city TEXT,
  start_date DATE,
  end_date DATE,
  duration_months INT NOT NULL DEFAULT 0,
  grant_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (grant_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  category TEXT,
  idea_summary TEXT,
  pic_name TEXT,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.11,
  status public.proposal_status NOT NULL DEFAULT 'draft',
  current_step INT NOT NULL DEFAULT 1,
  progress_percent INT NOT NULL DEFAULT 0,
  review_note TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  version_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT proposals_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_proposals_owner ON public.proposals(owner_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_updated ON public.proposals(updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_access_proposal(_pid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = _pid AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
$$;

-- SECTIONS
CREATE TABLE public.proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, section_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_sections TO authenticated;
GRANT ALL ON public.proposal_sections TO service_role;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_all" ON public.proposal_sections FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));
CREATE TRIGGER trg_sections_updated BEFORE UPDATE ON public.proposal_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LFA
CREATE TABLE public.lfa_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  row_type TEXT NOT NULL DEFAULT 'activity',
  goal TEXT,
  outcome TEXT,
  output TEXT,
  activity TEXT,
  indicator TEXT,
  baseline TEXT,
  target TEXT,
  means_of_verification TEXT,
  assumption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lfa_rows TO authenticated;
GRANT ALL ON public.lfa_rows TO service_role;
ALTER TABLE public.lfa_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfa_all" ON public.lfa_rows FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));
CREATE TRIGGER trg_lfa_updated BEFORE UPDATE ON public.lfa_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BUDGET
CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  lfa_row_id UUID REFERENCES public.lfa_rows(id) ON DELETE SET NULL,
  code TEXT,
  category TEXT NOT NULL DEFAULT 'Operasional',
  activity_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'MANUAL',
  sbm_id UUID REFERENCES public.sbm(id) ON DELETE SET NULL,
  sbu_id UUID REFERENCES public.sbu(id) ON DELETE SET NULL,
  volume NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (volume >= 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  frequency NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (frequency >= 0),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  subtotal NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price) STORED,
  tax_amount NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price * tax_rate) STORED,
  total NUMERIC(18,2) GENERATED ALWAYS AS (volume * frequency * unit_price * (1 + tax_rate)) STORED,
  validation_status TEXT NOT NULL DEFAULT 'belum_divalidasi',
  validation_message TEXT,
  override_reason TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items TO authenticated;
GRANT ALL ON public.budget_items TO service_role;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_all" ON public.budget_items FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));
CREATE TRIGGER trg_budget_updated BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DONOR MATCHES
CREATE TABLE public.donor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  met_requirements TEXT[] NOT NULL DEFAULT '{}',
  unmet_requirements TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, donor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donor_matches TO authenticated;
GRANT ALL ON public.donor_matches TO service_role;
ALTER TABLE public.donor_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_all" ON public.donor_matches FOR ALL TO authenticated USING (public.can_access_proposal(proposal_id)) WITH CHECK (public.can_access_proposal(proposal_id));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- COMMUNITY
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'terbit',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_read" ON public.community_posts FOR SELECT TO authenticated USING (status = 'terbit' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "posts_admin_write" ON public.community_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'tampil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read" ON public.community_comments FOR SELECT TO authenticated USING (status = 'tampil' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comments_insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_own_update" ON public.community_comments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comments_delete" ON public.community_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- SEED DONORS
INSERT INTO public.donors (name, category, country, website, email, phone, funding_fields, priorities, requirements, min_grant, max_grant, currency, deadline) VALUES
('Global Environment Facility Small Grants Programme','Multilateral','Amerika Serikat','https://sgp.undp.org','sgp.indonesia@undp.org','+62 21 3141308',
 ARRAY['Konservasi Keanekaragaman Hayati','Mitigasi Perubahan Iklim','Degradasi Lahan'],
 ARRAY['Organisasi berbasis masyarakat','Pelibatan masyarakat adat','Kesetaraan gender'],
 ARRAY['Akta pendirian organisasi','Laporan keuangan dua tahun terakhir','Surat dukungan pemerintah daerah','Logical Framework Matrix','Rencana Anggaran Biaya rinci'],
 200000000, 750000000,'IDR','2026-11-30'),
('Tropical Forest Conservation Action Kalimantan','Bilateral','Indonesia','https://tfcakalimantan.org','info@tfcakalimantan.org','+62 561 733123',
 ARRAY['Konservasi Hutan Tropis','Restorasi Ekosistem','Ekonomi Masyarakat Hutan'],
 ARRAY['Kalimantan','Perhutanan sosial','Pengelolaan kawasan konservasi'],
 ARRAY['Legalitas lembaga','Pengalaman program sejenis','Rencana keberlanjutan','Kerangka monitoring dan evaluasi'],
 150000000, 1500000000,'IDR','2026-09-30'),
('Ford Foundation Indonesia','Yayasan Filantropi','Amerika Serikat','https://www.fordfoundation.org','indonesia@fordfoundation.org','+62 21 2358 6900',
 ARRAY['Keadilan Sosial','Tata Kelola Sumber Daya Alam','Pemberdayaan Masyarakat Adat'],
 ARRAY['Advokasi kebijakan','Penguatan kelembagaan','Inklusi sosial'],
 ARRAY['Profil organisasi','Teori perubahan','Anggaran multi tahun','Audit keuangan'],
 500000000, 3000000000,'IDR','2026-12-15'),
('Kehati Foundation','Yayasan Nasional','Indonesia','https://kehati.or.id','info@kehati.or.id','+62 21 7183185',
 ARRAY['Keanekaragaman Hayati','Pertanian Berkelanjutan','Ekosistem Pesisir'],
 ARRAY['Konservasi berbasis masyarakat','Ekonomi hijau','Riset terapan'],
 ARRAY['NPWP lembaga','Rekening lembaga','Proposal teknis','RAB sesuai standar biaya'],
 50000000, 500000000,'IDR','2026-08-31'),
('Uni Eropa - Delegasi untuk Indonesia','Multilateral','Belgia','https://www.eeas.europa.eu','delegation-indonesia@eeas.europa.eu','+62 21 2554 6200',
 ARRAY['Perubahan Iklim','Kehutanan Lestari','Hak Asasi Manusia','Ekonomi Sirkular'],
 ARRAY['Kemitraan multipihak','Kepatuhan FLEGT','Transparansi anggaran'],
 ARRAY['Registrasi PADOR','Laporan audit independen','Co-financing minimal 10 persen','Logical Framework Matrix','Rencana kerja terperinci'],
 1000000000, 15000000000,'IDR','2026-10-15'),
('Program Pengelolaan Hutan Berkelanjutan KLHK','Pemerintah','Indonesia','https://www.menlhk.go.id','pengaduan@menlhk.go.id','+62 21 5730191',
 ARRAY['Perhutanan Sosial','Rehabilitasi Hutan dan Lahan','Pengendalian Kebakaran Hutan'],
 ARRAY['Kelompok Tani Hutan','Kesatuan Pengelolaan Hutan','Wilayah prioritas nasional'],
 ARRAY['Surat keputusan kelompok','Peta wilayah kelola','RAB mengacu SBM dan SBU','Surat pernyataan tidak konflik'],
 25000000, 300000000,'IDR','2026-07-31'),
('Packard Foundation - Marine Program','Yayasan Filantropi','Amerika Serikat','https://www.packard.org','info@packard.org','+1 650 917 7100',
 ARRAY['Konservasi Laut','Perikanan Berkelanjutan','Ekosistem Mangrove'],
 ARRAY['Kawasan konservasi perairan','Data ilmiah','Kemitraan nelayan'],
 ARRAY['Profil lembaga berbahasa Inggris','Teori perubahan','Indikator terukur'],
 700000000, 5000000000,'IDR','2026-11-01'),
('Dana Indonesia untuk Iklim dan Lingkungan (BPDLH)','Pemerintah','Indonesia','https://bpdlh.id','info@bpdlh.id','+62 21 3512300',
 ARRAY['Mitigasi dan Adaptasi Iklim','Energi Terbarukan','Restorasi Gambut'],
 ARRAY['Penurunan emisi terukur','Pemberdayaan ekonomi lokal','Kesiapan kelembagaan'],
 ARRAY['Legalitas lembaga','Rekening khusus program','RAB sesuai SBM','Sistem MRV emisi'],
 100000000, 2000000000,'IDR','2026-12-31');

-- SEED SBM
INSERT INTO public.sbm (year, version, code, category, description, unit, price, region_code, regulation_source, effective_from, effective_until) VALUES
(2026,'1.0','SBM-001','Honorarium','Honorarium Narasumber Pejabat Eselon II','OJ',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-002','Honorarium','Honorarium Narasumber Praktisi atau Ahli','OJ',900000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-003','Honorarium','Honorarium Moderator','OK',700000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-004','Honorarium','Honorarium Panitia Kegiatan','OK',400000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-005','Honorarium','Honorarium Fasilitator Pelatihan Masyarakat','OJ',600000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-010','Perjalanan Dinas','Uang Harian Perjalanan Dinas Dalam Provinsi','OH',380000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-011','Perjalanan Dinas','Uang Harian Perjalanan Dinas Luar Provinsi','OH',430000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-012','Perjalanan Dinas','Uang Representasi Perjalanan Dinas','OH',250000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-013','Perjalanan Dinas','Transport Lokal Dalam Kota','OK',150000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-020','Konsumsi','Konsumsi Rapat Makan Siang','OK',65000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-021','Konsumsi','Konsumsi Rapat Kudapan','OK',30000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-030','Sewa','Sewa Ruang Pertemuan Fullday','Paket',3500000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-031','Sewa','Sewa Kendaraan Roda Empat Harian','Unit/Hari',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-032','Sewa','Sewa Perahu Motor Survei Lapangan','Unit/Hari',1200000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-040','Bahan','Alat Tulis Kantor Paket Kegiatan','Paket',750000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-041','Bahan','Penggandaan dan Penjilidan Dokumen','Eksemplar',75000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-042','Bahan','Bibit Tanaman Kehutanan Siap Tanam','Batang',12000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-043','Bahan','Pupuk Organik untuk Rehabilitasi Lahan','Kg',5000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-050','Jasa Profesional','Jasa Konsultan Individu Ahli Madya','OB',18000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-051','Jasa Profesional','Jasa Enumerator Survei Lapangan','OH',300000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-052','Jasa Profesional','Jasa Audit Keuangan Program','Paket',35000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-060','Publikasi','Produksi Video Dokumentasi Program','Paket',25000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-061','Publikasi','Cetak Media Kampanye Poster','Lembar',15000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2025,'1.0','SBM-001','Honorarium','Honorarium Narasumber Pejabat Eselon II','OJ',900000,'NASIONAL','PMK Standar Biaya Masukan 2025','2025-01-01','2025-12-31'),
(2025,'1.0','SBM-010','Perjalanan Dinas','Uang Harian Perjalanan Dinas Dalam Provinsi','OH',360000,'NASIONAL','PMK Standar Biaya Masukan 2025','2025-01-01','2025-12-31');

-- SEED SBU
INSERT INTO public.sbu (year, version, code, category, description, unit, price, province_code, city_code, source, effective_from) VALUES
(2026,'1.0','SBU-100','Akomodasi','Penginapan Standar Pelaksana','OH',700000,'KALIMANTAN BARAT','KOTA PONTIANAK','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-101','Akomodasi','Penginapan Standar Pejabat','OH',1100000,'KALIMANTAN BARAT','KOTA PONTIANAK','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-102','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',950000,'KALIMANTAN BARAT','SEMUA','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-103','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',520000,'KALIMANTAN BARAT','SEMUA','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-110','Akomodasi','Penginapan Standar Pelaksana','OH',900000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-111','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',680000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-112','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',1200000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-120','Akomodasi','Penginapan Standar Pelaksana','OH',650000,'SULAWESI SELATAN','KOTA MAKASSAR','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-121','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',480000,'SULAWESI SELATAN','SEMUA','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-122','Transportasi','Sewa Perahu Motor','Unit/Hari',1100000,'SULAWESI SELATAN','SEMUA','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-130','Akomodasi','Penginapan Standar Pelaksana','OH',620000,'PAPUA','SEMUA','Peraturan Gubernur Papua','2026-01-01'),
(2026,'1.0','SBU-131','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',1500000,'PAPUA','SEMUA','Peraturan Gubernur Papua','2026-01-01'),
(2026,'1.0','SBU-140','Akomodasi','Penginapan Standar Pelaksana','OH',600000,'JAWA BARAT','SEMUA','Peraturan Gubernur Jawa Barat','2026-01-01'),
(2026,'1.0','SBU-141','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',450000,'JAWA BARAT','SEMUA','Peraturan Gubernur Jawa Barat','2026-01-01'),
(2026,'1.0','SBU-150','Akomodasi','Penginapan Standar Pelaksana','OH',640000,'SUMATERA UTARA','SEMUA','Peraturan Gubernur Sumatera Utara','2026-01-01'),
(2026,'1.0','SBU-151','Konsumsi','Paket Fullboard Peserta Kegiatan','OH',470000,'SUMATERA UTARA','SEMUA','Peraturan Gubernur Sumatera Utara','2026-01-01');

-- SEED COMMUNITY
INSERT INTO public.community_posts (category, title, slug, excerpt, content) VALUES
('Panduan Hibah','Sepuluh Kesalahan Umum dalam Penyusunan Proposal Hibah Lingkungan','kesalahan-umum-proposal-hibah',
 'Ringkasan kesalahan yang paling sering membuat proposal hibah ditolak pada tahap penyaringan awal.',
 'Banyak proposal ditolak bukan karena gagasannya lemah, melainkan karena penyajiannya tidak memenuhi standar donor. Kesalahan pertama adalah narasi latar belakang yang tidak didukung data. Kesalahan kedua adalah ketidakselarasan antara Logical Framework dan Rencana Anggaran Biaya. Kesalahan ketiga adalah indikator yang tidak terukur. Kesalahan keempat adalah anggaran yang melampaui standar biaya yang berlaku. Kesalahan kelima adalah tidak adanya rencana keberlanjutan setelah program berakhir. Perbaikan pada kelima aspek tersebut umumnya meningkatkan peluang lolos secara signifikan.'),
('Standar Biaya','Memahami Perbedaan Standar Biaya Masukan dan Standar Biaya Umum','perbedaan-sbm-dan-sbu',
 'Penjelasan praktis mengenai kapan menggunakan SBM dan kapan menggunakan SBU dalam penyusunan RAB.',
 'Standar Biaya Masukan ditetapkan pada tingkat nasional dan menjadi acuan batas tertinggi untuk komponen seperti honorarium, uang harian, dan jasa profesional. Standar Biaya Umum ditetapkan pada tingkat daerah dan menjadi acuan untuk komponen yang sangat dipengaruhi kondisi wilayah seperti akomodasi, transportasi lokal, dan paket kegiatan. Dalam penyusunan Rencana Anggaran Biaya, gunakan SBM sebagai acuan utama dan SBU sebagai acuan wilayah pelaksanaan. Setiap item yang melampaui standar wajib disertai justifikasi tertulis.'),
('Logical Framework','Menyusun Logical Framework Matrix yang Konsisten','menyusun-logical-framework-matrix',
 'Langkah menyusun hierarki Goal, Outcome, Output, dan Activity beserta indikator yang terukur.',
 'Logical Framework Matrix menuntut hierarki yang jelas. Goal menggambarkan dampak jangka panjang. Outcome menggambarkan perubahan perilaku atau kondisi pada akhir program. Output menggambarkan produk yang dihasilkan. Activity menggambarkan pekerjaan yang dilaksanakan. Setiap tingkatan wajib memiliki indikator, baseline, target, dan alat verifikasi. Asumsi dicantumkan untuk menjelaskan kondisi eksternal yang harus terpenuhi. Konsistensi antara Logical Framework, jadwal kegiatan, dan anggaran adalah kunci penilaian donor.'),
('Donor','Strategi Memilih Lembaga Donor yang Tepat','strategi-memilih-lembaga-donor',
 'Kriteria kunci untuk menilai kecocokan antara program organisasi dan prioritas pendanaan donor.',
 'Kecocokan donor ditentukan oleh kesesuaian tema, wilayah kerja, rentang nilai hibah, dan kesiapan administrasi. Pelajari prioritas pendanaan dan riwayat program yang pernah dibiayai. Pastikan nilai hibah yang diajukan berada dalam rentang yang ditetapkan. Perhatikan tenggat pengajuan dan persyaratan dokumen legal. Organisasi yang belum memiliki laporan audit sebaiknya memulai dari donor nasional dengan persyaratan yang lebih ringan sebelum mengajukan ke donor multilateral.');