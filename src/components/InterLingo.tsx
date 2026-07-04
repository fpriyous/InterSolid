import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Award, BookOpen, CheckCircle, ShieldCheck, HelpCircle, ArrowRight, 
  RefreshCw, Star, Flame, Trophy, Lock, Play, ChevronRight, ChevronLeft,
  MessageSquare, Sparkles, Loader2, User, Volume2, Heart, Smile, Compass, 
  Gift, Utensils, Clock
} from 'lucide-react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LESSONS, CAT_MENTORS, CAT_MENTORS as MENTORS, CatMentor, Lesson, Question } from '../data/interlingo_data';

// --- SOUNDBOARD CONTROLLER (Using Web Audio API) ---
const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'feed' | 'click' | 'jump' | 'whack' | 'pop' | 'alarm') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
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
      const chord = [261.63, 329.63, 392.00, 523.25]; // Majestic C-Major chord
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
      });
    } else if (type === 'feed') {
      // Hilarious chewing/meowing synthesizer sounds
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(350, now);
      osc1.frequency.linearRampToValueAtTime(550, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(450, now + 0.3);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(700, now);
      osc2.frequency.exponentialRampToValueAtTime(900, now + 0.3);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'whack') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(1400, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'alarm') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (err) {
    console.warn("Web Audio API not allowed or supported yet:", err);
  }
};

