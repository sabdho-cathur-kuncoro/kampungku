import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';

type WargaRow = {
  nik: string;
  noKk: string;
  alamat: string;
  statusTinggal: string;
  tglMasuk: Date | null;
  user: { name: string; email: string; phone: string | null };
  anggotaKeluarga: {
    nama: string;
    nik: string;
    hubungan: string;
    tglLahir: Date;
    jenisKelamin: string;
    pekerjaan: string | null;
    pendidikan: string | null;
  }[];
};

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export async function streamWargaXlsx(
  res: Response,
  rows: WargaRow[],
  namaRT: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KampungKu';
  workbook.created = new Date();

  // Sheet 1: Data Warga
  const wsWarga = workbook.addWorksheet('Data Warga');
  wsWarga.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Lengkap', key: 'nama', width: 25 },
    { header: 'NIK', key: 'nik', width: 18 },
    { header: 'No. KK', key: 'noKk', width: 18 },
    { header: 'Alamat', key: 'alamat', width: 35 },
    { header: 'Status Tinggal', key: 'statusTinggal', width: 16 },
    { header: 'Tgl Masuk', key: 'tglMasuk', width: 14 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'No. HP', key: 'phone', width: 16 },
    { header: 'Jml Anggota KK', key: 'jmlAnggota', width: 16 },
  ];

  // Header row styling
  wsWarga.getRow(1).font = { bold: true };
  wsWarga.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };

  rows.forEach((w, i) => {
    wsWarga.addRow({
      no: i + 1,
      nama: w.user.name,
      nik: w.nik,
      noKk: w.noKk,
      alamat: w.alamat,
      statusTinggal: w.statusTinggal,
      tglMasuk: w.tglMasuk
        ? w.tglMasuk.toLocaleDateString('id-ID')
        : '-',
      email: w.user.email,
      phone: w.user.phone ?? '-',
      jmlAnggota: w.anggotaKeluarga.length,
    });
  });

  // Sheet 2: Anggota Keluarga
  const wsKK = workbook.addWorksheet('Anggota Keluarga');
  wsKK.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama KK (Warga)', key: 'namaKK', width: 25 },
    { header: 'Nama Anggota', key: 'nama', width: 25 },
    { header: 'NIK', key: 'nik', width: 18 },
    { header: 'Hubungan', key: 'hubungan', width: 16 },
    { header: 'Tgl Lahir', key: 'tglLahir', width: 14 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 14 },
    { header: 'Pekerjaan', key: 'pekerjaan', width: 20 },
    { header: 'Pendidikan', key: 'pendidikan', width: 14 },
  ];
  wsKK.getRow(1).font = { bold: true };
  wsKK.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };

  let kkNo = 1;
  for (const w of rows) {
    for (const a of w.anggotaKeluarga) {
      wsKK.addRow({
        no: kkNo++,
        namaKK: w.user.name,
        nama: a.nama,
        nik: a.nik,
        hubungan: a.hubungan,
        tglLahir: a.tglLahir.toLocaleDateString('id-ID'),
        jenisKelamin: a.jenisKelamin,
        pekerjaan: a.pekerjaan ?? '-',
        pendidikan: a.pendidikan ?? '-',
      });
    }
  }

  const tgl = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="data-warga-${tgl}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function streamWargaPDF(
  res: Response,
  rows: WargaRow[],
  namaRT: string,
): void {
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });

  const tgl = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="data-warga-${tgl}.pdf"`);

  doc.pipe(res);

  // Title
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(`Data Warga — ${namaRT}`, { align: 'center' })
    .moveDown(0.3)
    .fontSize(10)
    .font('Helvetica')
    .text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
    .moveDown(0.8);

  // Table header
  const COL = { no: 30, nama: 140, nik: 100, alamat: 150, status: 70, phone: 80 };
  const startX = doc.page.margins.left;
  let y = doc.y;
  const rowH = 18;

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(9);
    let x = startX;
    doc.rect(x, y, Object.values(COL).reduce((a, b) => a + b, 0), rowH).fill('#D9E1F2').stroke();
    doc.fillColor('black');
    doc.text('No', x + 2, y + 4, { width: COL.no }); x += COL.no;
    doc.text('Nama', x + 2, y + 4, { width: COL.nama }); x += COL.nama;
    doc.text('NIK', x + 2, y + 4, { width: COL.nik }); x += COL.nik;
    doc.text('Alamat', x + 2, y + 4, { width: COL.alamat }); x += COL.alamat;
    doc.text('Status', x + 2, y + 4, { width: COL.status }); x += COL.status;
    doc.text('No. HP', x + 2, y + 4, { width: COL.phone });
    y += rowH;
  };

  drawHeader();

  doc.font('Helvetica').fontSize(8);
  rows.forEach((w, i) => {
    const pageBottom = doc.page.height - doc.page.margins.bottom - rowH;
    if (y + rowH > pageBottom) {
      doc.addPage({ layout: 'landscape' });
      y = doc.page.margins.top;
      drawHeader();
      doc.font('Helvetica').fontSize(8);
    }

    const fill = i % 2 === 0 ? 'white' : '#F5F5F5';
    const totalW = Object.values(COL).reduce((a, b) => a + b, 0);
    doc.rect(startX, y, totalW, rowH).fill(fill).stroke();
    doc.fillColor('black');

    let x = startX;
    doc.text(String(i + 1), x + 2, y + 4, { width: COL.no }); x += COL.no;
    doc.text(w.user.name, x + 2, y + 4, { width: COL.nama - 4 }); x += COL.nama;
    doc.text(w.nik, x + 2, y + 4, { width: COL.nik - 4 }); x += COL.nik;
    doc.text(w.alamat, x + 2, y + 4, { width: COL.alamat - 4 }); x += COL.alamat;
    doc.text(w.statusTinggal, x + 2, y + 4, { width: COL.status - 4 }); x += COL.status;
    doc.text(w.user.phone ?? '-', x + 2, y + 4, { width: COL.phone - 4 });

    y += rowH;
  });

  // Footer: total warga
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(9)
    .text(`Total warga: ${rows.length}`, startX);

  doc.end();
}
