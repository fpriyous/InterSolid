import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Trophy, Sparkles, Heart, Utensils, Star, Flame, 
  Volume2, Gift, User, Crown, ChevronRight, Award, 
  Smile, Zap, CheckCircle, RefreshCw, AlertCircle,
  Radio, Sliders, Mic, Play, Pause, X, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CAT_MENTORS, CatMentor } from '../data/interlingo_data';
import { CANTEEN_DISHES, CanteenDish, CatFeedRecord, getFeederTitle } from '../data/canteen_data';
import { 
  playCatMeowAudio, 
  playFoodSound, 
  speakCatVoiceLine,
  VOICE_MODELS,
  VoiceModelOption,
  getSavedVoiceModel,
  saveVoiceModel,
  testAuditionVoiceModel,
  stopAllAudioPlayback
} from '../lib/cat_audio_engine';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit, getDoc 
} from 'firebase/firestore';

interface CatCanteenProps {
  user: any;
  userXp: number;
  onXpChange: (newXp: number) => void;
  playSound: (type: 'correct' | 'incorrect' | 'complete' | 'feed' | 'click' | 'flip' | 'alarm') => void;
}

export function CatCanteen({ user, userXp, onXpChange, playSound }: CatCanteenProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('explorer');
  const [selectedDishId, setSelectedDishId] = useState<string>('peking_duck');
  const [activeSubTab, setActiveSubTab] = useState<'feeding' | 'leaderboard'>('feeding');
  const [leaderboardFilter, setLeaderboardFilter] = useState<string>('all');

  // Voice Model State
  const [activeVoiceModelId, setActiveVoiceModelId] = useState<string>(getSavedVoiceModel());
  const [showVoiceStudioModal, setShowVoiceStudioModal] = useState<boolean>(false);
  const [isAuditioningId, setIsAuditioningId] = useState<string | null>(null);
  const [speakingCatId, setSpeakingCatId] = useState<string | null>(null);
  
  // Real-time feeds state
  const [feedRecords, setFeedRecords] = useState<CatFeedRecord[]>([]);
  const [fedCatId, setFedCatId] = useState<string | null>(null);
  const [speechBubble, setSpeechBubble] = useState<{
    catName: string;
    speech: string;
    subtext: string;
    hanzi: string;
    dishName: string;
    dishIcon: string;
    voiceModelName: string;
  } | null>(null);

  const [floatingIcons, setFloatingIcons] = useState<{ id: number; icon: string; x: number; y: number }[]>([]);
  const [comboCount, setComboCount] = useState<number>(0);
  const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);
  const [isFeeding, setIsFeeding] = useState<boolean>(false);

  // Listen to Firestore real-time feeding records
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'interlingo_cat_feeds'),
        orderBy('feedCount', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records: CatFeedRecord[] = [];
        snapshot.forEach((doc) => {
          records.push(doc.data() as CatFeedRecord);
        });
        setFeedRecords(records);
      }, (err) => {
        console.warn("Real-time feed listener error:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore listener init error:", e);
    }
  }, []);

  // Current active voice model object
  const currentVoiceModel = VOICE_MODELS.find(v => v.id === activeVoiceModelId) || VOICE_MODELS[0];

  // Selected entities
  const selectedCat = CAT_MENTORS[selectedCatId] || CAT_MENTORS.explorer;
  const selectedDish = CANTEEN_DISHES.find(d => d.id === selectedDishId) || CANTEEN_DISHES[0];

  // Aggregated stats per cat
  const catTotalFeeds = React.useMemo(() => {
    const stats: Record<string, number> = {};
    Object.keys(CAT_MENTORS).forEach(id => { stats[id] = 0; });
    feedRecords.forEach(rec => {
      stats[rec.catId] = (stats[rec.catId] || 0) + (rec.feedCount || 0);
    });
    return stats;
  }, [feedRecords]);

  // Filtered leaderboard records
  const filteredLeaderboard = React.useMemo(() => {
    if (leaderboardFilter === 'all') {
      // Group by user for overall sugar daddy rankings
      const userMap: Record<string, {
        userId: string;
        userName: string;
        userPhoto?: string;
        totalFeeds: number;
        totalXp: number;
        topCatId: string;
        lastDish: string;
        lastDishIcon?: string;
      }> = {};

      feedRecords.forEach(rec => {
        if (!userMap[rec.userId]) {
          userMap[rec.userId] = {
            userId: rec.userId,
            userName: rec.userName,
            userPhoto: rec.userPhoto,
            totalFeeds: 0,
            totalXp: 0,
            topCatId: rec.catId,
            lastDish: rec.lastDish,
            lastDishIcon: rec.lastDishIcon
          };
        }
        userMap[rec.userId].totalFeeds += rec.feedCount;
        userMap[rec.userId].totalXp += (rec.totalXpSpent || 0);
      });

      return Object.values(userMap).sort((a, b) => b.totalFeeds - a.totalFeeds);
    } else {
      return feedRecords.filter(r => r.catId === leaderboardFilter);
    }
  }, [feedRecords, leaderboardFilter]);

  // Switch voice model
  const handleSelectVoiceModel = (modelId: string) => {
    playSound('click');
    setActiveVoiceModelId(modelId);
    saveVoiceModel(modelId);
  };

  // Audition voice model
  const handleAuditionModel = async (model: VoiceModelOption) => {
    playSound('click');
    setIsAuditioningId(model.id);
    try {
      await testAuditionVoiceModel(model);
    } finally {
      setIsAuditioningId(null);
    }
  };

  // Handle feeding a cat
  const handleFeedAction = async (cat: CatMentor, dish: CanteenDish) => {
    if (userXp < dish.cost) {
      playSound('incorrect');
      alert(`XP Anda tidak mencukupi! Perlu ${dish.cost} XP, saldo Anda ${userXp} XP. Selesaikan misi pembelajaran diplomasi untuk mendapatkan XP tambahan!`);
      return;
    }

    if (isFeeding) return;
    setIsFeeding(true);
    setSpeakingCatId(cat.id);

    // 1. Play Sound Effects
    playSound('feed');
    playFoodSound(dish.crunchType);

    // 2. Play Voice Actor Speech via Neural Voice Engine
    const voiceLinePromise = speakCatVoiceLine(cat, undefined, activeVoiceModelId);

    // 3. Update Combo Streak
    const newCombo = comboCount + 1;
    setComboCount(newCombo);
    if (comboTimer) clearTimeout(comboTimer);
    const timer = setTimeout(() => setComboCount(0), 4000);
    setComboTimer(timer);

    // 4. Update UI State & Animations
    setFedCatId(cat.id);
    
    // Spawn floating animation particles
    const newParticles = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      icon: i % 2 === 0 ? dish.icon : '💖',
      x: (Math.random() - 0.5) * 120,
      y: -50 - Math.random() * 80
    }));
    setFloatingIcons(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setFloatingIcons(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 1500);

    // 5. Deduct XP
    const newXpBalance = Math.max(0, userXp - dish.cost);
    onXpChange(newXpBalance);

    // 6. Wait for voice line result
    try {
      const voiceLine = await voiceLinePromise;
      setSpeechBubble({
        catName: cat.name,
        speech: voiceLine.speech,
        subtext: voiceLine.subtext,
        hanzi: voiceLine.hanzi,
        dishName: dish.name,
        dishIcon: dish.icon,
        voiceModelName: activeVoiceModelId === 'auto' ? cat.voiceModelLabel : currentVoiceModel.name
      });
    } catch (e) {
      console.warn("Voice speech error:", e);
    } finally {
      setSpeakingCatId(null);
    }

    // 7. Save to Firestore
    try {
      // Update User Progress doc
      const userProgRef = doc(db, 'interlingo_progress', user.uid);
      await updateDoc(userProgRef, {
        xp: newXpBalance,
        updatedAt: new Date().toISOString()
      });

      // Update or Create Feed Record doc
      const feedDocId = `${cat.id}_${user.uid}`;
      const feedDocRef = doc(db, 'interlingo_cat_feeds', feedDocId);
      
      const existingSnap = await getDoc(feedDocRef);
      if (existingSnap.exists()) {
        const currData = existingSnap.data() as CatFeedRecord;
        await updateDoc(feedDocRef, {
          feedCount: (currData.feedCount || 0) + 1,
          totalXpSpent: (currData.totalXpSpent || 0) + dish.cost,
          lastDish: dish.name,
          lastDishIcon: dish.icon,
          userName: user.displayName || user.email?.split('@')[0] || 'Delegasi Diplomat',
          userPhoto: user.photoURL || '',
          lastFedAt: new Date().toISOString()
        });
      } else {
        await setDoc(feedDocRef, {
          id: feedDocId,
          catId: cat.id,
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Delegasi Diplomat',
          userPhoto: user.photoURL || '',
          feedCount: 1,
          totalXpSpent: dish.cost,
          lastDish: dish.name,
          lastDishIcon: dish.icon,
          lastFedAt: new Date().toISOString()
        });
      }

      logPortalActivity('interlingo_canteen', `Menyajikan ${dish.name} kepada ${cat.name}`, user);
    } catch (err) {
      console.warn("Failed to persist feeding record to Firestore:", err);
    }

    setTimeout(() => {
      setIsFeeding(false);
    }, 600);
  };

  // Test Voice of a Cat Mentor
  const handleTestCatVoice = async (cat: CatMentor) => {
    playSound('click');
    setSpeakingCatId(cat.id);
    try {
      const voice = await speakCatVoiceLine(cat, undefined, activeVoiceModelId);
      setSpeechBubble({
        catName: cat.name,
        speech: voice.speech,
        subtext: voice.subtext,
        hanzi: voice.hanzi,
        dishName: 'Uji Model Suara',
        dishIcon: '🎙️',
        voiceModelName: activeVoiceModelId === 'auto' ? cat.voiceModelLabel : currentVoiceModel.name
      });
    } catch (e) {
      console.warn("Test voice error:", e);
    } finally {
      setSpeakingCatId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status, XP, Combo Streak, and AI Voice Studio */}
      <div className="bg-gradient-to-r from-red-950 via-[#1a0f12] to-amber-950 p-6 md:p-8 rounded-[2.5rem] border border-amber-500/30 shadow-2xl text-white relative overflow-hidden">
        {/* Chinese Ornamental Seal in background */}
        <div className="absolute top-2 right-4 text-7xl font-serif font-black text-amber-500/10 select-none pointer-events-none">
          国宴
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-red-600/80 text-amber-300 font-serif font-black text-[10px] uppercase px-3 py-1 rounded-full border border-amber-400/40 shadow-sm inline-flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" /> Kantin Kucing Absurd & Jamuan Kenegaraan (外交国宴)
              </span>
              
              {/* Voice Studio Active Pill */}
              <button
                onClick={() => { playSound('click'); setShowVoiceStudioModal(true); }}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-amber-400/40 shadow-sm inline-flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Mic className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="truncate max-w-[170px]">{currentVoiceModel.name}</span>
                <Sliders className="w-3 h-3 opacity-70" />
              </button>

              {comboCount > 1 && (
                <motion.span 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="bg-gradient-to-r from-amber-500 to-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1"
                >
                  <Flame className="w-3 h-3 fill-white text-white" /> COMBO x{comboCount}! 🔥
                </motion.span>
              )}
            </div>

            <h2 className="font-serif font-black text-2xl md:text-3xl text-amber-100 tracking-tight leading-tight">
              Pemberian Makanan & Dewan Keamanan Kucing Oyen
            </h2>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Tiap kucing memiliki suara meong, aksen dubber, dan model AI (Charon, Puck, Kore, Fenrir, Zephyr, Aoede) yang berbeda-beda! Sajikan hidangan diplomatik untuk mendongkrak statusmu di <span className="text-amber-300 font-bold">Papan Peringkat Sugar Daddy Kucing</span>!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Quick Open Voice Studio Button */}
            <button
              onClick={() => { playSound('click'); setShowVoiceStudioModal(true); }}
              className="bg-gradient-to-br from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 px-4 py-3 rounded-2xl border border-amber-400/50 shadow-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
                <Mic className="w-4 h-4 text-amber-300" /> Studio Suara AI
              </div>
              <span className="text-[9px] font-bold text-white/80">Pilih Model Suara 🎙️</span>
            </button>

            <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-amber-500/30 text-center shadow-lg">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 block">Saldo XP Kamu</span>
              <span className="text-2xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" /> {userXp}
              </span>
            </div>

            <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/30 text-center shadow-lg">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 block">Total Disajikan</span>
              <span className="text-2xl font-black text-rose-400 font-mono flex items-center justify-center gap-1">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500" /> 
                {Object.values(catTotalFeeds).reduce((a: number, b: number) => a + b, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation: Feeding vs Leaderboard vs Voice Studio */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-amber-500/20 flex-wrap">
          <button
            onClick={() => { playSound('click'); setActiveSubTab('feeding'); }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'feeding'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-amber-400/40'
                : 'bg-black/30 hover:bg-black/50 text-amber-200/70 hover:text-white'
            }`}
          >
            <Utensils className="w-4 h-4" /> Meja Makan Kucing (喂食)
          </button>
          
          <button
            onClick={() => { playSound('click'); setActiveSubTab('leaderboard'); }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'leaderboard'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-amber-400/40'
                : 'bg-black/30 hover:bg-black/50 text-amber-200/70 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" /> Papan Peringkat Sugar Daddy (猫咪赞助榜)
          </button>

          <button
            onClick={() => { playSound('click'); setShowVoiceStudioModal(true); }}
            className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400/30 cursor-pointer ml-auto"
          >
            <Sliders className="w-4 h-4 text-amber-300" /> Ganti Model Suara AI ({VOICE_MODELS.length} Model)
          </button>
        </div>
      </div>

      {/* Speech & Meow Reaction Bubble */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="bg-gradient-to-r from-red-900/90 via-[#231015] to-amber-900/90 border-2 border-amber-400/60 p-5 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{speechBubble.dishIcon}</span>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                    {speechBubble.catName} bereaksi terhadap {speechBubble.dishName}:
                  </span>
                  <span className="text-[10px] bg-red-600/50 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {speechBubble.hanzi}
                  </span>
                  <span className="text-[10px] bg-amber-500/30 text-amber-100 font-mono px-2 py-0.5 rounded-full border border-amber-400/40">
                    🎙️ {speechBubble.voiceModelName}
                  </span>
                </div>
                <p className="text-sm md:text-base font-bold text-white leading-snug">
                  {speechBubble.subtext}
                </p>
                <p className="text-xs text-amber-300/80 italic">
                  Suara Dubber: "{speechBubble.speech}"
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => {
                    playSound('click');
                    setSpeechBubble(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-amber-300 text-xs font-bold border border-amber-400/30 transition-colors cursor-pointer shrink-0"
                >
                  Tutup ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MEJA MAKAN & FEEDING INTERFACE                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'feeding' && (
        <div className="space-y-6">
          {/* Dish Picker Menu Bar */}
          <div className="bg-white dark:bg-[#1a0f12] p-5 md:p-6 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-red-600" />
                <h3 className="font-serif font-black text-lg text-slate-800 dark:text-white">
                  Pilih Menu Jamuan Kenegaraan & Jajanan Absurd
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                Pilih makanan lalu klik tombol beri makan pada kucing favoritmu!
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {CANTEEN_DISHES.map((dish) => {
                const isSelected = selectedDishId === dish.id;
                const canAfford = userXp >= dish.cost;

                return (
                  <button
                    key={dish.id}
                    onClick={() => {
                      playSound('click');
                      playFoodSound(dish.crunchType);
                      setSelectedDishId(dish.id);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1.5 cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-b from-red-500/10 to-amber-500/10 border-red-500 ring-2 ring-amber-400/50 shadow-md'
                        : canAfford
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-red-400'
                        : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{dish.icon}</span>
                    <div className="w-full">
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                        {dish.name}
                      </p>
                      <span className="text-[9px] font-black text-red-600 dark:text-amber-400 font-mono">
                        {dish.cost} XP
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Dish Information Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/20 border border-red-200 dark:border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-red-100 dark:border-slate-800">
                  {selectedDish.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-black text-sm text-slate-900 dark:text-white">
                      {selectedDish.name}
                    </h4>
                    <span className="text-[10px] font-bold text-red-600 dark:text-amber-400">
                      {selectedDish.hanzi}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {selectedDish.desc} — <span className="italic text-slate-500 dark:text-slate-400">{selectedDish.flavorText}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {selectedDish.buffEffect}
                </span>
                <span className="font-black text-red-600 dark:text-amber-400 font-mono text-sm">
                  {selectedDish.cost} XP / porsi
                </span>
              </div>
            </div>
          </div>

          {/* Cat Mentors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(CAT_MENTORS).map((cat) => {
              const isSelected = selectedCatId === cat.id;
              const isBeingFed = fedCatId === cat.id;
              const isSpeaking = speakingCatId === cat.id;
              const feedsCount = catTotalFeeds[cat.id] || 0;
              const fullnessPct = Math.min(100, Math.round((feedsCount % 30) * 3.33));

              return (
                <div
                  key={cat.id}
                  className={`bg-white dark:bg-[#1a0f12] p-6 rounded-[2.5rem] border transition-all relative flex flex-col justify-between space-y-4 shadow-xl ${
                    isBeingFed
                      ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-red-500/20 scale-[1.02]'
                      : isSelected
                      ? 'border-red-500 dark:border-red-700'
                      : 'border-red-100 dark:border-red-950/60 hover:border-red-300'
                  }`}
                >
                  {/* Floating Particles Animation */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                    {floatingIcons.map((particle) => (
                      <motion.div
                        key={particle.id}
                        initial={{ opacity: 1, y: 0, x: particle.x, scale: 1 }}
                        animate={{ opacity: 0, y: particle.y, scale: 1.5 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute bottom-1/2 left-1/2 text-2xl select-none"
                      >
                        {particle.icon}
                      </motion.div>
                    ))}
                  </div>

                  {/* Cat Avatar & Character Card */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar with Sound Vibration ring */}
                      <div className="relative shrink-0">
                        <div className={`w-20 h-20 rounded-3xl overflow-hidden border-2 border-red-500/40 shadow-xl bg-slate-950 relative group select-none ring-2 ${
                          isBeingFed ? 'ring-amber-400 animate-bounce' : isSpeaking ? 'ring-red-500 animate-pulse' : 'ring-amber-500/20'
                        }`}>
                          <img 
                            src={cat.imageUrl} 
                            alt={cat.name} 
                            className={`w-full h-full object-cover transition-transform duration-500 ${
                              isBeingFed ? 'scale-110' : 'group-hover:scale-105'
                            }`}
                            referrerPolicy="no-referrer"
                          />
                          {/* Chinese Seal Stamp */}
                          <div className="absolute top-1 right-1 bg-red-600/95 text-amber-300 font-serif font-black text-[7px] px-1 py-0.5 rounded border border-amber-400/40 shadow">
                            中
                          </div>
                          
                          {/* Speaking wave animation indicator */}
                          {isSpeaking && (
                            <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[1px] flex items-center justify-center">
                              <div className="flex gap-0.5 items-center">
                                <span className="w-1 h-3 bg-amber-300 rounded-full animate-bounce [animation-delay:0ms]"></span>
                                <span className="w-1 h-5 bg-amber-300 rounded-full animate-bounce [animation-delay:150ms]"></span>
                                <span className="w-1 h-2 bg-amber-300 rounded-full animate-bounce [animation-delay:300ms]"></span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Audio Test Voice Bubble Button */}
                        <button
                          onClick={() => handleTestCatVoice(cat)}
                          title="Klik untuk mendengarkan suara tukang suara kucing ini"
                          disabled={isSpeaking}
                          className="absolute -bottom-2 -right-2 p-2 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg hover:scale-110 active:scale-95 transition-transform border border-amber-300/40 cursor-pointer disabled:opacity-50"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Info & Dubber Title */}
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-serif font-black text-base text-slate-800 dark:text-white leading-tight">
                          {cat.name}
                        </h4>
                        <p className="text-[10px] font-bold text-red-600 dark:text-amber-400 uppercase leading-snug">
                          {cat.role}
                        </p>
                        <p className="text-[8px] font-mono text-slate-400 uppercase truncate">
                          {cat.institution}
                        </p>
                        
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {cat.tukangSuaraTitle}
                          </span>
                          <span className="inline-block text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-rose-400 border border-red-500/20">
                            {cat.voiceModelLabel.split(':')[1]?.trim() || cat.geminiVoice}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Catchphrase */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      “{cat.catchphrase}”
                    </div>

                    {/* Fullness & Total Feeds Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                        <span>Tingkat Kekenyangan & Harmoni</span>
                        <span className="text-red-600 dark:text-amber-400 font-mono">
                          {feedsCount} Porsi Disajikan ({fullnessPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(8, fullnessPct)}%` }}
                          className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 h-full rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feeding Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleFeedAction(cat, selectedDish)}
                      disabled={isFeeding}
                      className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      <Gift className="w-4 h-4 animate-bounce" />
                      Sajikan {selectedDish.name} ({selectedDish.cost} XP) {selectedDish.icon}
                    </button>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>Aksen: {cat.voiceProfile.accent}</span>
                      <button 
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          setLeaderboardFilter(cat.id);
                          setActiveSubTab('leaderboard');
                        }}
                        className="text-red-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        Lihat Donatur Teratas <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PAPAN PERINGKAT SUGAR DADDY PER KUCING & GLOBAL               */}
      {/* ========================================================================= */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white dark:bg-[#1a0f12] p-6 md:p-8 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-red-100 dark:border-slate-800">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-amber-400 px-3 py-1 rounded-full bg-red-500/10">
                Papan Peringkat Donatur & Sugar Daddy/Mommy 👑
              </span>
              <h3 className="font-serif font-black text-2xl text-slate-800 dark:text-white mt-2">
                Klasemen Pemberi Makan Kucing Terbanyak (猫咪赞助榜)
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Siapakah yang paling royal menyajikan Bebek Peking, Seblak Rafael, dan Boba Chagee pada masing-masing kucing diplomat? Cek daftar donatur teratas di bawah ini!
              </p>
            </div>

            {/* Quick Feed Button back to feeding */}
            <button
              onClick={() => { playSound('click'); setActiveSubTab('feeding'); }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-center"
            >
              <Utensils className="w-4 h-4" /> Kasih Makan Sekarang!
            </button>
          </div>

          {/* Filter Bar per Cat */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { playSound('click'); setLeaderboardFilter('all'); }}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                leaderboardFilter === 'all'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              👑 Semua Kucing (Global)
            </button>

            {Object.values(CAT_MENTORS).map((cat) => (
              <button
                key={cat.id}
                onClick={() => { playSound('click'); setLeaderboardFilter(cat.id); }}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  leaderboardFilter === cat.id
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{cat.name.split(' ')[0]} {cat.name.split(' ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Leaderboard Table / Cards */}
          {filteredLeaderboard.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-5xl block animate-bounce">🥟</span>
              <h4 className="font-serif font-bold text-base text-slate-700 dark:text-slate-200">
                Belum ada donatur untuk kategori ini
              </h4>
              <p className="text-xs text-slate-400">
                Jadilah yang pertama menyajikan jamuan diplomasi dan raih gelar Sugar Daddy Diplomasi No. 1!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeaderboard.map((item: any, idx: number) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;
                const feeds = item.feedCount || item.totalFeeds || 0;
                const xpSpent = item.totalXpSpent || item.totalXp || 0;
                const feederTitle = getFeederTitle(feeds);

                return (
                  <div
                    key={item.id || item.userId || idx}
                    className={`p-5 rounded-3xl border relative overflow-hidden flex items-center gap-4 transition-all shadow-md ${
                      isTop1
                        ? 'bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 dark:bg-gradient-to-r dark:from-amber-950/40 dark:to-red-950/40'
                        : isTop2
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700'
                        : isTop3
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                        : 'bg-white dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-9 h-9 rounded-2xl font-mono font-black text-sm shadow-sm border border-black/10">
                      {isTop1 ? (
                        <span className="text-xl animate-bounce">👑</span>
                      ) : isTop2 ? (
                        <span className="text-xl">🥈</span>
                      ) : isTop3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-slate-500 font-mono">#{idx + 1}</span>
                      )}
                    </div>

                    {/* User Avatar */}
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-red-500/30 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                      {item.userPhoto ? (
                        <img 
                          src={item.userPhoto} 
                          alt={item.userName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-serif font-black text-sm text-slate-800 dark:text-white truncate">
                          {item.userName}
                        </h4>
                        {isTop1 && (
                          <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full uppercase">
                            Sultan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${feederTitle.color}`}>
                          {feederTitle.badge}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                          {feederTitle.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> {feeds} Porsi
                        </span>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {xpSpent} XP
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AI VOICE MODEL STUDIO MODAL                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showVoiceStudioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#180e12] border-2 border-amber-500/40 rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-white overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-red-950 via-[#231015] to-amber-950 border-b border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-red-600/30 border border-amber-400/40 text-amber-300">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-xl text-amber-100">
                      Studio Model Suara Kucing (AI Voice Studio)
                    </h3>
                    <p className="text-xs text-amber-200/70">
                      Pilih dari {VOICE_MODELS.length} model suara AI & Web Audio untuk mengisi suara kucing diplomatik
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { playSound('click'); stopAllAudioPlayback(); setShowVoiceStudioModal(false); }}
                  className="p-2 rounded-2xl bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Models List */}
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center justify-between">
                  <span>Model Aktif Saat Ini: <strong className="text-amber-300">{currentVoiceModel.name}</strong></span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 rounded-full font-mono text-amber-300">
                    {currentVoiceModel.tag}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {VOICE_MODELS.map((model) => {
                    const isSelected = activeVoiceModelId === model.id;
                    const isAuditioning = isAuditioningId === model.id;

                    return (
                      <div
                        key={model.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-gradient-to-r from-red-950/60 to-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                            : 'bg-black/30 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl p-2 rounded-xl bg-black/40 border border-amber-500/20 shrink-0">
                            {model.avatarIcon}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif font-black text-sm text-white">
                                {model.name}
                              </h4>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-600/30 text-amber-300 border border-amber-500/30">
                                {model.tag}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {model.description}
                            </p>
                            <p className="text-[10px] text-amber-400/80 font-medium">
                              Sesuai untuk: <span className="italic">{model.recommendedFor}</span>
                            </p>
                          </div>
                        </div>

                        {/* Audition & Select Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Audition Button */}
                          <button
                            onClick={() => handleAuditionModel(model)}
                            disabled={isAuditioning}
                            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${isAuditioning ? 'animate-bounce text-amber-400' : ''}`} />
                            <span>{isAuditioning ? 'Memutar...' : 'Audisi'}</span>
                          </button>

                          {/* Select Button */}
                          <button
                            onClick={() => handleSelectVoiceModel(model.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <span>Pilih</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-black/40 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-200/70">
                <span>Model suara tersimpan secara otomatis di preferensi browser Anda.</span>
                <button
                  onClick={() => { playSound('click'); stopAllAudioPlayback(); setShowVoiceStudioModal(false); }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold cursor-pointer hover:scale-105 transition-transform"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
