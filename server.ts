import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Optional local env file
  }
  if (!process.env.GEMINI_API_KEY) {
    try {
      process.loadEnvFile('.env');
    } catch {
      // Optional env file
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured on the server.') as Error & { status?: number };
    err.status = 500;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const err = error as { status?: number; code?: number };
    if (retries > 0 && (err?.status === 429 || err?.status === 503 || err?.code === 429)) {
      await delay(delayMs);
      return retryOperation(operation, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

const extractErrorStatusAndMessage = (error: unknown): { status: number; message: string } => {
  const err = error as { status?: number; message?: string };
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = err?.message || 'Gemini API request failed';
  return { status, message };
};

app.post('/api/gemini/avatar', async (_req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    const response: GenerateContentResponse = await retryOperation(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: 'Detailed anime portrait profile picture, vibrant game art style.' }] },
        config: { imageConfig: { aspectRatio: '1:1' } },
      })
    );

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      res.status(502).json({ error: 'No image data returned from model.' });
      return;
    }

    res.json({ imageUrl });
  } catch (error: unknown) {
    const { status, message } = extractErrorStatusAndMessage(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/gemini/gacha-skin', async (req: Request, res: Response) => {
  try {
    const { type } = req.body as { type?: string };
    const validTypes = new Set(['EFFECT', 'TILE', 'WALLPAPER', 'AVATAR', 'PET', 'GEAR']);
    if (!type || !validTypes.has(type)) {
      res.status(400).json({ error: 'Invalid gacha asset type.' });
      return;
    }

    const ai = getAiClient();
    let prompt = `Anime game asset: ${type} skin, vibrant colors, clean design.`;
    if (type === 'GEAR') {
      prompt =
        'DJMax Portable 2 rhythm game gear skin, sleek left-aligned brushed silver metallic arcade playfield deck with integrated vertical fever and HP LED meters, cyan laser judgment line, glossy 3D keycaps, dark translucent play track lanes.';
    } else if (type === 'EFFECT') {
      prompt =
        'Game visual effect particle burst, glowing shockwave, magical rune, lens flare, isolated on black background, high contrast, circular composition.';
    } else if (type === 'PET') {
      prompt = 'Cute anime sci-fi floating pet robot, isolated on black background.';
    }

    const response: GenerateContentResponse = await retryOperation(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: type === 'GEAR' || type === 'WALLPAPER' ? '16:9' : '1:1',
          },
        },
      })
    );

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      res.status(502).json({ error: 'No image data returned from model.' });
      return;
    }

    res.json({ imageUrl });
  } catch (error: unknown) {
    const { status, message } = extractErrorStatusAndMessage(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { history = [], userMessage, persona = 'Neon (Global AI)' } = req.body as {
      history?: Array<{ sender: string; text: string }>;
      userMessage?: string;
      persona?: string;
    };

    if (!userMessage || typeof userMessage !== 'string') {
      res.status(400).json({ error: 'userMessage is required.' });
      return;
    }

    const ai = getAiClient();
    const systemInstruction = [
      `You are roleplaying as '${persona}' in the rhythm game 'DJMIX LOVE V'.`,
      persona === 'Neon (Global AI)'
        ? 'You are a friendly but competitive AI host. You use terms like "AP" (All Perfect) and "Sync".'
        : 'You are a fellow player. Keep it casual, use internet slang, be cool.',
      'Keep your response very short (1-2 brief sentences max, under 35 words).',
    ].join(' ');

    const recentHistory = Array.isArray(history) ? history.slice(-12) : [];
    const formattedHistory = recentHistory.map((m) => `${m.sender}: ${m.text}`).join('\n');

    const response: GenerateContentResponse = await retryOperation(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Current conversation history:\n${formattedHistory}\n\nUser says: "${userMessage}". Reply as ${persona}:`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const reply = response.text?.trim() || "GG! Let's play another round.";
    res.json({ reply });
  } catch (error: unknown) {
    const { status, message } = extractErrorStatusAndMessage(error);
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
