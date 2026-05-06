import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, Info, AlertCircle, Megaphone, Lock, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, Timestamp, orderBy, query, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  date: string;
  authorId: string;
}

export default function Pengumuman({ isAdmin, user }: { isAdmin: boolean, user: User | null }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' as any });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ ...docSnap.data() as Announcement, id: docSnap.id });
      });
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addAnnouncement = async () => {
    if (!user) return alert('Silakan login dulu');
    if (!form.title.trim()) return alert('Judul tidak boleh kosong');
    if (!form.content.trim()) return alert('Isi pengumuman tidak boleh kosong');
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          ...form,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          authorId: user.uid,
          authorName: user.displayName || 'Anonim',
          authorPhoto: user.photoURL || '',
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: Timestamp.now()
        });
      }
      setIsAdding(false);
      setEditingId(null);
      setForm({ title: '', content: '', priority: 'medium' });
    } catch (e: any) {
      handleFirestoreError(e, editingId ? OperationType.UPDATE : OperationType.CREATE, `announcements/${editingId || ''}`);
    }
  };

  const startEdit = (a: Announcement) => {
    setForm({ title: a.title, content: a.content, priority: a.priority });
    setEditingId(a.id);
    setIsAdding(true);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user) return alert('Silakan login dulu');
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    if (!isAdmin && ann.authorId !== user.uid) return alert('Anda hanya bisa menghapus pengumuman buatan sendiri!');
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setConfirmId(null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `announcements/${id}`);
      setConfirmId(null);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'border-rose-500 bg-rose-50 text-rose-500 dark:bg-rose-900/20';
      case 'medium': return 'border-blue-500 bg-blue-50 text-blue-500 dark:bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-50 text-gray-500 dark:bg-gray-800/50';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-[#1a252f] rounded-2xl md:rounded-[32px] border border-blue-100 dark:border-blue-900/30 p-4 md:p-8 shadow-sm">
        {user ? (
          !isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 md:py-6 border-2 border-dashed border-blue-200 dark:border-blue-900/40 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 text-blue-500 text-xs md:text-sm font-black uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3}/> Posting Pengumuman
            </button>
          ) : (
            <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-1">
                <h4 className="font-serif text-lg md:text-xl font-bold">{editingId ? 'Edit' : 'Buat'} Pengumuman</h4>
                <button onClick={() => { setIsAdding(false); setEditingId(null); setForm({ title: '', content: '', priority: 'medium' }); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Judul Pengumuman..." 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="px-4 py-3 text-sm rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-300"
                />
                <select 
                  value={form.priority}
                  onChange={e => setForm({...form, priority: e.target.value as any})}
                  className="px-4 py-3 text-sm rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="low">Prioritas: Rendah</option>
                  <option value="medium">Prioritas: Sedang</option>
                  <option value="high">Prioritas: Penting!</option>
                </select>
              </div>
              <textarea 
                placeholder="Tuliskan detail pengumuman..." 
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 outline-none h-32 md:h-40 resize-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-300"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setIsAdding(false); setEditingId(null); setForm({ title: '', content: '', priority: 'medium' }); }} className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Batal</button>
                <button 
                  onClick={addAnnouncement} 
                  className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all hover:-translate-y-1 active:scale-95"
                >
                  {editingId ? 'Simpan Perubahan' : 'Posting Sekarang'}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center gap-2">
            <Lock size={20} className="text-gray-300" />
            <p className="text-[10px] text-gray-400 uppercase tracking-tight">Login Google untuk posting pengumuman</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white dark:bg-[#1a252f] rounded-2xl md:rounded-[32px] border border-blue-100 dark:border-blue-900/10 overflow-hidden shadow-xl shadow-blue-500/5 flex flex-col md:flex-row transition-all duration-300 hover:-translate-y-1">
            <div className={`w-full md:w-1.5 ${getPriorityColor(a.priority)} md:border-none`} />
            <div className="p-5 md:p-8 flex-1">
              <div className="flex items-start justify-between gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${getPriorityColor(a.priority)} border-none shadow-sm`}>
                    {a.priority === 'high' ? <AlertCircle size={20} className="md:w-6 md:h-6"/> : a.priority === 'medium' ? <Info size={20} className="md:w-6 md:h-6"/> : <Megaphone size={20} className="md:w-6 md:h-6"/>}
                  </div>
                  <div>
                    <h3 className="font-serif text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">{a.title}</h3>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{a.date}</span>
                  </div>
                </div>
                {user && (
                  <div className="flex items-center gap-1 md:gap-2">
                    {(isAdmin || a.authorId === user.uid) && (
                      <>
                        <button onClick={() => startEdit(a)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                          <Pencil size={16}/>
                        </button>
                        <button onClick={() => setConfirmId(a.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                          <Trash2 size={16}/>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed md:leading-loose whitespace-pre-wrap">{a.content}</p>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Bell size={48} className="mx-auto mb-4" />
            <p className="text-sm">Tidak ada pengumuman baru.</p>
          </div>
        )}
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
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Pengumuman ini akan dihapus permanen</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmId(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => deleteAnnouncement(confirmId)}
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
