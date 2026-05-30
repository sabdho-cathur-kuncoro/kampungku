import Link from 'next/link';
import {
  Users,
  Wallet,
  Bell,
  FileText,
  MessageSquare,
  BarChart2,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from 'lucide-react';

// ─── Data ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Users,
    title: 'Data Kependudukan',
    desc: 'Kelola data warga, kartu keluarga, dan status tinggal dalam satu sistem terpadu.',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Wallet,
    title: 'Iuran Bulanan',
    desc: 'Buat tagihan, konfirmasi pembayaran, dan verifikasi bendahara secara digital.',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Bell,
    title: 'Pengumuman',
    desc: 'Publikasikan informasi kegiatan, keuangan, dan darurat ke seluruh warga.',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    icon: FileText,
    title: 'Layanan Surat',
    desc: 'Warga ajukan surat keterangan secara online, unduh PDF setelah disetujui.',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    icon: MessageSquare,
    title: 'Pengaduan Warga',
    desc: 'Tampung aspirasi dan keluhan warga, termasuk pengaduan anonim.',
    color: 'text-red-600 bg-red-50',
  },
  {
    icon: BarChart2,
    title: 'Laporan Keuangan',
    desc: 'Rekap iuran terkumpul, tunggakan, dan grafik keuangan per bulan.',
    color: 'text-teal-600 bg-teal-50',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'RT Mendaftar',
    desc: 'Admin platform mendaftarkan RT dan membuat akun admin awal.',
  },
  {
    num: '02',
    title: 'Admin Menyiapkan Data',
    desc: 'Admin input data warga, jenis iuran, dan mengatur pengguna.',
  },
  {
    num: '03',
    title: 'Warga Mulai Mengakses',
    desc: 'Warga login, bayar iuran, ajukan surat, dan ikuti pengumuman RT.',
  },
];

const STATS = [
  { value: '6', label: 'Fitur Lengkap' },
  { value: '6', label: 'Level Akses' },
  { value: '100%', label: 'Gratis & Open Source' },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-body">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="font-heading text-white font-extrabold text-xs">K</span>
            </div>
            <span className="font-heading font-extrabold text-stone-900 text-base">KampungKu</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-heading font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Masuk
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-24 px-4"
        style={{ backgroundColor: '#0f3d20' }}
      >
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-300 font-heading font-semibold text-xs px-3 py-1 rounded-full mb-6">
            <MapPin size={12} />
            Platform RT/RW Digital
          </span>

          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
            Kelola RT Lebih Mudah,{' '}
            <span className="text-green-400">Lebih Cerdas</span>
          </h1>

          <p className="font-body text-green-200 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Kampungmu di Ujung Jari — satu platform untuk data warga, iuran,
            pengumuman, surat keterangan, dan pengaduan RT/RW.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-heading font-semibold px-6 py-3 rounded-xl transition-colors text-base"
            >
              Masuk ke Dashboard
              <ArrowRight size={16} />
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-heading font-semibold px-6 py-3 rounded-xl transition-colors text-base"
            >
              Lihat Fitur
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 divide-x divide-stone-200">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4">
              <span className="font-heading text-3xl font-extrabold text-green-600">{value}</span>
              <span className="font-body text-sm text-stone-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="fitur" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-extrabold text-stone-900 mb-3">
              Semua yang Dibutuhkan RT
            </h2>
            <p className="font-body text-stone-500 max-w-md mx-auto">
              Enam modul terintegrasi untuk administrasi RT yang modern dan efisien.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-stone-200 p-6 hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-heading font-bold text-stone-900 mb-2">{title}</h3>
                <p className="font-body text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-extrabold text-stone-900 mb-3">
              Cara Kerja KampungKu
            </h2>
            <p className="font-body text-stone-500">Mulai gunakan dalam 3 langkah mudah.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="flex flex-col items-center text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center mb-4">
                  <span className="font-heading font-extrabold text-white text-lg">{num}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-0.5 bg-green-200" />
                )}
                <h3 className="font-heading font-bold text-stone-900 mb-2">{title}</h3>
                <p className="font-body text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role overview ───────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-extrabold text-stone-900 mb-3">
              Akses Sesuai Peran
            </h2>
            <p className="font-body text-stone-500 max-w-sm mx-auto">
              Setiap pengguna mendapat tampilan dan hak akses yang sesuai jabatannya.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { role: 'Admin', color: 'bg-red-50 text-red-700 border-red-200' },
              { role: 'Ketua RT', color: 'bg-green-50 text-green-700 border-green-200' },
              { role: 'Bendahara', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { role: 'Sekretaris', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { role: 'Warga', color: 'bg-stone-50 text-stone-700 border-stone-200' },
              { role: 'Super Admin', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            ].map(({ role, color }) => (
              <div
                key={role}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 font-heading font-semibold text-sm ${color}`}
              >
                <CheckCircle2 size={14} />
                {role}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto bg-green-600 rounded-3xl px-8 py-14 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white mb-3">
            Siap Modernisasi RT Anda?
          </h2>
          <p className="font-body text-green-100 mb-8 text-base">
            Mulai gunakan KampungKu sekarang — gratis, aman, dan mudah dipakai di smartphone.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-heading font-bold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-base"
          >
            Masuk Sekarang
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-stone-900 px-4 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-green-600 flex items-center justify-center">
              <span className="font-heading text-white font-extrabold text-[10px]">K</span>
            </div>
            <span className="font-heading font-bold text-white text-sm">KampungKu</span>
            <span className="font-body text-stone-500 text-xs ml-1">— Kampungmu di Ujung Jari</span>
          </div>
          <p className="font-body text-stone-500 text-xs">
            © {new Date().getFullYear()} KampungKu. Hak cipta dilindungi.
          </p>
        </div>
      </footer>

    </div>
  );
}
