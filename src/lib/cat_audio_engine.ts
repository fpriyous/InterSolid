import { CatMentor, TTSLang } from '../data/interlingo_data';

export interface VoiceModelOption {
  id: string;
  name: string;
  category: 'gemini' | 'browser' | 'synth';
  geminiVoice?: 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';
  description: string;
  tag: string;
  recommendedFor: string;
  avatarIcon: string;
}

export const VOICE_MODELS: VoiceModelOption[] = [
  {
    id: 'auto',
    name: '🎭 Otomatis per Karakter (Rekomendasi AI)',
    category: 'gemini',
    description: 'Setiap kucing otomatis memakai model suara neural AI khasnya masing-masing.',
    tag: 'Dynamic Multi-Model',
    recommendedFor: 'Semua Kucing Diplomasi',
    avatarIcon: '👑'
  },
  {
    id: 'gemini-charon',
    name: 'Gemini Neural: Charon (Baritone Warlord 🎙️)',
    category: 'gemini',
    geminiVoice: 'Charon',
    description: 'Suara berat, gagah, tegas, dan berwibawa layaknya panglima maritim.',
    tag: 'Deep Baritone',
    recommendedFor: 'Prof. Oyen & Kapitan Zhao',
    avatarIcon: '🦁'
  },
  {
    id: 'gemini-puck',
    name: 'Gemini Neural: Puck (Hyperactive & Energetic ⚡)',
    category: 'gemini',
    geminiVoice: 'Puck',
    description: 'Suara lincah, cepat, heboh, penuh semangat, dan ekspresif.',
    tag: 'Fast & Playful',
    recommendedFor: 'Chen Blep Becak Surabaya',
    avatarIcon: '🚀'
  },
  {
    id: 'gemini-kore',
    name: 'Gemini Neural: Kore (Warm & Diplomatic 🌸)',
    category: 'gemini',
    geminiVoice: 'Kore',
    description: 'Suara lembut, hangat, elegan, santun, dan sangat ramah.',
    tag: 'Warm Diplomat',
    recommendedFor: 'Kanjeng Mami Lin & Diplomasi',
    avatarIcon: '🍵'
  },
  {
    id: 'gemini-fenrir',
    name: 'Gemini Neural: Fenrir (Fierce & Commanding 🐺)',
    category: 'gemini',
    geminiVoice: 'Fenrir',
    description: 'Suara serak militer, berapi-api, penuh disiplin, dan mendominasi.',
    tag: 'Military Leader',
    recommendedFor: 'Kapitan Zhao & Sengketa Natuna',
    avatarIcon: '⚓'
  },
  {
    id: 'gemini-zephyr',
    name: 'Gemini Neural: Zephyr (Sigma Zen & Low Bass 🗿)',
    category: 'gemini',
    geminiVoice: 'Zephyr',
    description: 'Suara tenang, dingin, santai, dan tanpa beban saat melakukan hak veto.',
    tag: 'Sigma Mewing',
    recommendedFor: 'Zhang Xiao Sigma Skibidi',
    avatarIcon: '🕶️'
  },
  {
    id: 'gemini-aoede',
    name: 'Gemini Neural: Aoede (Dramatic & Cheerful 🎭)',
    category: 'gemini',
    geminiVoice: 'Aoede',
    description: 'Suara aristokrat ceria, bernada estetis, dan santun ningrat.',
    tag: 'Aristocrat Tenor',
    recommendedFor: 'Lord Li Seblak Laily',
    avatarIcon: '🌶️'
  },
  {
    id: 'browser-id',
    name: 'Browser Local: Bahasa Indonesia (Sintesis Cepat 🇮🇩)',
    category: 'browser',
    description: 'Sintesis suara bawaan browser mesin lokal untuk bahasa Indonesia.',
    tag: 'Web Speech API',
    recommendedFor: 'Offline & Low Bandwidth',
    avatarIcon: '🌐'
  },
  {
    id: 'browser-zh',
    name: 'Browser Local: Mandarin Putonghua (Lokal 🇨🇳)',
    category: 'browser',
    description: 'Sintesis suara aksen Putonghua asli langsung dari browser.',
    tag: 'Web Speech API',
    recommendedFor: 'Latihan Hanzi Cepat',
    avatarIcon: '🥢'
  },
  {
    id: 'synth-meow',
    name: 'Synthesizer: Procedural Chiptune Meow (Oscillator 🐱)',
    category: 'synth',
    description: 'Frekuensi suara meong murni Web Audio oscillator tanpa teks TTS.',
    tag: 'Retro 8-Bit Meow',
    recommendedFor: 'Efek Lucu & Lucu-lucuan',
    avatarIcon: '🐾'
  }
];