// --- AUDIBLE TTS MANDARIN PRONUNCIATION ---
const speakMandarin = (text: string) => {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Resume if speaking queue is stuck in paused state (common browser issue)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      // Cancel previous speech to prevent overlapping
      window.speechSynthesis.cancel();
      
      // Use a slight timeout (50ms) before speaking. 
      // Direct synchronous speak after cancel often causes a silent block or failure in Chrome/Safari.
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.82; // comfortable rate for learning
          utterance.pitch = 1.1; // cute, animated tone
          
          // Get available voices and prefer a Chinese voice
          const voices = window.speechSynthesis.getVoices();
          const zhVoice = voices.find(v => v.lang.toLowerCase().includes('zh') || v.lang.toLowerCase().includes('cn'));
          if (zhVoice) {
            utterance.voice = zhVoice;
          }
          
          utterance.onerror = (e) => {
            console.warn("SpeechSynthesis error:", e.error);
            // Resume to unblock speechSynthesis queue if paused
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          };
          
          window.speechSynthesis.speak(utterance);
        } catch (innerErr) {
          console.warn("Error inside speech synthesis delay:", innerErr);
        }
      }, 50);
    } else {
      console.warn("Speech Synthesis not supported in this browser.");
    }
  } catch (err) {
    console.error("Failed to execute speakMandarin:", err);
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

// --- CUSTOM INTERACTIVE CAT MEME COMPONENT ---
function CatMemeAvatar({ 
  type, 
  imageUrl, 
  alt = 'Cat Mentor', 
  className = 'w-24 h-24',
  pulse = false,
  talking = false
}: { 
  type: 'hat' | 'paw' | 'tongue' | 'cool' | 'rebel' | 'closeup'; 
  imageUrl: string; 
  alt?: string;
  className?: string;
  pulse?: boolean;
  talking?: boolean;
}) {
  return (
    <div className={`relative rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-[#fef9f3] shrink-0 ${className} ${pulse ? 'ring-4 ring-orange-400/50' : ''}`}>
      <img 
        src={imageUrl} 
        alt={alt} 
        className={`w-full h-full object-cover transition-all duration-500 ${
          type === 'closeup' ? 'scale-115 hover:scale-125' : 'hover:scale-110'
        } ${talking ? 'animate-[bounce_0.5s_infinite]' : ''}`}
        referrerPolicy="no-referrer"
      />
      
      {/* 1. Hat Overlay (The Explorer Cat) */}
      {type === 'hat' && (
        <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-[15%] pointer-events-none">
          <svg className="w-[82%] h-auto drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] animate-[bounce_1.5s_infinite]" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 52 C10 46, 110 46, 110 52 C110 62, 10 62, 10 52 Z" fill="#b19470" />
            <path d="M30 49 C30 15, 90 15, 90 49 Z" fill="#917c5d" />
            <rect x="30" y="42" width="60" height="7" fill="#58432a" />
            <circle cx="60" cy="45" r="4.5" fill="#ffd700" />
          </svg>
        </div>
      )}

      {/* 2. Paw Overlay (The Supportive Bilateral Cat) */}
      {type === 'paw' && (
        <div className="absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] flex justify-end items-end pointer-events-none">
          <svg className="w-[62%] h-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] animate-[pulse_2s_infinite] origin-bottom-right rotate-[-12deg]" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 60 C23 20, 57 20, 70 60 L80 80 L0 80 Z" fill="#f8b16c" />
            <path d="M10 60 C23 20, 57 20, 70 60 L80 80 L0 80 Z" fill="#fff" opacity="0.15" />
            {/* Soft pink pads */}
            <circle cx="40" cy="55" r="14" fill="#ffaab3" />
            <circle cx="23" cy="36" r="6" fill="#ffaab3" />
            <circle cx="40" cy="29" r="7" fill="#ffaab3" />
            <circle cx="57" cy="36" r="6" fill="#ffaab3" />
          </svg>
        </div>
      )}

      {/* 3. Tongue Overlay (The Blep Cat) */}
      {type === 'tongue' && (
        <div className="absolute bottom-[22%] left-[45%] -translate-x-1/2 flex justify-center pointer-events-none">
          <motion.div 
            animate={{ height: [12, 22, 12] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="w-4 h-5 bg-pink-400 rounded-b-full border-2 border-pink-500 shadow-md origin-top" 
          />
        </div>
      )}

      {/* 4. Cool Sunglasses & Cigarette (The Lobbyist Cat) */}
      {type === 'cool' && (
        <>
          <div className="absolute top-[38%] inset-x-0 flex justify-center pointer-events-none scale-110">
            <div className="flex gap-1 items-center">
              <div className="w-6 h-4 bg-slate-900 rounded-md border-t border-slate-600 shadow-md" />
              <div className="w-2 h-0.5 bg-slate-900" />
              <div className="w-6 h-4 bg-slate-900 rounded-md border-t border-slate-600 shadow-md" />
            </div>
          </div>
          <div className="absolute bottom-[28%] left-[54%] origin-left rotate-[12deg] pointer-events-none">
            <div className="w-8 h-1.5 bg-white rounded-r shadow border border-gray-200 flex justify-end">
              <div className="w-2.5 h-full bg-amber-500 rounded-r-xs animate-pulse" />
            </div>
          </div>
        </>
      )}

      {/* 5. Rebel Grumpy Markings (The Opposition Cat) */}
      {type === 'rebel' && (
        <>
          <div className="absolute top-[32%] inset-x-0 flex justify-around px-5 pointer-events-none">
            <div className="w-5 h-1.5 bg-slate-900 rounded-full rotate-[22deg]" />
            <div className="w-5 h-1.5 bg-slate-900 rounded-full -rotate-[22deg]" />
          </div>
          <div className="absolute bottom-2 left-2 bg-rose-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded-full uppercase tracking-widest pointer-events-none shadow-md">
            OPOSISI 😾
          </div>
        </>
      )}

      {/* 6. Close Up Fish-Eye Distortion Grid (Shocked Humas Cat) */}
      {type === 'closeup' && (
        <div className="absolute inset-0 border-4 border-dashed border-rose-500/50 rounded-2xl animate-[spin_8s_linear_infinite] pointer-events-none" />
      )}
    </div>
  );
}

export default function InterLingo({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'map' | 'canteen'>('map');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProgress[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  
  // Quiz Flow States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Custom Particle/Feed States
  const [fedCatId, setFedCatId] = useState<string | null>(null);
  const [feedingBubble, setFeedingBubble] = useState<string | null>(null);
  const [xpDeductionAnim, setXpDeductionAnim] = useState(false);

  // RPG Gameplay & Arcade States
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(25);
  const [gameplayMode, setGameplayMode] = useState<'classic' | 'jumper' | 'whack' | 'catcher'>('classic');
  const [jumperCatPos, setJumperCatPos] = useState<number | null>(null);
  const [whackHammerPos, setWhackHammerPos] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [bubbles, setBubbles] = useState<any[]>([]);

  // Get dynamic mode per question
  const getModeForIndex = (index: number): 'classic' | 'jumper' | 'whack' | 'catcher' => {
    const modes: ('classic' | 'jumper' | 'whack' | 'catcher')[] = ['jumper', 'whack', 'catcher', 'classic'];
    return modes[index % modes.length];
  };

  // Initialize bubble drift items
  const initBubbles = (question: Question) => {
    const list = question.options.map((opt, i) => {
      return {
        id: i,
        idx: i,
        text: opt,
        x: 5 + Math.random() * 55, // safe % range to avoid overflowing box sides
        y: 15 + Math.random() * 45,
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8),
        vy: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.8)
      };
    });
    setBubbles(list);
  };

  // Bubble floating loop
  useEffect(() => {
    if (gameplayMode !== 'catcher' || isAnswered || !activeLesson || lessonComplete || lives <= 0) {
      return;
    }
    
    const interval = setInterval(() => {
      setBubbles((prev) => 
        prev.map((b) => {
          let newX = b.x + b.vx;
          let newY = b.y + b.vy;
          let newVx = b.vx;
          let newVy = b.vy;
          
          if (newX < 2 || newX > 62) {
            newVx = -b.vx;
            newX = Math.max(2, Math.min(62, newX));
          }
          if (newY < 5 || newY > 65) {
            newVy = -b.vy;
            newY = Math.max(5, Math.min(65, newY));
          }
          
          return {
            ...b,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
          };
        })
      );
    }, 45);
    
    return () => clearInterval(interval);
  }, [gameplayMode, isAnswered, activeLesson, lessonComplete, lives]);

  // Countdown timer clock
  useEffect(() => {
    if (!activeLesson || lessonComplete || lives <= 0 || isAnswered) {
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleTimeUp();
          return 0;
        }
        if (prev <= 6) {
          playSound('alarm');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeLesson, currentQuestionIdx, isAnswered, lessonComplete, lives]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    setIsAnswered(true);
    playSound('incorrect');
    setLives((prev) => Math.max(0, prev - 1));
  };

  // Load progress & leaderboard from Firestore (Durable Cloud Persistence)
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
          userName: user.displayName || 'Solidaritas Anonim',
          userPhoto: user.photoURL || undefined,
          xp: 20, // Start with 20 XP so they can immediately test the canteen if they want!
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

  // --- HANDLERS ---
  const handleStartLesson = (lesson: Lesson) => {
    playSound('click');
    setPreviewLesson(null);
    setActiveLesson(lesson);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setLessonComplete(false);
    setLives(3);
    setTimeLeft(25);
    setIsTimeUp(false);
    setJumperCatPos(null);
    setWhackHammerPos(null);
    
    const initialMode = getModeForIndex(0);
    setGameplayMode(initialMode);
    if (initialMode === 'catcher') {
      initBubbles(lesson.questions[0]);
    }
    
    // Announce lesson start in speech
    setTimeout(() => {
      speakMandarin("你好");
    }, 400);
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    playSound('click');
    setSelectedOption(idx);
    setIsAnswered(true);
    
    const isCorrect = activeLesson!.questions[currentQuestionIdx].correctAnswer === idx;
    if (isCorrect) {
      playSound('correct');
      const pronunciationText = activeLesson!.questions[currentQuestionIdx].audioText;
      if (pronunciationText) {
        speakMandarin(pronunciationText);
      }
    } else {
      playSound('incorrect');
      setLives((prev) => Math.max(0, prev - 1));
    }
  };

  const handleJumperLeap = (idx: number) => {
    if (isAnswered) return;
    playSound('jump');
    setJumperCatPos(idx);
    
    setTimeout(() => {
      setSelectedOption(idx);
      setIsAnswered(true);
      const isCorrect = activeLesson!.questions[currentQuestionIdx].correctAnswer === idx;
      if (isCorrect) {
        playSound('correct');
        const pronunciationText = activeLesson!.questions[currentQuestionIdx].audioText;
        if (pronunciationText) {
          speakMandarin(pronunciationText);
        }
      } else {
        playSound('incorrect');
        setLives((prev) => Math.max(0, prev - 1));
      }
    }, 750);
  };

  const handleWhackMole = (idx: number) => {
    if (isAnswered) return;
    playSound('whack');
    setWhackHammerPos(idx);
    
    setTimeout(() => {
      setSelectedOption(idx);
      setIsAnswered(true);
      const isCorrect = activeLesson!.questions[currentQuestionIdx].correctAnswer === idx;
      if (isCorrect) {
        playSound('correct');
        const pronunciationText = activeLesson!.questions[currentQuestionIdx].audioText;
        if (pronunciationText) {
          speakMandarin(pronunciationText);
        }
      } else {
        playSound('incorrect');
        setLives((prev) => Math.max(0, prev - 1));
      }
    }, 350);
  };

  const handlePopBubble = (idx: number) => {
    if (isAnswered) return;
    playSound('pop');
    setSelectedOption(idx);
    setIsAnswered(true);
    
    const isCorrect = activeLesson!.questions[currentQuestionIdx].correctAnswer === idx;
    if (isCorrect) {
      playSound('correct');
      const pronunciationText = activeLesson!.questions[currentQuestionIdx].audioText;
      if (pronunciationText) {
        speakMandarin(pronunciationText);
      }
    } else {
      playSound('incorrect');
      setLives((prev) => Math.max(0, prev - 1));
    }
  };

  const handleVerifyAnswer = () => {
    // Verified automatically
  };

  const handleNextQuestion = () => {
    playSound('click');
    if (!activeLesson) return;
    
    if (currentQuestionIdx < activeLesson.questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsTimeUp(false);
      setTimeLeft(25);
      setJumperCatPos(null);
      setWhackHammerPos(null);
      
      const nextMode = getModeForIndex(nextIdx);
      setGameplayMode(nextMode);
      if (nextMode === 'catcher') {
        initBubbles(activeLesson.questions[nextIdx]);
      }
    } else {
      handleCompleteLesson();
    }
  };

  const handleCompleteLesson = async () => {
    if (!progress || !activeLesson || !user) return;

    playSound('complete');
    const lessonId = activeLesson.id;
    const isFirstTime = !progress.completedLessons.includes(lessonId);
    const xpReward = isFirstTime ? activeLesson.xp : 15; // 15 XP for repeat lessons

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
      logPortalActivity('interlingo_lesson', `Menyelesaikan level: ${activeLesson.title}`, user);
    } catch (e) {
      console.error("Failed to update learning progress:", e);
    }

    setLessonComplete(true);
  };

  // Canteen: Feeding mini-game
  const handleFeedCat = async (catId: string) => {
    if (!progress || !user) return;
    if (progress.xp < 20) {
      playSound('incorrect');
      alert("Meow! XP kamu tidak cukup. Selesaikan setidaknya satu materi atau kumpulkan 20 XP untuk membeli camilan ikan!");
      return;
    }

    playSound('feed');
    setFedCatId(catId);
    setXpDeductionAnim(true);
    
    const mentor = MENTORS[catId];
    setFeedingBubble(`"${mentor.name} mengunyah ikan basah dengan gembira... Hěn hǎochī (很好吃)!"`);
    
    // Pronounce thank you in Mandarin
    speakMandarin("谢谢你");

    const docRef = doc(db, 'interlingo_progress', user.uid);
    try {
      await updateDoc(docRef, {
        xp: Math.max(0, progress.xp - 20),
        updatedAt: new Date().toISOString()
      });
      logPortalActivity('interlingo_canteen', `Memberi makan mentor ${mentor.name}`, user);
    } catch (e) {
      console.error("Failed to deduct XP for feeding:", e);
    }

    setTimeout(() => {
      setXpDeductionAnim(false);
    }, 1000);

    setTimeout(() => {
      setFedCatId(null);
      setFeedingBubble(null);
    }, 4500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-xs text-slate-400 mt-6 uppercase tracking-widest font-black animate-pulse">Menghubungkan ke Pusat Bahasa Mandarin...</p>
      </div>
    );
  }

  // --- VIEW: LESSON ACTIVE GAMEPLAY ---
  if (activeLesson) {
    const question = activeLesson.questions[currentQuestionIdx];
    const progressPercent = Math.round(((currentQuestionIdx) / activeLesson.questions.length) * 100);
    const mentor = MENTORS[activeLesson.catMentor];

    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#141e26] rounded-[2.5rem] border border-orange-100 dark:border-slate-800 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Dynamic ambient bg glow based on correctness */}
        <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl -z-10 rounded-full transition-colors duration-500 opacity-20 ${
          isAnswered 
            ? (selectedOption === question.correctAnswer ? 'bg-emerald-500' : 'bg-rose-500')
            : 'bg-orange-400'
        }`} />

        <AnimatePresence mode="wait">
          {lives <= 0 ? (
            /* GAME OVER SCREEN */
            <motion.div
              key="gameover"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 space-y-6"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-red-600 text-white rounded-[2.2rem] flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20 animate-bounce">
                <span className="text-5xl">😾</span>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-serif text-3xl font-black text-rose-600 dark:text-rose-400">Interupsi, Sidang Gagal!</h3>
                <p className="text-xs text-rose-500 uppercase tracking-[0.25em] font-black">Diplomasi Mogok • Kucing Kecewa</p>
                <p className="text-sm max-w-md mx-auto leading-relaxed text-slate-500 dark:text-slate-350 px-4 italic">
                  “Meow! Diplomasi kamu kacau balau, aliansi bubar, dan kucing perdamaian mogok makan! Coba ulangi materi dengan lebih fokus agar bisa menyuap para oposisi!”
                </p>
              </div>

              {/* Sir Grumpy Profile */}
              <div className="flex justify-center my-4">
                <div className="bg-rose-50 dark:bg-rose-950/20 p-5 rounded-[2rem] border border-rose-500/10 max-w-sm flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=300&auto=format&fit=crop" className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500" />
                  <div className="text-left">
                    <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase">Ketua Oposisi</span>
                    <h4 className="font-serif font-bold text-sm text-slate-800 dark:text-white mt-1">Sir Grumpy</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">"Kucing FISIP butuh negosiasi nyata, bukan omong kosong!"</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    playSound('click');
                    handleStartLesson(activeLesson);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-500/10 transition-all cursor-pointer"
                >
                  Ulangi Materi 🔁
                </button>
                <button
                  onClick={() => {
                    playSound('click');
                    setActiveLesson(null);
                  }}
                  className="px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Kembali ke Peta
                </button>
              </div>
            </motion.div>
          ) : !lessonComplete ? (
            <motion.div
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              className="space-y-6"
            >
              {/* Top Header & Duolingo Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-orange-500 animate-spin" /> {activeLesson.title}</span>
                  <span>Pertanyaan {currentQuestionIdx + 1} dari {activeLesson.questions.length}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-3.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent || 5}%` }}
                      className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-500 rounded-full" 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      playSound('click');
                      if (window.confirm("Yakin ingin keluar dan membuang progres latihan ini?")) {
                        setActiveLesson(null);
                      }
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Keluar
                  </button>
                </div>

                {/* Hearts and Timer Row */}
                <div className="flex items-center justify-between bg-orange-50/50 dark:bg-slate-900/30 px-4 py-2.5 rounded-2xl border border-orange-100/50 dark:border-slate-800">
                  {/* Hearts */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Nyawa:</span>
                    {[0, 1, 2].map((heartIdx) => (
                      <motion.div
                        key={heartIdx}
                        animate={heartIdx < lives ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ repeat: heartIdx < lives ? Infinity : 0, repeatDelay: 5 + heartIdx }}
                      >
                        <Heart 
                          className={`w-5 h-5 ${
                            heartIdx < lives 
                              ? 'text-rose-500 fill-rose-500 drop-shadow-[0_2px_4px_rgba(244,63,94,0.2)]' 
                              : 'text-slate-300 dark:text-slate-700'
                          }`} 
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Mode Badge */}
                  <div className="hidden sm:flex items-center gap-1 text-[9px] font-black uppercase bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    {gameplayMode === 'classic' && 'Cerdas Cermat Tepat ⏱️'}
                    {gameplayMode === 'jumper' && 'Lompat Kucing Lucu 😸'}
                    {gameplayMode === 'whack' && 'Gebuk Tikus Koruptor 🔨'}
                    {gameplayMode === 'catcher' && 'Tangkap Geopolitik 🎈'}
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className={`font-mono text-sm font-black ${
                      timeLeft <= 5 
                        ? 'text-red-500 animate-bounce bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Mentor Dialogue Box */}
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-5">
                <CatMemeAvatar 
                  type={mentor.overlayType} 
                  imageUrl={mentor.imageUrl} 
                  className="w-20 h-20 md:w-24 md:h-24"
                  talking={isAnswered && selectedOption === question.correctAnswer}
                />
                
                <div className="space-y-2 flex-1 text-center md:text-left relative">
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/20 w-fit">
                    Mentor: {mentor.name}
                  </span>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-300 font-medium leading-relaxed italic">
                    {isAnswered 
                      ? (selectedOption === question.correctAnswer 
                          ? `“Luar biasa! Benar sekali meow! Dengar dan ulangi pelafalan Mandarin-nya ya.”` 
                          : `“Aduh, sayang sekali meow. Jawabannya kurang tepat, tapi coba telusuri penjelasanku!”`)
                      : isTimeUp
                      ? `“WAKTU HABIS MEOW! Kamu harus bertindak lebih cepat di panggung internasional!”`
                      : `“${mentor.catchphrase} Perhatikan baik-baik soal di bawah!”`
                    }
                  </p>
                </div>
              </div>

              {/* Main Interactive Question Screen */}
              <div className="space-y-4">
                <div className="bg-orange-500/[0.02] dark:bg-orange-500/[0.01] border border-orange-500/10 p-6 rounded-3xl text-center space-y-4 relative">
                  <div className="absolute top-3 right-3 flex gap-2">
                    {question.pinyin && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-full font-mono">
                        {question.pinyin}
                      </span>
                    )}
                  </div>

                  <HelpCircle className="w-10 h-10 text-orange-500 mx-auto animate-bounce" />
                  <h3 className="font-serif font-black text-xl md:text-2xl leading-relaxed text-slate-800 dark:text-white max-w-xl mx-auto">
                    {question.question}
                  </h3>

                  {question.audioText && (
                    <button
                      onClick={() => speakMandarin(question.audioText!)}
                      className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                      title="Klik untuk mendengarkan lafal Mandarin asli"
                    >
                      <Volume2 className="w-4 h-4" /> Dengar Pelafalan
                    </button>
                  )}
                </div>

                {/* DYNAMIC ARCADE GAME arenas */}
                {gameplayMode === 'classic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {question.options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = question.correctAnswer === idx;
                      let cardStyle = "border-slate-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-[#18242f]";
                      
                      if (isAnswered) {
                        if (isCorrect) cardStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/10";
                        else if (isSelected) cardStyle = "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400";
                        else cardStyle = "border-slate-100 dark:border-slate-900 opacity-40";
                      } else if (isSelected) {
                        cardStyle = "border-orange-500 bg-orange-500/5 ring-4 ring-orange-500/10";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(idx)}
                          disabled={isAnswered}
                          className={`text-left p-4.5 rounded-2xl border text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${cardStyle} active:scale-98 cursor-pointer`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                              isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                          </div>
                          {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {gameplayMode === 'jumper' && (
                  <div className="space-y-4">
                    <div className="relative bg-gradient-to-b from-sky-400/10 to-emerald-500/10 dark:from-sky-950/20 dark:to-emerald-950/20 h-56 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between p-4">
                      {/* Floating Platforms Grid */}
                      <div className="grid grid-cols-2 gap-4 z-10">
                        {question.options.map((opt, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrect = question.correctAnswer === idx;
                          let platformStyle = "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200";
                          
                          if (isAnswered) {
                            if (isCorrect) platformStyle = "bg-emerald-500 text-white border-emerald-600";
                            else if (isSelected) platformStyle = "bg-rose-500 text-white border-rose-600 animate-pulse";
                            else platformStyle = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-40";
                          } else if (jumperCatPos === idx) {
                            platformStyle = "bg-orange-400 text-white border-orange-500";
                          }
                          
                          return (
                            <button
                              key={idx}
                              disabled={isAnswered}
                              onClick={() => handleJumperLeap(idx)}
                              className={`p-3 rounded-2xl border-b-4 font-bold text-xs shadow-md transition-all text-center flex flex-col items-center justify-center relative hover:scale-102 active:scale-95 cursor-pointer ${platformStyle}`}
                            >
                              <span className="absolute top-1 left-2 text-[8px] bg-black/10 px-1.5 py-0.5 rounded uppercase font-black">PLATFORM {String.fromCharCode(65 + idx)}</span>
                              <span className="mt-2 text-[11px] leading-snug line-clamp-2">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Ground & Jumper Sprite */}
                      <div className="relative h-16 w-full border-t border-slate-300/30 flex justify-center items-end bg-black/5 rounded-b-2xl">
                        <motion.div
                          className="absolute bottom-2 left-[50%] -translate-x-1/2"
                          animate={
                            jumperCatPos === null
                              ? { y: [0, -3, 0] }
                              : jumperCatPos === 0
                              ? { x: -110, y: -110, rotate: [0, 180, 360], scale: 1.1 }
                              : jumperCatPos === 1
                              ? { x: 110, y: -110, rotate: [0, -180, -360], scale: 1.1 }
                              : jumperCatPos === 2
                              ? { x: -110, y: -50, rotate: [0, 180, 360], scale: 1.1 }
                              : { x: 110, y: -50, rotate: [0, -180, -360], scale: 1.1 }
                          }
                          transition={{ 
                            y: jumperCatPos === null ? { repeat: Infinity, duration: 1.5 } : { type: 'spring', stiffness: 100, damping: 10 },
                            x: { type: 'spring', stiffness: 100, damping: 10 },
                            rotate: { duration: 0.6 }
                          }}
                        >
                          <div className="flex flex-col items-center relative">
                            {jumperCatPos === null && (
                              <span className="absolute -top-7 text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-bounce">LOMPAT! 😸</span>
                            )}
                            
                            <div className="w-11 h-11 bg-orange-400 rounded-full border-2 border-white flex items-center justify-center shadow-md text-xl relative">
                              {isAnswered && selectedOption === question.correctAnswer ? '😸👑' : isAnswered ? '😵' : '😸'}
                              {/* ears */}
                              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-orange-400 rounded-tl-full border-t-2 border-l-2 border-white -rotate-[15deg]" />
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-400 rounded-tr-full border-t-2 border-r-2 border-white rotate-[15deg]" />
                            </div>
                            <div className="flex gap-3 -mt-1">
                              <div className="w-3 h-2.5 bg-white rounded-full border border-orange-300" />
                              <div className="w-3 h-2.5 bg-white rounded-full border border-orange-300" />
                            </div>
                          </div>
                        </motion.div>
                        
                        <span className="text-[9px] font-bold text-slate-400/60 tracking-wider">TAP SEBUAH PLATFORM UNTUK MELOMPAT</span>
                      </div>
                    </div>
                  </div>
                )}

                {gameplayMode === 'whack' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gradient-to-b from-emerald-800/20 to-emerald-950/20 p-4 rounded-3xl border border-emerald-900/30 relative overflow-hidden h-72">
                      {/* Mallet mallet thud effect */}
                      <AnimatePresence>
                        {whackHammerPos !== null && (
                          <motion.div
                            initial={{ opacity: 0, rotate: 60, scale: 0.8 }}
                            animate={{ 
                              opacity: 1, 
                              rotate: -20, 
                              scale: 1.2,
                              x: whackHammerPos === 0 || whackHammerPos === 2 ? -30 : 130,
                              y: whackHammerPos === 0 || whackHammerPos === 1 ? -40 : 80
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute z-30 pointer-events-none left-1/3 top-1/4 text-4xl"
                          >
                            🔨💥
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {question.options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = question.correctAnswer === idx;
                        let moleStyle = "bg-amber-950/60 hover:bg-amber-900/80 border-amber-900 text-amber-200";
                        
                        if (isAnswered) {
                          if (isCorrect) moleStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                          else if (isSelected) moleStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                          else moleStyle = "bg-slate-900/40 border-slate-800 opacity-20";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={isAnswered}
                            onClick={() => handleWhackMole(idx)}
                            className={`relative border-2 rounded-2xl p-3 flex flex-col justify-between items-center transition-all duration-300 active:scale-95 group overflow-hidden h-28 cursor-pointer ${moleStyle}`}
                          >
                            <div className="absolute bottom-0 inset-x-0 h-6 bg-slate-950/50 rounded-full border-t border-slate-900 flex items-center justify-center">
                              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black">LOBANG {String.fromCharCode(65 + idx)}</span>
                            </div>

                            <motion.div
                              animate={
                                isAnswered && isSelected && !isCorrect
                                  ? { y: 20, rotate: 45 }
                                  : isAnswered && isCorrect
                                  ? { y: [0, -10, 0], scale: 1.1 }
                                  : { y: [0, -5, 0] }
                              }
                              transition={{ repeat: isAnswered ? 0 : Infinity, duration: 2, repeatType: "reverse" }}
                              className="flex flex-col items-center z-10 -mt-1"
                            >
                              <div className="relative">
                                <div className="w-10 h-10 bg-amber-750 dark:bg-amber-800 rounded-full border border-amber-500 shadow flex items-center justify-center text-xl relative">
                                  {isAnswered && isCorrect ? '🐭💰' : isAnswered && isSelected ? '😵💨' : '🐭🕶️'}
                                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-800 rounded-full border border-amber-600" />
                                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-800 rounded-full border border-amber-600" />
                                </div>
                              </div>
                            </motion.div>

                            <span className="text-[10px] font-bold text-center leading-tight text-white px-1 py-0.5 rounded bg-black/40 border border-white/5 w-full truncate z-20">
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gameplayMode === 'catcher' && (
                  <div className="space-y-4">
                    <div className="relative bg-gradient-to-b from-indigo-900/40 to-slate-900/60 dark:from-[#0b0f19] dark:to-[#141a29] h-72 rounded-3xl border border-indigo-500/20 overflow-hidden p-3 flex flex-col justify-between">
                      <div className="absolute top-2 inset-x-0 text-center pointer-events-none z-10">
                        <span className="text-[9px] font-black uppercase bg-indigo-500 text-white px-2.5 py-0.5 rounded-full tracking-widest shadow-md">
                          Pecahkan Gelembung Diplomasi yang Benar! 🎈
                        </span>
                      </div>

                      <div className="relative flex-1 w-full">
                        {bubbles.map((b) => {
                          const isSelected = selectedOption === b.idx;
                          const isCorrect = question.correctAnswer === b.idx;
                          
                          let bubbleStyle = "bg-indigo-400/20 border-indigo-400 hover:bg-indigo-400/35 text-indigo-100";
                          if (isAnswered) {
                            if (isCorrect) bubbleStyle = "bg-emerald-500 text-white border-emerald-600 scale-105 shadow-emerald-500/20";
                            else if (isSelected) bubbleStyle = "bg-rose-500 text-white border-rose-600 scale-95 opacity-50";
                            else bubbleStyle = "opacity-20 bg-slate-800 border-slate-700 text-slate-500 pointer-events-none";
                          }

                          return (
                            <button
                              key={b.id}
                              disabled={isAnswered}
                              onClick={() => handlePopBubble(b.idx)}
                              style={{
                                position: "absolute",
                                left: `${b.x}%`,
                                top: `${b.y}%`
                              }}
                              className={`w-36 h-20 rounded-[2rem] border-2 shadow-lg backdrop-blur-xs flex flex-col items-center justify-center p-2 text-[10px] leading-snug font-black transition-all text-center select-none active:scale-95 cursor-pointer ${bubbleStyle}`}
                            >
                              <span className="text-[8px] uppercase tracking-wider bg-black/10 px-1 rounded-sm mb-1">
                                Opsi {String.fromCharCode(65 + b.idx)}
                              </span>
                              <span className="line-clamp-2">{b.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Explanations Banner */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-3xl border ${
                      selectedOption === question.correctAnswer 
                        ? 'bg-emerald-500/[0.03] border-emerald-500/20' 
                        : 'bg-rose-500/[0.03] border-rose-500/20'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                        selectedOption === question.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {selectedOption === question.correctAnswer ? <CheckCircle className="w-5 h-5 animate-bounce" /> : <Flame className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                          selectedOption === question.correctAnswer ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {selectedOption === question.correctAnswer ? 'Jawaban Kamu Tepat, Brilian!' : 'Kurang Tepat! Terus Belajar'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-350 leading-relaxed italic">{question.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Button Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                {isAnswered && (
                  <button
                    onClick={handleNextQuestion}
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-650 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {currentQuestionIdx === activeLesson.questions.length - 1 ? 'Selesaikan Kelas' : 'Pertanyaan Berikutnya'} <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            // COMPLETE STAGE CELEBRATION SCREEN
            <motion.div
              key="complete"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8 space-y-6"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-orange-500/20 animate-bounce">
                <Trophy className="w-12 h-12" />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-serif text-3xl font-black text-slate-800 dark:text-white">Kelas Selesai! 🎉</h3>
                <p className="text-xs text-orange-500 uppercase tracking-[0.25em] font-black">XIE XIE (谢谢) - SOLIDARITAS</p>
                <p className="text-sm max-w-md mx-auto leading-relaxed text-slate-500 dark:text-slate-350 px-4">
                  Selamat, kamu berhasil menaklukkan materi **{activeLesson.title}**! Ilmu komunikasi & lobi diplomatikmu terus berkembang.
                </p>
              </div>

              {/* Stats Rewards */}
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-2">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4.5 rounded-3xl border border-orange-500/10 shadow-sm">
                  <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1 animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase">XP Diperoleh</p>
                  <p className="text-lg font-black text-orange-500">
                    +{progress?.completedLessons.includes(activeLesson.id) ? 15 : activeLesson.xp} XP
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4.5 rounded-3xl border border-orange-500/10 shadow-sm">
                  <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Beruntun / Streak</p>
                  <p className="text-lg font-black text-orange-500">{progress?.streak || 1} Hari</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    playSound('click');
                    setActiveLesson(null);
                  }}
                  className="px-10 py-4.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Kembali ke Peta Kurikulum
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- VIEW: CURRICULUM MAP & CANTEEN ---
  return (
    <div className="space-y-6">
      {/* Top App Bar with XP, Streak & Switcher */}
      <div className="bg-white dark:bg-[#141e26] p-5 rounded-[2rem] border border-orange-100 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* User stats */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border border-orange-200 bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-500 font-bold">
            {progress?.userPhoto ? (
              <img src={progress.userPhoto} alt={progress.userName} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hubungan Internasional</h4>
            <h3 className="font-serif text-base font-bold text-slate-800 dark:text-white truncate max-w-[180px]">{progress?.userName}</h3>
          </div>
        </div>

        {/* Global XP & Streak meters */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
            <div className="relative">
              <span className="text-sm font-black text-slate-800 dark:text-white">{progress?.xp ?? 0}</span>
              <span className="text-[9px] font-bold text-slate-400 block -mt-1">XP SKOR</span>
              <AnimatePresence>
                {xpDeductionAnim && (
                  <motion.span 
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -20 }}
                    className="absolute -top-3 right-0 text-rose-500 text-xs font-black"
                  >
                    -20
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-bounce" />
            <div>
              <span className="text-sm font-black text-slate-800 dark:text-white">{progress?.streak ?? 0}</span>
              <span className="text-[9px] font-bold text-slate-400 block -mt-1">HARI STREAK</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher buttons */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => { playSound('click'); setActiveTab('map'); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'map'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/10'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Compass className="w-4 h-4" /> Peta Stage
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('canteen'); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'canteen'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/10'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Utensils className="w-4 h-4" /> Kantin Kucing
          </button>
        </div>
      </div>

      {activeTab === 'map' ? (
        // --- VIEW: DUOLINGO STYLE ROADMAP PATH ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main RPG Serpentine Stage Path */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#141e26] p-6 rounded-[2.5rem] border border-orange-100 dark:border-slate-800 shadow-xl relative">
              <div className="absolute top-4 right-4 animate-pulse bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-orange-500/20">
                12 Level Aktif 🗺️
              </div>

              <div className="flex items-center gap-2.5 mb-8">
                <Compass className="w-6 h-6 text-orange-500 animate-spin" />
                <div>
                  <h3 className="font-serif font-black text-xl text-slate-800 dark:text-white">Kurikulum Mandarin Diplomasi</h3>
                  <p className="text-xs text-slate-400">Pilih stage unlocked untuk mengasah lobi, pidato, dan taktik HI.</p>
                </div>
              </div>

              {/* RPG Winding Path Grid */}
              <div className="space-y-6 py-6 max-w-lg mx-auto relative px-4">
                {/* Visual curving connector background line */}
                <div className="absolute top-12 bottom-12 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-orange-400 via-amber-400 to-emerald-500 -z-0 rounded-full opacity-30" />

                {LESSONS.map((lesson, index) => {
                  const isCompleted = progress?.completedLessons?.includes(lesson.id);
                  const isFirst = index === 0;
                  const isPrevCompleted = index > 0 ? progress?.completedLessons?.includes(LESSONS[index - 1].id) : true;
                  const isUnlocked = isFirst || isPrevCompleted || isAdmin;
                  const isCurrent = isUnlocked && !isCompleted;

                  // Serpentine S-Curve Position offsets: Left, Center, Right, Center, Repeat
                  const offsets = [
                    "justify-start sm:pl-12",
                    "justify-center",
                    "justify-end sm:pr-12",
                    "justify-center"
                  ];
                  const offsetClass = offsets[index % 4];
                  const mentor = MENTORS[lesson.catMentor];

                  return (
                    <div key={lesson.id} className={`flex w-full ${offsetClass} relative z-10`}>
                      <div className="relative group">
                        {/* Dynamic Floating Speech Bubble for Unlocked but Not Completed Level */}
                        {isCurrent && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[9px] px-3 py-1.5 rounded-xl shadow-lg border border-white/20 whitespace-nowrap animate-[bounce_2s_infinite]">
                            SINI AJARIN! 😾
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rotate-45 border-r border-b border-white/20" />
                          </div>
                        )}

                        {/* Interactive Node Button */}
                        <button
                          onClick={() => {
                            if (!user) {
                              (window as any).showAuthError?.('unauthenticated');
                              return;
                            }
                            if (isUnlocked) {
                              playSound('click');
                              setPreviewLesson(lesson);
                            } else {
                              playSound('incorrect');
                              alert("Mew! Stage ini masih terkunci. Selesaikan materi sebelumnya terlebih dahulu!");
                            }
                          }}
                          className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
                            isCompleted 
                              ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/20 scale-100 hover:scale-105 hover:ring-4 hover:ring-emerald-400/20' 
                              : isCurrent
                              ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-xl shadow-orange-500/30 scale-110 hover:scale-115 ring-4 ring-orange-500/20 animate-[pulse_1.5s_infinite]'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-8 h-8 drop-shadow" />
                          ) : isUnlocked ? (
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-[9px] font-black uppercase opacity-85">Stage</span>
                              <span className="text-xl font-black">{index + 1}</span>
                            </div>
                          ) : (
                            <Lock className="w-6 h-6" />
                          )}
                        </button>

                        {/* Floating Micro Cat Head above Node */}
                        {isUnlocked && (
                          <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full border-2 border-orange-400 overflow-hidden shadow">
                            <img src={mentor.imageUrl} alt={mentor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        
                        {/* Hover Level Name Indicator */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-24 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-2.5 rounded-2xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 whitespace-nowrap z-50">
                          <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest leading-none">Level {index + 1}</p>
                          <h5 className="font-serif text-xs font-bold text-slate-800 dark:text-white mt-0.5">{lesson.title}</h5>
                          <p className="text-[9px] text-slate-400 italic">Hadiah: +{lesson.xp} XP</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Sidebar: Leaderboard & Previews */}
          <div className="space-y-4">
            {/* STAGE DESCRIPTION DIALOG PREVIEW CARD */}
            <AnimatePresence>
              {previewLesson && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-[#141e26] p-5 rounded-[2rem] border-2 border-orange-400 shadow-2xl space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 blur-2xl rounded-full" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                      Mulai Pelajaran
                    </span>
                    <button 
                      onClick={() => setPreviewLesson(null)}
                      className="text-xs font-bold text-slate-400 hover:text-red-500"
                    >
                      Batal
                    </button>
                  </div>

                  {/* Mentor welcoming portrait */}
                  <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <CatMemeAvatar 
                      type={MENTORS[previewLesson.catMentor].overlayType} 
                      imageUrl={MENTORS[previewLesson.catMentor].imageUrl} 
                      className="w-14 h-14"
                    />
                    <div>
                      <h4 className="font-serif font-bold text-xs leading-none">{MENTORS[previewLesson.catMentor].name}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">{MENTORS[previewLesson.catMentor].role}</p>
                      <p className="text-[10px] text-orange-500 italic font-medium mt-1 leading-relaxed">
                        “{MENTORS[previewLesson.catMentor].catchphrase}”
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif font-black text-lg text-slate-800 dark:text-white leading-tight">
                      {previewLesson.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {previewLesson.description}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total Hadiah</span>
                    <span className="text-orange-500 font-black">+{previewLesson.xp} XP</span>
                  </div>

                  <button
                    onClick={() => handleStartLesson(previewLesson)}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Mulai Belajar Sekarang
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Global Leaderboard Panel */}
            <div className="bg-white dark:bg-[#141e26] p-5 rounded-[2rem] border border-orange-100 dark:border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
                <div>
                  <h3 className="font-serif font-bold text-sm text-slate-800 dark:text-white">Klasemen Kelas InterLingo</h3>
                  <p className="text-[9px] text-slate-400">Peringkat akumulasi seluruh mahasiswa Hubungan Internasional.</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {leaderboard.map((lead, idx) => (
                  <div
                    key={lead.userId}
                    className={`p-3 rounded-2xl flex items-center justify-between ${
                      lead.userId === user?.uid 
                        ? 'bg-orange-500/10 border border-orange-500/30' 
                        : 'bg-slate-50/50 dark:bg-slate-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center">
                        {idx === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full border border-orange-200/50 overflow-hidden bg-slate-200 shrink-0">
                        {lead.userPhoto ? (
                          <img src={lead.userPhoto} alt={lead.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-500">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <span className="text-xs font-bold truncate max-w-[110px] text-slate-700 dark:text-slate-200">
                        {lead.userName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-black text-orange-500">{lead.xp} XP</span>
                    </div>
                  </div>
                ))}

                {leaderboard.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6 italic">Belum ada skor terekam.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // --- VIEW: CAT CANTEEN (FEED THE CAT MINIGAME) ---
        <div className="bg-white dark:bg-[#141e26] p-6 md:p-8 rounded-[2.5rem] border border-orange-100 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 px-3 py-1 bg-orange-500/10 rounded-full">
                Kantin Kucing MandarIn 🐟
              </span>
              <h3 className="font-serif font-black text-2xl text-slate-800 dark:text-white mt-2">Uji Keramahan Bilateral</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Beri makan para Kucing Mentor favoritmu menggunakan XP-mu untuk mendengarkan terima kasih Mandarin yang lucu dan memicu ledakan hati! Setiap hidangan berbiaya **20 XP**.
              </p>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 px-5 py-3 rounded-2xl text-center shrink-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">XP Kamu</p>
              <p className="text-2xl font-black text-orange-500">{progress?.xp ?? 0} XP</p>
            </div>
          </div>

          {/* Dialog Bubble for Feeding Event */}
          <AnimatePresence>
            {feedingBubble && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 text-center text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 shadow-lg"
              >
                {feedingBubble}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mentors Feed Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Object.values(MENTORS).map((cat) => {
              const isFed = fedCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col items-center text-center space-y-4 relative overflow-hidden ${
                    isFed 
                      ? 'bg-emerald-500/5 border-emerald-400 shadow-emerald-500/10 scale-102 shadow-lg ring-4 ring-emerald-400/20' 
                      : 'bg-slate-50/50 hover:bg-orange-500/[0.02] dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {/* Floating Heart Particle Explosion on Feed */}
                  <AnimatePresence>
                    {isFed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <motion.div 
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: [1, 2.5], opacity: 0 }}
                          className="text-red-500 text-5xl"
                        >
                          ❤️
                        </motion.div>
                        <motion.div 
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: [1.2, 3], opacity: 0 }}
                          transition={{ delay: 0.15 }}
                          className="text-pink-500 text-3xl absolute"
                        >
                          🌸
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  <CatMemeAvatar 
                    type={cat.overlayType} 
                    imageUrl={cat.imageUrl} 
                    className="w-24 h-24"
                    talking={isFed}
                  />

                  <div className="space-y-1">
                    <h4 className="font-serif font-black text-sm text-slate-800 dark:text-white leading-tight">
                      {cat.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{cat.role}</p>
                    <p className="text-xs text-slate-500 leading-relaxed italic max-w-[200px]">
                      “{cat.catchphrase}”
                    </p>
                  </div>

                  <button
                    onClick={() => handleFeedCat(cat.id)}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Gift className="w-4 h-4" /> Beri Makan 🐟
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
