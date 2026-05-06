import { useState, useEffect } from 'react';
import { MessageSquare, Send, Smile, Image as ImageIcon, Trash2, Heart, ShieldAlert, Key, Lock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, Timestamp, orderBy, query, increment, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface AspirasiMessage {
  id: string;
  text: string;
  sticker?: string;
  likes: number;
  likedBy?: string[];
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>;
  date: string;
  authorId?: string;
  authorName?: string;
}

const STICKERS = ['🔥', '👍', '❤️', '🙌', '😢', '😂', '👀', '💯', '🙏', '✨'];
const REACTION_EMOJIS = ['🔥', '👎', '❤️', '😂', '😮', '💯', '👏', '🤔', '🙌', '😢', '👀', '✨'];

export default function Aspirasi({ isAdmin, isDewa, user }: { isAdmin: boolean, isDewa: boolean, user: User | null }) {
  const [messages, setMessages] = useState<AspirasiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<AspirasiMessage | null>(null);
  const [warningMsg, setWarningMsg] = useState<AspirasiMessage | null>(null);
  const [warningText, setWarningText] = useState('Peringatan: Berhati-hatilah dalam bersikap dan menimbanglah sebelum menekan tombol kirim.');
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

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
      await addDoc(collection(db, 'aspirasi'), {
        text: inputText,
        sticker: selectedSticker,
        likes: 0,
        likedBy: [],
        reactions: {},
        userReactions: {},
        authorId: user?.uid || null,
        authorName: user?.displayName || 'Anonim',
        date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: Timestamp.now()
      });
      logPortalActivity('aspirasi_create', inputText ? `Pesan: ${inputText.slice(0, 20)}...` : 'Sticker', user);
      setInputText('');
      setSelectedSticker('');
      setShowStickers(false);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'aspirasi');
      console.error(e);
    }
  };

  const reactToMessage = async (m: AspirasiMessage, emoji: string) => {
    if (!user) return alert('Silakan login untuk memberikan reaksi.');
    try {
      const uid = user.uid;
      const oldEmoji = m.userReactions?.[uid];
      const updates: any = {};
      
      setActiveReactionMenu(null);

      // Case 1: Klik emoji yang sama (Toggle Off)
      if (oldEmoji === emoji) {
        updates[`reactions.${emoji}`] = increment(-1);
        updates[`userReactions.${uid}`] = deleteField();
      } 
      // Case 2: Ganti emoji
      else if (oldEmoji) {
        updates[`reactions.${oldEmoji}`] = increment(-1);
        updates[`reactions.${emoji}`] = increment(1);
        updates[`userReactions.${uid}`] = emoji;
      }
      // Case 3: Reaksi baru
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
    if (!user) return alert('Silakan login untuk menyukai pesan.');
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
    if (!isAdmin && !isModerator) return alert('Hanya moderator/admin yang bisa menghapus aspirasi!');
    try {
      await deleteDoc(doc(db, 'aspirasi', m.id));
      setConfirmMsg(null);
    } catch (e: any) {
      console.error("Delete aspirasi error:", e);
      alert('Gagal menghapus aspirasi: ' + e.message);
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
      alert('Gagal mengirim peringatan: ' + e.message);
    }
  };

  const sendWarning = (m: AspirasiMessage) => {
    if (!isAdmin && !isModerator) return;
    if (!m.authorId) return alert('Pengirim tidak teridentifikasi (mungkin pesan lama atau anonim tanpa ID)');
    setWarningMsg(m);
  };

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
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pesan Anonim</span>
              </div>
                <button 
                  onClick={() => {
                    if (isAdmin) {
                      setIsModerator(!isModerator);
                    } else {
                      alert(`Akses Ditolak. Email Anda (${user?.email || 'Belum Login'}) tidak terdaftar sebagai Admin di database.`);
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
                  placeholder="Tulis aspirasi atau pesan anonim di sini..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
                
                {selectedSticker && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full w-fit">
                    <span className="text-lg">{selectedSticker}</span>
                    <button onClick={() => setSelectedSticker('')} className="text-[10px] uppercase font-bold text-blue-500 hover:text-red-500">Batal</button>
                  </div>
                )}
    
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowStickers(!showStickers)}
                      className={`p-2 rounded-lg transition-colors ${showStickers ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      <Smile size={18}/>
                    </button>
                  </div>
                  <button 
                    onClick={sendMessage}
                    className="px-6 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    disabled={!inputText && !selectedSticker}
                  >
                    Kirim <Send size={14}/>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <Lock size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Login Google untuk beraspirasi</p>
              </div>
            )}

            {showStickers && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl animate-in fade-in slide-in-from-top-2">
                {STICKERS.map(s => (
                  <button 
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
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`bg-white dark:bg-[#1a252f] p-4 md:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm relative group transition-all ${
              activeReactionMenu === m.id ? 'z-[60]' : 'z-10'
            }`}
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <span className="text-[8px] md:text-[10px] font-bold text-gray-500">ANON</span>
                </div>
                <span className="text-[8px] md:text-[9px] font-bold tracking-widest text-gray-400 uppercase">{m.date}</span>
              </div>
              <div className="flex gap-1.5 md:gap-2 items-center">
                {(isAdmin || isModerator) && (
                  <div className="flex gap-1 md:gap-2">
                    <button 
                      onClick={() => sendWarning(m)}
                      className="p-1.5 text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                      title="Kirim Peringatan"
                    >
                      <ShieldAlert size={12} className="md:w-3.5 md:h-3.5" />
                    </button>
                    <button 
                      onClick={() => setConfirmMsg(m)} 
                      className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Hapus Pesan"
                    >
                      <Trash2 size={12} className="md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                )}
                
                <div className="relative">
                  <button 
                    onClick={() => setActiveReactionMenu(activeReactionMenu === m.id ? null : m.id)}
                    className="flex items-center gap-1 px-2 md:px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <Plus size={10} className="md:w-3 md:h-3" />
                    <span className="text-[8px] md:text-[10px] font-bold">REAKSI</span>
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

                <button 
                  onClick={() => likeMessage(m)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                    user && m.likedBy?.includes(user.uid) 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                      : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  }`}
                >
                  <Heart size={12} className={user && m.likedBy?.includes(user.uid) ? 'fill-white' : m.likes > 0 ? 'fill-rose-500' : ''}/>
                  <span className="text-[10px] font-bold">{m.likes}</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mb-4">
              {m.sticker && <span className="text-4xl animate-bounce duration-1000">{m.sticker}</span>}
              {m.text && <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{m.text}</p>}
            </div>

            {/* Reactions Display */}
            {m.reactions && Object.keys(m.reactions).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                {Object.entries(m.reactions).map(([emoji, count]) => {
                  const isUserReaction = user && m.userReactions?.[user.uid] === emoji;
                  return (count as number) > 0 && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      key={emoji}
                      onClick={() => reactToMessage(m, emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                        isUserReaction 
                          ? 'bg-blue-500 text-white border-blue-400 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 text-slate-500 grayscale-[0.5] hover:grayscale-0 hover:border-blue-200'
                      } text-[10px]`}
                    >
                      <span>{emoji}</span>
                      <span className={`font-bold ${isUserReaction ? 'text-white' : 'text-slate-500'}`}>{count as number}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <p className="text-sm font-serif italic">Belum ada aspirasi. Jadilah yang pertama memberikan suara!</p>
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
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Pesan ini akan dihapus permanen</p>
              
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
              <h3 className="font-serif text-2xl font-bold mb-2 uppercase tracking-tight">Kirim Peringatan</h3>
              <p className="text-[10px] text-gray-400 mb-6 uppercase font-bold tracking-widest leading-relaxed">
                Kepada: <span className="text-orange-500">{isDewa ? (warningMsg.authorName || 'Anonim') : 'Anonim'}</span>
              </p>
              
              <textarea 
                value={warningText}
                onChange={e => setWarningText(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-[11px] min-h-[120px] outline-none focus:ring-2 focus:ring-orange-500/20 mb-6 resize-none leading-relaxed"
                placeholder="Tulis pesan peringatan..."
              />

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setWarningMsg(null)}
                  className="py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={executeWarning}
                  className="py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Kirim Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