const AUDIO_CACHE = new Map<string, string>();
const LOCAL_STORAGE_VOICE_KEY = 'intersolid_cat_voice_model_pref';

export const getSavedVoiceModel = (): string => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_VOICE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

export const saveVoiceModel = (modelId: string) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_VOICE_KEY, modelId);
  } catch (e) {
    console.warn("Could not save voice model preference", e);
  }
};

// --- AUDIO BUFFER / PCM DECODER & PLAYER ---
let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;

export const stopAllAudioPlayback = () => {
  try {
    if (activeAudioSource) {
      activeAudioSource.stop();
      activeAudioSource.disconnect();
      activeAudioSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // ignore cleanup errors
  }
};

export const playPCM24kBase64 = (base64Audio: string, sampleRate = 24000): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      stopAllAudioPlayback();

      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass({ sampleRate });
      activeAudioContext = ctx;

      // Check if it's a WAV/RIFF container
      const isWav = binary.startsWith('RIFF');

      if (isWav) {
        ctx.decodeAudioData(
          bytes.buffer.slice(0),
          (buffer) => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            activeAudioSource = source;
            source.onended = () => {
              activeAudioSource = null;
              resolve();
            };
            source.start(0);
          },
          (err) => {
            console.warn("WAV decode failed, falling back to raw PCM:", err);
            playRawPCM(ctx, bytes, sampleRate, resolve, reject);
          }
        );
      } else {
        playRawPCM(ctx, bytes, sampleRate, resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
};

const playRawPCM = (
  ctx: AudioContext,
  bytes: Uint8Array,
  sampleRate: number,
  resolve: () => void,
  reject: (err: any) => void
) => {
  try {
    const numSamples = Math.floor(bytes.length / 2);
    const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);

    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true); // Little-endian 16-bit
      channelData[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    activeAudioSource = source;
    source.onended = () => {
      activeAudioSource = null;
      resolve();
    };
    source.start(0);
  } catch (e) {
    reject(e);
  }
};

// --- PROCEDURAL CAT MEOW GENERATOR (Web Audio API) ---
export const playCatMeowAudio = (meowType: string) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    if (meowType === 'baritone_grunt') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(260, now);
      osc1.frequency.linearRampToValueAtTime(140, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(80, now + 0.55);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(32, now);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.6);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);
    } else if (meowType === 'aristocrat_purr') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.linearRampToValueAtTime(640, now + 0.18);
      osc.frequency.linearRampToValueAtTime(460, now + 0.48);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.52);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);
    } else if (meowType === 'squeak_chipmunk') {
      [0, 0.12].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 920 : 1380, now + offset);
        osc.frequency.linearRampToValueAtTime(idx === 0 ? 1280 : 1850, now + offset + 0.09);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.005, now + offset + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } else if (meowType === 'sigma_bass') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(65, now);
      osc2.frequency.setValueAtTime(130, now);
      osc2.frequency.linearRampToValueAtTime(95, now + 0.65);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } else if (meowType === 'commanding_rawr') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.linearRampToValueAtTime(280, now + 0.12);
      osc.frequency.linearRampToValueAtTime(150, now + 0.38);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (meowType === 'gossip_trill') {
      const freqs = [640, 860, 1020, 760];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.14, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.06);
      });
    }
  } catch (e) {
    console.error("Cat meow audio error:", e);
  }
};

// --- PROCEDURAL FOOD CONSUMPTION FX ---
export const playFoodSound = (crunchType: string) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    if (crunchType === 'crunch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (crunchType === 'spicy_sizzle') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.linearRampToValueAtTime(540, now + 0.15);
      osc2.frequency.setValueAtTime(640, now);
      osc2.frequency.linearRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } else if (crunchType === 'boba_pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (crunchType === 'slurp' || crunchType === 'soup_sip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.error("Food sound error:", e);
  }
};

