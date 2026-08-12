-- 1. First registered user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization_name, phone)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  PERFORM pg_advisory_xact_lock(hashtext('ecogrant_first_admin'));
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN admin_exists THEN 'user'::app_role ELSE 'admin'::app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

-- 2. Admin can manage roles
CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 3. Activities master
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Umum',
  sub_category TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_output TEXT,
  default_indicator TEXT,
  target_unit TEXT NOT NULL DEFAULT 'kegiatan',
  lfa_level TEXT NOT NULL DEFAULT 'activity',
  budget_category TEXT NOT NULL DEFAULT 'Operasional',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_read ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY activities_admin_write ON public.activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Proposal versions
CREATE TABLE public.proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.proposal_versions TO authenticated;
GRANT ALL ON public.proposal_versions TO service_role;
ALTER TABLE public.proposal_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_read ON public.proposal_versions FOR SELECT TO authenticated
  USING (public.can_access_proposal(proposal_id));
CREATE POLICY versions_insert ON public.proposal_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_proposal(proposal_id));

-- 5. Help articles
CREATE TABLE public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'Panduan',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_articles TO authenticated;
GRANT ALL ON public.help_articles TO service_role;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY help_read ON public.help_articles FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY help_admin_write ON public.help_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER help_articles_updated_at BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Login histories
CREATE TABLE public.login_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'berhasil',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_histories TO authenticated;
GRANT ALL ON public.login_histories TO service_role;
ALTER TABLE public.login_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY login_hist_read ON public.login_histories FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY login_hist_insert ON public.login_histories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. AI generations log
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL DEFAULT 'narrative',
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sukses',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_gen_read ON public.ai_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ai_gen_insert ON public.ai_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Seed help articles
INSERT INTO public.help_articles (category, title, slug, excerpt, content, sort_order) VALUES
('Memulai','Panduan Memulai','panduan-memulai','Langkah pertama menggunakan EcoGrant AI.','1. Lengkapi profil dan nama organisasi pada menu Profil.\n2. Buka menu Proposal Saya lalu pilih Buat Proposal.\n3. Ikuti wizard sepuluh langkah dari informasi dasar hingga ekspor dokumen.\n4. Seluruh perubahan tersimpan otomatis.',1),
('Panduan','Panduan Wizard Proposal','panduan-wizard','Penjelasan sepuluh langkah penyusunan proposal.','Langkah 1 Informasi Proposal, Langkah 2 Penyusunan Narasi, Langkah 3 Executive Summary, Langkah 4 Pemilihan Donor, Langkah 5 Logical Framework Matrix, Langkah 6 Sinkronisasi SBM, Langkah 7 Sinkronisasi SBU, Langkah 8 Rencana Anggaran Biaya, Langkah 9 Review, Langkah 10 Export.',2),
('Panduan','Panduan Penggunaan AI','panduan-ai','Cara memakai bantuan AI secara bertanggung jawab.','AI menghasilkan draf narasi berdasarkan data proposal. Seluruh hasil wajib ditinjau dan disunting oleh pengguna sebelum diajukan. Semakin lengkap ringkasan ide, lokasi, kategori, dan donor, semakin relevan hasilnya.',3),
('Panduan','Panduan Logical Framework','panduan-lfa','Menyusun matriks kerangka logis.','Logical Framework Matrix memuat Goal, Outcome, Output, Activity, indikator, baseline, target, alat verifikasi, dan asumsi. Baris LFA dapat ditautkan ke item Rencana Anggaran Biaya.',4),
('Panduan','Panduan Standar Biaya Masukan','panduan-sbm','Memahami acuan SBM.','Standar Biaya Masukan adalah acuan harga satuan nasional. Item anggaran yang melebihi SBM ditandai tidak sesuai dan memerlukan alasan penyimpangan.',5),
('Panduan','Panduan Standar Biaya Umum','panduan-sbu','Memahami acuan SBU regional.','Standar Biaya Umum berlaku per provinsi dan kota. Pilih wilayah yang sesuai dengan lokasi pelaksanaan program agar validasi anggaran akurat.',6),
('Panduan','Panduan Rencana Anggaran Biaya','panduan-rab','Menyusun RAB yang valid.','Setiap item RAB memiliki volume, satuan, frekuensi, harga satuan, dan pajak. Total RAB divalidasi terhadap nilai hibah dan standar biaya yang berlaku.',7),
('FAQ','Pertanyaan yang Sering Diajukan','faq','Jawaban atas pertanyaan umum.','Apakah data saya aman? Ya, setiap proposal hanya dapat diakses pemiliknya dan administrator.\nApakah dokumen dapat diekspor? Ya, tersedia format PDF, DOCX, dan XLSX.\nApakah hasil AI dapat disunting? Ya, seluruh hasil dapat disunting bebas.',8),
('Dukungan','Kontak Dukungan','kontak-dukungan','Menghubungi tim dukungan.','Kirim surat elektronik ke dukungan@ecogrant.ai dengan menyertakan nama organisasi, judul proposal, dan tangkapan layar kendala yang dialami.',9);

-- 9. Seed activities
INSERT INTO public.activities (category, sub_category, name, description, default_output, default_indicator, target_unit, lfa_level, budget_category) VALUES
('Rehabilitasi Hutan','Penanaman','Penanaman Pohon Multiguna','Kegiatan penanaman bibit pohon multiguna pada lahan kritis.','Lahan kritis terehabilitasi','Jumlah hektare lahan tertanam','hektare','output','Bahan'),
('Rehabilitasi Hutan','Pembibitan','Pembangunan Persemaian Desa','Pembangunan dan operasional persemaian bibit tingkat desa.','Persemaian desa beroperasi','Jumlah bibit siap tanam','bibit','output','Bahan'),
('Pemberdayaan Masyarakat','Pelatihan','Pelatihan Kelompok Tani Hutan','Peningkatan kapasitas kelompok tani hutan.','Kapasitas kelompok meningkat','Jumlah peserta terlatih','orang','activity','Honorarium'),
('Pemberdayaan Masyarakat','Pendampingan','Pendampingan Usaha Hasil Hutan Bukan Kayu','Pendampingan pengembangan usaha berbasis HHBK.','Usaha kelompok berkembang','Jumlah kelompok terdampingi','kelompok','activity','Perjalanan'),
('Konservasi','Patroli','Patroli Partisipatif Kawasan','Patroli pengamanan kawasan bersama masyarakat.','Kawasan terjaga','Jumlah patroli terlaksana','kegiatan','activity','Perjalanan'),
('Monitoring dan Evaluasi','Monitoring','Monitoring dan Evaluasi Program','Pemantauan capaian indikator program secara berkala.','Laporan monitoring tersusun','Jumlah laporan monitoring','laporan','activity','Operasional'),
('Diseminasi','Publikasi','Lokakarya dan Diseminasi Hasil','Penyebarluasan hasil program kepada pemangku kepentingan.','Hasil program tersebarluaskan','Jumlah peserta lokakarya','orang','activity','Operasional');