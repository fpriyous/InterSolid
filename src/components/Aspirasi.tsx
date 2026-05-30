import { useState, useEffect } from 'react';
import { MessageSquare, Send, Smile, Trash2, Heart, ShieldAlert, Lock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, Timestamp, orderBy, query, increment, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface AspirasiMessage {
  id: string;
  parentId?: string | null;
  text: string;
  sticker?: string;
  likes: number;
  likedBy?: string[];
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>;
  date: string;
  authorId?: string;
  authorName?: string;
  createdAt?: any;
}

const STICKERS = ['🔥', '👍', '❤️', '🙌', '😢', '😂', '👀', '💯', '🙏', '✨'];
const REACTION_EMOJIS = ['🔥', '👎', '❤️', '😂', '😮', '💯', '👏', '🤔', '🙌', '😢', '👀', '✨'];

const CUSTOM_STICKERS = [
  { id: 'vector_neko', name: '🐱 Waving Neko' },
  { id: 'vector_rocket', name: '🚀 Hype Rocket' },
  { id: 'vector_heart', name: '💖 Super Heart' },
  { id: 'vector_coffee', name: '☕ Cozy Coffee' },
  { id: 'vector_party', name: '🎉 Party Popper' },
  { id: 'vector_fire', name: '🔥 Blazing Fire' },
  { id: 'vector_ghost', name: '👾 Cute Ghost' },
  { id: 'vector_raincloud', name: '🌧️ Cry Cloud' }
];

function RenderSticker({ stickerId, className = "w-14 h-14" }: { stickerId: string; className?: string }) {
  if (!stickerId) return null;

  // If it's a standard emoji (non-vector), render normally
  if (!stickerId.startsWith('vector_')) {
    return <span className="text-3xl animate-pulse mt-1 w-fit block">{stickerId}</span>;
  }

  const baseSvgClass = `${className} select-none transition-transform hover:scale-110`;

  switch (stickerId) {
    case 'vector_neko':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-bounce duration-1000`}>
          <circle cx="50" cy="50" r="45" fill="#FFF4E0" stroke="#F0A500" strokeWidth="4" />
          <path d="M25 20 L35 40 L15 35 Z" fill="#FFC107" stroke="#F0A500" strokeWidth="3" />
          <path d="M75 20 L65 40 L85 35 Z" fill="#FFC107" stroke="#F0A500" strokeWidth="3" />
          <path d="M28 25 L33 35 L22 32 Z" fill="#FFA3B1" />
          <path d="M72 25 L67 35 L78 32 Z" fill="#FFA3B1" />
          <ellipse cx="40" cy="45" rx="4" ry="6" fill="#333" />
          <ellipse cx="60" cy="45" rx="4" ry="6" fill="#333" />
          <ellipse cx="39" cy="43" rx="1.5" ry="2" fill="#FFF" />
          <ellipse cx="59" cy="43" rx="1.5" ry="2" fill="#FFF" />
          <circle cx="34" cy="53" r="5" fill="#FF8E9E" opacity="0.8" />
          <circle cx="66" cy="53" r="5" fill="#FF8E9E" opacity="0.8" />
          <path d="M46 52 Q50 55 54 52" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 52 Q50 63 62 52" fill="none" stroke="#F0A500" strokeWidth="3.5" strokeLinecap="round" />
          <g className="origin-[80px_70px] animate-[pulse_1.5s_infinite]">
            <circle cx="80" cy="65" r="10" fill="#FFC107" stroke="#F0A500" strokeWidth="3" />
            <circle cx="75" cy="60" r="2.5" fill="#333" />
            <circle cx="80" cy="58" r="2.5" fill="#333" />
            <circle cx="85" cy="60" r="2.5" fill="#333" />
          </g>
        </svg>
      );
    case 'vector_rocket':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-pulse`}>
          <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF5252" />
              <stop offset="100%" stopColor="#FF7A00" />
            </linearGradient>
            <linearGradient id="flameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFEA00" />
              <stop offset="100%" stopColor="#FF3D00" />
            </linearGradient>
          </defs>
          <path d="M42 70 Q50 95 58 70 Q50 82 42 70" fill="url(#flameGrad)" className="animate-[bounce_0.6s_infinite]" />
          <path d="M25 65 L40 50 L35 70 Z" fill="#D32F2F" />
          <path d="M75 65 L60 50 L65 70 Z" fill="#D32F2F" />
          <path d="M50 15 Q65 40 62 70 L38 70 Q35 40 50 15" fill="url(#rocketBody)" />
          <circle cx="50" cy="45" r="8" fill="#FFF" stroke="#ECEFF1" strokeWidth="2" />
          <circle cx="50" cy="45" r="5" fill="#00B0FF" />
          <path d="M50 15 Q55 25 50 32 Q45 25 50 15" fill="#D32F2F" />
        </svg>
      );
    case 'vector_heart':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-[pulse_1.2s_infinite]`}>
          <defs>
            <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2E93" />
              <stop offset="100%" stopColor="#FF8E53" />
            </linearGradient>
          </defs>
          <path d="M50 30 C35 10, 10 25, 10 50 C10 75, 45 92, 50 95 C55 92, 90 75, 90 50 C90 25, 65 10, 50 30 Z" fill="url(#heartGrad)" />
          <path d="M25 28 C20 33, 18 40, 20 45 C19 38, 22 32, 27 28 Z" fill="#FFF" opacity="0.6" />
          <path d="M75 25 L77 30 L82 31 L77 32 L75 37 L73 32 L68 31 L73 30 Z" fill="#FFF" className="animate-ping" />
        </svg>
      );
    case 'vector_coffee':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-pulse`}>
          <defs>
            <linearGradient id="cupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8D6E63" />
              <stop offset="100%" stopColor="#4E342E" />
            </linearGradient>
          </defs>
          <path d="M35 30 Q30 15 35 5 Q40 15 35 30" fill="none" stroke="#BCAAA4" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_2s_infinite]" />
          <path d="M50 30 Q55 15 50 5 Q45 15 50 30" fill="none" stroke="#BCAAA4" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_2s_infinite_0.4s]" />
          <path d="M65 30 Q60 15 65 5 Q70 15 65 30" fill="none" stroke="#BCAAA4" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_2s_infinite_0.8s]" />
          <path d="M65 45 C80 45, 80 70, 65 70" fill="none" stroke="url(#cupGrad)" strokeWidth="8" />
          <path d="M25 40 L75 40 L70 75 C68 83, 32 83, 30 75 Z" fill="url(#cupGrad)" opacity="0.95" />
          <path d="M23 45 L77 45 L74 65 L26 65 Z" fill="#D7CCC8" />
          <circle cx="50" cy="55" r="5" fill="#4E342E" />
        </svg>
      );
    case 'vector_party':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-bounce duration-700`}>
          <defs>
            <linearGradient id="popperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#AB47BC" />
              <stop offset="100%" stopColor="#7B1FA2" />
            </linearGradient>
          </defs>
          <path d="M15 85 L25 50 L50 75 Z" fill="url(#popperGrad)" />
          <path d="M40 45 Q60 15 85 10" fill="none" stroke="#FF7043" strokeWidth="3.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M55 55 Q75 35 90 25" fill="none" stroke="#26A69A" strokeWidth="3.5" strokeLinecap="round" className="animate-pulse" />
          <circle cx="70" cy="15" r="3" fill="#FFEE58" className="animate-ping" />
          <circle cx="85" cy="25" r="3.5" fill="#26C6DA" />
          <circle cx="60" cy="35" r="2.5" fill="#EC407A" />
          <polygon points="50,15 55,20 52,25 47,20" fill="#26A69A" />
          <polygon points="80,45 85,50 82,53 77,48" fill="#FFCA28" />
        </svg>
      );
    case 'vector_fire':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-[pulse_1s_infinite]`}>
          <defs>
            <linearGradient id="fireOuter" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#E65100" />
              <stop offset="50%" stopColor="#F57C00" />
              <stop offset="100%" stopColor="#FFCC80" />
            </linearGradient>
            <linearGradient id="fireInner" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#D50000" />
              <stop offset="60%" stopColor="#FF6D00" />
              <stop offset="100%" stopColor="#FFD600" />
            </linearGradient>
          </defs>
          <path d="M50 95 C25 95, 10 75, 10 50 C10 20, 45 5, 50 5 C55 5, 90 20, 90 50 C90 75, 75 95, 50 95 Z" fill="url(#fireOuter)" />
          <path d="M50 90 C35 90, 25 75, 25 60 C25 40, 45 25, 50 25 C55 25, 75 40, 75 60 C75 75, 65 90, 50 90 Z" fill="url(#fireInner)" className="animate-[bounce_0.8s_infinite]" />
          <circle cx="30" cy="30" r="2" fill="#FFF" opacity="0.8" className="animate-pulse" />
          <circle cx="70" cy="20" r="3" fill="#FFF" opacity="0.6" className="animate-ping" />
        </svg>
      );
    case 'vector_ghost':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-bounce duration-1000`}>
          <defs>
            <linearGradient id="ghostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0F7FA" />
              <stop offset="100%" stopColor="#80DEEA" />
            </linearGradient>
          </defs>
          <path d="M20 50 C20 25, 80 25, 80 50 L80 80 Q70 85 65 80 Q60 75 50 80 Q40 85 35 80 L20 80 Z" fill="url(#ghostGrad)" />
          <circle cx="33" cy="55" r="4" fill="#FF8E9E" opacity="0.6" />
          <circle cx="67" cy="55" r="4" fill="#FF8E9E" opacity="0.6" />
          <circle cx="40" cy="48" r="4" fill="#006064" />
          <circle cx="60" cy="48" r="4" fill="#006064" />
          <circle cx="39" cy="46" r="1.5" fill="#FFF" />
          <circle cx="59" cy="46" r="1.5" fill="#FFF" />
          <ellipse cx="50" cy="56" rx="3" ry="5" fill="#006064" />
        </svg>
      );
    case 'vector_raincloud':
      return (
        <svg viewBox="0 0 100 100" className={`${baseSvgClass} animate-pulse`}>
          <defs>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#90A4AE" />
              <stop offset="100%" stopColor="#37474F" />
            </linearGradient>
          </defs>
          <path d="M30 65 L28 80" fill="none" stroke="#29B6F6" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_1.2s_infinite]" />
          <path d="M50 70 L48 85" fill="none" stroke="#29B6F6" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_1.2s_infinite_0.4s]" />
          <path d="M70 65 L68 80" fill="none" stroke="#29B6F6" strokeWidth="3" strokeLinecap="round" className="animate-[bounce_1.2s_infinite_0.8s]" />
          <path d="M25 60 C15 60, 10 50, 15 40 C10 30, 25 20, 35 25 C45 15, 65 15, 75 25 C85 20, 92 35, 85 45 C92 55, 80 60, 75 60 Z" fill="url(#cloudGrad)" />
          <path d="M36 38 Q40 35 44 38" fill="none" stroke="#ECEFF1" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M56 38 Q60 35 64 38" fill="none" stroke="#ECEFF1" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="43" cy="46" r="2" fill="#29B6F6" className="animate-bounce" />
          <circle cx="57" cy="46" r="2" fill="#29B6F6" className="animate-bounce" />
          <path d="M47 52 Q50 48 53 52" fill="none" stroke="#ECEFF1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

const formatAspirasiDate = (msg: AspirasiMessage) => {
  if (msg.createdAt) {
    try {
      const dateObj = typeof msg.createdAt.toDate === 'function' ? msg.createdAt.toDate() : new Date(msg.createdAt);
      if (!isNaN(dateObj.getTime())) {
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        return `${dateStr} • ${timeStr}`;
      }
    } catch (e) {
      console.error("Error formatting date:", e);
    }
  }
  return msg.date;
};

interface MessageBubbleProps {
  key?: string;
  m: AspirasiMessage;
  depth: number;
  user: User | null;
  isAdmin: boolean;
  isModerator: boolean;
  isDewa: boolean;
  activeReactionMenu: string | null;
  setActiveReactionMenu: (id: string | null) => void;
  setConfirmMsg: (m: AspirasiMessage | null) => void;
  setWarningMsg: (m: AspirasiMessage | null) => void;
  reactToMessage: (m: AspirasiMessage, emoji: string) => Promise<void>;
  likeMessage: (m: AspirasiMessage) => Promise<void>;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  replySticker: string;
  setReplySticker: (sticker: string) => void;
  showReplyStickers: boolean;
  setShowReplyStickers: (show: boolean) => void;
  sendReply: (parentId: string) => Promise<void>;
  messagesByParent: Record<string, AspirasiMessage[]>;
  allMessages: AspirasiMessage[];
}

function MessageBubble({
  m,
  depth,
  user,
  isAdmin,
  isModerator,
  isDewa,
  activeReactionMenu,
  setActiveReactionMenu,
  setConfirmMsg,
  setWarningMsg,
  reactToMessage,
  likeMessage,
  replyingToId,
  setReplyingToId,
  replyText,
  setReplyText,
  replySticker,
  setReplySticker,
  showReplyStickers,
  setShowReplyStickers,
  sendReply,
  messagesByParent,
  allMessages
}: MessageBubbleProps) {
  const children = messagesByParent[m.id] || [];
  const parentMsg = m.parentId ? allMessages.find(msg => msg.id === m.parentId) : null;
  const [replyStickerTab, setReplyStickerTab] = useState<'emoji' | 'vector'>('emoji');

  return (
    <div 
      className={`relative ${
        depth > 0 
          ? 'pl-3 md:pl-4 border-l-2 border-blue-500/10 dark:border-blue-900/20 mt-3' 
          : 'bg-white dark:bg-[#1a252f] p-4 md:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm'
      } group transition-all`}
    >
      <div className={depth > 0 ? 'bg-slate-50/50 dark:bg-slate-900/20 p-3 md:p-4 rounded-xl border border-blue-500/5 dark:border-blue-900/10 relative' : 'relative'}>
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shrink-0">
              <span className="text-[7px] md:text-[9.5px] font-bold text-gray-500">ANON</span>
            </div>
            <span className="text-[8px] md:text-[9px] font-bold tracking-widest text-[#9aaabb] dark:text-gray-400 uppercase">{formatAspirasiDate(m)}</span>
          </div>
          <div className="flex gap-1.5 md:gap-2 items-center">
            {/* Admin/Moderator controls */}
            {(isAdmin || isModerator) && (
              <div className="flex gap-1 md:gap-2">
                <button 
                  onClick={() => setWarningMsg(m)}
                  className="p-1 text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                  title="Send Warning"
                >
                  <ShieldAlert size={12} className="md:w-3.5 md:h-3.5" />
                </button>
                <button 
                  onClick={() => setConfirmMsg(m)} 
                  className="p-1 text-gray-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  title="Delete Message"
                >
                  <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                </button>
              </div>
            )}
            
            {/* Reply trigger */}
            <button 
              onClick={() => {
                if (!user) {
                  (window as any).showAuthError?.('unauthenticated');
                  return;
                }
                setReplyingToId(replyingToId === m.id ? null : m.id);
                setReplyText('');
                setReplySticker('');
                setShowReplyStickers(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 text-[#6b7d91] dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MessageSquare size={10} className="md:w-3 md:h-3" />
              <span className="text-[8px] md:text-[9.5px] font-extrabold uppercase">REPLY</span>
            </button>

            {/* Reactions */}
            <div className="relative">
              <button 
                onClick={() => setActiveReactionMenu(activeReactionMenu === m.id ? null : m.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 text-[#6b7d91] dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Plus size={10} className="md:w-3 md:h-3" />
                <span className="text-[8px] md:text-[9.5px] font-extrabold uppercase">REACT</span>
              </button>

              <AnimatePresence>
                {activeReactionMenu === m.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="fixed md:absolute md:bottom-full bottom-20 left-4 right-4 md:left-auto md:right-0 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-wrap justify-center gap-2 z-[70] md:whitespace-nowrap"
                  >
                    {REACTION_EMOJIS.map(emoji => {
                      const isUserReaction = user && m.userReactions?.[user.uid] === emoji;
                      return (
                        <button
                          key={emoji}
                          onClick={() => reactToMessage(m, emoji)}
                          className={`text-xl hover:scale-125 transition-transform p-1.5 rounded-lg ${isUserReaction ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Likes */}
            <button 
              onClick={() => likeMessage(m)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
                user && m.likedBy?.includes(user.uid) 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40'
              }`}
            >
              <Heart size={11} className={user && m.likedBy?.includes(user.uid) ? 'fill-white' : m.likes > 0 ? 'fill-rose-500' : ''}/>
              <span className="text-[9px] font-bold">{m.likes}</span>
            </button>
          </div>
        </div>
        
        {parentMsg && (
          <div className="mb-2.5 flex items-center gap-1.5 text-[9px] text-[#556677] dark:text-[#a0b0c0] bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/10 dark:border-blue-400/10 px-2.5 py-1 rounded-xl w-fit max-w-full">
            <span className="font-extrabold uppercase text-blue-500 tracking-wider flex items-center gap-1 shrink-0">
              <svg className="w-2.5 h-2.5 transform scale-x-[-1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              REPLY COMPANION:
            </span>
            <span className="italic truncate max-w-[150px] sm:max-w-[300px]">
              {parentMsg.text ? parentMsg.text : (parentMsg.sticker ? `[Custom Sticker]` : 'Anonymous feedback')}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-3">
          {m.sticker && (
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white/40 dark:bg-black/20 rounded-2xl p-1.5 border border-slate-100/50 dark:border-slate-800/10 shadow-sm">
              <RenderSticker stickerId={m.sticker} className="w-full h-full" />
            </div>
          )}
          {m.text && <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-sans whitespace-pre-wrap">{m.text}</p>}
        </div>

        {m.reactions && Object.keys(m.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/10">
            {Object.entries(m.reactions).map(([emoji, count]) => {
              const isUserReaction = user && m.userReactions?.[user.uid] === emoji;
              return (count as number) > 0 && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={emoji}
                  onClick={() => reactToMessage(m, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                    isUserReaction 
                      ? 'bg-blue-500 text-white border-blue-400 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 text-slate-500 grayscale-[0.3] hover:grayscale-0 hover:border-blue-200'
                  } text-[9px]`}
                >
                  <span>{emoji}</span>
                  <span className={`font-bold ${isUserReaction ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{count as number}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {user && replyingToId === m.id && (
        <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-900 border border-blue-500/10 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Reply as Anonymous User</span>
            <button 
              onClick={() => setReplyingToId(null)}
              className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500"
            >
              Cancel
            </button>
          </div>
          <textarea 
            placeholder="Write your response..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            className="w-full bg-white dark:bg-gray-950 border-none rounded-xl p-3 text-xs min-h-[50px] outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-700 dark:text-slate-300"
            autoFocus
          />
          {replySticker && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl w-fit">
              <div className="w-8 h-8">
                <RenderSticker stickerId={replySticker} className="w-full h-full" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300">Sticker Selected</span>
              <button onClick={() => setReplySticker('')} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-600 transition-colors">Remove</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowReplyStickers(!showReplyStickers)}
              className={`p-1.5 rounded-lg transition-colors ${showReplyStickers ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Smile size={16}/>
            </button>
            <button 
              onClick={() => sendReply(m.id)}
              disabled={!replyText && !replySticker}
              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              Send Reply <Send size={10}/>
            </button>
          </div>
          {showReplyStickers && (
            <div className="p-3 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex gap-1.5 border-b border-gray-100 dark:border-gray-900 pb-1.5">
                <button 
                  type="button"
                  onClick={() => setReplyStickerTab('emoji')}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold transition-all ${
                    replyStickerTab === 'emoji' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  😊 Emojis
                </button>
                <button 
                  type="button"
                  onClick={() => setReplyStickerTab('vector')}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold transition-all ${
                    replyStickerTab === 'vector' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  🎨 Custom Stickers
                </button>
              </div>

              {replyStickerTab === 'emoji' ? (
                <div className="flex flex-wrap gap-2">
                  {STICKERS.map(s => (
                    <button 
                      key={s} 
                      onClick={() => {
                        setReplySticker(s);
                        setShowReplyStickers(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {CUSTOM_STICKERS.map(sticker => (
                    <button 
                      key={sticker.id}
                      onClick={() => {
                        setReplySticker(sticker.id);
                        setShowReplyStickers(false);
                      }}
                      className="flex flex-col items-center justify-center p-1 rounded-lg bg-gray-50 dark:bg-slate-905 hover:bg-blue-50 dark:hover:bg-blue-900/25 border border-transparent hover:border-blue-100 transition-all"
                      title={sticker.name}
                    >
                      <div className="w-8 h-8">
                        <RenderSticker stickerId={sticker.id} className="w-full h-full" />
                      </div>
                      <span className="text-[7.5px] text-gray-400 font-bold mt-0.5 text-center truncate w-full">{sticker.name.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {children.length > 0 && (
        <div className="space-y-1">
          {children.map(child => (
            <MessageBubble 
              key={child.id}
              m={child}
              depth={depth + 1}
              user={user}
              isAdmin={isAdmin}
              isModerator={isModerator}
              isDewa={isDewa}
              activeReactionMenu={activeReactionMenu}
              setActiveReactionMenu={setActiveReactionMenu}
              setConfirmMsg={setConfirmMsg}
              setWarningMsg={setWarningMsg}
              reactToMessage={reactToMessage}
              likeMessage={likeMessage}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              replySticker={replySticker}
              setReplySticker={setReplySticker}
              showReplyStickers={showReplyStickers}
              setShowReplyStickers={setShowReplyStickers}
              sendReply={sendReply}
              messagesByParent={messagesByParent}
              allMessages={allMessages}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Aspirasi({ isAdmin, isDewa, user }: { isAdmin: boolean, isDewa: boolean, user: User | null }) {
  const [messages, setMessages] = useState<AspirasiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<'emoji' | 'vector'>('emoji');
  const [isModerator, setIsModerator] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<AspirasiMessage | null>(null);
  const [warningMsg, setWarningMsg] = useState<AspirasiMessage | null>(null);
  const [warningText, setWarningText] = useState('Warning: Please express your thoughts respectfully and double-check your message before hitting send.');
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySticker, setReplySticker] = useState('');
  const [showReplyStickers, setShowReplyStickers] = useState(false);

  useEffect(() => {
    if (isAdmin) setIsModerator(true);
  }, [isAdmin]);

  useEffect(() => {
    const q = query(collection(db, 'aspirasi'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: AspirasiMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ ...docSnap.data() as AspirasiMessage, id: docSnap.id });
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Aspirasi listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'aspirasi');
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!inputText && !selectedSticker) return;
    try {
      const fullDateStr = `${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      await addDoc(collection(db, 'aspirasi'), {
        parentId: null,
        text: inputText,
        sticker: selectedSticker,
        likes: 0,
        likedBy: [],
        reactions: {},
        userReactions: {},
        authorId: user?.uid || null,
        authorName: user?.displayName || 'Anonymous',
        date: fullDateStr,
        createdAt: Timestamp.now()
      });
      logPortalActivity('aspirasi_create', inputText ? `Message: ${inputText.slice(0, 20)}...` : 'Sticker', user);
      setInputText('');
      setSelectedSticker('');
      setShowStickers(false);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'aspirasi');
      console.error(e);
    }
  };

  const sendReply = async (parentId: string) => {
    if (!replyText && !replySticker) return;
    try {
      const fullDateStr = `${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      await addDoc(collection(db, 'aspirasi'), {
        parentId: parentId,
        text: replyText,
        sticker: replySticker || '',
        likes: 0,
        likedBy: [],
        reactions: {},
        userReactions: {},
        authorId: user?.uid || null,
        authorName: user?.displayName || 'Anonymous',
        date: fullDateStr,
        createdAt: Timestamp.now()
      });
      logPortalActivity('aspirasi_reply', replyText ? `Reply message: ${replyText.slice(0, 20)}...` : 'Sticker', user);
      setReplyText('');
      setReplySticker('');
      setReplyingToId(null);
      setShowReplyStickers(false);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'aspirasi');
      console.error(e);
    }
  };

  const reactToMessage = async (m: AspirasiMessage, emoji: string) => {
    if (!user) {
      (window as any).showAuthError?.('unauthenticated');
      return;
    }
    try {
      const uid = user.uid;
      const oldEmoji = m.userReactions?.[uid];
      const updates: any = {};
      
      setActiveReactionMenu(null);

      if (oldEmoji === emoji) {
        updates[`reactions.${emoji}`] = increment(-1);
        updates[`userReactions.${uid}`] = deleteField();
      } 
      else if (oldEmoji) {
        updates[`reactions.${oldEmoji}`] = increment(-1);
        updates[`reactions.${emoji}`] = increment(1);
        updates[`userReactions.${uid}`] = emoji;
      }
      else {
        updates[`reactions.${emoji}`] = increment(1);
        updates[`userReactions.${uid}`] = emoji;
      }

      await updateDoc(doc(db, 'aspirasi', m.id), updates);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `aspirasi/${m.id}`);
      console.error(e);
    }
  };

  const likeMessage = async (m: AspirasiMessage) => {
    if (!user) {
      (window as any).showAuthError?.('unauthenticated');
      return;
    }
    try {
      const uid = user.uid;
      const isLiked = m.likedBy?.includes(uid);
      
      await updateDoc(doc(db, 'aspirasi', m.id), {
        likes: isLiked ? increment(-1) : increment(1),
        likedBy: isLiked ? arrayRemove(uid) : arrayUnion(uid)
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `aspirasi/${m.id}`);
      console.error(e);
    }
  };

  const deleteMessage = async (m: AspirasiMessage) => {
    if (!isAdmin && !isModerator) {
      (window as any).showAuthError?.('unauthorized');
      return;
    }
    try {
      await deleteDoc(doc(db, 'aspirasi', m.id));

      // Recursive cleanup for nested subcomments!
      const deleteChildren = async (parentId: string) => {
        const children = messages.filter(msg => msg.parentId === parentId);
        for (const child of children) {
          await deleteDoc(doc(db, 'aspirasi', child.id));
          await deleteChildren(child.id);
        }
      };
      await deleteChildren(m.id);

      setConfirmMsg(null);
    } catch (e: any) {
      console.error("Delete aspirasi error:", e);
      (window as any).showAppAlert?.('Delete Failed', 'Failed to delete message: ' + e.message, 'error');
      setConfirmMsg(null);
    }
  };

  const executeWarning = async () => {
    if (!warningMsg || !warningMsg.authorId) return;
    
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: warningMsg.authorId,
        message: warningText,
        createdAt: Timestamp.now(),
        type: 'warning'
      });
      setWarningMsg(null);
    } catch (e: any) {
      console.error(e);
      (window as any).showAppAlert?.('Failed to Send Warning', 'Could not send system warning: ' + e.message, 'error');
    }
  };

  const sendWarning = (m: AspirasiMessage) => {
    if (!isAdmin && !isModerator) return;
    if (!m.authorId) {
      (window as any).showAppAlert?.('No User ID Found', 'The author has not registered an ID. Anonymous message might be sent without ID to protect user privacy.', 'info');
      return;
    }
    setWarningMsg(m);
  };

  // Process hierarchy
  const messagesByParent: Record<string, AspirasiMessage[]> = {};
  const topLevelMessages: AspirasiMessage[] = [];

  messages.forEach(m => {
    if (m.parentId) {
      if (!messagesByParent[m.parentId]) {
        messagesByParent[m.parentId] = [];
      }
      messagesByParent[m.parentId].push(m);
    } else {
      topLevelMessages.push(m);
    }
  });

  // Sort children by date asc, so nested conversations progress chronological
  Object.keys(messagesByParent).forEach(pid => {
    messagesByParent[pid].sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return aTime - bTime;
    });
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-4 md:p-6 shadow-xl shadow-blue-500/5">
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="hidden md:flex w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center text-blue-500">
            <MessageSquare size={20}/>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="md:hidden w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                  <MessageSquare size={16}/>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Anonymous Messages</span>
              </div>
              <button 
                onClick={() => {
                  if (isAdmin) {
                    setIsModerator(!isModerator);
                  } else {
                    (window as any).showAppAlert?.('Access Denied', `Access Denied. Your email (${user?.email || 'Not Logged In'}) is not registered as an Admin in the database. Click the shield/lock icon at the top right to login as Admin.`, 'error');
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  (isModerator || isAdmin) 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'text-gray-300 hover:text-orange-500'
                }`}
              >
                <ShieldAlert size={12}/> {(isModerator || isAdmin) ? (isDewa ? 'DEWA' : isAdmin ? 'ADMIN' : 'MOD') : 'MODERATOR'}
              </button>
            </div>
            {user ? (
               <>
                <textarea 
                  placeholder="Write an aspiration or anonymous message here..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-700 dark:text-slate-300"
                />
                
                {selectedSticker && (
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl w-fit">
                    <div className="w-8 h-8">
                      <RenderSticker stickerId={selectedSticker} className="w-full h-full" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-300">Sticker Selected</span>
                    <button onClick={() => setSelectedSticker('')} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-600 transition-colors">Cancel</button>
                  </div>
                )}
    
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowStickers(!showStickers)}
                      className={`p-2 rounded-lg transition-colors ${showStickers ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      <Smile size={18}/>
                    </button>
                  </div>
                  <button 
                    onClick={sendMessage}
                    className="px-6 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    disabled={!inputText && !selectedSticker}
                  >
                    Send <Send size={14}/>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <Lock size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Login with Google to express voice</p>
              </div>
            )}

            {showStickers && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl animate-in fade-in slide-in-from-top-2 border border-blue-500/5 space-y-3">
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                  <button 
                    type="button"
                    onClick={() => setStickerTab('emoji')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      stickerTab === 'emoji' 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    😊 Emojis
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStickerTab('vector')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      stickerTab === 'vector' 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    🎨 Vector Stickers
                  </button>
                </div>

                {stickerTab === 'emoji' ? (
                  <div className="flex flex-wrap gap-2">
                    {STICKERS.map(s => (
                      <button 
                        type="button"
                        key={s} 
                        onClick={() => {
                          setSelectedSticker(s);
                          setShowStickers(false);
                        }}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {CUSTOM_STICKERS.map(sticker => (
                      <button 
                        type="button"
                        key={sticker.id}
                        onClick={() => {
                          setSelectedSticker(sticker.id);
                          setShowStickers(false);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-[#1a252f] hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 transition-all hover:scale-105"
                        title={sticker.name}
                      >
                        <div className="w-10 h-10">
                          <RenderSticker stickerId={sticker.id} className="w-full h-full" />
                        </div>
                        <span className="text-[8px] text-gray-400 font-bold mt-1 text-center truncate w-full">{sticker.name.split(' ').slice(1).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {topLevelMessages.map((m) => (
          <MessageBubble 
            key={m.id}
            m={m}
            depth={0}
            user={user}
            isAdmin={isAdmin}
            isModerator={isModerator}
            isDewa={isDewa}
            activeReactionMenu={activeReactionMenu}
            setActiveReactionMenu={setActiveReactionMenu}
            setConfirmMsg={setConfirmMsg}
            setWarningMsg={setWarningMsg}
            reactToMessage={reactToMessage}
            likeMessage={likeMessage}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            replyText={replyText}
            setReplyText={setReplyText}
            replySticker={replySticker}
            setReplySticker={setReplySticker}
            showReplyStickers={showReplyStickers}
            setShowReplyStickers={setShowReplyStickers}
            sendReply={sendReply}
            messagesByParent={messagesByParent}
            allMessages={messages}
          />
        ))}
        {topLevelMessages.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <p className="text-sm font-serif italic">No feedback posts yet. Be the first to express yours!</p>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmMsg && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmMsg(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-8 max-w-xs w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">This message and all replies will be permanently deleted</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmMsg(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => confirmMsg && deleteMessage(confirmMsg)}
                  className="py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                >
                  reyal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warning Modal */}
      <AnimatePresence>
        {warningMsg && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWarningMsg(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] rounded-3xl border border-orange-100 dark:border-orange-900/30 p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="text-orange-500" size={32} />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2 uppercase tracking-tight">Send Warning</h3>
              <p className="text-[10px] text-gray-400 mb-6 uppercase font-bold tracking-widest leading-relaxed">
                To: <span className="text-orange-500">{isDewa ? (warningMsg.authorName || 'Anonymous') : 'Anonymous'}</span>
              </p>
              
              <textarea 
                value={warningText}
                onChange={e => setWarningText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-[11px] min-h-[120px] outline-none focus:ring-2 focus:ring-orange-500/20 mb-6 resize-none leading-relaxed text-slate-700 dark:text-slate-300"
                placeholder="Write warning message..."
              />

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setWarningMsg(null)}
                  className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeWarning}
                  className="py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Send Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
