-- ============================================================================
-- PART 2: MASTER SEED DATA
-- Project: EcoGrant AI (scnouypfyimjuonbnnhj)
-- ============================================================================

-- 1. SEED ROLES
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Administrator dengan hak pengelolaan penuh sistem'),
  ('user', 'Pengguna operasional untuk membuat dan mengelola proposal')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. SEED PERMISSIONS
INSERT INTO public.permissions (name, description, category) VALUES
  ('dashboard.user.view', 'Melihat dashboard user', 'Dashboard'),
  ('dashboard.admin.view', 'Melihat dashboard admin', 'Dashboard'),
  ('proposal.create', 'Membuat proposal baru', 'Proposal'),
  ('proposal.view.own', 'Melihat proposal milik sendiri atau workspace yang diikuti', 'Proposal'),
  ('proposal.view.all', 'Melihat seluruh proposal sistem', 'Proposal'),
  ('proposal.update.own', 'Mengedit proposal milik sendiri', 'Proposal'),
  ('proposal.update.all', 'Mengedit seluruh proposal sistem', 'Proposal'),
  ('proposal.delete.own', 'Menghapus proposal sendiri dengan soft delete', 'Proposal'),
  ('proposal.delete.all', 'Menghapus seluruh proposal sistem', 'Proposal'),
  ('proposal.approve', 'Mengubah status dan memberikan approval proposal', 'Proposal'),
  ('proposal.export', 'Mengekspor proposal (PDF, Word, Excel)', 'Proposal'),
  ('ai.generate', 'Menjalankan AI generator untuk proposal', 'AI'),
  ('donor.manage', 'Mengelola master data donor (CRUD)', 'Master Data'),
  ('sbm.manage', 'Mengelola master data SBM (CRUD)', 'Master Data'),
  ('sbu.manage', 'Mengelola master data SBU (CRUD)', 'Master Data'),
  ('activity.manage', 'Mengelola master data kegiatan (CRUD)', 'Master Data'),
  ('user.manage', 'Mengelola pengguna, hak akses, peran, dan reset password', 'User Management'),
  ('community.manage', 'Mengelola artikel community dan moderasi komentar', 'Community'),
  ('analytics.view', 'Melihat analytics dan mengekspor laporan platform', 'Analytics'),
  ('audit.view', 'Melihat seluruh Audit Log sistem', 'System'),
  ('settings.manage', 'Mengelola System Settings', 'System')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 3. LINK ROLE PERMISSIONS
DO $$
DECLARE
  v_admin_role_id UUID;
  v_user_role_id UUID;
