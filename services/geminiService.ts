import { GachaItem, GachaType, ChatMessage } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

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
      } catch (e) { resolve(base64Image); }
    };
    img.onerror = () => { clearTimeout(timeoutId); resolve(base64Image); };
    img.src = base64Image;
  });
};

const getFallbackImage = (type: GachaType) => {
    if (type === 'GEAR') {
        const svg = `<svg width="400" height="225" viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pillar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="400" height="225" fill="#020617"/>
  <!-- Centered Gear Cabinet Playzone -->
  <rect x="140" y="8" width="120" height="209" rx="6" fill="#090d16" stroke="#334155" stroke-width="2"/>
  <!-- Side Pillars -->
  <rect x="140" y="8" width="14" height="209" fill="url(#pillar)"/>
  <rect x="246" y="8" width="14" height="209" fill="url(#pillar)"/>
  <!-- Pillar Neon Rim Lights -->
  <line x1="154" y1="8" x2="154" y2="217" stroke="#00f0ff" stroke-width="1.5"/>
  <line x1="246" y1="8" x2="246" y2="217" stroke="#ec4899" stroke-width="1.5"/>
  <!-- Side VU Meter LEDs -->
  <g fill="#22c55e">
    <rect x="143" y="140" width="8" height="3" rx="1"/>
    <rect x="143" y="130" width="8" height="3" rx="1"/>
    <rect x="143" y="120" width="8" height="3" rx="1"/>
    <rect x="249" y="140" width="8" height="3" rx="1"/>
    <rect x="249" y="130" width="8" height="3" rx="1"/>
    <rect x="249" y="120" width="8" height="3" rx="1"/>
  </g>
  <g fill="#eab308">
    <rect x="143" y="105" width="8" height="3" rx="1"/>
    <rect x="143" y="95" width="8" height="3" rx="1"/>
    <rect x="249" y="105" width="8" height="3" rx="1"/>
    <rect x="249" y="95" width="8" height="3" rx="1"/>
  </g>
  <g fill="#ef4444">
    <rect x="143" y="80" width="8" height="3" rx="1"/>
    <rect x="249" y="80" width="8" height="3" rx="1"/>
  </g>
  <!-- 4 Lanes (Blue - White - White - Blue) -->
  <rect x="154" y="24" width="23" height="152" fill="rgba(0,240,255,0.08)"/>
  <rect x="177" y="24" width="23" height="152" fill="rgba(255,255,255,0.04)"/>
  <rect x="200" y="24" width="23" height="152" fill="rgba(255,255,255,0.04)"/>
  <rect x="223" y="24" width="23" height="152" fill="rgba(0,240,255,0.08)"/>
  <!-- Lane Pinstripe Dividers -->
  <line x1="177" y1="24" x2="177" y2="176" stroke="rgba(255,255,255,0.15)"/>
  <line x1="200" y1="24" x2="200" y2="176" stroke="rgba(255,255,255,0.15)"/>
  <line x1="223" y1="24" x2="223" y2="176" stroke="rgba(255,255,255,0.15)"/>
  <!-- Sample Notes -->
  <rect x="156" y="70" width="19" height="7" rx="2" fill="#38bdf8"/>
  <rect x="179" y="100" width="19" height="7" rx="2" fill="#fde047"/>
  <rect x="202" y="60" width="19" height="7" rx="2" fill="#fde047"/>
  <rect x="225" y="120" width="19" height="7" rx="2" fill="#38bdf8"/>
  <!-- Judgment Line -->
  <line x1="154" y1="176" x2="246" y2="176" stroke="#ffffff" stroke-width="2"/>
  <line x1="154" y1="176" x2="246" y2="176" stroke="#00f0ff" stroke-width="5" stroke-opacity="0.6"/>
  <!-- Receptors -->
  <rect x="156" y="180" width="19" height="14" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
  <rect x="179" y="180" width="19" height="14" rx="2" fill="#eab308" stroke="#fde047" stroke-width="1"/>
  <rect x="202" y="180" width="19" height="14" rx="2" fill="#eab308" stroke="#fde047" stroke-width="1"/>
  <rect x="225" y="180" width="19" height="14" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="1"/>
  <text x="165" y="191" font-family="monospace" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">D</text>
  <text x="188" y="191" font-family="monospace" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">F</text>
  <text x="211" y="191" font-family="monospace" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">J</text>
  <text x="234" y="191" font-family="monospace" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">K</text>
  <!-- Top Marquee Bar -->
  <rect x="140" y="8" width="120" height="16" fill="#0f172a" stroke="#334155"/>
  <text x="200" y="20" font-family="monospace" font-size="8" font-weight="900" fill="#00f0ff" text-anchor="middle" letter-spacing="0.5">RESPECT GEAR</text>
</svg>`;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    const color = type === 'TILE' ? '#db2777' : type === 'PET' ? '#10b981' : type === 'AVATAR' ? '#3b82f6' : '#f59e0b';
    const text = type;
    const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" font-family="monospace" font-size="20" fill="${color}" text-anchor="middle" dy=".3em">${text}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const generateAiAvatar = async (): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok || !data?.imageUrl) {
      throw new Error(data?.error || 'Avatar generation failed');
    }
    return await compressImage(data.imageUrl, 200, 0.7);
  } catch (error) {
    console.error('generateAiAvatar error:', error);
    return `https://picsum.photos/seed/${Date.now()}/200/200`;
  }
};

export const generateGachaSkin = async (type: GachaType): Promise<GachaItem> => {
  try {
    const response = await fetch('/api/gemini/gacha-skin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await response.json();
    if (!response.ok || !data?.imageUrl) {
      throw new Error(data?.error || 'Skin generation failed');
    }

    let imageUrl: string = data.imageUrl;

    // Remove background for Effects and Pets/Tiles to make them layerable
    if (type === 'PET' || type === 'TILE' || type === 'EFFECT') {
        imageUrl = await removeBlackBackground(imageUrl, type === 'EFFECT' ? 150 : 200);
    } else {
        imageUrl = await compressImage(imageUrl, (type === 'WALLPAPER' ? 512 : 256), 0.7);
    }

    const rarity = Math.random() > 0.85 ? 'SSR' : Math.random() > 0.55 ? 'SR' : 'R';
    return { id: generateId(), type, name: `${type} Unit ${Math.floor(Math.random()*99)}`, image: imageUrl, rarity };
  } catch (error) {
    console.error('generateGachaSkin error:', error);
    return { id: generateId(), type, name: "Data Fragment", image: getFallbackImage(type), rarity: 'R' };
  }
};

export const generateChatReply = async (history: ChatMessage[], userMessage: string, persona: string = "Neon (Global AI)"): Promise<string> => {
    try {
        const response = await fetch('/api/gemini/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history, userMessage, persona }),
        });
        const data = await response.json();
        if (!response.ok || !data?.reply) {
            throw new Error(data?.error || 'Chat generation failed');
        }
        return data.reply;
    } catch (error) {
        console.error('generateChatReply error:', error);
        return "System error... Connection unstable.";
    }
};
