import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Video, Upload, Trash2, Edit2, X, Plus, Loader2, Sparkles, User, Play, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { db, logPortalActivity, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface VideoProfile {
  id: string;
  name: string;
  role: string;
  videoUrl: string;
  publicId?: string;
  userId: string;
  createdAt: string;
}

export default function VideoProfiles({ user, isAdmin }: { user: any, isAdmin: boolean }) {
  const [profiles, setProfiles] = useState<VideoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null); // profile ID being edited

  const [activeProfile, setActiveProfile] = useState<VideoProfile | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current user already has a video profile
  const myProfile = profiles.find(p => p.userId === user?.uid);

  useEffect(() => {
    const q = query(collection(db, 'video_profiles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as VideoProfile));
      setProfiles(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load video profiles:", error);
      handleFirestoreError(error, OperationType.LIST, 'video_profiles');
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      (window as any).showAppAlert?.('Bukan Video', 'Harap pilih file video (MP4, WebM)!', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) { // 25MB max
      (window as any).showAppAlert?.('File Terlalu Besar', 'Maksimal ukuran video adalah 25MB.', 'error');
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

    if (!file.type.startsWith('video/')) {
      (window as any).showAppAlert?.('Format Ditolak', 'Hanya diperbolehkan format video!', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      (window as any).showAppAlert?.('File Terlalu Besar', 'Maksimal ukuran video adalah 25MB.', 'error');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      (window as any).showAuthError?.('unauthenticated');
      return;
    }

    if (!name.trim() || !role.trim()) {
      (window as any).showAppAlert?.('Form Belum Lengkap', 'Nama dan Peran wajib diisi!', 'info');
      return;
    }

    if (!selectedFile && !isEditing) {
      (window as any).showAppAlert?.('Video Kosong', 'Harap pilih atau unggah video profil Anda!', 'info');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      let finalVideoUrl = '';
      let finalPublicId = '';

      if (selectedFile) {
        setUploadProgress(30);
        // Direct Cloudinary Upload matching original memory asset preset
        const cloudName = 'deemvhgg4'; 
        const uploadPreset = 'intersolid';
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'intersolid_video_profiles');

        setUploadProgress(50);
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Gagal mengunggah video ke Cloudinary');
        }

        const result = await response.json();
        finalVideoUrl = result.secure_url;
        finalPublicId = result.public_id;
      }

      setUploadProgress(85);

      if (isEditing) {
        // Edit existing profile
        const updateData: any = {
          name: name.trim(),
          role: role.trim()
        };
        if (finalVideoUrl) {
          updateData.videoUrl = finalVideoUrl;
          updateData.publicId = finalPublicId;
        }

        await updateDoc(doc(db, 'video_profiles', isEditing), updateData);
        logPortalActivity('profile_update', `Updated profile card for ${name}`, user);
        (window as any).showAppAlert?.('Berhasil', 'Video profil Anda berhasil diperbarui!', 'success');
      } else {
        // Add new profile
        const newProfileRef = doc(collection(db, 'video_profiles'));
        await setDoc(newProfileRef, {
          name: name.trim(),
          role: role.trim(),
          videoUrl: finalVideoUrl,
          publicId: finalPublicId,
          userId: user.uid,
          createdAt: new Date().toISOString()
        });
        logPortalActivity('profile_create', `Created profile card for ${name}`, user);
        (window as any).showAppAlert?.('Berhasil', 'Video profil Anda sukses diunggah!', 'success');
      }

      // Reset form states
      setShowForm(false);
      setIsEditing(null);
      setName('');
      setRole('');
      setSelectedFile(null);
      setPreviewUrl(null);

    } catch (err: any) {
      console.error("Profile save error:", err);
      (window as any).showAppAlert?.('Gagal Mengunggah', err.message || 'Terjadi gangguan jaringan saat menyimpan profil.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteProfile = async (profile: VideoProfile) => {
    if (!user) return;
    
    // Authorization check
    if (profile.userId !== user.uid && !isAdmin) {
      (window as any).showAuthError?.('unauthorized');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus kartu video profil dari "${profile.name}"?`)) {
      try {
        // 1. Delete from Firestore
        await deleteDoc(doc(db, 'video_profiles', profile.id));
        
        // 2. Delete from Cloudinary asynchronously
        if (profile.publicId) {
          fetch(`/api/delete-media/${profile.publicId}`, { method: 'DELETE' })
            .catch(e => console.error("Cloudinary asset deletion failed:", e));
        }

        logPortalActivity('profile_delete', `Deleted video profile of ${profile.name}`, user);
        (window as any).showAppAlert?.('Terhapus', 'Kartu video profil berhasil dihapus.', 'success');
      } catch (err: any) {
        console.error("Failed to delete profile:", err);
        (window as any).showAppAlert?.('Gagal', 'Terjadi kesalahan sistem.', 'error');
      }
    }
  };

  const handleEditTrigger = (profile: VideoProfile) => {
    setIsEditing(profile.id);
    setName(profile.name);
    setRole(profile.role);
    setPreviewUrl(profile.videoUrl);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Intro Dashboard */}
      <div className="bg-white dark:bg-[#141e26] p-6 rounded-[2rem] border border-blue-50 dark:border-blue-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="font-serif text-2xl font-bold flex items-center gap-2">
            Video Profile Directory <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Galeri interaktif 10-detik perkenalan mahasiswa kelas InterSolid. Unggah video pendekmu dan buat bento card kreatifmu sendiri!
          </p>
        </div>

        {/* Action Button */}
        <div>
          {!user ? (
            <button
              onClick={() => (window as any).showAuthError?.('unauthenticated')}
              className="px-6 py-3.5 bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Unggah Profil Saya
            </button>
          ) : myProfile && !showForm ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleEditTrigger(myProfile)}
                className="px-5 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all"
              >
                <Edit2 className="w-4 h-4" /> Edit Profil Saya
              </button>
              <button
                onClick={() => handleDeleteProfile(myProfile)}
                className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-500 rounded-2xl transition-all"
                title="Hapus Profil Saya"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : !showForm ? (
            <button
              onClick={() => {
                setIsEditing(null);
                setName(user.displayName || '');
                setRole('');
                setSelectedFile(null);
                setPreviewUrl(null);
                setShowForm(true);
              }}
              className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/10 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Unggah Profil Saya
            </button>
          ) : (
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all"
            >
              <X className="w-4 h-4" /> Batal
            </button>
          )}
        </div>
      </div>

      {/* Upload/Edit Form Drawer */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSaveProfile}
              className="bg-white dark:bg-[#141e26] p-6 rounded-[2.5rem] border border-blue-50 dark:border-blue-900/15 space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-800">
                <Video className="w-5 h-5 text-blue-500" />
                <h4 className="font-serif font-bold text-lg">
                  {isEditing ? 'Perbarui Video Profil' : 'Daftarkan Profil Video Baru'}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Contoh: Farhan Priyouse"
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-blue-50/20 dark:border-blue-900/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[#1f2b36] dark:text-[#ddeaf2] font-semibold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Peran / Julukan di Kelas</label>
                    <input
                      type="text"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      placeholder="Contoh: Dubes Anti-Tugas, Menteri Seblak"
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-blue-50/20 dark:border-blue-900/5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[#1f2b36] dark:text-[#ddeaf2] font-semibold text-sm"
                    />
                    <span className="text-[10px] text-gray-400 mt-1.5 block">Berikan julukan terlucu atau peran resmi kamu di pengurusan kelas.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sedang Mengunggah ({uploadProgress}%)
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Simpan Bento Card Profil
                      </>
                    )}
                  </button>
                </div>

                {/* Video Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Video Profil (Maks 10 Detik)</label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-[200px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-500/5' 
                        : previewUrl 
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-blue-500/40 dark:hover:border-blue-500/20'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="video/*"
                      className="hidden"
                    />

                    {previewUrl ? (
                      <div className="w-full h-full relative rounded-3xl overflow-hidden p-2">
                        <video src={previewUrl} className="w-full h-full object-cover rounded-2xl" muted playsInline loop autoPlay />
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-bold text-white uppercase">
                          Pratinjau Video
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center mx-auto text-blue-500">
                          <Upload className="w-5 h-5 animate-pulse" />
                        </div>
                        <p className="text-xs font-bold">Tarik & lepas file video di sini, atau klik untuk memilih</p>
                        <p className="text-[10px] text-gray-400">Rekomendasi durasi: 5-10 detik. Maks 25MB.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest font-bold">Membuka lemari arsip video...</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#141e26] rounded-[2rem] border border-blue-50 dark:border-blue-900/10 p-8 space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center mx-auto text-blue-500">
            <Video className="w-8 h-8" />
          </div>
          <h4 className="font-serif text-xl font-bold">Arsip Masih Kosong</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            Belum ada mahasiswa yang mengunggah video perkenalannya. Jadilah yang pertama yang memecahkan kesunyian ini!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {profiles.map((profile) => (
              <motion.div
                key={profile.id}
                layoutId={`card-${profile.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white dark:bg-[#141e26] rounded-[2.5rem] border border-blue-50 dark:border-blue-900/10 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-500/[0.03] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Loop Video Card */}
                <div className="h-[280px] bg-gray-100 dark:bg-gray-950 relative overflow-hidden">
                  <video
                    src={profile.videoUrl}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 flex flex-col justify-between p-6">
                    {/* Top badging */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white px-3 py-1 rounded-full shadow-sm select-none">
                        Student Card
                      </span>
                      
                      {/* Trash action for Admin or Creator */}
                      {(isAdmin || profile.userId === user?.uid) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(profile);
                          }}
                          className="p-2 bg-black/40 hover:bg-red-500/90 hover:scale-105 rounded-xl text-white transition-all shadow-md backdrop-blur-sm"
                          title="Hapus Video Profil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Centered Play overlay */}
                    <button
                      onClick={() => {
                        setActiveProfile(profile);
                        setIsMuted(false);
                      }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
                      </div>
                    </button>

                    {/* Bottom Metadata */}
                    <div className="space-y-1 select-none">
                      <h4 className="font-serif text-lg font-bold text-white truncate">{profile.name}</h4>
                      <p className="text-xs font-bold text-blue-400 tracking-wide truncate uppercase">{profile.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Immersive Fullscreen Lightbox Player */}
      <AnimatePresence>
        {activeProfile && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Background Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProfile(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Main Player Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#141e26] rounded-[36px] overflow-hidden border border-white/10 shadow-2xl z-10"
            >
              {/* Top controls inside modal */}
              <div className="absolute top-6 inset-x-6 z-20 flex items-center justify-between pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest text-white uppercase">Active Audition</span>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 bg-black/50 hover:bg-black/80 rounded-xl text-white transition-all backdrop-blur-md"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setActiveProfile(null)}
                    className="p-3 bg-black/50 hover:bg-red-500 rounded-xl text-white transition-all backdrop-blur-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Full height Video Player */}
              <div className="h-[480px] bg-black">
                <video
                  src={activeProfile.videoUrl}
                  className="w-full h-full object-contain"
                  autoPlay
                  controls={false}
                  loop
                  muted={isMuted}
                  playsInline
                />
              </div>

              {/* Footer details */}
              <div className="p-8 bg-gradient-to-t from-black/80 to-[#141e26] border-t border-white/5 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl font-bold text-white leading-tight">{activeProfile.name}</h3>
                  <p className="text-sm font-extrabold text-blue-400 tracking-wider uppercase">{activeProfile.role}</p>
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ID Terdaftar</p>
                    <p className="text-xs font-mono text-gray-200 mt-0.5 truncate max-w-[250px]">{activeProfile.userId}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