// --- BROWSER FALLBACK TTS HELPER ---
const playBrowserTTS = (
  text: string, 
  langCode: string = 'id-ID', 
  pitch = 1.0, 
  rate = 1.0
) => {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Browser SpeechSynthesis error:", e);
  }
};

// --- MULTI-MODEL CAT VOICE SPEAKER ---
export const speakCatVoiceLine = async (
  cat: CatMentor,
  phraseIndex?: number,
  customVoiceModelId?: string
): Promise<{ speech: string; subtext: string; hanzi: string }> => {
  const voicesList = cat.feedingVoices && cat.feedingVoices.length > 0 
    ? cat.feedingVoices 
    : [
        {
          speech: `Miaww! Nǐ hǎo! Terima kasih jamuannya! (${cat.name})`,
          subtext: `“${cat.catchphrase}”`,
          hanzi: '多谢多谢！(Duōxiè duōxiè!)'
        }
      ];

  const selectedIdx = phraseIndex !== undefined 
    ? phraseIndex % voicesList.length 
    : Math.floor(Math.random() * voicesList.length);
  
  const chosenVoice = voicesList[selectedIdx];
  const activeModelId = customVoiceModelId || getSavedVoiceModel();

  // If user selected synth-meow, only play procedural meow
  if (activeModelId === 'synth-meow') {
    playCatMeowAudio(cat.voiceProfile.meowType);
    return chosenVoice;
  }

  // If user selected browser-id or browser-zh
  if (activeModelId === 'browser-id') {
    playCatMeowAudio(cat.voiceProfile.meowType);
    playBrowserTTS(chosenVoice.speech, 'id-ID', cat.voiceProfile.pitch, cat.voiceProfile.rate);
    return chosenVoice;
  }
  if (activeModelId === 'browser-zh') {
    playCatMeowAudio(cat.voiceProfile.meowType);
    playBrowserTTS(chosenVoice.hanzi, 'zh-CN', cat.voiceProfile.pitch, cat.voiceProfile.rate);
    return chosenVoice;
  }

  // Determine Gemini Voice to use
  let geminiVoice: 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede' = cat.geminiVoice || 'Kore';
  
  if (activeModelId.startsWith('gemini-')) {
    const selectedOption = VOICE_MODELS.find(v => v.id === activeModelId);
    if (selectedOption?.geminiVoice) {
      geminiVoice = selectedOption.geminiVoice;
    }
  }

  const cacheKey = `${geminiVoice}_${cat.voicePersona}_${chosenVoice.speech}`;

  // Check cache first for instant replay
  if (AUDIO_CACHE.has(cacheKey)) {
    try {
      const cachedBase64 = AUDIO_CACHE.get(cacheKey)!;
      await playPCM24kBase64(cachedBase64);
      return chosenVoice;
    } catch (e) {
      console.warn("Cached audio playback failed, generating anew...", e);
    }
  }

  // Play short cute meow sound immediately as intro feedback
  playCatMeowAudio(cat.voiceProfile.meowType);

  // Request high-quality Neural Voice from Gemini TTS backend
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chosenVoice.speech,
        voice: geminiVoice,
        persona: cat.voicePersona,
        promptPrefix: `Persona ${cat.name}`
      })
    });

    if (!response.ok) {
      throw new Error(`TTS HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data.audioBase64) {
      AUDIO_CACHE.set(cacheKey, data.audioBase64);
      await playPCM24kBase64(data.audioBase64, data.sampleRate || 24000);
      return chosenVoice;
    } else {
      throw new Error("No audio base64 returned");
    }
  } catch (err) {
    console.warn("[TTS Fallback] Gemini TTS request failed, using Browser Voice:", err);
    // Smooth fallback to browser SpeechSynthesis so user always hears sound!
    playBrowserTTS(chosenVoice.speech, 'id-ID', cat.voiceProfile.pitch, cat.voiceProfile.rate);
  }

  return chosenVoice;
};

// --- DIPLOMATIC SPEECH (STUDY CARDS & QUESTIONS) ---
export const speakDiplomaticSpeech = async (
  text: string, 
  langCode: TTSLang = 'zh-CN',
  preferredVoiceModel?: string
) => {
  const activeModelId = preferredVoiceModel || getSavedVoiceModel();

  if (activeModelId === 'browser-id' || activeModelId === 'browser-zh' || activeModelId === 'browser-en') {
    const targetLang = activeModelId === 'browser-id' ? 'id-ID' : activeModelId === 'browser-en' ? 'en-US' : 'zh-CN';
    playBrowserTTS(text, targetLang, 1.0, 0.88);
    return;
  }

  if (activeModelId === 'synth-meow') {
    playCatMeowAudio('baritone_grunt');
    return;
  }

  let geminiVoice: 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede' = 'Kore';
  if (activeModelId.startsWith('gemini-')) {
    const selectedOption = VOICE_MODELS.find(v => v.id === activeModelId);
    if (selectedOption?.geminiVoice) {
      geminiVoice = selectedOption.geminiVoice;
    }
  } else if (langCode === 'zh-CN') {
    geminiVoice = 'Aoede'; // Dramatic clear Mandarin
  } else if (langCode === 'en-US') {
    geminiVoice = 'Kore'; // Clear English
  }

  const cacheKey = `${geminiVoice}_diplomatic_${text}`;
  if (AUDIO_CACHE.has(cacheKey)) {
    try {
      const cachedBase64 = AUDIO_CACHE.get(cacheKey)!;
      await playPCM24kBase64(cachedBase64);
      return;
    } catch (e) {
      console.warn("Cached audio playback failed:", e);
    }
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: geminiVoice,
        persona: 'warm_diplomat',
        promptPrefix: langCode === 'zh-CN' ? 'Speak clearly in accurate Mandarin Chinese:' : 'Speak in clear diplomatic cadence:'
      })
    });

    if (!response.ok) {
      throw new Error(`TTS HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data.audioBase64) {
      AUDIO_CACHE.set(cacheKey, data.audioBase64);
      await playPCM24kBase64(data.audioBase64, data.sampleRate || 24000);
      return;
    }
  } catch (err) {
    console.warn("[TTS Fallback] Gemini TTS failed for diplomatic speech, fallback to browser:", err);
    playBrowserTTS(text, langCode === 'en-US' ? 'en-US' : 'zh-CN', 1.0, 0.88);
  }
};

