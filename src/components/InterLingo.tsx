import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Award, BookOpen, CheckCircle, ShieldCheck, HelpCircle, ArrowRight, 
  RefreshCw, Star, Flame, Trophy, Lock, Play, ChevronRight, ChevronLeft,
  MessageSquare, Sparkles, Loader2, User, Volume2, Heart, Smile, Compass, 
  Gift, Utensils, Clock, Check, X, RotateCcw, Shuffle, Bookmark, 
  Layers, VolumeX, Lightbulb, Globe, MapPin, 
  Scale, FileText, CheckCircle2, AlertCircle, Info
} from 'lucide-react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LESSONS, 
  CAT_MENTORS, 
  TIERS, 
  CatMentor, 
  Lesson, 
  Question, 
  StudyCard, 
  TheoryBrief, 
  MatchingPair,
  TTSLang 
} from '../data/interlingo_data';
import { CatCanteen } from './CatCanteen';
import { speakDiplomaticSpeech } from '../lib/cat_audio_engine';

// --- SOUNDBOARD CONTROLLER (Web Audio API) ---
const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'feed' | 'click' | 'flip' | 'alarm') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      // Pentatonic Chinese Imperial chime (Gong / Chime harmonic)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(587.33, now + 0.08); // D5
      osc1.frequency.setValueAtTime(659.25, now + 0.16); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.24); // G5
      osc1.frequency.setValueAtTime(880.00, now + 0.32); // A5

      osc2.frequency.setValueAtTime(1046.50, now + 0.24); // C6 bell shimmer

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now + 0.2);
      osc1.stop(now + 0.68);
      osc2.stop(now + 0.68);
    } else if (type === 'incorrect') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'complete') {
      // Grand Imperial Fanfare (Chinese Pentatonic G-A-C-D-E-G)
      const pentatonic = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; 
      pentatonic.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.12, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + 1.2);
      });
    } else if (type === 'feed') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(392, now); // G4
      osc1.frequency.linearRampToValueAtTime(659, now + 0.15); // E5
      osc1.frequency.linearRampToValueAtTime(783, now + 0.3); // G5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783, now);
      osc2.frequency.exponentialRampToValueAtTime(1046, now + 0.3);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'click' || type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'flip' ? 880 : 660, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'alarm') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.error("Audio Web API error:", e);
  }
};

interface UserProgress {
  userId: string;
  userName: string;
  userPhoto?: string;
  xp: number;
  streak: number;
  lastActiveDate: string;
  completedLessons: string[];
  updatedAt: string;
}

// Unified step in the interleaved lesson journey
export type LessonStepType = 'briefing' | 'concept_card' | 'question';

export interface LessonStep {
  stepType: LessonStepType;
  briefing?: TheoryBrief;
  conceptCard?: StudyCard;
  question?: Question;
  stepIndex: number;
}

// Build interleaved queue of steps for a given lesson
function buildInterleavedSteps(lesson: Lesson): LessonStep[] {
  const steps: LessonStep[] = [];
  let stepCounter = 0;

  // 1. First Step: The Mentor's Theory & Siyasah Briefing
  steps.push({
    stepType: 'briefing',
    briefing: lesson.theoryBrief,
    stepIndex: stepCounter++
  });

  // 2. Interleave Study Cards with Practice Questions
  const studyCards = lesson.studyCards || [];
  const questions = lesson.questions || [];

  let cardIdx = 0;
  let qIdx = 0;

  while (cardIdx < studyCards.length || qIdx < questions.length) {
    // Insert a concept/study card if available
    if (cardIdx < studyCards.length) {
      steps.push({
        stepType: 'concept_card',
        conceptCard: studyCards[cardIdx],
        stepIndex: stepCounter++
      });
      cardIdx++;
    }

    // Insert 1 or 2 matching practice questions right after
    if (qIdx < questions.length) {
      steps.push({
        stepType: 'question',
        question: questions[qIdx],
        stepIndex: stepCounter++
      });
      qIdx++;
    }
  }

  // If there are leftover questions (e.g. cumulative scenario dilemma or matching pairs at the end), add them
  while (qIdx < questions.length) {
    steps.push({
      stepType: 'question',
      question: questions[qIdx],
      stepIndex: stepCounter++
    });
    qIdx++;
  }

  return steps;
}

// --- CHINESE DIPLOMATIC BANQUET DISHES ---
const CHINESE_DIPLOMATIC_DISHES = [
  {
    id: 'jiaozi',
    name: 'Jiaozi Diplomasi (外交水饺)',
    desc: 'Pangsit simbol persahabatan bilateral & traktat',
    icon: '🥟',
    cost: 20,
    voicePhrase: '谢谢你，这道外交水饺皮薄馅大，太好吃了！'
  },
  {
    id: 'peking_duck',
    name: 'Bebek Peking Kenegaraan (北京烤鸭)',
    desc: 'Jamuan makan malam resmi Konferensi Tingkat Tinggi',
    icon: '🦆',
    cost: 30,
    voicePhrase: '哇！北京烤鸭国宴佳肴，一言九鼎！'
  },
  {
    id: 'mooncake',
    name: 'Kue Bulan Traktat Damai (和平月饼)',
    desc: 'Simbol keharmonisan & perdamaian abadi',
    icon: '🥮',
    cost: 20,
    voicePhrase: '月圆人团圆，祝愿世界和平共处！'
  },
  {
    id: 'longjing_tea',
    name: 'Teh Hijau Longjing (西湖龙井茶)',
    desc: 'Teh diplomasi perundingan bilateral meja bundar',
    icon: '🍵',
    cost: 15,
    voicePhrase: '以茶会友，品味外交风范！'
  },
  {
    id: 'dimsum',
    name: 'Dim Sum Multilateral (多边点心)',
    desc: 'Koleksi aneka dim sum sidang internasional',
    icon: '🥢',
    cost: 25,
    voicePhrase: '多边合作点心，味道真是绝妙！'
  },
  {
    id: 'longevity_noodles',
    name: 'Mie Panjang Umur Hubungan (友谊长寿面)',
    desc: 'Doa persahabatan diplomatik langgeng & harmonis',
    icon: '🍜',
    cost: 20,
    voicePhrase: '友谊地久天长，长寿面太香了！'
  }
];