BEGIN
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO v_user_role_id FROM public.roles WHERE name = 'user';

  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF v_user_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_user_role_id, id FROM public.permissions
    WHERE name IN (
      'dashboard.user.view', 'proposal.create', 'proposal.view.own',
      'proposal.update.own', 'proposal.delete.own', 'proposal.export', 'ai.generate'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 4. SEED DONORS
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
('Dana Indonesia untuk Iklim dan Lingkungan (BPDLH)','Pemerintah','Indonesia','https://bpdlh.id','info@bpdlh.id','+62 21 3512300',
 ARRAY['Mitigasi dan Adaptasi Iklim','Energi Terbarukan','Restorasi Gambut'],
 ARRAY['Penurunan emisi terukur','Pemberdayaan ekonomi lokal','Kesiapan kelembagaan'],
 ARRAY['Legalitas lembaga','Rekening khusus program','RAB sesuai SBM','Sistem MRV emisi'],
 100000000, 2000000000,'IDR','2026-12-31')
ON CONFLICT DO NOTHING;

-- 5. SEED SBM 2026
INSERT INTO public.sbm (year, version, code, category, description, unit, price, region_code, regulation_source, effective_from, effective_until) VALUES
(2026,'1.0','SBM-001','Honorarium','Honorarium Narasumber Pejabat Eselon II','OJ',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-002','Honorarium','Honorarium Narasumber Praktisi atau Ahli','OJ',900000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-003','Honorarium','Honorarium Moderator','OK',700000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-004','Honorarium','Honorarium Panitia Kegiatan','OK',400000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-005','Honorarium','Honorarium Fasilitator Pelatihan Masyarakat','OJ',600000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-010','Perjalanan Dinas','Uang Harian Perjalanan Dinas Dalam Provinsi','OH',380000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-011','Perjalanan Dinas','Uang Harian Perjalanan Dinas Luar Provinsi','OH',430000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-020','Konsumsi','Konsumsi Rapat Makan Siang','OK',65000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-021','Konsumsi','Konsumsi Rapat Kudapan','OK',30000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-030','Sewa','Sewa Ruang Pertemuan Fullday','Paket',3500000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-031','Sewa','Sewa Kendaraan Roda Empat Harian','Unit/Hari',1000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-032','Sewa','Sewa Perahu Motor Survei Lapangan','Unit/Hari',1200000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-040','Bahan','Alat Tulis Kantor Paket Kegiatan','Paket',750000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-050','Jasa Profesional','Jasa Konsultan Individu Ahli Madya','OB',18000000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31'),
(2026,'1.0','SBM-051','Jasa Profesional','Jasa Enumerator Survei Lapangan','OH',300000,'NASIONAL','PMK Standar Biaya Masukan 2026','2026-01-01','2026-12-31')
ON CONFLICT (year, version, code, region_code) DO NOTHING;

-- 6. SEED SBU 2026
INSERT INTO public.sbu (year, version, code, category, description, unit, price, province_code, city_code, source, effective_from) VALUES
(2026,'1.0','SBU-100','Akomodasi','Penginapan Standar Pelaksana','OH',700000,'KALIMANTAN BARAT','KOTA PONTIANAK','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-102','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',950000,'KALIMANTAN BARAT','SEMUA','Peraturan Gubernur Kalimantan Barat','2026-01-01'),
(2026,'1.0','SBU-110','Akomodasi','Penginapan Standar Pelaksana','OH',900000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-112','Transportasi','Sewa Kendaraan Roda Empat','Unit/Hari',1200000,'DKI JAKARTA','SEMUA','Peraturan Gubernur DKI Jakarta','2026-01-01'),
(2026,'1.0','SBU-120','Akomodasi','Penginapan Standar Pelaksana','OH',650000,'SULAWESI SELATAN','KOTA MAKASSAR','Peraturan Gubernur Sulawesi Selatan','2026-01-01'),
(2026,'1.0','SBU-130','Akomodasi','Penginapan Standar Pelaksana','OH',620000,'PAPUA','SEMUA','Peraturan Gubernur Papua','2026-01-01')
ON CONFLICT (year, version, code, province_code, city_code) DO NOTHING;

-- 7. SEED ACTIVITIES
INSERT INTO public.activities (category, sub_category, name, description, default_output, default_indicator, target_unit, lfa_level, budget_category) VALUES
('Rehabilitasi Hutan','Penanaman','Penanaman Pohon Multiguna','Kegiatan penanaman bibit pohon multiguna pada lahan kritis.','Lahan kritis terehabilitasi','Jumlah hektare lahan tertanam','hektare','output','Bahan'),
('Pemberdayaan Masyarakat','Pelatihan','Pelatihan Kelompok Tani Hutan','Peningkatan kapasitas kelompok tani hutan.','Kapasitas kelompok meningkat','Jumlah peserta terlatih','orang','activity','Honorarium'),
('Konservasi','Patroli','Patroli Partisipatif Kawasan','Patroli pengamanan kawasan bersama masyarakat.','Kawasan terjaga','Jumlah patroli terlaksana','kegiatan','activity','Perjalanan'),
('Monitoring dan Evaluasi','Monitoring','Monitoring dan Evaluasi Program','Pemantauan capaian indikator program secara berkala.','Laporan monitoring tersusun','Jumlah laporan monitoring','laporan','activity','Operasional')
ON CONFLICT DO NOTHING;

-- 8. SEED HELP ARTICLES
INSERT INTO public.help_articles (category, title, slug, excerpt, content, sort_order) VALUES
('Memulai','Panduan Memulai Wizard Proposal','panduan-memulai','Langkah pertama menggunakan EcoGrant AI.','1. Lengkapi profil dan nama organisasi pada menu Profil.\n2. Buka menu Proposal Saya lalu pilih Buat Proposal.\n3. Ikuti wizard sepuluh langkah dari informasi dasar hingga ekspor dokumen.\n4. Seluruh perubahan tersimpan otomatis.',1),
('Panduan','Panduan Wizard Proposal 10 Langkah','panduan-wizard','Penjelasan sepuluh langkah penyusunan proposal.','Langkah 1 Informasi Proposal, Langkah 2 Penyusunan Narasi, Langkah 3 Executive Summary, Langkah 4 Pemilihan Donor, Langkah 5 Logical Framework Matrix, Langkah 6 Sinkronisasi SBM, Langkah 7 Sinkronisasi SBU, Langkah 8 Rencana Anggaran Biaya, Langkah 9 Review, Langkah 10 Export.',2)
ON CONFLICT (slug) DO NOTHING;

-- 9. SYNC EXISTING USER TO ADMIN IF ANY
UPDATE public.user_roles SET role = 'admin' WHERE role_id IS NULL;
