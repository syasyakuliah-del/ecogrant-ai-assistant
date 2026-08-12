-- ============================================================================
-- PART 2: MASTER SEED DATA
-- Project: EcoGrant AI (scnouypfyimjuonbnnhj)
-- PRD Section 25 Compliant Seed Data
-- ============================================================================

-- 1. SEED ROLES
INSERT INTO public.roles (name, code, description, is_system) VALUES
  ('admin', 'ROLE_ADMIN', 'Administrator dengan hak pengelolaan penuh sistem', true),
  ('user', 'ROLE_USER', 'Pengguna operasional untuk membuat dan mengelola proposal', true)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. SEED PERMISSIONS
INSERT INTO public.permissions (name, code, module, category, description) VALUES
  ('dashboard.user.view', 'PERM_DASHBOARD_USER', 'Dashboard', 'Dashboard', 'Melihat dashboard user'),
  ('dashboard.admin.view', 'PERM_DASHBOARD_ADMIN', 'Dashboard', 'Dashboard', 'Melihat dashboard admin'),
  ('proposal.create', 'PERM_PROPOSAL_CREATE', 'Proposal', 'Proposal', 'Membuat proposal baru'),
  ('proposal.view.own', 'PERM_PROPOSAL_VIEW_OWN', 'Proposal', 'Proposal', 'Melihat proposal milik sendiri atau workspace'),
  ('proposal.view.all', 'PERM_PROPOSAL_VIEW_ALL', 'Proposal', 'Proposal', 'Melihat seluruh proposal sistem'),
  ('proposal.update.own', 'PERM_PROPOSAL_UPDATE_OWN', 'Proposal', 'Proposal', 'Mengedit proposal milik sendiri'),
  ('proposal.update.all', 'PERM_PROPOSAL_UPDATE_ALL', 'Proposal', 'Proposal', 'Mengedit seluruh proposal sistem'),
  ('proposal.delete.own', 'PERM_PROPOSAL_DELETE_OWN', 'Proposal', 'Proposal', 'Menghapus proposal sendiri (soft delete)'),
  ('proposal.delete.all', 'PERM_PROPOSAL_DELETE_ALL', 'Proposal', 'Proposal', 'Menghapus seluruh proposal sistem'),
  ('proposal.approve', 'PERM_PROPOSAL_APPROVE', 'Proposal', 'Proposal', 'Mengubah status dan memberikan approval proposal'),
  ('proposal.export', 'PERM_PROPOSAL_EXPORT', 'Proposal', 'Proposal', 'Mengekspor proposal (PDF, Word, Excel)'),
  ('ai.generate', 'PERM_AI_GENERATE', 'AI', 'AI Generator', 'Menjalankan AI generator untuk proposal'),
  ('donor.manage', 'PERM_DONOR_MANAGE', 'Master Data', 'Master Data', 'Mengelola master data donor (CRUD)'),
  ('sbm.manage', 'PERM_SBM_MANAGE', 'Master Data', 'Master Data', 'Mengelola master data SBM (CRUD)'),
  ('sbu.manage', 'PERM_SBU_MANAGE', 'Master Data', 'Master Data', 'Mengelola master data SBU (CRUD)'),
  ('activity.manage', 'PERM_ACTIVITY_MANAGE', 'Master Data', 'Master Data', 'Mengelola master data kegiatan (CRUD)'),
  ('user.manage', 'PERM_USER_MANAGE', 'User Management', 'User & RBAC', 'Mengelola pengguna, hak akses, peran, dan reset password'),
  ('community.manage', 'PERM_COMMUNITY_MANAGE', 'Community', 'Community', 'Mengelola artikel community dan moderasi komentar'),
  ('analytics.view', 'PERM_ANALYTICS_VIEW', 'Analytics', 'Analytics & System', 'Melihat analytics dan mengekspor laporan platform'),
  ('audit.view', 'PERM_AUDIT_VIEW', 'System', 'Analytics & System', 'Melihat seluruh Audit Log sistem'),
  ('settings.manage', 'PERM_SETTINGS_MANAGE', 'System', 'Analytics & System', 'Mengelola System Settings')
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

-- 4. SEED DONOR CATEGORIES & DONORS
INSERT INTO public.donor_categories (name, code, description) VALUES
  ('Multilateral', 'CAT_MULTI', 'Lembaga pendanaan internasional multilateral'),
  ('Bilateral', 'CAT_BI', 'Lembaga pendanaan hubungan dua negara'),
  ('Yayasan Filantropi', 'CAT_FILANTROPI', 'Yayasan donor internasional & nasional'),
  ('Yayasan Nasional', 'CAT_NASIONAL', 'Yayasan hibah lokal Indonesia'),
  ('Pemerintah', 'CAT_GOV', 'Lembaga pendanaan atau badan pengelola dana pemerintah')
ON CONFLICT (name) DO NOTHING;

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

