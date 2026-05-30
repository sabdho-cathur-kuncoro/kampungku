import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.router';
import { adminRouter } from './modules/tenant/tenant.router';
import { wargaRouter } from './modules/warga/warga.router';
import { iuranRouter } from './modules/iuran/iuran.router';
import { pengumumanRouter } from './modules/pengumuman/pengumuman.router';
import { suratRouter } from './modules/surat/surat.router';
import { pengaduanRouter } from './modules/pengaduan/pengaduan.router';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/warga', wargaRouter);
app.use('/api/v1/iuran', iuranRouter);
app.use('/api/v1/pengumuman', pengumumanRouter);
app.use('/api/v1/surat', suratRouter);
app.use('/api/v1/pengaduan', pengaduanRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.use(errorHandler);

export default app;
