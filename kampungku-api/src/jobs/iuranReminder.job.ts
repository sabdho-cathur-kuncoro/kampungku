import cron from 'node-cron';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendWhatsAppBulk, type WaMessage } from '../utils/whatsapp';

const BULAN_LABEL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function buildReminderMessage(args: {
  namaWarga: string;
  namaRT: string;
  tagihan: { jenisNama: string; jumlah: number }[];
  bulan: number;
  tahun: number;
}): string {
  const bulanLabel = BULAN_LABEL[args.bulan - 1];
  const totalJumlah = args.tagihan.reduce((s, t) => s + t.jumlah, 0);
  const detail = args.tagihan
    .map((t) => `  - ${t.jenisNama}: Rp ${t.jumlah.toLocaleString('id-ID')}`)
    .join('\n');

  return [
    `Halo ${args.namaWarga},`,
    '',
    `Ini pengingat iuran ${args.namaRT} bulan ${bulanLabel} ${args.tahun} yang belum dibayar:`,
    detail,
    `Total: Rp ${totalJumlah.toLocaleString('id-ID')}`,
    '',
    'Silakan lakukan pembayaran dan konfirmasi melalui aplikasi KampungKu.',
    'Terima kasih.',
  ].join('\n');
}

export async function runIuranReminder(): Promise<void> {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  console.log(`[iuranReminder] Mulai pengiriman reminder iuran ${bulan}/${tahun}...`);

  // Fetch all active tenants
  const tenants = await prisma.rT.findMany({
    where: { isActive: true },
    select: { id: true, nama: true },
  });

  let totalMessages = 0;
  const messages: WaMessage[] = [];

  for (const tenant of tenants) {
    // Find all BELUM_BAYAR tagihan for this month, grouped by warga
    const tagihan = await prisma.iuranTagihan.findMany({
      where: {
        rtId: tenant.id,
        bulan,
        tahun,
        status: 'BELUM_BAYAR',
      },
      select: {
        jumlah: true,
        warga: {
          select: {
            user: { select: { name: true, phone: true } },
          },
        },
        jenisIuran: { select: { nama: true } },
      },
    });

    // Group by warga phone
    const byPhone = new Map<
      string,
      { namaWarga: string; tagihan: { jenisNama: string; jumlah: number }[] }
    >();

    for (const t of tagihan) {
      const phone = t.warga.user.phone;
      if (!phone) continue;

      const existing = byPhone.get(phone);
      const item = { jenisNama: t.jenisIuran.nama, jumlah: Number(t.jumlah) };

      if (existing) {
        existing.tagihan.push(item);
      } else {
        byPhone.set(phone, { namaWarga: t.warga.user.name, tagihan: [item] });
      }
    }

    for (const [phone, { namaWarga, tagihan: items }] of byPhone) {
      messages.push({
        target: phone,
        message: buildReminderMessage({ namaWarga, namaRT: tenant.nama, tagihan: items, bulan, tahun }),
      });
    }

    totalMessages += byPhone.size;
  }

  console.log(`[iuranReminder] ${totalMessages} warga perlu diingatkan di ${tenants.length} tenant.`);

  const result = await sendWhatsAppBulk(messages);

  if (result.skipped > 0) {
    console.log(`[iuranReminder] Fonnte tidak dikonfigurasi — ${result.skipped} pesan dilewati.`);
  } else {
    console.log(
      `[iuranReminder] Selesai. Terkirim: ${result.sent}, Gagal: ${result.failed}.`,
    );
  }
}

/**
 * Register the cron job. Runs at 08:00 every day; triggers the reminder
 * only on IURAN_REMINDER_DAY of each month.
 */
export function registerIuranReminderJob(): void {
  cron.schedule('0 8 * * *', async () => {
    const today = new Date().getDate();
    if (today !== env.IURAN_REMINDER_DAY) return;

    try {
      await runIuranReminder();
    } catch (err) {
      console.error('[iuranReminder] Error:', err);
    }
  });

  console.log(
    `[iuranReminder] Terjadwal — setiap tanggal ${env.IURAN_REMINDER_DAY} pukul 08:00.`,
  );
}
