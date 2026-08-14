import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Leaf, Cpu, Database, FileText, CheckCircle, Calculator, Search, AlignLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans selection:bg-green-200">
      {/* Navbar */}
      <header className="px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-green-900">
          EcoGrant AI
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-gray-600">
          <a href="#fitur" className="hover:text-green-800">Fitur</a>
          <a href="#tentang" className="hover:text-green-800">Tentang Kami</a>
          <a href="#komunitas" className="hover:text-green-800">Komunitas</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-xs font-medium text-gray-700 hover:text-green-800">
            Masuk
          </Link>
          <Link to="/auth" className="bg-[#0f4c3a] hover:bg-[#0a3628] text-white px-5 py-2 rounded text-xs font-medium transition-colors">
            Daftar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-20 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] text-gray-900 tracking-tight">
            Wujudkan Dampak Nyata dengan Proposal Hibah Berbasis AI
          </h1>
          <p className="text-sm text-gray-600 max-w-lg leading-relaxed">
            EcoGrant AI adalah generator proposal yang cepat, konsisten, dan terstandardisasi khusus untuk sektor kehutanan dan sosial. Fokus pada konservasi, biarkan AI menyusun narasi teknis Anda.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/auth" className="bg-[#0f4c3a] hover:bg-[#0a3628] text-white px-5 py-2.5 rounded text-xs font-medium transition-colors inline-flex items-center gap-2">
              Mulai Susun Proposal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a href="#fitur" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded text-xs font-medium transition-colors">
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
        <div className="flex-1 w-full bg-[#eef4f1] rounded-2xl flex flex-col items-center justify-center p-8 min-h-[400px] relative overflow-hidden">
          <div className="text-center z-10 w-full">
            <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium mb-4 w-full">
              <span>EcoGrant AI</span>
              <div className="flex gap-4">
                <span>Platform ▼</span>
                <span>Import ▼</span>
                <span>About</span>
                <span>Login</span>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 text-lg">Accelerating Green Impact with Intelligent Funding.</h3>
            <div className="w-full max-w-[280px] aspect-square mx-auto relative mt-6 mb-8 flex items-end justify-center">
              {/* Abstract tree representation */}
              <Leaf className="w-48 h-48 text-[#1a7348] opacity-90 absolute bottom-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#eef4f1] via-transparent to-transparent z-10"></div>
              <div className="w-full h-12 bg-blue-400/20 rounded-full blur-xl absolute bottom-0"></div>
              <div className="flex flex-wrap justify-center gap-1 absolute bottom-4 w-full z-20">
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-blue-500/60" style={{ transform: `translateY(${Math.random() * -20}px)` }}></div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-green-900/10 w-full text-left">
              <span className="font-bold text-xl text-green-900">EcoGrant AI</span>
              <span className="text-[10px] text-gray-600 border-l border-gray-300 pl-3 leading-tight">Empowering Sustainable<br/>innovation with AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mengapa EcoGrant AI */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-3">Mengapa EcoGrant AI?</h2>
        <p className="text-gray-600 text-sm max-w-2xl mx-auto mb-12 leading-relaxed">
          Platform terpadu yang menghilangkan kerumitan administratif, memungkinkan NGO dan inisiatif lokal fokus pada pelaksanaan lapangan.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-[#f2f7f4] p-6 rounded-xl space-y-3">
            <div className="w-8 h-8 bg-green-100 text-green-700 rounded flex items-center justify-center mb-4">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold">Single Source of Truth</h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Semua data organisasi, profil, dan rekam jejak tersimpan aman di satu tempat. Tidak perlu lagi mencari dokumen lama atau mengetik ulang informasi dasar untuk setiap proposal.
            </p>
          </div>
          <div className="bg-[#f2f7f4] p-6 rounded-xl space-y-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded flex items-center justify-center mb-4">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold">AI Narrative Synthesis</h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Model bahasa kami dilatih khusus untuk memahami konteks kehutanan dan pemberdayaan sosial, menghasilkan latar belakang dan metodologi yang persuasif dan sesuai standar donor internasional.
            </p>
          </div>
          <div className="bg-[#f2f7f4] p-6 rounded-xl space-y-3">
            <div className="w-8 h-8 bg-gray-200 text-gray-700 rounded flex items-center justify-center mb-4">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold">Data Integration</h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              Sinkronisasi otomatis dengan standar biaya regional (SBM/SBU) dan kerangka logis yang memastikan aktivitas dan anggaran selalu selaras secara matematis.
            </p>
          </div>
        </div>
      </section>

      {/* Fitur Inti Generator */}
      <section id="fitur" className="px-6 py-20 bg-[#f4f7f5]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-10">Fitur Inti Generator</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl flex gap-4 shadow-sm border border-gray-100">
              <div className="text-[#1a7348] shrink-0 mt-0.5"><AlignLeft className="w-5 h-5" /></div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">AI Narrative Generator</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Menyusun latar belakang masalah yang kuat, justifikasi intervensi, dan metodologi pelaksanaan dengan nada profesional. Sistem memberikan saran perbaikan narasi berdasarkan kriteria spesifik donor.</p>
                <div className="bg-blue-50 border-l-[3px] border-blue-500 p-2.5 mt-2 text-[10px] text-blue-800 rounded-r-sm">
                  <strong className="block mb-0.5">AI Suggestion</strong>
                  "Penambahan data deforestasi sekunder akan memperkuat argumen urgensi intervensi pada paragraf 2."
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl flex gap-4 shadow-sm border border-gray-100">
              <div className="text-[#1a7348] shrink-0 mt-0.5"><CheckCircle className="w-5 h-5" /></div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Logical Framework Matrix (LFA)</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Penyusunan matriks LFA otomatis. Sistem memastikan keselarasan logis antara Tujuan Utama (Goal), Hasil yang Diharapkan (Outcomes), Keluaran (Outputs), dan Aktivitas (Activities).</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl flex gap-4 shadow-sm border border-gray-100">
              <div className="text-[#1a7348] shrink-0 mt-0.5"><Calculator className="w-5 h-5" /></div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">RAB & SBM/SBU Sync</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Validasi finansial real-time. Rencana Anggaran Biaya (RAB) otomatis divalidasi terhadap Standar Biaya Masukan (SBM) regional untuk menghindari penolakan proposal karena ketidakwajaran anggaran.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl flex gap-4 shadow-sm border border-gray-100">
              <div className="text-[#1a7348] shrink-0 mt-0.5"><Search className="w-5 h-5" /></div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Donor Matching</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Algoritma pencocokan cerdas yang merekomendasikan donor potensial atau program hibah (Grant Calls) yang terbuka berdasarkan tema proyek, wilayah geografis, dan skala anggaran Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Langkah */}
      <section className="px-6 py-20 bg-[#eef2f0] text-center">
        <h2 className="text-2xl font-bold mb-3">10 Langkah Menuju Proposal Sempurna</h2>
        <p className="text-gray-600 text-sm max-w-2xl mx-auto mb-12">
          Proses yang terstruktur memandu Anda dari pengumpulan data awal hingga dokumen akhir yang siap dikirim.
        </p>
        
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3">
          {[
            { step: '1-2', title: 'Inisiasi & Konteks', desc: 'Info Proyek & Konteks Wilayah' },
            { step: '3-4', title: 'Kerangka Logis', desc: 'Pohon Masalah & Matriks LFA' },
            { step: '5-6', title: 'Pelaksanaan', desc: 'Rencana Kerja & Monitoring' },
            { step: '7-8', title: 'Penganggaran', desc: 'Struktur Organisasi & RAB', ai: true },
            { step: '9-10', title: 'Finalisasi', desc: 'Review, Export & Signoff', ai: true }
          ].map((item, i) => (
            <div key={i} className="bg-[#f8faf9] p-5 rounded-lg w-full sm:w-[48%] lg:flex-1 text-center relative shadow-sm border border-white/50">
              {item.ai && (
                <span className="absolute -top-2.5 right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">AI Assist</span>
              )}
              <div className="w-8 h-8 mx-auto bg-[#0a4f32] text-white rounded-full flex items-center justify-center text-[11px] font-bold mb-3 shadow-inner">
                {item.step}
              </div>
              <h4 className="font-bold text-xs mb-1.5">{item.title}</h4>
              <p className="text-[10px] text-gray-500 leading-tight px-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#f8faf9]">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between text-center gap-6 px-6">
          <div className="flex-1 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[#0a4f32] mb-1">1,250+</div>
            <div className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Proposal Dihasilkan</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[#0a4f32] mb-1">45</div>
            <div className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Donor Aktif Terindeks</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[#0a4f32] mb-1">85%</div>
            <div className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Tingkat Kesuksesan Format</div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[#0a4f32] mb-1">60%</div>
            <div className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Waktu Penyusunan Hemat</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0f4c3a] text-white text-center py-20 px-6">
        <h2 className="text-3xl font-bold mb-4">Siap Mengajukan Hibah Anda?</h2>
        <p className="text-green-100/90 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
          Bergabunglah dengan ratusan organisasi konservasi yang telah menstandarisasi pengajuan hibah mereka dengan EcoGrant AI.
        </p>
        <Link to="/auth" className="bg-white text-[#0f4c3a] hover:bg-gray-100 px-6 py-3 rounded text-xs font-bold transition-colors inline-flex items-center gap-2">
          Mulai Sekarang - Gratis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#eef2f0] px-6 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-gray-600">
          <div className="font-bold text-[#0a4f32] text-xs">EcoGrant AI</div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 font-medium">
            <a href="#" className="hover:text-[#0a4f32] transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-[#0a4f32] transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-[#0a4f32] transition-colors">Kontak Kami</a>
            <a href="#" className="hover:text-[#0a4f32] transition-colors">Peta Situs</a>
          </div>
          <div className="font-medium">© 2024 EcoGrant AI. Solusi Cerdas untuk Konservasi dan Sektor Sosial.</div>
        </div>
      </footer>
    </div>
  );
}
