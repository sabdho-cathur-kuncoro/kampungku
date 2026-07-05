import type { Role } from '@/lib/auth';

export type { Role };

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Warga ────────────────────────────────────────────────────────────────────

export type StatusTinggal = 'TETAP' | 'KONTRAK' | 'KOST' | 'PINDAH';

export interface AnggotaKeluarga {
  id: string;
  wargaId: string;
  nama: string;
  nik: string;
  hubungan: string;
  tglLahir: string;
  jenisKelamin: string;
  pekerjaan: string | null;
  pendidikan: string | null;
}

export interface Warga {
  id: string;
  nik: string;
  noKk: string;
  alamat: string;
  rtId: string;
  statusTinggal: StatusTinggal;
  tglMasuk: string | null;
  fotoProfilUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'isActive'>;
}

// ─── Iuran ────────────────────────────────────────────────────────────────────

export type StatusIuran = 'BELUM_BAYAR' | 'MENUNGGU_VERIFIKASI' | 'LUNAS';

export interface JenisIuran {
  id: string;
  tenantId: string;
  nama: string;
  jumlah: number;
  keterangan: string | null;
  isAktif: boolean;
}

export interface IuranTagihan {
  id: string;
  wargaId: string;
  jenisIuranId: string;
  rtId: string;
  bulan: number;
  tahun: number;
  jumlah: number;
  status: StatusIuran;
  tglBayar: string | null;
  verifiedBy: string | null;
  catatan: string | null;
  createdAt: string;
  warga: Pick<Warga, 'id' | 'nik'> & { user: Pick<User, 'id' | 'name'> };
  jenisIuran: Pick<JenisIuran, 'id' | 'nama'>;
}

// ─── Pengumuman ───────────────────────────────────────────────────────────────

export type KategoriPengumuman = 'UMUM' | 'KEGIATAN' | 'KEUANGAN' | 'DARURAT';

export interface Pengumuman {
  id: string;
  judul: string;
  konten: string;
  kategori: KategoriPengumuman;
  isPinned: boolean;
  tglMulai: string;
  tglSelesai: string | null;
  rtId: string;
  createdAt: string;
  author: Pick<User, 'id' | 'name' | 'role'>;
}

// ─── Surat ────────────────────────────────────────────────────────────────────

export type JenisSurat =
  | 'DOMISILI'
  | 'KETERANGAN_TIDAK_MAMPU'
  | 'KETERANGAN_USAHA'
  | 'PENGANTAR_KTP'
  | 'PENGANTAR_KK'
  | 'LAINNYA';

export type StatusSurat = 'DIAJUKAN' | 'DIPROSES' | 'DISETUJUI' | 'DITOLAK';

export interface PermohonanSurat {
  id: string;
  tenantId: string;
  jenisSurat: JenisSurat;
  keperluan: string;
  status: StatusSurat;
  noSurat: string | null;
  alasanTolak: string | null;
  tglDiajukan: string;
  tglDiproses: string | null;
  warga: Pick<Warga, 'id' | 'nik' | 'alamat'> & { user: Pick<User, 'id' | 'name'> };
  approver: Pick<User, 'id' | 'name'> | null;
}

// ─── Pengaduan ────────────────────────────────────────────────────────────────

export type StatusPengaduan = 'BARU' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';

export interface Pengaduan {
  id: string;
  tenantId: string;
  judul: string;
  deskripsi: string;
  isAnonim: boolean;
  status: StatusPengaduan;
  tanggapan: string | null;
  createdAt: string;
  updatedAt: string;
  warga: (Pick<Warga, 'id'> & { user: Pick<User, 'id' | 'name'> }) | null;
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export type MessageRole = 'USER' | 'ASSISTANT';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface ChatSendResponse {
  message: string;
  quota: ChatQuota;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  quota: ChatQuota;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  warga: {
    total: number;
    byStatus: Record<StatusTinggal, number>;
  };
  keluarga: { totalAnggota: number };
  pengaduan: Record<StatusPengaduan, number>;
  surat: Record<StatusSurat, number>;
  iuranBulanIni: {
    bulan: number;
    tahun: number;
    byStatus: Record<StatusIuran, { count: number; total: number }>;
  };
  pengumumanAktif: number;
}
