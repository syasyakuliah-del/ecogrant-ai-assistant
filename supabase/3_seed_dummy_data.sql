-- ============================================================================
-- EcoGrant AI - 3_seed_dummy_data.sql
-- Generating Enterprise Dummy Data for Testing (PRD 42)
-- ============================================================================

DO $$
BEGIN
  -- 1. Seed 20 Users & Profiles
  FOR i IN 1..20 LOOP
    INSERT INTO public.profiles (id, full_name, email, organization_name, position, status, created_at)
    VALUES (
      gen_random_uuid(),
      'Pengelola Program Eco ' || i,
      'user_dummy_' || i || '@ecogrant.org',
      'Yayasan Konservasi Nusantara ' || ((i % 5) + 1),
      'Project Officer',
      CASE WHEN i % 10 = 0 THEN 'nonaktif' ELSE 'aktif' END,
      now() - (i || ' days')::interval
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 2. Seed 30 Donors
  FOR i IN 1..30 LOOP
    INSERT INTO public.donors (name, category, country, website, email, phone, min_grant, max_grant, currency, is_active)
    VALUES (
      'Lembaga Donor Hibah ' || i,
      CASE WHEN i % 3 = 0 THEN 'Bilateral' WHEN i % 3 = 1 THEN 'Multilateral' ELSE 'Filantropi' END,
      CASE WHEN i % 4 = 0 THEN 'Indonesia' WHEN i % 4 = 1 THEN 'Jerman' WHEN i % 4 = 2 THEN 'Jepang' ELSE 'Amerika Serikat' END,
      'https://donor' || i || '.example.org',
      'grant@donor' || i || '.example.org',
      '021-5550' || i,
      50000000 * (i % 5 + 1),
      500000000 * (i % 5 + 1),
      'IDR',
      true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 3. Seed 500 SBM items
  FOR i IN 1..500 LOOP
    INSERT INTO public.sbm (year, version, code, category, description, unit, price, region_code, is_active)
    VALUES (
      2026,
      '1.0',
      'SBM-' || LPAD(i::text, 4, '0'),
      CASE WHEN i % 4 = 0 THEN 'Honorarium' WHEN i % 4 = 1 THEN 'Perjalanan Dinas' WHEN i % 4 = 2 THEN 'Sewa Kendaraan' ELSE 'Operasional' END,
      'Standard Biaya Masukan Item Kehutanan ' || i,
      CASE WHEN i % 3 = 0 THEN 'OJ' WHEN i % 3 = 1 THEN 'OH' ELSE 'Unit' END,
      50000 + (i * 2500),
      CASE WHEN i % 5 = 0 THEN 'JAKARTA' WHEN i % 5 = 1 THEN 'SUMATERA' WHEN i % 5 = 2 THEN 'KALIMANTAN' WHEN i % 5 = 3 THEN 'SULAWESI' ELSE 'NASIONAL' END,
      true
    ) ON CONFLICT (year, version, code, region_code) DO NOTHING;
  END LOOP;

  -- 4. Seed 500 SBU items
  FOR i IN 1..500 LOOP
    INSERT INTO public.sbu (year, version, code, category, description, unit, price, province_code, city_code, is_active)
    VALUES (
      2026,
      '1.0',
      'SBU-' || LPAD(i::text, 4, '0'),
      CASE WHEN i % 3 = 0 THEN 'Akomodasi Hotel' WHEN i % 3 = 1 THEN 'Transportasi Lokal' ELSE 'Konsumsi Rapat' END,
      'Standard Biaya Umum Regional ' || i,
      CASE WHEN i % 2 = 0 THEN 'OH' ELSE 'Paket' END,
      100000 + (i * 3500),
      CASE WHEN i % 4 = 0 THEN 'DKI JAKARTA' WHEN i % 4 = 1 THEN 'JAWA BARAT' WHEN i % 4 = 2 THEN 'KALIMANTAN TIMUR' ELSE 'PAPUA' END,
      'SEMUA',
      true
    ) ON CONFLICT (year, version, code, province_code, city_code) DO NOTHING;
  END LOOP;

  -- 5. Seed 100 Activities
  FOR i IN 1..100 LOOP
    INSERT INTO public.activities (name, category, description, target_unit, lfa_level, budget_category, is_active)
    VALUES (
      'Kegiatan Lapangan Pelestarian ' || i,
      CASE WHEN i % 3 = 0 THEN 'Restorasi Hutan' WHEN i % 3 = 1 THEN 'Pemberdayaan Desa' ELSE 'Edukasi Lingkungan' END,
      'Deskripsi ringkas pelaksanaan kegiatan konservasi ' || i,
      'kegiatan',
      'activity',
      'Operasional',
      true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- 6. Seed 20 Community Articles
  FOR i IN 1..20 LOOP
    INSERT INTO public.community_posts (title, slug, category, excerpt, content, status, views_count, is_published, created_at)
    VALUES (
      'Artikel Berbagi Pengalaman Hibah ' || i,
      'artikel-berbagi-pengalaman-hibah-' || i,
      CASE WHEN i % 3 = 0 THEN 'Tips & Trik' WHEN i % 3 = 1 THEN 'Kisah Sukses' ELSE 'Panduan LFA' END,
      'Ringkasan praktis cara menyusun proposal yang disetujui donor...',
      'Konten artikel lengkap berisi strategi dan langkah praktis untuk pengajuan hibah...',
      'tampil',
      10 * i,
      true,
      now() - (i || ' days')::interval
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
