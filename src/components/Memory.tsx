import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Image as ImageIcon, Video, Upload, X, Loader2, Heart, MessageCircle, Sparkles, ShieldAlert, Box, Grid } from 'lucide-react';
import { db, storage, logPortalActivity } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, Timestamp, updateDoc, arrayUnion, arrayRemove, getDocs, where } from 'firebase/firestore';
import { ref as sRef, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import imageCompression from 'browser-image-compression';
import InfiniteMenu from './InfiniteMenu';

interface MemoryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
  title: string;
  caption: string;
  displayDate: string; // YYYY-MM-DD format
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
  likes: string[];
  reactions?: Record<string, string[]>; // emoji -> array of uids
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
}

const EMOJI_LIST = ['❤️', '🔥', '😂', '🙌', '😮', '😢', '😍', '👏'];

function CommentSection({ memoryId, user }: { memoryId: string, user: User | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'memories', memoryId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [memoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment('');

    // Optimistic Update
    const tempId = 'temp-' + Date.now();
    const optimisticComment: Comment = {
      id: tempId,
      text: commentText,
      userId: user.uid,
      userName: user.displayName || 'Anonim',
      userPhoto: user.photoURL || undefined,
      createdAt: Timestamp.now()
    };
    setComments(prev => [optimisticComment, ...prev]);

    try {
      await addDoc(collection(db, 'memories', memoryId, 'comments'), {
        text: commentText,
        userId: user.uid,
        userName: user.displayName || 'Anonim',
        userPhoto: user.photoURL,
        createdAt: Timestamp.now()
      });
      logPortalActivity('memory_comment', `Komentar di kenangan`, user);
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove optimistic comment if error
      setComments(prev => prev.filter(c => c.id !== tempId));
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[300px] md:max-h-[400px] bg-black/20 rounded-2xl md:rounded-3xl overflow-hidden border border-white/5">
      <div className="p-3 md:p-4 border-b border-white/5 bg-white/5">
        <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[2px] text-blue-400">Diskusi Kenangan</h4>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-blue-500/50" size={16} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 opacity-30">
            <MessageCircle size={32} className="mx-auto mb-2" />
            <p className="text-[10px] font-bold uppercase">Belum ada komentar</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <img src={comment.userPhoto || ''} className="w-6 h-6 rounded-full border border-white/10 shrink-0" alt="" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-[10px] font-bold text-gray-400">{comment.userName}</span>
                   <span className="text-[8px] text-gray-600 font-medium">
                     {comment.createdAt?.toDate?.().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed bg-white/5 p-3 rounded-2xl rounded-tl-none">
                  {comment.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white/5 border-t border-white/5">
        <div className="relative">
          <input 
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tulis pendapatmu..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
          <button 
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:opacity-30"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MemoryFloat({ memory, index, onClick }: { memory: MemoryItem, index: number, onClick: () => void, key?: string }) {
  // Random position, rotation and size for authentic "scattered" look
  const [pos] = useState({
    top: `${10 + Math.random() * 70}%`,
    left: `${10 + Math.random() * 80}%`,
    rotate: (Math.random() - 0.5) * 30, // More rotation
    scale: 0.8 + Math.random() * 0.4 // Varying sizes
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0.8],
        scale: [pos.scale * 0.8, pos.scale, pos.scale, pos.scale * 0.9],
        x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100], // More movement
        y: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100],
      }}
      transition={{ 
        duration: 12 + Math.random() * 8, 
        repeat: Infinity,
        delay: index * 0.4,
        ease: "easeInOut"
      }}
      whileHover={{ 
        scale: 1.2, 
        zIndex: 50, 
        opacity: 1,
        rotate: 0,
        transition: { duration: 0.3 } 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute w-32 h-32 md:w-52 md:h-52 cursor-pointer shadow-2xl rounded-xl overflow-hidden border-2 border-white/20 hover:border-blue-400 hover:shadow-blue-500/40 bg-gray-900 z-10"
      style={{ 
        top: pos.top, 
        left: pos.left, 
        rotate: `${pos.rotate}deg` 
      }}
    >
      <div className="w-full h-full relative group">
        {memory.type === 'image' ? (
          <img src={memory.url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full relative">
            <video src={memory.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
               <div className="p-2 bg-white/20 backdrop-blur-md rounded-full">
                  <Video size={16} className="text-white" />
               </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <p className="text-[9px] text-white font-bold uppercase truncate">{memory.userName}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Memory({ isAdmin, user, targetId, setTargetId }: { isAdmin: boolean, user: User | null, targetId?: string | null, setTargetId?: (id: string | null) => void }) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'compressing' | 'uploading' | 'idle'>('idle');
  const [showUpload, setShowUpload] = useState(false);
  const [stageMode, setStageMode] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [displayDate, setDisplayDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'warehouse'>('grid');
  const [confirmDelete, setConfirmDelete] = useState<MemoryItem | null>(null);

  const activeMemory = useMemo(() => memories.find(m => m.id === activeMemoryId) || null, [memories, activeMemoryId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'memories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemoryItem));
      setMemories(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Global Reconciliation: Ensure every memory has a calendar entry and cleanup orphans
  useEffect(() => {
    // Run even if memories.length is 0 to cleanup stray events
    if (!loading && user) {
      const syncInternal = async () => {
        try {
          const eventsSnap = await getDocs(query(collection(db, 'events'), where('genre', '==', 'memory')));
          const memoryIdsWithEvents = new Set();
          
          const cleanupPromises = [];
          
          for (const evDoc of eventsSnap.docs) {
            const data = evDoc.data();
            const linkedMemoryId = data.memoryId;
            
            if (linkedMemoryId) {
              const memoryExists = memories.some(m => m.id === linkedMemoryId);
              if (memoryExists) {
                memoryIdsWithEvents.add(linkedMemoryId);
              } else {
                console.log("[Sync] Deleting orphaned event:", evDoc.id);
                cleanupPromises.push(deleteDoc(doc(db, 'events', evDoc.id)));
              }
            } else {
              // Old memory event without memoryId link? Delete it to be safe, it'll be recreated if needed
              cleanupPromises.push(deleteDoc(doc(db, 'events', evDoc.id)));
            }
          }

          if (cleanupPromises.length > 0) await Promise.all(cleanupPromises);

          // Check if any memory is missing a calendar entry
          for (const memory of memories) {
            if (!memoryIdsWithEvents.has(memory.id)) {
              console.log("[Sync] Creating missing calendar entry for memory:", memory.id);
              const eventRef = await addDoc(collection(db, 'events'), {
                title: memory.title || 'Momen Berharga',
                genre: 'memory',
                date: memory.displayDate,
                time: '',
                note: memory.caption || `Kenangan yang dibagikan oleh ${memory.userName}`,
                authorId: memory.userId,
                createdAt: Timestamp.now(),
                memoryUrl: memory.url,
                memoryId: memory.id
              });
              await updateDoc(doc(db, 'memories', memory.id), {
                calendarEventId: eventRef.id
              });
            }
          }
        } catch (err) {
          console.warn("[Sync] Reconciliation failed:", err);
        }
      };
      
      // Delay slightly to ensure states are settled
      const timer = setTimeout(syncInternal, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, memories.length, user?.uid]);

  // Handle Target ID for deep linking/direct navigation (Robust version)
  useEffect(() => {
    if (!loading && targetId && memories.length > 0) {
      console.log("[Memory] Attempting navigation to:", targetId);
      const target = memories.find(m => m.id === targetId);
      if (target) {
        // Use a small timeout to ensure the grid is rendered
        const timer = setTimeout(() => {
          setActiveMemoryId(target.id);
          setStageMode(false);
          // Clean targetId via parent callback
          if (setTargetId) setTargetId(null);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, targetId, memories.length]);

  useEffect(() => {
    if (activeMemoryId || stageMode || showUpload) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeMemoryId, stageMode, showUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) { // 25MB max raw
      alert('File terlalu besar! Maksimal 25MB agar tidak gagal di tengah jalan.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Hanya file gambar atau video yang diperbolehkan!');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File terlalu besar! Maksimal 25MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setError(null);

    try {
      const isImage = selectedFile.type.startsWith('image/');
      let fileToUpload: File | Blob = selectedFile;
      
      // Image compression step
      if (isImage) {
        setUploadStatus('compressing');
        setUploadProgress(10);
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          onProgress: (p: number) => setUploadProgress(Math.round(p * 0.4))
        };
        try {
          fileToUpload = await imageCompression(selectedFile, options);
          setUploadProgress(45);
        } catch (compErr) {
          console.warn('Compression failed, using original:', compErr);
          fileToUpload = selectedFile;
        }
      }

      setUploadStatus('uploading');
      
      // Direct Cloudinary Upload (Serverless-friendly)
      // This uses unsigned presets for direct-from-client uploads
      const cloudName = 'deemvhgg4'; 
      const uploadPreset = 'intersolid';
      
      console.log(`[Cloudinary Config] FORCE OVERRIDE - Cloud: ${cloudName}, Preset: ${uploadPreset}`);
      
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${isImage ? 'image' : 'video'}/upload`;
      
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'intersolid_memories');

      setUploadProgress(60);
      
      try {
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          const message = errorData.error?.message || `Cloudinary Error ${response.status}`;
          
          console.error('[Cloudinary Debug]', {
            cloudName,
            presetUsed: uploadPreset,
            fullError: errorData
          });

          if (message.toLowerCase().includes("preset")) {
            throw new Error(`PRESET SALAH: Cloudinary tidak menemukan ID '${uploadPreset}'. 
            SOLUSI: 
            1. Pastikan di Cloudinary Settings > Upload, ada preset bernama '${uploadPreset}'.
            2. Pastikan Tipenya adalah 'Unsigned' (Foto yang kamu kirim tadi sudah benar: intersolid - Unsigned).`);
          }
          throw new Error(message);
        }

        const result = await response.json();
        const downloadURL = result.secure_url;
        const publicId = result.public_id;
        setUploadProgress(90);

        const memoryData = {
          type: isImage ? 'image' : 'video',
          url: downloadURL,
          publicId: publicId,
          title: title || 'Momen Berharga',
          caption: caption,
          displayDate: displayDate,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || 'Anonim',
          userPhoto: user.photoURL,
          createdAt: Timestamp.now(),
          likes: []
        };

        // Success - Save to Firestore
        const memoryRef = await addDoc(collection(db, 'memories'), {
          ...memoryData,
          calendarEventId: null
        });
        const memoryId = memoryRef.id;
        logPortalActivity('memory_upload', `Kenangan: ${memoryData.title}`, user);

        // Also add to Calendar automatically
        try {
          const eventRef = await addDoc(collection(db, 'events'), {
            title: title || 'Momen Berharga',
            genre: 'memory',
            date: displayDate,
            time: '',
            note: caption || `Kenangan yang dibagikan oleh ${user.displayName || 'Anonim'}`,
            authorId: user.uid,
            createdAt: Timestamp.now(),
            memoryUrl: downloadURL,
            memoryId: memoryId // CRITICAL: Link back to memory
          });
          
          // Update memory with event ID
          await updateDoc(doc(db, 'memories', memoryId), {
            calendarEventId: eventRef.id
          });
        } catch (calError) {
          console.error("Gagal sinkronisasi ke kalender:", calError);
        }

        setUploadProgress(100);

        // Reset
        setShowUpload(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setTitle('');
        setDisplayDate(new Date().toISOString().split('T')[0]);
        setUploading(false);
        setUploadStatus('idle');
        setUploadProgress(0);
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('Upload Timeout: Koneksi internet Anda terlalu lambat atau server Cloudinary sedang sibuk. Silakan coba lagi.');
        }
        throw fetchErr;
      }

    } catch (err: any) {
      console.error('Upload process failed:', err);
      let errorMsg = err.message || 'Error tidak diketahui.';
      
      if (errorMsg.includes('cloud_name')) {
        errorMsg = `Nama Cloud "${errorMsg.split('cloud_name ')[1]}" ditolak. Pastikan 'Cloud Name' di Settings sudah benar (Tanpa spasi/petik).`;
      }
      
      setError(errorMsg);
      setUploading(false);
      setUploadStatus('idle');
      // Keep progress at current state so user knows where it failed
    }
  };

  const handleDelete = async (memory: MemoryItem) => {
    if (!user) return;
    if (!window.confirm("Hapus kenangan ini? Foto ini juga akan dihapus dari Kalender secara otomatis.")) return;

    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, 'memories', memory.id));
      
      // 2. Guaranteed Deletion from Calendar
      // We look for events by linked memoryId for maximum robustness
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('memoryId', '==', memory.id));
        const eventsSnap = await getDocs(q);
        
        const deleteOps = eventsSnap.docs.map(d => deleteDoc(doc(db, 'events', d.id)));
        
        // Also check if there's a direct calendarEventId stored
        if ((memory as any).calendarEventId) {
          deleteOps.push(deleteDoc(doc(db, 'events', (memory as any).calendarEventId)));
        }
        
        await Promise.all(deleteOps);
        console.log('[Sync] Memory and all related calendar entries deleted');
      } catch (syncErr) {
        console.warn('[Sync] Calendar cleanup partially failed:', syncErr);
      }

      setConfirmDelete(null);
      if (activeMemoryId === memory.id) setActiveMemoryId(null);
      
      // 3. Delete from Cloudinary
      if (memory.publicId) {
        await fetch(`/api/delete-media/${encodeURIComponent(memory.publicId)}`, {
          method: 'DELETE',
        }).catch(e => console.warn('Cloudinary delete fail:', e));
      }
      
    } catch (error: any) {
      console.error("Delete memory error:", error);
      alert('Gagal menghapus: ' + (error.message || "Izin ditolak"));
    }
  };

  const toggleReaction = async (memory: MemoryItem, emoji: string) => {
    if (!user) return alert('Silakan login untuk bereaksi!');
    
    // Optimistic Update
    const currentReactions = memory.reactions || {};
    const usersWhoReacted = currentReactions[emoji] || [];
    const hasReacted = usersWhoReacted.includes(user.uid);
    const newUsers = hasReacted 
      ? usersWhoReacted.filter(id => id !== user.uid)
      : [...usersWhoReacted, user.uid];

    // Update local state immediately for snappy feel
    const updatedMemory = {
      ...memory,
      reactions: {
        ...currentReactions,
        [emoji]: newUsers
      }
    };
    setMemories(prev => prev.map(m => m.id === memory.id ? updatedMemory : m));

    try {
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        [`reactions.${emoji}`]: newUsers
      });
    } catch (err) {
      console.error('Reaction error:', err);
      // Revert if error
      setMemories(prev => prev.map(m => m.id === memory.id ? memory : m));
    }
  };

  const toggleLike = async (memory: MemoryItem) => {
    if (!user) return alert('Silakan login untuk memberikan like!');
    
    // Optimistic Update
    const hasLiked = memory.likes?.includes(user.uid);
    const newLikes = hasLiked 
      ? memory.likes.filter(id => id !== user.uid)
      : [...(memory.likes || []), user.uid];

    const updatedMemory = { ...memory, likes: newLikes };
    setMemories(prev => prev.map(m => m.id === memory.id ? updatedMemory : m));

    try {
      const memoryRef = doc(db, 'memories', memory.id);
      await updateDoc(memoryRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error('Like error:', err);
      // Revert if error
      setMemories(prev => prev.map(m => m.id === memory.id ? memory : m));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Memuat Memories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Memory Stage Overlay */}
      <AnimatePresence>
        {stageMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#070e15] flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
               <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
            </div>

            <button 
              onClick={() => setStageMode(false)}
              className="absolute top-8 right-8 z-[310] w-12 h-12 bg-white/10 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-white/20 flex items-center justify-center border border-white/10 transition-all"
            >
              <X size={24} />
            </button>

            <div className="relative z-10 text-center mb-12 pointer-events-none">
               <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-[10px] font-black uppercase tracking-[6px] text-blue-400 mb-4"
               >
                 Intersolid · Class Memories
               </motion.div>
               <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-serif text-5xl md:text-7xl text-white font-bold leading-tight"
               >
                 Momen <em className="text-blue-500 not-italic">Terbaik</em><br />Kita Bersama
               </motion.h2>
               <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-white text-xs mt-6 font-medium tracking-wider"
               >
                 MEMUTAR KILAS BALIK OTOMATIS...
               </motion.p>
            </div>

            {/* Floating Memories Stage */}
            <div className="absolute inset-0 z-0 overflow-hidden" onClick={() => setStageMode(false)}>
               {memories.length > 0 ? (
                 // Visualizing up to 20 memories for a full scattered effect
                 memories.slice(0, 20).map((m, i) => (
                   <MemoryFloat key={`${m.id}-float`} memory={m} index={i} onClick={() => setActiveMemoryId(m.id)} />
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center h-full text-white/20">
                   <ImageIcon size={64} className="mb-4" />
                   <p className="font-bold uppercase tracking-widest">Belum ada kenangan untuk ditampilkan</p>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMemory && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 backdrop-blur-2xl bg-black/95 md:bg-black/90"
              onClick={() => setActiveMemoryId(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full h-full md:max-w-6xl md:max-h-[90vh] bg-[#0a1118] md:rounded-[48px] border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button Inside Modal */}
              <button 
                onClick={() => setActiveMemoryId(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-[610] w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 md:bg-white/5 backdrop-blur-md text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 md:border-white/5"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>

              {/* Media View */}
              <div className="w-full md:flex-1 shrink-0 bg-black flex items-center justify-center relative group/media aspect-square md:aspect-auto">
                {activeMemory.type === 'image' ? (
                  <img src={activeMemory.url} className="w-full h-full object-contain" alt="" />
                ) : (
                  <video src={activeMemory.url} controls autoPlay className="w-full h-full object-contain" />
                )}
                
                {/* Floating Emojis Menu */}
                <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 md:p-2 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full opacity-0 group-hover/media:opacity-100 transition-all duration-300 overflow-x-auto no-scrollbar max-w-[90vw]">
                  {EMOJI_LIST.map(emoji => {
                    const reactors = activeMemory.reactions?.[emoji] || [];
                    const isMyReaction = reactors.includes(user?.uid || '');
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(activeMemory, emoji)}
                        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-base md:text-lg transition-all hover:scale-125 ${isMyReaction ? 'bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/20' : 'hover:bg-white/10'}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar - Details & Comments */}
              <div className="w-full md:w-[380px] h-auto md:h-full flex flex-col bg-[#0d161f] border-t md:border-t-0 md:border-l border-white/5 overflow-hidden">
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                   <div className="flex items-center gap-3 md:gap-4">
                      <img src={activeMemory.userPhoto} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border border-blue-500/30" alt="" />
                      <div className="text-left">
                         <p className="text-xs md:text-sm font-black text-white uppercase tracking-[2px]">{activeMemory.userName}</p>
                         <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider">{activeMemory.createdAt?.toDate ? activeMemory.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Baru Saja'}</p>
                      </div>
                   </div>

                   <div className="space-y-2 md:space-y-3">
                      <h4 className="text-lg md:text-xl font-serif font-bold text-white leading-tight">{activeMemory.title || 'Momen Berharga'}</h4>
                      <p className="text-xs md:text-sm text-white/70 font-medium italic leading-relaxed">
                        "{activeMemory.caption || 'Kenangan manis tanpa kata-kata'}"
                      </p>
                   </div>

                   <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(activeMemory.reactions || {}).map(([emoji, uids]) => {
                        const reactorIds = uids as any[];
                        if (reactorIds.length === 0) return null;
                        return (
                          <div key={emoji} className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                            <span className="text-sm">{emoji}</span>
                            <span className="text-[10px] font-black text-blue-400">{reactorIds.length}</span>
                          </div>
                        );
                      })}
                   </div>

                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleLike(activeMemory)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${activeMemory.likes?.includes(user?.uid || '') ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                         <Heart size={14} fill={activeMemory.likes?.includes(user?.uid || '') ? 'currentColor' : 'none'} />
                         {activeMemory.likes?.length || 0} Likes
                      </button>
                      <a 
                        href={activeMemory.url} 
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all border border-white/5"
                      >
                         Download
                      </a>
                   </div>

                   {/* Commends Integrated in Sidebar */}
                   <div className="pt-6 border-t border-white/5">
                      <CommentSection memoryId={activeMemory.id} user={user} />
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-serif text-3xl font-bold">Galeri Memories</h3>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold opacity-60">Dokumentasi perjalanan & kebersamaan kita</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-200 dark:border-white/5 mr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
              title="Tampilan Grid"
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('warehouse')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'warehouse' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
              title="Gudang Memories (3D)"
            >
              <Box size={18} />
            </button>
          </div>

          <button 
            onClick={() => setStageMode(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/5 group"
          >
            <Sparkles size={16} className="group-hover:animate-spin" /> Kilas Memories
          </button>
          <button 
            onClick={() => setShowUpload(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold text-xs hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> Bagikan Momen
          </button>
        </div>
      </div>

      {viewMode === 'warehouse' ? (
        <div className="w-full aspect-[4/3] md:aspect-[21/9] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl relative">
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-1 items-start">
            <div className="px-4 py-1.5 bg-blue-500 rounded-full text-[8px] font-black uppercase text-white tracking-[2px] shadow-lg shadow-blue-500/40">Gudang Memories</div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 ml-4">Putar Dunia Untuk Mencari Kenangan</p>
          </div>
          <InfiniteMenu 
            items={memories.map(m => ({
              image: m.url,
              title: m.title || 'Momen Berharga',
              description: m.displayDate ? new Date(m.displayDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : m.caption,
              id: m.id,
              raw: m
            }))} 
            scale={0.8}
            onOpenItem={(item) => setActiveMemoryId(item.id)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map((m) => (
            <div key={m.id} className="group bg-white dark:bg-[#1a252f] rounded-[32px] overflow-hidden border border-blue-50 dark:border-blue-900/20 shadow-sm hover:shadow-xl transition-all duration-500">
              <div 
                className="relative aspect-square overflow-hidden cursor-zoom-in"
                onClick={() => setActiveMemoryId(m.id)}
              >
                {m.type === 'image' ? (
                  <img 
                    src={m.url} 
                    alt={m.caption} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <video 
                    src={m.url} 
                    className="w-full h-full object-cover" 
                    controls 
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-3">
                    <img src={m.userPhoto} className="w-8 h-8 rounded-full border-2 border-white/50" alt="" />
                    <div className="text-white">
                      <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1">{m.userName}</p>
                      <p className="text-[9px] opacity-70">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('id-ID') : 'Baru Saja'}</p>
                    </div>
                  </div>
                </div>

                {(isAdmin || user?.uid === m.userId) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(m);
                    }}
                    className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="p-6">
                <p className="text-sm font-medium mb-4 line-clamp-2 italic text-gray-700 dark:text-gray-300">
                  "{m.caption || 'Tanpa keterangan'}"
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleLike(m)}
                      className={`flex items-center gap-2 text-xs font-bold transition-all px-3 py-1.5 rounded-full ${m.likes?.includes(user?.uid || '') ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <Heart size={14} fill={m.likes?.includes(user?.uid || '') ? 'currentColor' : 'none'} />
                      {m.likes?.length || 0}
                    </button>

                    <div className="flex -space-x-1">
                      {Object.entries(m.reactions || {}).slice(0, 3).map(([emoji, uids]) => {
                      const reactorIds = uids as any[];
                      return reactorIds.length > 0 && <span key={emoji} className="text-sm drop-shadow-sm">{emoji}</span>
                    })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-300">
                    {m.type === 'image' ? <ImageIcon size={14} /> : <Video size={14} />}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {memories.length === 0 && (
        <div className="bg-white dark:bg-[#1a252f] rounded-[40px] p-20 text-center border-2 border-dashed border-blue-50 dark:border-blue-900/10">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ImageIcon size={40} className="text-blue-500" />
          </div>
          <h4 className="font-serif text-2xl font-bold mb-2">Belum Ada Memories</h4>
          <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto italic">Jadilah yang pertama membagikan momen berharga kelas kita!</p>
          <button 
            onClick={() => setShowUpload(true)}
            className="px-8 py-3 bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20"
          >
            Mulai Bagikan
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => !uploading && setShowUpload(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl border border-blue-100 dark:border-blue-900/30"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-serif text-2xl font-bold">Bagikan Memories</h3>
                  {!uploading && (
                    <button 
                      onClick={() => setShowUpload(false)} 
                      className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X size={20}/>
                    </button>
                  )}
                </div>

              <div className="space-y-6">
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 group cursor-pointer transition-all ${
                    previewUrl 
                      ? 'border-blue-500' 
                      : isDragging 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02] shadow-2xl shadow-blue-500/10' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-blue-300'
                  }`}
                >
                  {previewUrl ? (
                    <div className="absolute inset-0 p-2">
                       {selectedFile?.type.startsWith('image/') ? (
                         <img src={previewUrl} className="w-full h-full object-cover rounded-2xl" alt="" />
                       ) : (
                         <video src={previewUrl} className="w-full h-full object-cover rounded-2xl" />
                       )}
                       {!uploading && (
                         <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl shadow-lg"
                         >
                           <X size={16} />
                         </button>
                       )}
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Klik / Taruh File Disini</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase">Maksimal 20MB (Foto/Video Pendek)</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*" 
                    onChange={handleFileSelect} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-2">Judul Memori</label>
                    <input 
                      type="text"
                      placeholder="Contoh: Bukber Kelas..."
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      disabled={uploading}
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-2">Tanggal Kejadian</label>
                    <input 
                      type="date"
                      value={displayDate}
                      onChange={e => setDisplayDate(e.target.value)}
                      disabled={uploading}
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block ml-2">Deskripsi / Cerita</label>
                  <textarea 
                    placeholder="Tuliskan cerita singkat dibalik momen ini..."
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    disabled={uploading}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none h-24"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                    <div className="flex gap-2">
                       <ShieldAlert size={16} className="text-red-500 shrink-0" />
                       <div className="space-y-1">
                         <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Gagal Mengunggah</p>
                         <p className="text-xs text-red-600/80 dark:text-red-400 leading-relaxed font-medium">{error}</p>
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="w-full relative overflow-hidden py-5 bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-600 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                >
                  <div 
                    className="absolute inset-0 bg-blue-600/50 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <div className="relative flex items-center gap-3">
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        {uploadStatus === 'compressing' ? `Mengompres... (${uploadProgress}%)` : `Mengunggah... (${uploadProgress}%)`}
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Publikasikan Sekarang
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-[#1a252f] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-blue-100 dark:border-blue-900/30 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">Kenangan ini akan dihapus permanen</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  faqeee
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
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