-- 7. SEED ACTIVITY CATEGORIES & ACTIVITIES
INSERT INTO public.activity_categories (name, code, description) VALUES
  ('Rehabilitasi Hutan', 'ACT_CAT_REHAB', 'Kegiatan penanaman dan restorasi kawasan hutan'),
  ('Pemberdayaan Masyarakat', 'ACT_CAT_PEMBERDAYAAN', 'Peningkatan kapasitas dan ekonomi kelompok tani'),
  ('Konservasi', 'ACT_CAT_KONSERVASI', 'Pengamanan kawasan dan riset keanekaragaman hayati'),
  ('Monitoring dan Evaluasi', 'ACT_CAT_MONEV', 'Pemantauan dan evaluasi program berkala')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.activities (category, sub_category, name, description, default_output, default_indicator, target_unit, lfa_level, budget_category) VALUES
('Rehabilitasi Hutan','Penanaman','Penanaman Pohon Multiguna','Kegiatan penanaman bibit pohon multiguna pada lahan kritis.','Lahan kritis terehabilitasi','Jumlah hektare lahan tertanam','hektare','output','Bahan'),
('Pemberdayaan Masyarakat','Pelatihan','Pelatihan Kelompok Tani Hutan','Peningkatan kapasitas kelompok tani hutan.','Kapasitas kelompok meningkat','Jumlah peserta terlatih','orang','activity','Honorarium'),
('Konservasi','Patroli','Patroli Partisipatif Kawasan','Patroli pengamanan kawasan bersama masyarakat.','Kawasan terjaga','Jumlah patroli terlaksana','kegiatan','activity','Perjalanan'),
('Monitoring dan Evaluasi','Monitoring','Monitoring dan Evaluasi Program','Pemantauan capaian indikator program secara berkala.','Laporan monitoring tersusun','Jumlah laporan monitoring','laporan','activity','Operasional')
ON CONFLICT DO NOTHING;

-- 8. SEED COMMUNITY CATEGORIES
INSERT INTO public.community_categories (name, slug, description) VALUES
  ('Praktik Baik', 'praktik-baik', 'Praktik baik dan pembelajaran lapangan'),
  ('Panduan Proposal', 'panduan-proposal', 'Panduan teknis penyusunan proposal hibah'),
  ('Studi Kasus', 'studi-kasus', 'Studi kasus program lingkungan hidup'),
  ('Info Donor', 'info-donor', 'Peluang dan info panggilan proposal hibah'),
  ('Umum', 'umum', 'Diskusi umum komunitas')
ON CONFLICT (slug) DO NOTHING;

-- 9. SEED SYSTEM SETTINGS
INSERT INTO public.system_settings (key, value_json, is_public, description) VALUES
  ('platform.info', '{"name": "EcoGrant AI", "version": "1.0.0", "description": "Generator Proposal Hibah AI Lingkungan Hidup"}', true, 'Informasi umum platform'),
  ('platform.financial', '{"default_tax_rate": 0.11, "currency_default": "IDR"}', true, 'Default keuangan dan pajak PPN'),
  ('ai.config', '{"enabled": true, "default_model": "gpt-4o-mini", "max_tokens_per_request": 4000}', false, 'Pengaturan AI Generator')
ON CONFLICT (key) DO NOTHING;

-- 10. SEED HELP ARTICLES
INSERT INTO public.help_articles (category, title, slug, excerpt, content, sort_order) VALUES
('Memulai','Panduan Memulai Wizard Proposal','panduan-memulai','Langkah pertama menggunakan EcoGrant AI.','1. Lengkapi profil dan nama organisasi pada menu Profil.\n2. Buka menu Proposal Saya lalu pilih Buat Proposal.\n3. Ikuti wizard sepuluh langkah dari informasi dasar hingga ekspor dokumen.\n4. Seluruh perubahan tersimpan otomatis.',1),
('Panduan','Panduan Wizard Proposal 10 Langkah','panduan-wizard','Penjelasan sepuluh langkah penyusunan proposal.','Langkah 1 Informasi Proposal, Langkah 2 Penyusunan Narasi, Langkah 3 Executive Summary, Langkah 4 Pemilihan Donor, Langkah 5 Logical Framework Matrix, Langkah 6 Sinkronisasi SBM, Langkah 7 Sinkronisasi SBU, Langkah 8 Rencana Anggaran Biaya, Langkah 9 Review, Langkah 10 Export.',2)
ON CONFLICT (slug) DO NOTHING;

-- 11. ENSURE SYASYAKULIAH@GMAIL.COM IS SET AS ADMIN
INSERT INTO public.user_roles (user_id, role, role_id)
SELECT id, 'admin'::public.app_role, (SELECT id FROM public.roles WHERE name = 'admin')
FROM auth.users WHERE email = 'syasyakuliah@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin', role_id = EXCLUDED.role_id;

UPDATE public.user_roles SET role = 'admin' WHERE role_id IS NULL;