// --- AUDITION / TEST VOICE MODEL ---
export const testAuditionVoiceModel = async (model: VoiceModelOption): Promise<void> => {
  stopAllAudioPlayback();

  if (model.id === 'synth-meow') {
    playCatMeowAudio('baritone_grunt');
    setTimeout(() => playCatMeowAudio('squeak_chipmunk'), 250);
    return;
  }

  if (model.category === 'browser') {
    const sampleText = model.id === 'browser-zh' 
      ? '你好！我是外交国宴猫咪，欢迎来到联合国猫粮公约！' 
      : 'Halo! Saya model suara diplomasi kelas internasional!';
    playBrowserTTS(sampleText, model.id === 'browser-zh' ? 'zh-CN' : 'id-ID');
    return;
  }

  const voiceName = model.geminiVoice || 'Charon';
  const samplePhrase = `Halo delegasi! Ini adalah pengujian model suara ${model.name}. Nǐ hǎo!`;
  const cacheKey = `${voiceName}_sample_${samplePhrase}`;

  if (AUDIO_CACHE.has(cacheKey)) {
    await playPCM24kBase64(AUDIO_CACHE.get(cacheKey)!);
    return;
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: samplePhrase,
        voice: voiceName,
        promptPrefix: 'Say with great charismatic character voice:'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.audioBase64) {
        AUDIO_CACHE.set(cacheKey, data.audioBase64);
        await playPCM24kBase64(data.audioBase64, data.sampleRate || 24000);
        return;
      }
    }
  } catch (err) {
    console.warn("Audition TTS error:", err);
  }

  // Fallback
  playBrowserTTS(samplePhrase, 'id-ID');
};