// --- MENTOR CAT AVATAR COMPONENT ---
function CatMemeAvatar({ 
  type, 
  imageUrl, 
  className = "w-20 h-20", 
  talking = false 
}: { 
  type: string; 
  imageUrl: string; 
  className?: string; 
  talking?: boolean 
}) {
  return (
    <div className={`relative ${className} rounded-3xl overflow-hidden border-2 border-red-500/40 shadow-xl bg-slate-950 shrink-0 group select-none ring-2 ring-amber-500/20`}>
      <img 
        src={imageUrl} 
        alt="Diplomatic Cat Mentor" 
        className={`w-full h-full object-cover transition-transform duration-500 ${
          talking ? 'scale-110' : 'group-hover:scale-105'
        }`}
        referrerPolicy="no-referrer"
      />

      {/* Diplomatic Chinese Traditional Badge / Seal */}
      <div className="absolute top-1.5 right-1.5 bg-red-600/90 text-amber-300 font-serif font-black text-[7px] px-1.5 py-0.5 rounded border border-amber-400/40 shadow">
        中
      </div>

      {type === 'hat' && (
        <div className="absolute top-1.5 left-2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[7px] px-2 py-0.5 rounded-full shadow pointer-events-none">
          🏮 学者
        </div>
      )}

      {type === 'paw' && (
        <div className="absolute bottom-1.5 left-2 bg-amber-500 text-slate-900 font-black text-[7px] px-2 py-0.5 rounded-full shadow pointer-events-none">
          📜 大使
        </div>
      )}

      {type === 'tongue' && (
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none">
          <motion.div 
            animate={{ scaleY: [1, 1.4, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-4 h-5 bg-rose-400 rounded-b-full border-2 border-red-500 shadow-md origin-top" 
          />
        </div>
      )}

      {type === 'cool' && (
        <div className="absolute top-[38%] inset-x-0 flex justify-center pointer-events-none scale-110">
          <div className="flex gap-1 items-center">
            <div className="w-6 h-4 bg-slate-950 rounded-md border-t border-amber-500 shadow-md" />
            <div className="w-2 h-0.5 bg-amber-500" />
            <div className="w-6 h-4 bg-slate-950 rounded-md border-t border-amber-500 shadow-md" />
          </div>
        </div>
      )}

      {type === 'rebel' && (
        <div className="absolute bottom-2 left-2 bg-red-700 text-amber-300 font-black text-[7px] px-2 py-0.5 rounded-full uppercase tracking-widest pointer-events-none shadow-md border border-amber-400/30">
          VETO! 否决
        </div>
      )}

      {type === 'closeup' && (
        <div className="absolute inset-0 border-4 border-dashed border-red-500/50 rounded-2xl animate-[spin_12s_linear_infinite] pointer-events-none" />
      )}
    </div>
  );
}

export default function InterLingo({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'map' | 'glossary' | 'canteen'>('map');
  const [selectedTier, setSelectedTier] = useState<number | 'all'>('all');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Lesson Context (Interleaved Step Engine)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<LessonStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Step-specific Interactive States
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Sentence Builder State
  const [assembledTokens, setAssembledTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>([]);

  // Matching Pairs State
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{ [left: string]: string }>({});
  const [shuffledRights, setShuffledRights] = useState<string[]>([]);

  // Feeding & XP deduction
  const [fedCatId, setFedCatId] = useState<string | null>(null);
  const [feedingBubble, setFeedingBubble] = useState<string | null>(null);
  const [xpDeductionAnim, setXpDeductionAnim] = useState(false);

  // Load progress & leaderboard from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const leadQuery = query(collection(db, 'interlingo_progress'), orderBy('xp', 'desc'), limit(15));
    const unsubLead = onSnapshot(leadQuery, (snap) => {
      setLeaderboard(snap.docs.map(d => d.data() as UserProgress));
    }, (error) => {
      console.error("Leaderboard loading failed:", error);
      handleFirestoreError(error, OperationType.LIST, 'interlingo_progress');
    });

    const docRef = doc(db, 'interlingo_progress', user.uid);
    const unsubProgress = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        setProgress(docSnap.data() as UserProgress);
      } else {
        const defaultProg: UserProgress = {
          userId: user.uid,
          userName: user.displayName || 'Diplomat Muda',
          userPhoto: user.photoURL || undefined,
          xp: 30, // Starter XP
          streak: 0,
          lastActiveDate: '',
          completedLessons: [],
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, defaultProg);
        setProgress(defaultProg);
      }
      setLoading(false);
    }, (error) => {
      console.error("User progress loading failed:", error);
      handleFirestoreError(error, OperationType.GET, `interlingo_progress/${user.uid}`);
    });

    return () => {
      unsubLead();
      unsubProgress();
    };
  }, [user]);

  // Current Step helper
  const currentStep = steps[currentStepIdx];

  // Helper to initialize question-specific sub-states
  const initStepState = (step: LessonStep) => {
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeUp(false);
    setTimeLeft(30);

    if (step.stepType === 'concept_card' && step.conceptCard) {
      speakDiplomaticSpeech(step.conceptCard.audioText, step.conceptCard.audioLang);
    } else if (step.stepType === 'question' && step.question) {
      const q = step.question;
      if (q.type === 'sentence_builder' && q.wordTokens) {
        const shuffled = [...q.wordTokens].sort(() => Math.random() - 0.5);
        setAvailableTokens(shuffled);
        setAssembledTokens([]);
      } else if (q.type === 'matching' && q.matchingPairs) {
        setMatchedPairs({});
        setSelectedLeft(null);
        const rights = q.matchingPairs.map(p => p.right).sort(() => Math.random() - 0.5);
        setShuffledRights(rights);
      }
    }
  };

  // Timer Clock for Question Steps
  useEffect(() => {
    if (!activeLesson || !currentStep || currentStep.stepType !== 'question' || lessonComplete || lives <= 0 || isAnswered) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        if (prev <= 5) {
          playSound('alarm');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeLesson, currentStepIdx, isAnswered, lessonComplete, lives]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    setIsAnswered(true);
    playSound('incorrect');
    setLives((prev) => Math.max(0, prev - 1));
  };

  // Start Unified Lesson Journey
  const handleOpenLesson = (lesson: Lesson) => {
    playSound('click');
    setPreviewLesson(null);
    setActiveLesson(lesson);
    const lessonSteps = buildInterleavedSteps(lesson);
    setSteps(lessonSteps);
    setCurrentStepIdx(0);
    setLives(3);
    setLessonComplete(false);
    
    if (lessonSteps.length > 0) {
      initStepState(lessonSteps[0]);
    }
  };

  // Answer multiple choice / scenario / listening
  const handleSelectOption = (optIdx: number) => {
    if (isAnswered || !currentStep || currentStep.stepType !== 'question' || !currentStep.question) return;
    playSound('click');
    setSelectedOption(optIdx);
    setIsAnswered(true);

    const question = currentStep.question;
    const isCorrect = question.type === 'true_false' 
      ? (optIdx === 0 ? question.isTrue === true : question.isTrue === false)
      : question.correctAnswer === optIdx;

    if (isCorrect) {
      playSound('correct');
      if (question.audioText) {
        speakDiplomaticSpeech(question.audioText, question.audioLang || 'ar-SA');
      }
    } else {
      playSound('incorrect');
      setLives((prev) => Math.max(0, prev - 1));
    }
  };

  // Sentence Builder Token Interactions
  const handleAddToken = (token: string, tokenIdx: number) => {
    if (isAnswered) return;
    playSound('click');
    setAssembledTokens(prev => [...prev, token]);
    setAvailableTokens(prev => prev.filter((_, idx) => idx !== tokenIdx));
  };

  const handleRemoveToken = (token: string, tokenIdx: number) => {
    if (isAnswered) return;
    playSound('click');
    setAvailableTokens(prev => [...prev, token]);
    setAssembledTokens(prev => prev.filter((_, idx) => idx !== tokenIdx));
  };

  const handleCheckSentence = () => {
    if (isAnswered || !currentStep || !currentStep.question) return;
    const question = currentStep.question;
    if (!question.correctOrder) return;

    const isCorrect = JSON.stringify(assembledTokens) === JSON.stringify(question.correctOrder);
    setIsAnswered(true);

    if (isCorrect) {
      playSound('correct');
      if (question.audioText) {
        speakDiplomaticSpeech(question.audioText, question.audioLang || 'ar-SA');
      }
    } else {
      playSound('incorrect');
      setLives(prev => Math.max(0, prev - 1));
    }
  };

  // Matching Pairs Interactions
  const handleSelectLeftPair = (leftText: string) => {
    if (isAnswered) return;
    playSound('click');
    setSelectedLeft(leftText);
  };

  const handleSelectRightPair = (rightText: string) => {
    if (isAnswered || !selectedLeft || !currentStep || !currentStep.question) return;
    playSound('click');
    
    const question = currentStep.question;
    const pair = question.matchingPairs?.find(p => p.left === selectedLeft);

    if (pair && pair.right === rightText) {
      playSound('correct');
      const newMatched = { ...matchedPairs, [selectedLeft]: rightText };
      setMatchedPairs(newMatched);
      setSelectedLeft(null);

      // Check if all matched
      if (Object.keys(newMatched).length === question.matchingPairs?.length) {
        setIsAnswered(true);
      }
    } else {
      playSound('incorrect');
      setLives(prev => Math.max(0, prev - 1));
      setSelectedLeft(null);
    }
  };

  // Next Step in Unified Journey
  const handleNextStep = () => {
    playSound('click');
    if (!activeLesson) return;

    if (currentStepIdx < steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      initStepState(steps[nextIdx]);
    } else {
      handleCompleteLesson();
    }
  };

  const handleCompleteLesson = async () => {
    if (!progress || !activeLesson || !user) return;

    playSound('complete');
    const lessonId = activeLesson.id;
    const isFirstTime = !progress.completedLessons.includes(lessonId);
    const xpReward = isFirstTime ? activeLesson.xp : 20;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = progress.streak;

    if (progress.lastActiveDate === yesterdayStr) {
      newStreak += 1;
    } else if (progress.lastActiveDate !== todayStr) {
      newStreak = 1;
    }

    const updatedCompleted = isFirstTime 
      ? [...progress.completedLessons, lessonId] 
      : progress.completedLessons;

    const docRef = doc(db, 'interlingo_progress', user.uid);
    const updatedProg = {
      xp: progress.xp + xpReward,
      streak: newStreak,
      lastActiveDate: todayStr,
      completedLessons: updatedCompleted,
      updatedAt: new Date().toISOString()
    };

    try {
      await updateDoc(docRef, updatedProg);
      logPortalActivity('interlingo_lesson', `Lulus materi: ${activeLesson.title} (${activeLesson.tierLabel})`, user);
    } catch (e) {
      console.error("Failed to save progress:", e);
    }

    setLessonComplete(true);
  };

  // Feed Canteen Mentor with Chinese Diplomatic Banquet Dish
  const handleFeedCat = async (catId: string, dishId: string = 'jiaozi') => {
    if (!progress || !user) return;
    const dish = CHINESE_DIPLOMATIC_DISHES.find(d => d.id === dishId) || CHINESE_DIPLOMATIC_DISHES[0];
    
    if (progress.xp < dish.cost) {
      playSound('incorrect');
      alert(`XP kamu belum cukup meow! Diperlukan minimal ${dish.cost} XP untuk menyajikan ${dish.name}!`);
      return;
    }

    playSound('feed');
    setFedCatId(catId);
    setXpDeductionAnim(true);
    
    const mentor = CAT_MENTORS[catId];
    setFeedingBubble(`"${mentor.name}: ${dish.voicePhrase} (${dish.name} sangat lezat!)"`);
    speakDiplomaticSpeech(dish.voicePhrase, "zh-CN");

    const docRef = doc(db, 'interlingo_progress', user.uid);
    try {
      await updateDoc(docRef, {
        xp: Math.max(0, progress.xp - dish.cost),
        updatedAt: new Date().toISOString()
      });
      logPortalActivity('interlingo_canteen', `Menyajikan ${dish.name} kepada ${mentor.name}`, user);
    } catch (e) {
      console.error("Failed to feed mentor:", e);
    }

    setTimeout(() => setXpDeductionAnim(false), 1000);
    setTimeout(() => {
      setFedCatId(null);
      setFeedingBubble(null);
    }, 5000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase animate-pulse">
          Memuat Kurikulum Diplomasi & Bahasa Mandarin Hubungan Internasional (中文外交)...
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACTIVE UNIFIED LESSON (INTERLEAVED INFORMATION & DRILLS)
  // =========================================================================
  if (activeLesson && steps.length > 0) {
    const mentor = CAT_MENTORS[activeLesson.catMentor];
    const totalSteps = steps.length;
    const progressPct = Math.round(((currentStepIdx + 1) / totalSteps) * 100);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation & Status Bar */}
        <div className="bg-white dark:bg-[#1a0f12] p-5 rounded-[2rem] border border-red-100 dark:border-red-950/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playSound('click');
                if (window.confirm("Keluar dari sesi materi ini?")) {
                  setActiveLesson(null);
                }
              }}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
              title="Kembali ke Peta Stage"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20">
                  Level {activeLesson.stageNumber} • {activeLesson.tierLabel}
                </span>
                <span className="text-[9px] font-bold text-slate-400">{activeLesson.difficulty}</span>
              </div>
              <h3 className="font-serif font-black text-lg text-slate-800 dark:text-white leading-tight mt-0.5">
                {activeLesson.title}
              </h3>
            </div>
          </div>

          {/* Unified Progress Indicator */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                Langkah {currentStepIdx + 1} dari {totalSteps}
              </span>
              <div className="w-32 sm:w-40 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 rounded-full transition-all duration-300 shadow" 
                />
              </div>
            </div>

            {/* Lives / Hearts */}
            <div className="flex items-center gap-1 bg-red-50/60 dark:bg-slate-900/60 px-3 py-2 rounded-2xl border border-red-100/60 dark:border-slate-800">
              {[0, 1, 2].map((heartIdx) => (
                <Heart 
                  key={heartIdx}
                  className={`w-4 h-4 ${
                    heartIdx < lives 
                      ? 'text-red-600 fill-red-600 drop-shadow-[0_2px_4px_rgba(220,38,38,0.3)]' 
                      : 'text-slate-300 dark:text-slate-700'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Step Container */}
        <div className="bg-white dark:bg-[#1a0f12] rounded-[2.5rem] border border-red-100 dark:border-red-950/60 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {lives <= 0 ? (
              /* ================= GAME OVER SCREEN ================= */
              <motion.div
                key="gameover"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-24 h-24 bg-gradient-to-tr from-red-600 to-rose-700 text-white rounded-[2.2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-600/25 animate-bounce">
                  <span className="text-5xl">😾</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl font-black text-red-600 dark:text-red-400">Interupsi Sidang, Negosiasi Terhenti!</h3>
                  <p className="text-xs text-red-500 uppercase tracking-[0.25em] font-black">Taktik Diplomasi Butuh Pengasahan (需再学习)</p>
                  <p className="text-sm max-w-md mx-auto leading-relaxed text-slate-500 dark:text-slate-300 px-4 italic">
                    “Meow! Aliansi diplomatikmu goyah. Ulangi level ini dari awal untuk memperdalam konsep dan menaklukkan resolusi!”
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      playSound('click');
                      handleOpenLesson(activeLesson);
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/20 transition-all cursor-pointer"
                  >
                    Ulangi Level Ini 🔁
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setActiveLesson(null);
                    }}
                    className="px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Kembali ke Peta 🗺️
                  </button>
                </div>
              </motion.div>
            ) : lessonComplete ? (
              /* ================= LESSON COMPLETE CELEBRATION ================= */
              <motion.div
                key="complete"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-24 h-24 bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white rounded-[2.2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-600/30 animate-bounce">
                  <Trophy className="w-12 h-12 text-amber-300" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl font-black text-slate-800 dark:text-white">Selamat! Misi Diplomasi Ditaklukkan! 🏮</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-[0.25em] font-black">
                    PENCAPAIAN DIPLOMASI MANDARIN (外交成就)
                  </p>
                  <p className="text-sm max-w-md mx-auto leading-relaxed text-slate-500 dark:text-slate-300 px-4">
                    Selamat, kamu berhasil menguasai materi **{activeLesson.title}** secara bertahap dari teori, istilah, hingga simulasi praktik!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-2">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4.5 rounded-3xl border border-red-500/10 shadow-sm">
                    <Star className="w-6 h-6 text-amber-500 mx-auto mb-1 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">XP Diperoleh</p>
                    <p className="text-lg font-black text-red-600 dark:text-red-400">
                      +{progress?.completedLessons.includes(activeLesson.id) ? 20 : activeLesson.xp} XP
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4.5 rounded-3xl border border-red-500/10 shadow-sm">
                    <Flame className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Streak Belajar</p>
                    <p className="text-lg font-black text-amber-600">{progress?.streak || 1} Hari</p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      playSound('click');
                      setActiveLesson(null);
                    }}
                    className="px-10 py-4.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/25 transition-all cursor-pointer"
                  >
                    Lanjut ke Peta Stage 🗺️
                  </button>
                </div>
              </motion.div>
            ) : currentStep ? (
              /* ================= ACTIVE STEP RENDERING ================= */
              <motion.div
                key={currentStepIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* --- STEP TYPE 1: BRIEFING & TEORI HI --- */}
                {currentStep.stepType === 'briefing' && currentStep.briefing && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-red-950 via-red-900 to-slate-950 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-red-800/40">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 blur-3xl rounded-full pointer-events-none" />
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-3 max-w-2xl">
                          <div className="inline-flex items-center gap-2 bg-red-600/30 text-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-400/30 shadow">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 1. Briefing Diplomasi & Teori HI (外交简报)
                          </div>
                          <h2 className="font-serif text-2xl md:text-3xl font-black leading-tight text-amber-100">
                            {currentStep.briefing.title}
                          </h2>
                          <p className="text-xs md:text-sm text-red-100/90 leading-relaxed font-light">
                            {currentStep.briefing.summary}
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-2 bg-black/40 p-4 rounded-3xl border border-amber-400/20 backdrop-blur-sm shrink-0">
                          <CatMemeAvatar 
                            type={mentor.overlayType} 
                            imageUrl={mentor.imageUrl} 
                            className="w-20 h-20"
                          />
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-amber-300">{mentor.name}</p>
                            <p className="text-[8px] text-red-200/70 uppercase">{mentor.institution}</p>
                          </div>
                        </div>
                      </div>

                      {/* Theory Insights Pillars */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-amber-400" /> Perspektif Teori & Landasan HI
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed italic">
                            "{currentStep.briefing.theoreticalPerspective}"
                          </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-200 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-amber-300" /> Protokol Sidang & Konvensi
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {currentStep.briefing.diplomaticProtocol}
                          </p>
                        </div>
                      </div>

                      {/* Key Vocabulary Highlights */}
                      {currentStep.briefing.keyVocabularyHighlights && currentStep.briefing.keyVocabularyHighlights.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-amber-300 tracking-wider">
                            Istilah Kunci (核心词汇):
                          </span>
                          {currentStep.briefing.keyVocabularyHighlights.map((term, i) => (
                            <span key={i} className="text-xs bg-red-600/30 text-amber-200 border border-amber-400/30 px-2.5 py-0.5 rounded-lg font-mono">
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action button to proceed */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleNextStep}
                        className="px-8 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/25 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        Paham Briefing! Masuk ke Pembelajaran Istilah <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- STEP TYPE 2: SISIPAN ISTILAH BARU (CONCEPT CARD) --- */}
                {currentStep.stepType === 'concept_card' && currentStep.conceptCard && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                          {currentStep.conceptCard.tag || 'Istilah & Frasa Kunci'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Pelajari sebelum latihan interaktif
                        </span>
                      </div>

                      <button
                        onClick={() => speakDiplomaticSpeech(currentStep.conceptCard!.audioText, currentStep.conceptCard!.audioLang)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer"
                        title="Dengarkan pelafalan asli"
                      >
                        <Volume2 className="w-4 h-4" /> Dengar Pelafalan (发音)
                      </button>
                    </div>

                    <div className="bg-gradient-to-br from-red-50/80 via-amber-50/40 to-rose-50/40 dark:from-[#1f1215] dark:via-[#1c1214] dark:to-[#1a0f12] p-6 md:p-10 rounded-3xl border-2 border-red-500/20 shadow-lg space-y-6">
                      <div className="text-center py-4 space-y-3">
                        <h2 
                          className="font-serif font-black text-3xl md:text-5xl text-slate-800 dark:text-white tracking-wide" 
                          dir={currentStep.conceptCard.language === 'ar' ? 'rtl' : 'ltr'}
                        >
                          {currentStep.conceptCard.term}
                        </h2>
                        {currentStep.conceptCard.transliteration && (
                          <p className="text-sm md:text-base font-mono text-red-600 dark:text-amber-400 font-bold">
                            {currentStep.conceptCard.transliteration}
                          </p>
                        )}
                        <div className="inline-block bg-white dark:bg-slate-800 px-6 py-2.5 rounded-2xl shadow-sm border border-red-100 dark:border-slate-700">
                          <p className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-200">
                            {currentStep.conceptCard.meaning}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-red-500/10">
                        <div className="bg-white/80 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-red-100/60 dark:border-slate-700/50 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-red-500" /> Konteks Diplomasi & Hubungan Internasional:
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {currentStep.conceptCard.contextHI}
                          </p>
                        </div>

                        <div className="bg-white/80 dark:bg-slate-800/80 p-4.5 rounded-2xl border border-red-100/60 dark:border-slate-700/50 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-500" /> Contoh dalam Sidang / Traktat:
                          </span>
                          <p className="text-xs font-serif text-slate-700 dark:text-slate-200 italic leading-relaxed">
                            "{currentStep.conceptCard.exampleSentence}"
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CatMemeAvatar 
                          type={mentor.overlayType} 
                          imageUrl={mentor.imageUrl} 
                          className="w-8 h-8 rounded-xl"
                        />
                        <span>{mentor.name}: "Lafalkan istilah ini lalu uji pemahamanmu!"</span>
                      </div>

                      <button
                        onClick={handleNextStep}
                        className="px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        Lanjut ke Latihan Terkait <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- STEP TYPE 3: SOAL & LATIHAN INTERAKTIF (QUESTION) --- */}
                {currentStep.stepType === 'question' && currentStep.question && (
                  <div className="space-y-6">
                    {/* Header: Question Type Badge & Timer */}
                    <div className="flex items-center justify-between bg-red-50/50 dark:bg-slate-900/40 px-4 py-2.5 rounded-2xl border border-red-100/50 dark:border-slate-800">
                      {/* Question Model Type Tag */}
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-full border border-red-500/20">
                        {currentStep.question.type === 'multiple_choice' && 'Pilihan Ganda Kontekstual 📝'}
                        {currentStep.question.type === 'sentence_builder' && 'Penyusun Frasa Resolusi 🧩'}
                        {currentStep.question.type === 'matching' && 'Hubungkan Pasangan Istilah 🔗'}
                        {currentStep.question.type === 'scenario_dilemma' && 'Studi Kasus Diplomasi 🏛️'}
                        {currentStep.question.type === 'listening' && 'Uji Pendengaran Audio 🎧'}
                        {currentStep.question.type === 'true_false' && 'Analisis Benar / Salah ⚖️'}
                      </div>

                      {/* Timer */}
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                        <span className={`font-mono text-sm font-black ${
                          timeLeft <= 5 
                            ? 'text-red-500 animate-bounce bg-red-500/10 px-2 py-0.5 rounded-md' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {timeLeft}s
                        </span>
                      </div>
                    </div>

                    {/* Mentor Speech Dialogue */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                      <CatMemeAvatar 
                        type={mentor.overlayType} 
                        imageUrl={mentor.imageUrl} 
                        className="w-14 h-14"
                        talking={isAnswered}
                      />
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[9px] font-black uppercase text-red-600 dark:text-amber-400">{mentor.name}</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">
                          {isAnswered
                            ? (selectedOption === currentStep.question.correctAnswer || (currentStep.question.type === 'sentence_builder' && isAnswered)
                                ? '“Excellent! Jawabanmu tepat dan menunjukkan kematangan diplomatik.”'
                                : '“Kurang tepat meow. Telaah kembali catatan analisis di bawah!”')
                            : `“${mentor.catchphrase} Selesaikan tantangan ini dengan cermat!”`}
                        </p>
                      </div>
                    </div>

                    {/* Question Content: MULTIPLE CHOICE or TRUE/FALSE */}
                    {(currentStep.question.type === 'multiple_choice' || currentStep.question.type === 'true_false') && (
                      <div className="space-y-4">
                        <div className="bg-red-500/[0.03] border border-red-500/15 p-6 rounded-3xl text-center space-y-3">
                          <h3 className="font-serif font-black text-xl md:text-2xl text-slate-800 dark:text-white leading-relaxed max-w-2xl mx-auto">
                            {currentStep.question.question}
                          </h3>
                          {currentStep.question.audioText && (
                            <button
                              onClick={() => speakDiplomaticSpeech(currentStep.question!.audioText!, currentStep.question!.audioLang)}
                              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" /> Putar Audio Lafal (播放发音)
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentStep.question.type === 'true_false' ? (
                            [
                              { label: 'Benar (True / 正确)', val: true },
                              { label: 'Salah (False / 错误)', val: false }
                            ].map((tf, idx) => {
                              const isSelected = selectedOption === idx;
                              const isCorrect = currentStep.question!.isTrue === tf.val;
                              let style = "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18242f]";
                              if (isAnswered) {
                                if (isCorrect) style = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/20";
                                else if (isSelected) style = "bg-rose-500/10 border-rose-500 text-rose-600";
                                else style = "opacity-40";
                              }

                              return (
                                <button
                                  key={idx}
                                  disabled={isAnswered}
                                  onClick={() => handleSelectOption(idx)}
                                  className={`p-5 rounded-2xl border text-sm font-bold transition-all text-center flex items-center justify-center gap-3 ${style} cursor-pointer hover:border-red-500`}
                                >
                                  <span>{tf.label}</span>
                                  {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-red-600" />}
                                </button>
                              );
                            })
                          ) : (
                            currentStep.question.options?.map((opt, idx) => {
                              const isSelected = selectedOption === idx;
                              const isCorrect = currentStep.question!.correctAnswer === idx;
                              let style = "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18242f]";
                              if (isAnswered) {
                                if (isCorrect) style = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/20";
                                else if (isSelected) style = "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400";
                                else style = "opacity-40";
                              } else if (isSelected) {
                                style = "border-red-500 bg-red-500/5 ring-4 ring-red-500/10";
                              }

                              return (
                                <button
                                  key={idx}
                                  disabled={isAnswered}
                                  onClick={() => handleSelectOption(idx)}
                                  className={`p-4.5 rounded-2xl border text-xs md:text-sm font-semibold transition-all flex items-center justify-between text-left ${style} cursor-pointer hover:border-red-500`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                      isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                                  </div>
                                  {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Question Content: SCENARIO DILEMMA */}
                    {currentStep.question.type === 'scenario_dilemma' && (
                      <div className="space-y-4">
                        <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl space-y-3">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
                            <Scale className="w-4 h-4" /> Skenario Kasus Diplomatik (外交情境案例)
                          </div>
                          <p className="text-sm md:text-base font-serif text-slate-800 dark:text-slate-100 leading-relaxed italic bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-amber-500/10">
                            "{currentStep.question.scenario}"
                          </p>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white pt-2">
                            {currentStep.question.question}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {currentStep.question.options?.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = currentStep.question!.correctAnswer === idx;
                            let style = "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18242f]";
                            if (isAnswered) {
                              if (isCorrect) style = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/20";
                              else if (isSelected) style = "bg-rose-500/10 border-rose-500 text-rose-600";
                              else style = "opacity-40";
                            }

                            return (
                              <button
                                key={idx}
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(idx)}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-medium transition-all text-left flex items-start justify-between gap-3 ${style} cursor-pointer hover:border-red-500`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                                </div>
                                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Question Content: SENTENCE BUILDER */}
                    {currentStep.question.type === 'sentence_builder' && (
                      <div className="space-y-4">
                        <div className="bg-red-500/[0.03] border border-red-500/15 p-6 rounded-3xl text-center space-y-2">
                          <h3 className="font-serif font-black text-xl text-slate-800 dark:text-white">
                            {currentStep.question.question}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Ketuk kata-kata di bawah secara berurutan untuk menyusun frasa diplomasi resmi Mandarin.
                          </p>
                        </div>

                        {/* Assembled Sentence Box */}
                        <div className="min-h-[70px] bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-950 flex flex-wrap items-center gap-2">
                          {assembledTokens.map((tok, idx) => (
                            <motion.button
                              key={idx}
                              layout
                              disabled={isAnswered}
                              onClick={() => handleRemoveToken(tok, idx)}
                              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-md shadow-red-600/20 hover:bg-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{tok}</span>
                              {!isAnswered && <X className="w-3.5 h-3.5 opacity-60" />}
                            </motion.button>
                          ))}

                          {assembledTokens.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Ketuk potongan kata Hanzi / Pinyin di bawah...</span>
                          )}
                        </div>

                        {/* Available Word Bank */}
                        <div className="flex flex-wrap gap-2 justify-center py-2">
                          {availableTokens.map((tok, idx) => (
                            <button
                              key={idx}
                              disabled={isAnswered}
                              onClick={() => handleAddToken(tok, idx)}
                              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-500 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            >
                              {tok}
                            </button>
                          ))}
                        </div>

                        {!isAnswered && (
                          <div className="text-center pt-2">
                            <button
                              disabled={assembledTokens.length === 0}
                              onClick={handleCheckSentence}
                              className="px-8 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                            >
                              Verifikasi Susunan Kalimat (验证句子)
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Content: MATCHING PAIRS */}
                    {currentStep.question.type === 'matching' && currentStep.question.matchingPairs && (
                      <div className="space-y-4">
                        <div className="bg-red-500/[0.03] border border-red-500/15 p-5 rounded-3xl text-center space-y-1">
                          <h3 className="font-serif font-black text-xl text-slate-800 dark:text-white">
                            {currentStep.question.question}
                          </h3>
                          <p className="text-xs text-slate-400">
                            Pilih istilah Mandarin di sisi kiri, lalu pasangkan dengan arti yang tepat di sisi kanan.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Left items */}
                          <div className="space-y-2">
                            {currentStep.question.matchingPairs.map((pair, idx) => {
                              const isMatched = !!matchedPairs[pair.left];
                              const isSelected = selectedLeft === pair.left;

                              return (
                                <button
                                  key={idx}
                                  disabled={isMatched || isAnswered}
                                  onClick={() => handleSelectLeftPair(pair.left)}
                                  className={`w-full p-3.5 rounded-2xl border text-xs md:text-sm font-bold text-left transition-all cursor-pointer ${
                                    isMatched 
                                      ? 'bg-red-500/10 border-red-500 text-red-600 line-through opacity-70' 
                                      : isSelected 
                                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-600 ring-4 ring-red-500/20' 
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-400 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  {pair.left}
                                </button>
                              );
                            })}
                          </div>

                          {/* Right items */}
                          <div className="space-y-2">
                            {shuffledRights.map((rightText, idx) => {
                              const isMatched = Object.values(matchedPairs).includes(rightText);

                              return (
                                <button
                                  key={idx}
                                  disabled={isMatched || isAnswered || !selectedLeft}
                                  onClick={() => handleSelectRightPair(rightText)}
                                  className={`w-full p-3.5 rounded-2xl border text-xs md:text-sm font-medium text-left transition-all cursor-pointer ${
                                    isMatched 
                                      ? 'bg-red-500/10 border-red-500 text-red-600 opacity-70' 
                                      : selectedLeft 
                                      ? 'bg-amber-50/60 dark:bg-slate-800 border-amber-300 hover:border-red-500 text-slate-800 dark:text-slate-100' 
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 text-slate-500'
                                  }`}
                                >
                                  {rightText}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Question Content: LISTENING DRILL */}
                    {currentStep.question.type === 'listening' && (
                      <div className="space-y-4">
                        <div className="bg-red-500/[0.04] border-2 border-red-500/20 p-8 rounded-3xl text-center space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-3 py-1 rounded-full">
                            Diplomatic Audio Listening Drill (听力训练)
                          </span>
                          <h3 className="font-serif font-black text-xl text-slate-800 dark:text-white">
                            {currentStep.question.question}
                          </h3>

                          <button
                            onClick={() => speakDiplomaticSpeech(currentStep.question!.audioText!, currentStep.question!.audioLang)}
                            className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-sm font-black uppercase tracking-wider inline-flex items-center gap-3 shadow-xl shadow-red-600/25 transition-all cursor-pointer animate-pulse"
                          >
                            <Volume2 className="w-5 h-5" /> Putar Rekaman Sidang Mandarin (播放听力)
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentStep.question.options?.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = currentStep.question!.correctAnswer === idx;
                            let style = "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18242f]";
                            if (isAnswered) {
                              if (isCorrect) style = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/20";
                              else if (isSelected) style = "bg-rose-500/10 border-rose-500 text-rose-600";
                              else style = "opacity-40";
                            }

                            return (
                              <button
                                key={idx}
                                disabled={isAnswered}
                                onClick={() => handleSelectOption(idx)}
                                className={`p-4 rounded-2xl border text-xs md:text-sm font-semibold transition-all text-left flex items-center justify-between ${style} cursor-pointer hover:border-red-500`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                                </div>
                                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Feedback & Proceed Footer for Question Step */}
                    <AnimatePresence>
                      {isAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Catatan Analisis Dosen & Duta Besar (外交官解析):
                              </h5>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {currentStep.question.explanation}
                              </p>
                            </div>
                          </div>

                          <div className="text-right pt-2 border-t border-slate-200/50 dark:border-slate-800">
                            <button
                              onClick={handleNextStep}
                              className="px-8 py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                            >
                              Lanjut ke Langkah Berikutnya <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN DASHBOARD & CURRICULUM ROADMAP (16 STAGES IN 4 TIERS)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Banner with User Stats & Tabs */}
      <div className="bg-white dark:bg-[#1a0f12] p-5 md:p-6 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        {/* User Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-500/10 flex items-center justify-center shrink-0 text-red-600 font-bold overflow-hidden shadow-inner ring-2 ring-amber-400/30">
            {progress?.userPhoto ? (
              <img src={progress.userPhoto} alt={progress.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-amber-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-500/20 inline-block">
              Hubungan Internasional • Bahasa Mandarin Diplomasi (中文外交)
            </span>
            <h3 className="font-serif text-lg md:text-xl font-black text-slate-800 dark:text-white truncate">
              {progress?.userName}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Pangkat: <span className="text-slate-700 dark:text-slate-200 font-semibold">{
                (progress?.xp ?? 0) >= 800 ? 'Suhu Duta Besar Berkuasa Penuh (特命全权大使) 👑' :
                (progress?.xp ?? 0) >= 450 ? 'Diplomat Senior DK PBB (常任理事国外交官) 🏛️' :
                (progress?.xp ?? 0) >= 200 ? 'Atase Sidang Multilateral (多边外交随员) 🎖️' :
                'Delegasi Muda HI (中文外交初学者) 🏮'
              }</span>
            </p>
          </div>
        </div>

        {/* Right Section: Meters & Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          {/* Meters */}
          <div className="flex items-center gap-2.5">
            <div className="bg-red-50/60 dark:bg-slate-900/60 px-4 py-2.5 rounded-2xl border border-red-100 dark:border-slate-800 flex items-center gap-2.5 shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
              <div className="relative">
                <span className="text-base font-black text-slate-800 dark:text-white">{progress?.xp ?? 0}</span>
                <span className="text-[9px] font-bold text-slate-400 block -mt-1">XP SKOR</span>
                <AnimatePresence>
                  {xpDeductionAnim && (
                    <motion.span 
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -20 }}
                      className="absolute -top-3 right-0 text-red-500 text-xs font-black"
                    >
                      -XP
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-red-50/60 dark:bg-slate-900/60 px-4 py-2.5 rounded-2xl border border-red-100 dark:border-slate-800 flex items-center gap-2.5 shadow-sm">
              <Flame className="w-4 h-4 text-amber-600 fill-amber-600 animate-bounce" />
              <div>
                <span className="text-base font-black text-slate-800 dark:text-white">{progress?.streak ?? 0}</span>
                <span className="text-[9px] font-bold text-slate-400 block -mt-1">HARI STREAK</span>
              </div>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl flex border border-slate-200/50 dark:border-slate-800 shadow-sm overflow-x-auto">
            <button
              onClick={() => { playSound('click'); setActiveTab('map'); }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Compass className="w-4 h-4" /> Peta Stage (地图)
            </button>
            <button
              onClick={() => { playSound('click'); setActiveTab('glossary'); }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'glossary'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Kamus Glosarium (词典)
            </button>
            <button
              onClick={() => { playSound('click'); setActiveTab('canteen'); }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'canteen'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Utensils className="w-4 h-4" /> Jamuan Diplomasi (国宴)
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: CURRICULUM ROADMAP ================= */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Road Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tier Filter Badges */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { playSound('click'); setSelectedTier('all'); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedTier === 'all'
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'bg-white dark:bg-[#1a0f12] text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Semua Level (16 Stage)
              </button>
              {TIERS.map((t) => (
                <button
                  key={t.tier}
                  onClick={() => { playSound('click'); setSelectedTier(t.tier); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedTier === t.tier
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
                      : 'bg-white dark:bg-[#1a0f12] text-slate-500 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Tier {t.tier}
                </button>
              ))}
            </div>

            {/* Stages Grouped by Tier */}
            {TIERS.filter(t => selectedTier === 'all' || selectedTier === t.tier).map((tierData) => {
              const tierLessons = LESSONS.filter(l => l.tier === tierData.tier);

              return (
                <div key={tierData.tier} className="bg-white dark:bg-[#1a0f12] p-6 md:p-8 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl space-y-6">
                  {/* Tier Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-red-100/60 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-amber-400">
                        {tierData.subtitle}
                      </span>
                      <h3 className="font-serif font-black text-xl text-slate-800 dark:text-white">
                        {tierData.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                        {tierData.description}
                      </p>
                    </div>
                  </div>

                  {/* Stage Winding Path */}
                  <div className="space-y-6 py-4 max-w-md mx-auto relative px-4">
                    <div className="absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-red-500 via-rose-500 to-amber-500 -z-0 rounded-full opacity-25" />

                    {tierLessons.map((lesson, localIdx) => {
                      const globalIdx = LESSONS.findIndex(l => l.id === lesson.id);
                      const isCompleted = progress?.completedLessons?.includes(lesson.id);
                      const isFirst = globalIdx === 0;
                      const isPrevCompleted = globalIdx > 0 ? progress?.completedLessons?.includes(LESSONS[globalIdx - 1].id) : true;
                      const isUnlocked = isFirst || isPrevCompleted || isAdmin;
                      const isCurrent = isUnlocked && !isCompleted;

                      const offsets = [
                        "justify-start sm:pl-10",
                        "justify-center",
                        "justify-end sm:pr-10",
                        "justify-center"
                      ];
                      const offsetClass = offsets[localIdx % 4];
                      const mentor = CAT_MENTORS[lesson.catMentor];

                      return (
                        <div key={lesson.id} className={`flex w-full ${offsetClass} relative z-10`}>
                          <div className="relative group">
                            {isCurrent && (
                              <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-[9px] px-3 py-1.5 rounded-xl shadow-lg border border-amber-300/30 whitespace-nowrap animate-[bounce_2s_infinite]">
                                SIAP BELAJAR! 🏮 开始学习
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-600 rotate-45 border-r border-b border-amber-300/30" />
                              </div>
                            )}

                            <button
                              onClick={() => {
                                if (isUnlocked) {
                                  playSound('click');
                                  setPreviewLesson(lesson);
                                } else {
                                  playSound('incorrect');
                                  alert("Materi ini masih terkunci! Selesaikan stage sebelumnya untuk membuka kunci.");
                                }
                              }}
                              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isCompleted 
                                  ? 'bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-red-600/20 scale-100 hover:scale-105 hover:ring-4 hover:ring-red-400/20' 
                                  : isCurrent
                                  ? 'bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xl shadow-red-600/30 scale-110 hover:scale-115 ring-4 ring-amber-400/30 animate-[pulse_1.5s_infinite]'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-8 h-8 drop-shadow text-amber-300" />
                              ) : isUnlocked ? (
                                <div className="flex flex-col items-center leading-none">
                                  <span className="text-[9px] font-black uppercase opacity-80">Stage</span>
                                  <span className="text-xl font-black">{lesson.stageNumber}</span>
                                </div>
                              ) : (
                                <Lock className="w-6 h-6" />
                              )}
                            </button>

                            {/* Cat Avatar Badge */}
                            {isUnlocked && (
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-red-500 overflow-hidden shadow ring-2 ring-amber-400/20">
                                <img src={mentor.imageUrl} alt={mentor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}

                            {/* Floating Tooltip Label */}
                            <div className="absolute top-1/2 -translate-y-1/2 left-24 bg-white dark:bg-slate-800 border border-red-100 dark:border-slate-700/50 p-3 rounded-2xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 whitespace-nowrap z-50">
                              <p className="text-[8px] font-black text-red-600 uppercase tracking-widest leading-none">
                                Level {lesson.stageNumber} • {lesson.difficulty}
                              </p>
                              <h5 className="font-serif text-xs font-bold text-slate-800 dark:text-white mt-0.5">{lesson.title}</h5>
                              <p className="text-[9px] text-slate-400 italic">Hadiah: +{lesson.xp} XP</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Sidebar: Preview Card & Leaderboard */}
          <div className="space-y-6">
            {/* Preview Card */}
            <AnimatePresence>
              {previewLesson && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-[#1a0f12] p-6 rounded-[2.5rem] border-2 border-red-500 shadow-2xl space-y-5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      Stage {previewLesson.stageNumber} • {previewLesson.tierLabel}
                    </span>
                    <button 
                      onClick={() => setPreviewLesson(null)}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <CatMemeAvatar 
                      type={CAT_MENTORS[previewLesson.catMentor].overlayType} 
                      imageUrl={CAT_MENTORS[previewLesson.catMentor].imageUrl} 
                      className="w-14 h-14"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-xs leading-none text-slate-800 dark:text-white">
                        {CAT_MENTORS[previewLesson.catMentor].name}
                      </h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{CAT_MENTORS[previewLesson.catMentor].role}</p>
                      <p className="text-[10px] text-red-600 dark:text-amber-400 italic font-medium mt-1 leading-relaxed">
                        “{CAT_MENTORS[previewLesson.catMentor].catchphrase}”
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif font-black text-lg text-slate-800 dark:text-white leading-snug">
                      {previewLesson.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {previewLesson.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total Hadiah XP</span>
                    <span className="text-red-600 font-black">+{previewLesson.xp} XP</span>
                  </div>

                  {/* Single Unified Start Button */}
                  <button
                    onClick={() => handleOpenLesson(previewLesson)}
                    className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    <Play className="w-4 h-4 fill-current" /> Mulai Sesi Diplomasi (Level {previewLesson.stageNumber})
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leaderboard */}
            <div className="bg-white dark:bg-[#1a0f12] p-6 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
                <div>
                  <h3 className="font-serif font-bold text-sm text-slate-800 dark:text-white">Klasemen Diplomat InterLingo</h3>
                  <p className="text-[9px] text-slate-400">Peringkat delegasi & mahasiswa Mandarin HI teraktif.</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {leaderboard.map((lead, idx) => (
                  <div
                    key={lead.userId}
                    className={`p-3 rounded-2xl flex items-center justify-between ${
                      lead.userId === user?.uid 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : 'bg-slate-50/50 dark:bg-slate-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-black text-xs text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>

                      <div className="w-8 h-8 rounded-full border border-red-200 overflow-hidden bg-slate-200 shrink-0">
                        {lead.userPhoto ? (
                          <img src={lead.userPhoto} alt={lead.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-600">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <span className="text-xs font-bold truncate max-w-[110px] text-slate-700 dark:text-slate-200">
                        {lead.userName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black text-red-600 dark:text-amber-400">{lead.xp} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: COMPLETE GLOSSARY & FLASHCARD VAULT ================= */}
      {activeTab === 'glossary' && (
        <div className="bg-white dark:bg-[#1a0f12] p-6 md:p-8 rounded-[2.5rem] border border-red-100 dark:border-red-950/60 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-amber-400 px-3 py-1 rounded-full bg-red-500/10">
                Pusat Kosa Kata & Frasa Diplomatik Mandarin 📚
              </span>
              <h3 className="font-serif font-black text-2xl text-slate-800 dark:text-white mt-2">
                Kamus Traktat & Kosakata Mandarin Diplomasi (中文外交与国际关系词典)
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Koleksi lengkap istilah diplomasi resmi bahasa Mandarin (Hanzi, Pinyin & Terjemahan Resmi) dari seluruh 16 Stage InterLingo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LESSONS.flatMap(l => l.studyCards.map(c => ({ ...c, lessonTitle: l.title, stage: l.stageNumber }))).map((card) => (
              <div
                key={card.id}
                className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-3xl border border-red-100 dark:border-slate-800 space-y-3 hover:border-red-400 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                    <span>Stage {card.stage}</span>
                    <span className="text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">{card.tag}</span>
                  </div>

                  <h4 className="font-serif font-black text-xl text-slate-800 dark:text-white leading-snug">
                    {card.term}
                  </h4>
                  {card.transliteration && (
                    <p className="text-xs font-mono text-red-600 dark:text-amber-400 font-bold">{card.transliteration}</p>
                  )}
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{card.meaning}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">{card.contextHI}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => speakDiplomaticSpeech(card.audioText, card.audioLang)}
                    className="p-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Lafal
                  </button>
                  <span className="text-[9px] text-slate-400 font-mono uppercase">{card.audioLang}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CAT CANTEEN & STATE BANQUET ================= */}
      {activeTab === 'canteen' && (
        <CatCanteen
          user={user}
          userXp={progress?.xp ?? 0}
          onXpChange={(newXp) => setProgress(prev => prev ? { ...prev, xp: newXp } : prev)}
          playSound={playSound}
        />
      )}
    </div>
  );
}
