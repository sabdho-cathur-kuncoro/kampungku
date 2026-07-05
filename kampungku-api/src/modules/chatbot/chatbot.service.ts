import type { Content } from '@google/genai' with { 'resolution-mode': 'import' };
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { buildRtContext } from './chatbot.context';

const CHATBOT_MODEL = 'gemini-2.5-flash';

const STATIC_SYSTEM_INSTRUCTIONS = `Kamu adalah asisten digital KampungKu, dirancang khusus untuk membantu pengurus RT/RW mengelola informasi lingkungan mereka.

ATURAN KETAT yang wajib dipatuhi:
1. Jawab HANYA pertanyaan yang berkaitan dengan RT/RW: iuran warga, permohonan surat, pengumuman, pengaduan, data warga, dan laporan keuangan RT.
2. Jika pertanyaan di luar topik RT/RW (misalnya resep masakan, berita umum, pemrograman, dll), tolak dengan sopan dan arahkan kembali ke topik RT/RW.
3. Selalu jawab dalam Bahasa Indonesia yang sopan, jelas, dan mudah dipahami.
4. Jika data yang ditanyakan tidak tersedia dalam konteks yang diberikan, katakan dengan jujur bahwa kamu tidak memiliki informasi tersebut — JANGAN membuat angka atau data fiktif.
5. Kamu bersifat READ-ONLY: kamu hanya memberikan informasi, tidak dapat mengubah, menambah, atau menghapus data apapun.
6. Saat menyebut jumlah uang, gunakan format Rupiah (contoh: Rp 150.000).`;

function getRateLimitKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `chatbot:rl:${userId}:${today}`;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

async function checkAndIncrementRateLimit(userId: string): Promise<{ used: number; limit: number }> {
  const key = getRateLimitKey(userId);
  const limit = env.CHATBOT_DAILY_LIMIT;

  const current = await redis.get(key);
  const used = current ? parseInt(current, 10) : 0;

  if (used >= limit) {
    throw new AppError(`Kuota harian habis. Kamu sudah mengirim ${limit} pesan hari ini. Coba lagi besok.`, 429);
  }

  const newCount = await redis.incr(key);
  if (newCount === 1) {
    await redis.expire(key, secondsUntilMidnight());
  }

  return { used: newCount, limit };
}

async function getOrCreateSession(userId: string, tenantId: string) {
  const existing = await prisma.chatSession.findFirst({
    where: { userId, tenantId },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.chatSession.create({ data: { userId, tenantId } });
}

async function loadHistory(sessionId: string) {
  const window = env.CHATBOT_HISTORY_WINDOW;
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: window,
    select: { role: true, content: true },
  });
  return messages;
}

export const chatbotService = {
  async send(userId: string, tenantId: string, userMessage: string) {
    if (!env.GEMINI_API_KEY) {
      throw new AppError('Fitur chatbot belum dikonfigurasi. Hubungi administrator.', 503);
    }

    const quota = await checkAndIncrementRateLimit(userId);

    const session = await getOrCreateSession(userId, tenantId);
    const history = await loadHistory(session.id);
    const rtContext = await buildRtContext(tenantId);

    const now = new Date();
    const tanggal = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(now);

    const dynamicContext = `Tanggal hari ini: ${tanggal}\n\nDATA RT SAAT INI:\n${rtContext}`;

    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const historyMessages: Content[] = history.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await client.models.generateContent({
      model: CHATBOT_MODEL,
      contents: [...historyMessages, { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: `${STATIC_SYSTEM_INSTRUCTIONS}\n\n${dynamicContext}`,
        maxOutputTokens: 1024,
      },
    });

    const assistantMessage = response.text;
    if (!assistantMessage) {
      throw new AppError('Respons AI tidak valid', 500);
    }

    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { sessionId: session.id, role: 'USER', content: userMessage },
      }),
      prisma.chatMessage.create({
        data: { sessionId: session.id, role: 'ASSISTANT', content: assistantMessage },
      }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      message: assistantMessage,
      quota: {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.limit - quota.used,
      },
    };
  },

  async getHistory(userId: string, tenantId: string, limit = 50) {
    const session = await prisma.chatSession.findFirst({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) return { messages: [], quota: await getQuota(userId) };

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return { messages, quota: await getQuota(userId) };
  },

  async clearHistory(userId: string, tenantId: string) {
    const session = await prisma.chatSession.findFirst({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) return;

    await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
  },
};

async function getQuota(userId: string) {
  const key = getRateLimitKey(userId);
  const current = await redis.get(key);
  const used = current ? parseInt(current, 10) : 0;
  const limit = env.CHATBOT_DAILY_LIMIT;
  return { used, limit, remaining: Math.max(0, limit - used) };
}
