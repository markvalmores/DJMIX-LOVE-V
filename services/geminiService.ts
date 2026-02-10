
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GachaItem, GachaType, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const generateId = () => Math.random().toString(36).substr(2, 9);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status === 503 || error.code === 429)) {
      await delay(delayMs);
      return retryOperation(operation, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

const compressImage = (base64Str: string, maxWidth = 300, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
          height = height * (maxWidth / width);
          width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const removeBlackBackground = (base64Image: string, maxWidth = 256): Promise<string> => {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(base64Image), 2500);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) { height = height * (maxWidth / width); width = maxWidth; }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(base64Image); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Simple luma keying to remove dark backgrounds for effects
            const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
            if (brightness < 30) data[i + 3] = 0;
            else if (brightness < 60) data[i + 3] = (brightness - 30) * 8.5;
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
      } catch(e) { resolve(base64Image); }
    };
    img.onerror = () => { clearTimeout(timeoutId); resolve(base64Image); };
    img.src = base64Image;
  });
};

const getFallbackImage = (type: GachaType) => {
    const color = type === 'GEAR' ? '#4f46e5' : type === 'TILE' ? '#db2777' : type === 'PET' ? '#10b981' : type === 'AVATAR' ? '#3b82f6' : '#f59e0b';
    const text = type;
    const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" font-family="monospace" font-size="20" fill="${color}" text-anchor="middle" dy=".3em">${text}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const generateAiAvatar = async (): Promise<string> => {
  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: "Detailed anime portrait profile picture, vibrant game art style." }] },
      config: { imageConfig: { aspectRatio: '1:1' } }
    }));
    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
    }
    return imageUrl ? await compressImage(imageUrl, 200, 0.7) : `https://picsum.photos/seed/${Date.now()}/200/200`;
  } catch (error) { return `https://picsum.photos/seed/${Date.now()}/200/200`; }
};

export const generateGachaSkin = async (type: GachaType): Promise<GachaItem> => {
  try {
    let prompt = `Anime game asset: ${type} skin, vibrant colors, clean design.`;
    if (type === 'EFFECT') {
        prompt = "Game visual effect particle burst, glowing shockwave, magical rune, lens flare, isolated on black background, high contrast, circular composition.";
    } else if (type === 'PET') {
        prompt = "Cute anime sci-fi floating pet robot, isolated on black background.";
    }

    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: (type === 'GEAR' || type === 'WALLPAPER') ? '16:9' : '1:1' } }
    }));

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
    }
    if (!imageUrl) throw new Error("No image data");

    // Remove background for Effects and Pets/Tiles to make them layerable
    if (type === 'PET' || type === 'TILE' || type === 'EFFECT') {
        imageUrl = await removeBlackBackground(imageUrl, type === 'EFFECT' ? 150 : 200);
    } else {
        imageUrl = await compressImage(imageUrl, (type === 'WALLPAPER' ? 512 : 256), 0.7);
    }

    const rarity = Math.random() > 0.85 ? 'SSR' : Math.random() > 0.55 ? 'SR' : 'R';
    return { id: generateId(), type, name: `${type} Unit ${Math.floor(Math.random()*99)}`, image: imageUrl, rarity };
  } catch (error) {
    return { id: generateId(), type, name: "Data Fragment", image: getFallbackImage(type), rarity: 'R' };
  }
};

export const generateChatReply = async (history: ChatMessage[], userMessage: string, persona: string = "Neon (Global AI)"): Promise<string> => {
    try {
        const context = `
            You are roleplaying as '${persona}' in the rhythm game 'DJMIX LOVE V'. 
            ${persona === 'Neon (Global AI)' ? 
              'You are a friendly but competitive AI host. You use terms like "AP" (All Perfect) and "Sync".' : 
              'You are a fellow player. Keep it casual, use internet slang, be cool.'}
            
            Current conversation history: ${history.map(m => `${m.sender}: ${m.text}`).join('\n')}
        `;
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: context },
                    { text: `User says: "${userMessage}". Reply as ${persona}:` }
                ]
            },
            config: { maxOutputTokens: 60 }
        });
        
        return response.text?.trim() || "GG! Let's play another round.";
    } catch (e) {
        return "System error... Connection unstable.";
    }
};
