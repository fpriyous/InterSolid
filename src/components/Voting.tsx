import { useState, useEffect } from 'react';
import { Vote, Trash2, Plus, CheckCircle2, Lock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, increment, query, orderBy, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  isActive: boolean;
  totalVotes: number;
  authorId: string;
  options?: PollOption[];
}


export default function Voting({ isAdmin, user }: { isAdmin: boolean, user: User | null }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('IS_hasVoted');
    return saved ? JSON.parse(saved) : {};
  });

  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const pollData: Poll[] = [];
      for (const pollDoc of snapshot.docs) {
        const p = { ...pollDoc.data() as any, id: pollDoc.id };
        const optSnapshot = await getDocs(collection(db, 'polls', pollDoc.id, 'options'));
        const options: any[] = [];
        optSnapshot.forEach(o => options.push({ ...o.data() as any, id: o.id }));
        p.options = options.sort((a, b) => (a.order || 0) - (b.order || 0));
        pollData.push(p);
      }
      setPolls(pollData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('IS_hasVoted', JSON.stringify(hasVoted));
  }, [hasVoted]);

  const handleAction = (type: 'delete', id: string) => {
    if (!user) {
      alert('Login Google dulu!');
      return;
    }
    setConfirmId(id);
  };

  const addPoll = async () => {
    if (!user || !newPoll.question || newPoll.options.some(o => !o)) return;
    try {
      const pollRef = await addDoc(collection(db, 'polls'), {
        question: newPoll.question,
        isActive: true,
        totalVotes: 0,
        authorId: user.uid,
        createdAt: Timestamp.now()
      });

      const batch = writeBatch(db);
      newPoll.options.forEach((opt, index) => {
        const optRef = doc(collection(db, 'polls', pollRef.id, 'options'));
        batch.set(optRef, {
          label: opt,
          votes: 0,
          order: index
        });
      });
      await batch.commit();

      setNewPoll({ question: '', options: ['', ''] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return alert('Silakan Login Google dulu untuk memilih!');
    if (hasVoted[pollId]) return;
    
    try {
      await updateDoc(doc(db, 'polls', pollId), {
        totalVotes: increment(1)
      });
      await updateDoc(doc(db, 'polls', pollId, 'options', optionId), {
        votes: increment(1)
      });
      setHasVoted({ ...hasVoted, [pollId]: true });
    } catch (e: any) {
      console.error("Vote error:", e);
      alert("Gagal memilih: " + e.message);
    }
  };

  const deletePoll = async (id: string) => {
    if (!isAdmin) {
      alert('Fitur ini hanya untuk Admin. Silakan login admin di header.');
      setConfirmId(null);
      return;
    }
    setLoading(true);
    try {
      console.log("Deleting poll and its options:", id);
      // Cleanup options subcollection
      const batch = writeBatch(db);
      const optsSnap = await getDocs(collection(db, 'polls', id, 'options'));
      optsSnap.forEach(d => batch.delete(d.ref));
      
      // Delete main doc
      batch.delete(doc(db, 'polls', id));
      
      await batch.commit();
      setConfirmId(null);
    } catch (e: any) {
      console.error("Delete poll error:", e);
      alert('Gagal menghapus polling: ' + (e.message || "Izin ditolak oleh server"));
      setConfirmId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 md:pb-0">
      <div className="lg:col-span-2 space-y-6">
        {polls.length > 0 ? (
          polls.map((p) => (
            <div key={p.id} className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-blue-100 dark:border-blue-900/10 p-6 md:p-8 shadow-xl shadow-blue-500/5 overflow-hidden relative transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6 md:mb-8 gap-4 px-1">
                <div>
                  <h3 className="font-serif text-lg md:text-2xl font-bold leading-tight">{p.question}</h3>
                  <p className="text-[10px] md:text-xs text-slate-400 mt-2 uppercase font-black tracking-[0.2em]">{p.totalVotes} Suara Masuk</p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleAction('delete', p.id)} 
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {p.options?.map((opt) => {
                  const percent = p.totalVotes > 0 ? Math.round((opt.votes / p.totalVotes) * 100) : 0;
                  const votedThis = hasVoted[p.id];
                  return (
                    <button 
                      key={opt.id}
                      onClick={() => handleVote(p.id, opt.id)}
                      disabled={votedThis}
                      className={`w-full p-4 rounded-xl relative overflow-hidden text-left border transition-all ${
                        votedThis ? 'border-gray-100 dark:border-gray-800' : 'border-blue-50 dark:border-blue-900/20 hover:border-blue-200'
                      }`}
                    >
                      <div 
                        className="absolute inset-y-0 left-0 bg-blue-500/10 transition-all duration-1000 ease-out" 
                        style={{ width: `${percent}%` }} 
                      />
                      <div className="relative flex items-center justify-between z-10">
                        <span className="text-xs font-medium">{opt.label}</span>
                        {votedThis ? (
                          <span className="text-xs font-bold text-blue-500">{percent}%</span>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-blue-200" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {hasVoted[p.id] && (
                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase">
                  <CheckCircle2 size={12}/> Anda sudah memberikan suara untuk sesi ini
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-20 text-center shadow-sm">
            <Vote size={48} className="mx-auto mb-4 text-blue-100" />
            <p className="text-sm text-gray-400 font-medium">Belum ada sesi voting aktif.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-blue-100 dark:border-blue-900/10 p-6 md:p-8 shadow-sm">
          <h4 className="font-serif text-lg font-bold mb-6">Buat Voting Baru</h4>
          {user ? (
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 ml-1">Kueri / Pertanyaan</label>
                <input 
                  type="text" 
                  placeholder="Apa yang ingin divoting?" 
                  value={newPoll.question}
                  onChange={e => setNewPoll({...newPoll, question: e.target.value})}
                  className="w-full px-5 py-3 text-sm rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 ml-1">Opsi Jawaban</label>
                {newPoll.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 group">
                    <input 
                      type="text" 
                      placeholder={`Opsi ke-${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...newPoll.options];
                        newOpts[i] = e.target.value;
                        setNewPoll({...newPoll, options: newOpts});
                      }}
                      className="flex-1 px-5 py-3 text-sm rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                    />
                    {newPoll.options.length > 2 && (
                      <button onClick={() => setNewPoll({...newPoll, options: newPoll.options.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                  className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} strokeWidth={3}/> Tambah Opsi Lain
                </button>
              </div>
              <button 
                onClick={addPoll}
                className="w-full py-4 bg-blue-600 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                Luncurkan Sekarang
              </button>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
              <Lock size={20} className="mx-auto mb-2 text-gray-300" />
              <p className="text-[10px] text-gray-400 uppercase tracking-tight">Login Google untuk membuat voting</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmId(null)}
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
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Sesi voting dan seluruh data suara akan dihapus</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmId(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => confirmId && deletePoll(confirmId)}
                  className="py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                >
                  reyal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
