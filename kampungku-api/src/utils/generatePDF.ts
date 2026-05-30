import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export interface SuratData {
  noSurat: string;
  jenisSurat: string;
  namaWarga: string;
  nik: string;
  alamat: string;
  keperluan: string;
  namaRT: string;
  tglDiproses: Date;
}

const JENIS_LABEL: Record<string, string> = {
  DOMISILI: 'Surat Keterangan Domisili',
  KETERANGAN_TIDAK_MAMPU: 'Surat Keterangan Tidak Mampu',
  KETERANGAN_USAHA: 'Surat Keterangan Usaha',
  PENGANTAR_KTP: 'Surat Pengantar KTP',
  PENGANTAR_KK: 'Surat Pengantar Kartu Keluarga',
  LAINNYA: 'Surat Keterangan',
};

export const streamSuratPDF = (res: Response, data: SuratData): void => {
  const doc = new PDFDocument({ size: 'A4', margin: 60 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="surat-${data.noSurat.replace(/\//g, '-')}.pdf"`,
  );

  doc.pipe(res);

  const judulSurat = JENIS_LABEL[data.jenisSurat] ?? 'Surat Keterangan';
  const tgl = data.tglDiproses.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Header
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(data.namaRT, { align: 'center' })
    .moveDown(0.3)
    .fontSize(11)
    .font('Helvetica')
    .text('Alamat RT setempat', { align: 'center' })
    .moveDown(0.5);

  doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke().moveDown(0.5);

  // Title
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(judulSurat.toUpperCase(), { align: 'center' })
    .moveDown(0.3)
    .fontSize(11)
    .font('Helvetica')
    .text(`Nomor: ${data.noSurat}`, { align: 'center' })
    .moveDown(1);

  // Opening
  doc
    .fontSize(11)
    .font('Helvetica')
    .text(
      `Yang bertanda tangan di bawah ini, Ketua ${data.namaRT}, menerangkan bahwa:`,
      { align: 'justify' },
    )
    .moveDown(1);

  // Subject fields
  const fields: [string, string][] = [
    ['Nama', data.namaWarga],
    ['NIK', data.nik],
    ['Alamat', data.alamat],
    ['Keperluan', data.keperluan],
  ];

  for (const [label, value] of fields) {
    doc
      .font('Helvetica-Bold')
      .text(`${label}`, { continued: true, width: 100 })
      .font('Helvetica')
      .text(`: ${value}`, { align: 'left' })
      .moveDown(0.3);
  }

  doc.moveDown(1);

  // Closing
  doc
    .fontSize(11)
    .font('Helvetica')
    .text(
      'Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
      { align: 'justify' },
    )
    .moveDown(2);

  // Signature block
  doc
    .text(`Diterbitkan di: ______`, { align: 'right' })
    .moveDown(0.3)
    .text(`Tanggal: ${tgl}`, { align: 'right' })
    .moveDown(2)
    .text('Ketua RT', { align: 'right' })
    .moveDown(3)
    .font('Helvetica-Bold')
    .text('(________________________)', { align: 'right' });

  doc.end();
};
