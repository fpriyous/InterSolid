import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Bell, 
  FileText, 
  Vote, 
  MessageSquare, 
  RotateCw, 
  CheckCircle2, 
  Lock, 
  ShieldAlert, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Mic, 
  MicOff, 
  ChevronRight, 
  Loader2, 
  Table, 
  LayoutTemplate, 
  Copy, 
  Check, 
  Edit3, 
  Compass, 
  HelpCircle, 
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, logPortalActivity } from '../lib/firebase';
import { collection, addDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';

export interface AIBypassChatProps {
  user: User | null;
  isAdmin: boolean;
  isDewa: boolean;
  activePage: string;
  setActivePage: (page: string, targetId?: string | null) => void;
  onOpenAdminModal?: () => void;
}

interface ActionPayload {
  type: 'create_event' | 'create_announcement' | 'create_note' | 'create_poll' | 'create_aspirasi' | 'create_absen_table' | 'navigate_to' | 'spin_wheel';
  title?: string;
  description?: string;
  requiresAdmin?: boolean;
  requiresAuth?: boolean;
  payload?: any;
  status?: 'pending' | 'executing' | 'success' | 'error' | 'permission_denied';
  errorMsg?: string;
  resultId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: ActionPayload[];
  suggestedNavigation?: string | null;
  quickSuggestions?: string[];
  templateCode?: string;
}

interface PresetTemplate {
  id: string;
  title: string;
  category: string;
  icon: any;
  color: string;
  badge: string;
  requiresAdmin: boolean;
  description: string;
  rawTemplate: string;
  samplePrompt: string;
  fields: { key: string; label: string; placeholder?: string; type?: string; options?: string[]; default?: string }[];
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'template_event',
    title: 'Jadwal & Agenda Kalender',
    category: 'Kalender',
    icon: CalendarIcon,
    color: 'from-blue-500 to-indigo-600',
    badge: 'Semua Anggota',
    requiresAdmin: false,
    description: 'Menambahkan jadwal kuliah, tenggat tugas, ujian, atau event ke kalender kelas.',
    rawTemplate: '[Jadwal]\nJudul: [Nama Jadwal / Tugas / Ujian]\nTanggal: [YYYY-MM-DD atau Contoh: Besok / 28 Agustus 2026]\nJam: [08:00 - 10:00 WIB]\nKategori: [tugas / uts / event / libur / materi / memory / lainnya]\nKeterangan: [Ruang kelas, link tugas, atau info tambahan]',
    samplePrompt: 'Buatkan jadwal Ujian Teori Hubungan Internasional tanggal 28 Agustus 2026 jam 08.00 - 10.00 WIB di Ruang B304 kategori uts keterangan bab 1-5',
    fields: [
      { key: 'title', label: 'Judul Jadwal / Kegiatan', placeholder: 'Contoh: Ujian Tengah Semester HI' },
      { key: 'date', label: 'Tanggal Pelaksanaan', placeholder: 'YYYY-MM-DD (Contoh: 2026-08-28 atau Besok)', default: new Date().toISOString().split('T')[0] },
      { key: 'time', label: 'Waktu / Jam', placeholder: 'Contoh: 08:00 - 10:00 WIB', default: '08:00 - 10:00 WIB' },
      { 
        key: 'genre', 
        label: 'Kategori Agenda', 
        placeholder: 'Pilih kategori', 
        type: 'select', 
        options: ['tugas', 'uts', 'event', 'libur', 'materi', 'memory', 'lainnya'],
        default: 'tugas'
      },
      { key: 'note', label: 'Keterangan Tambahan', placeholder: 'Contoh: Ruang B304, bawa kartu ujian' }
    ]
  },
  {
    id: 'template_announcement',
    title: 'Pengumuman Resmi Kelas',
    category: 'Pengumuman',
    icon: Bell,
    color: 'from-amber-500 to-orange-600',
    badge: 'Admin Only',
    requiresAdmin: true,
    description: 'Mempublikasikan pengumuman penting untuk seluruh mahasiswa kelas.',
    rawTemplate: '[Pengumuman]\nJudul: [Judul Pengumuman]\nPrioritas: [high / medium / low]\nIsi: [Tuliskan isi detail pengumuman resmi di sini]',
    samplePrompt: 'Bikin pengumuman resmi kelas judul: Perubahan Jadwal Kuliah Diplomasi, prioritas: high, isi: Kuliah hari Kamis dipindah ke hari Jumat pukul 13.30 WIB di Lab HI.',
    fields: [
      { key: 'title', label: 'Judul Pengumuman', placeholder: 'Contoh: Perubahan Jadwal Kuliah Diplomasi' },
      { 
        key: 'priority', 
        label: 'Tingkat Prioritas', 
        type: 'select', 
        options: ['high', 'medium', 'low'],
        default: 'medium'
      },
      { key: 'content', label: 'Isi Lengkap Pengumuman', placeholder: 'Tuliskan detail pengumuman yang ingin disampaikan ke seluruh kelas...', type: 'textarea' }
    ]
  },
  {
    id: 'template_note',
    title: 'Notulensi & Catatan Rapat',
    category: 'Notulensi',
    icon: FileText,
    color: 'from-purple-500 to-indigo-600',
    badge: 'Semua Anggota',
    requiresAdmin: false,
    description: 'Menyimpan rangkuman rapat, resume materi kuliah, atau proker organisasi.',
    rawTemplate: '[Notulensi]\nJudul: [Judul Rapat / Resume Materi]\nTag: [Rapat / Kuliah / Proker / Evaluasi / Akademik]\nPoin-poin:\n- [Poin pembahasan 1]\n- [Poin pembahasan 2]\n- [Kesimpulan / Action Items]',
    samplePrompt: 'Buat notulensi rapat evaluasi proker bakti sosial, tag: Proker, poin-poin: 1. Target dana tercapai 100%, 2. Publikasi video recap selesai minggu depan, 3. Laporan LPJ diserahkan ke Dosen Pembina.',
    fields: [
      { key: 'title', label: 'Judul Notulensi / Materi', placeholder: 'Contoh: Rapat Evaluasi Program Kerja Baksos' },
      { 
        key: 'tag', 
        label: 'Kategori / Tag', 
        type: 'select', 
        options: ['Rapat', 'Kuliah', 'Proker', 'Evaluasi', 'Akademik', 'Umum'],
        default: 'Rapat'
      },
      { key: 'content', label: 'Poin-poin Pembahasan', placeholder: '1. Pembahasan timeline\n2. Pembagian divisi kerja\n3. Target selesai akhir bulan', type: 'textarea' }
    ]
  },
  {
    id: 'template_poll',
    title: 'Voting & Polling Kelas',
    category: 'Voting',
    icon: Vote,
    color: 'from-emerald-500 to-teal-600',
    badge: 'Semua Anggota',
    requiresAdmin: false,
    description: 'Membuat pemungutan suara instan dengan berbagai opsi pilihan.',
    rawTemplate: '[Voting]\nPertanyaan: [Pertanyaan voting kelas]\nOpsi Pilihan:\n1. [Opsi Pertama]\n2. [Opsi Kedua]\n3. [Opsi Ketiga (Opsional)]',
    samplePrompt: 'Buat voting baru pertanyaan: "Dimana lokasi makrab kelas semester ini?", opsi: "Pantai Indah", "Villa Puncak", "Kafe Rooftop"',
    fields: [
      { key: 'question', label: 'Pertanyaan Voting', placeholder: 'Contoh: Mau pesan hoodie kelas warna apa?' },
      { key: 'opt1', label: 'Opsi Pilihan 1', placeholder: 'Contoh: Biru Navy (InterSolid)', default: 'Navy Blue' },
      { key: 'opt2', label: 'Opsi Pilihan 2', placeholder: 'Contoh: Hitam Carbon', default: 'Carbon Black' },
      { key: 'opt3', label: 'Opsi Pilihan 3 (Opsional)', placeholder: 'Contoh: Hijau Sage' }
    ]
  },
  {
    id: 'template_aspirasi',
    title: 'Aspirasi Anonim (Yapping)',
    category: 'Aspirasi',
    icon: MessageSquare,
    color: 'from-pink-500 to-rose-600',
    badge: 'Anonim & Bebas',
    requiresAdmin: false,
    description: 'Mengirimkan pesan curhat, saran, atau feedback ke Yapping Wall secara anonim.',
    rawTemplate: '[Aspirasi]\nPesan: [Tuliskan unek-unek / saran / pesan anonim]\nStiker: [🔥 / ❤️ / 👍 / 🙌 / 😂 / ✨ / vector_rocket / vector_neko]',
    samplePrompt: 'Kirim aspirasi anonim pesan: "Semangat ya teman-teman yang lagi ngerjain tugas makalah Teori HI, jangan lupa istirahat!" stiker: 🔥',
    fields: [
      { key: 'text', label: 'Pesan / Unek-unek Anonim', placeholder: 'Ketik pesan anonim kamu dengan sopan...', type: 'textarea' },
      { 
        key: 'sticker', 
        label: 'Pilih Stiker', 
        type: 'select', 
        options: ['🔥', '❤️', '👍', '🙌', '😂', '✨', 'vector_rocket', 'vector_heart', 'vector_coffee', 'vector_party', 'vector_fire', 'vector_neko', 'vector_ghost'],
        default: '🔥'
      }
    ]
  },
  {
    id: 'template_table',
    title: 'Tabel Absensi / Kas Digital',
    category: 'Absensi & Kas',
    icon: Table,
    color: 'from-indigo-500 to-cyan-600',
    badge: 'Semua Anggota',
    requiresAdmin: false,
    description: 'Membuat lembar tabel baru untuk pencatatan absensi kegiatan atau keuangan.',
    rawTemplate: '[Tabel]\nNama Tabel: [Nama kegiatan absensi atau kas kelas]',
    samplePrompt: 'Buatkan tabel absensi baru dengan nama: "Absensi Rapat Kerja Semester Genap"',
    fields: [
      { key: 'name', label: 'Nama Tabel Baru', placeholder: 'Contoh: Absensi Kunjungan Studi Diplomasi' }
    ]
  },
  {
    id: 'template_spin',
    title: 'Spin Wheel Undian Kelas',
    category: 'Games & Undian',
    icon: RotateCw,
    color: 'from-sky-500 to-blue-600',
    badge: 'Instan',
    requiresAdmin: false,
    description: 'Mengacak giliran presentasi atau doorprize untuk seluruh anggota kelas.',
    rawTemplate: '[Spin]\nPutar undian kelas sekarang',
    samplePrompt: 'Putar undian spin wheel kelas untuk menentukan giliran presentasi pertama',
    fields: []
  },
  {
    id: 'template_navigate',
    title: 'Navigasi Langsung ke Fitur',
    category: 'Navigasi',
    icon: Compass,
    color: 'from-slate-600 to-slate-800',
    badge: 'Pintas UI',
    requiresAdmin: false,
    description: 'Membuka langsung halaman fitur platform yang kamu inginkan.',
    rawTemplate: '[Navigasi]\nBuka halaman: [kalender / pengumuman / voting / notulensi / aspirasi / absen / spin / study / memory / profiles / interlingo]',
    samplePrompt: 'Buka halaman kalender kelas',
    fields: [
      { 
        key: 'page', 
        label: 'Pilih Halaman Tujuan', 
        type: 'select', 
        options: ['kalender', 'pengumuman', 'voting', 'notulensi', 'aspirasi', 'absen', 'spin', 'study', 'memory', 'profiles', 'interlingo'],
        default: 'kalender'
      }
    ]
  }
];

export default function AIBypassChat({
  user,
  isAdmin,
  isDewa,
  activePage,
  setActivePage,
  onOpenAdminModal
}: AIBypassChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeGuidedTemplate, setActiveGuidedTemplate] = useState<PresetTemplate | null>(null);
  const [guidedFormValues, setGuidedFormValues] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('IS_aiBypassMessages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        text: 'Halo! Aku **InterBypass AI**, asisten eksekutor otomatis portal InterSolid. Kamu bisa memerintahkan apa saja lewat obrolan teks bebas, atau gunakan **Template Perintah** di atas agar parameternya rapi dan jelas!',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        quickSuggestions: [
          '📋 Buka Template Perintah',
          '📅 Buat jadwal tugas kelompok',
          '📢 Bikin pengumuman penting',
          '🗳️ Buat voting lokasi makrab'
        ]
      }
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    localStorage.setItem('IS_aiBypassMessages', JSON.stringify(messages.slice(-30)));
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      (window as any).showAppAlert?.('Fitur Tidak Didukung', 'Browser Anda belum mendukung input suara Web Speech API.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleClearHistory = () => {
    const freshWelcome: ChatMessage = {
      id: 'welcome-reset',
      role: 'assistant',
      text: 'Riwayat obrolan telah dibersihkan. Apa yang ingin kamu jadwalkan atau jalankan berikutnya di platform ini? Klik tombol **Template** jika ingin format siap pakai!',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      quickSuggestions: [
        '📋 Buka Template Perintah',
        'Buat jadwal kelas minggu ini',
        'Bikinin pengumuman resmi'
      ]
    };
    setMessages([freshWelcome]);
  };

  // Execute an action on the client side using Firestore & App state
  const executeAction = async (action: ActionPayload): Promise<{ success: boolean; error?: string; resultId?: string }> => {
    const effectiveAdmin = isAdmin || isDewa;

    // Check Auth requirement
    if (action.requiresAuth && !user) {
      return { 
        success: false, 
        error: 'AUTH_REQUIRED' 
      };
    }

    // Check Admin requirement
    if (action.requiresAdmin && !effectiveAdmin) {
      return { 
        success: false, 
        error: 'ADMIN_REQUIRED' 
      };
    }

    try {
      switch (action.type) {
        case 'create_event': {
          const { title, genre = 'tugas', date, time = '', note = '' } = action.payload || {};
          if (!title || !date) throw new Error('Judul dan tanggal wajib diisi');

          const eventData = {
            title: title.trim(),
            genre: genre.toLowerCase(),
            date: date.trim(),
            time: time.trim(),
            note: note.trim(),
            authorId: user ? user.uid : 'anonymous',
            createdAt: Timestamp.now()
          };

          const docRef = await addDoc(collection(db, 'events'), eventData);
          logPortalActivity('event_create', `AI Bypass: Jadwal "${title}" pada ${date}`, user);
          return { success: true, resultId: docRef.id };
        }

        case 'create_announcement': {
          const { title, content, priority = 'medium' } = action.payload || {};
          if (!title || !content) throw new Error('Judul dan isi pengumuman wajib diisi');

          const annData = {
            title: title.trim(),
            content: content.trim(),
            priority: priority,
            authorId: user ? user.uid : 'admin',
            authorName: user?.displayName || 'Admin Kelas',
            authorPhoto: user?.photoURL || '',
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            createdAt: Timestamp.now()
          };

          const docRef = await addDoc(collection(db, 'announcements'), annData);
          logPortalActivity('announcement_create', `AI Bypass: Pengumuman "${title}"`, user);
          return { success: true, resultId: docRef.id };
        }

        case 'create_note': {
          const { title, content = '', htmlContent = '', tag = 'Umum', date } = action.payload || {};
          if (!title) throw new Error('Judul notulensi wajib diisi');

          const defaultHtml = htmlContent || `<p>${content.replace(/\n/g, '<br/>')}</p>`;
          const noteDate = date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

          const noteData = {
            title: title.trim(),
            content: content.trim() || title,
            htmlContent: defaultHtml,
            tag: tag.trim(),
            date: noteDate,
            authorId: user ? user.uid : 'member',
            createdAt: Timestamp.now()
          };

          const docRef = await addDoc(collection(db, 'notes'), noteData);
          logPortalActivity('note_create', `AI Bypass: Notulensi "${title}"`, user);
          return { success: true, resultId: docRef.id };
        }

        case 'create_poll': {
          const { question, options = ['Pilihan A', 'Pilihan B'] } = action.payload || {};
          if (!question) throw new Error('Pertanyaan voting wajib diisi');

          const pollRef = await addDoc(collection(db, 'polls'), {
            question: question.trim(),
            isActive: true,
            totalVotes: 0,
            authorId: user ? user.uid : 'member',
            createdAt: Timestamp.now()
          });

          // Insert subcollection options
          const batch = writeBatch(db);
          options.forEach((opt: string, idx: number) => {
            const optRef = doc(collection(db, 'polls', pollRef.id, 'options'));
            batch.set(optRef, {
              label: opt.trim() || `Opsi ${idx + 1}`,
              votes: 0,
              order: idx
            });
          });
          await batch.commit();

          logPortalActivity('poll_create', `AI Bypass: Polling "${question}"`, user);
          return { success: true, resultId: pollRef.id };
        }

        case 'create_aspirasi': {
          const { text, sticker = '🔥' } = action.payload || {};
          if (!text) throw new Error('Teks aspirasi wajib diisi');

          const docRef = await addDoc(collection(db, 'aspirasi'), {
            text: text.trim(),
            sticker: sticker,
            likes: 0,
            likedBy: [],
            reactions: {},
            userReactions: {},
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            authorId: user?.uid || null,
            authorName: user?.displayName || 'Anonim',
            createdAt: Timestamp.now()
          });

          logPortalActivity('aspirasi_create', `AI Bypass: Kirim Aspirasi Anonim`, user);
          return { success: true, resultId: docRef.id };
        }

        case 'create_absen_table': {
          const { name } = action.payload || {};
          if (!name) throw new Error('Nama tabel wajib diisi');

          const docRef = await addDoc(collection(db, 'absenTables'), {
            name: name.trim(),
            authorId: user ? user.uid : 'member',
            createdAt: Timestamp.now()
          });

          logPortalActivity('table_create', `AI Bypass: Tabel "${name}"`, user);
          return { success: true, resultId: docRef.id };
        }

        case 'navigate_to': {
          const page = action.payload?.page;
          if (page) {
            setActivePage(page);
          }
          return { success: true };
        }

        case 'spin_wheel': {
          const membersList = [
            'Bhintank Mi\'thori', 'Dimas Ardiansyah', 'Fatin Atikah', 
            'Ixmel Kaisa', 'Mahrezia Labidi', 'Nur Fika', 
            'Safira Fathia', 'Siti Nur Rahmawati', 'Ahmaddin Oemar', 'Ananda Rizki', 
            'Faiza Syan', 'Fauziyah Khansa', 'Kaisar El Kasyaf', 'Khadijah Zahra',
            'Munjidah Amalia', 'Najwa Alicia', 'Nidaan Khafiyya', 'Priyous Farrel', 
            'Raniah Naurah', 'Sabila Rahma', 'Shafiyyah', 'Shinta Anggraeni', 
            'Zadin Aisyah', 'Muhammad Naufal', 'Rafa Nureka', 'Ahmad Syarifil', 
            'Maulana Izza', 'Muhammad Harwin', 'Viona Aulya'
          ];
          const randomWinner = membersList[Math.floor(Math.random() * membersList.length)];
          
          if (user) {
            await addDoc(collection(db, 'spin_logs'), {
              winner: randomWinner,
              spunBy: user.displayName || 'Anggota Kelas',
              spunById: user.uid,
              createdAt: Timestamp.now()
            });
          }
          return { success: true, resultId: randomWinner };
        }

        default:
          return { success: true };
      }
    } catch (err: any) {
      console.error('Error executing action:', err);
      return { success: false, error: err.message || 'Gagal mengeksekusi aksi' };
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || isLoading) return;

    if (queryText === '📋 Buka Template Perintah' || queryText.toLowerCase().includes('buka template')) {
      setShowTemplates(true);
      return;
    }

    setInputMessage('');
    setShowTemplates(false);
    setActiveGuidedTemplate(null);

    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-bypass/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.text
          })),
          userContext: {
            isLoggedIn: !!user,
            isAdmin: isAdmin,
            isDewa: isDewa,
            userName: user?.displayName || 'Mahasiswa InterSolid',
            userEmail: user?.email || '',
            userId: user?.uid || ''
          },
          currentDateTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}`);
      }

      const result = await response.json();
      const aiData = result.data || {};
      
      const parsedActions: ActionPayload[] = (aiData.actions || []).map((act: any) => ({
        ...act,
        status: 'pending' as const
      }));

      // Immediately execute the actions
      const executedActions: ActionPayload[] = [];
      for (const act of parsedActions) {
        act.status = 'executing';
        const execResult = await executeAction(act);
        if (execResult.success) {
          act.status = 'success';
          act.resultId = execResult.resultId;
        } else if (execResult.error === 'ADMIN_REQUIRED') {
          act.status = 'permission_denied';
          act.errorMsg = 'Aksi ini memerlukan hak akses Admin/Pengurus kelas.';
        } else if (execResult.error === 'AUTH_REQUIRED') {
          act.status = 'permission_denied';
          act.errorMsg = 'Silakan login terlebih dahulu untuk menjalankan aksi ini.';
        } else {
          act.status = 'error';
          act.errorMsg = execResult.error;
        }
        executedActions.push(act);
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: aiData.reply || 'Perintah telah diproses.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        actions: executedActions,
        suggestedNavigation: aiData.suggestedNavigation || null,
        templateCode: aiData.templateCode || undefined,
        quickSuggestions: aiData.quickSuggestions || []
      };

      setMessages([...updatedMessages, assistantMsg]);

      // If suggested navigation exists and user requested navigation or primary action
      if (aiData.suggestedNavigation && (queryText.toLowerCase().includes('buka') || queryText.toLowerCase().includes('lihat') || queryText.toLowerCase().includes('navigasi'))) {
        setActivePage(aiData.suggestedNavigation);
      }

    } catch (err: any) {
      console.error('AI Bypass Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: 'Maaf, terjadi gangguan saat menghubungkan ke InterBypass AI. Mohon coba ulangi perintahmu sebentar lagi.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        quickSuggestions: ['Coba lagi', '📋 Buka Template Perintah', 'Buka Kalender']
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualActionExecute = async (msgId: string, actionIndex: number) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg || !targetMsg.actions || !targetMsg.actions[actionIndex]) return;

    const action = targetMsg.actions[actionIndex];
    const execResult = await executeAction(action);

    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.actions) return m;
      const newActions = [...m.actions];
      if (execResult.success) {
        newActions[actionIndex] = { ...action, status: 'success', resultId: execResult.resultId };
      } else if (execResult.error === 'ADMIN_REQUIRED') {
        newActions[actionIndex] = { ...action, status: 'permission_denied', errorMsg: 'Memerlukan akses Admin' };
      } else {
        newActions[actionIndex] = { ...action, status: 'error', errorMsg: execResult.error };
      }
      return { ...m, actions: newActions };
    }));
  };

  const handleLoginClick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleCopyTemplate = (tpl: PresetTemplate) => {
    navigator.clipboard.writeText(tpl.rawTemplate);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertTemplateToInput = (tpl: PresetTemplate) => {
    setInputMessage(tpl.rawTemplate);
    setShowTemplates(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleStartGuidedForm = (tpl: PresetTemplate) => {
    const initialValues: Record<string, string> = {};
    tpl.fields.forEach(f => {
      initialValues[f.key] = f.default || '';
    });
    setGuidedFormValues(initialValues);
    setActiveGuidedTemplate(tpl);
  };

  const handleSubmitGuidedForm = () => {
    if (!activeGuidedTemplate) return;

    // Construct clean structured prompt based on template type
    let promptString = '';
    const t = activeGuidedTemplate;

    if (t.id === 'template_event') {
      const { title, date, time, genre, note } = guidedFormValues;
      promptString = `[Jadwal]\nJudul: ${title || 'Kegiatan Kelas'}\nTanggal: ${date || '2026-08-28'}\nJam: ${time || '08:00 WIB'}\nKategori: ${genre || 'tugas'}\nKeterangan: ${note || '-'}`;
    } else if (t.id === 'template_announcement') {
      const { title, priority, content } = guidedFormValues;
      promptString = `[Pengumuman]\nJudul: ${title || 'Pengumuman Penting'}\nPrioritas: ${priority || 'medium'}\nIsi: ${content || 'Pengumuman untuk seluruh mahasiswa.'}`;
    } else if (t.id === 'template_note') {
      const { title, tag, content } = guidedFormValues;
      promptString = `[Notulensi]\nJudul: ${title || 'Catatan Rapat'}\nTag: ${tag || 'Rapat'}\nPoin-poin:\n${content || '- Pembahasan agenda'}`;
    } else if (t.id === 'template_poll') {
      const { question, opt1, opt2, opt3 } = guidedFormValues;
      const opts = [opt1, opt2, opt3].filter(Boolean);
      promptString = `[Voting]\nPertanyaan: ${question || 'Voting Kelas'}\nOpsi:\n${opts.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}`;
    } else if (t.id === 'template_aspirasi') {
      const { text, sticker } = guidedFormValues;
      promptString = `[Aspirasi]\nPesan: ${text || 'Semangat kuliah semuanya!'}\nStiker: ${sticker || '🔥'}`;
    } else if (t.id === 'template_table') {
      const { name } = guidedFormValues;
      promptString = `[Tabel]\nNama: ${name || 'Tabel Absensi Baru'}`;
    } else if (t.id === 'template_navigate') {
      const { page } = guidedFormValues;
      promptString = `[Navigasi]\nBuka halaman ${page || 'kalender'}`;
    } else if (t.id === 'template_spin') {
      promptString = `[Spin]\nPutar undian anggota kelas sekarang`;
    }

    setActiveGuidedTemplate(null);
    setShowTemplates(false);
    handleSendMessage(promptString);
  };

  return (
    <>
      {/* 🚀 Floating Launch Button */}
      <div 
        id="ai-bypass-launcher-container"
        className="fixed z-[180] bottom-20 md:bottom-7 right-4 md:right-7 flex flex-col items-end pointer-events-auto select-none"
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 15 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="relative group"
            >
              {/* Pulsing Aura */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 rounded-full blur-md opacity-60 group-hover:opacity-100 animate-pulse transition duration-500" />
              
              {/* Tooltip Notification */}
              <div className="absolute -top-10 right-0 bg-[#0c1829] text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg border border-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1.5">
                <Sparkles size={12} className="text-yellow-400 animate-spin" />
                <span>InterBypass AI Copilot</span>
              </div>

              {/* Main Button */}
              <button
                id="btn-ai-bypass-toggle"
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2.5 px-4 py-3.5 md:py-3.5 md:px-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-full shadow-2xl border border-white/20 hover:shadow-blue-500/40 transition-all"
                title="Buka InterBypass AI"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                    <Bot size={19} className="text-white animate-bounce" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-blue-900 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-blue-900 rounded-full" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-200 leading-none">Bypass AI</p>
                  <p className="text-xs font-bold text-white leading-tight">Copilot Kelas</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 💬 Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <div 
            id="ai-bypass-chat-modal"
            className={`fixed z-[190] ${
              isExpanded 
                ? 'inset-3 md:inset-8' 
                : 'bottom-4 right-4 md:bottom-7 md:right-7 w-[94vw] sm:w-[440px] md:w-[490px] h-[86vh] sm:h-[650px] max-h-[720px]'
            } flex flex-col pointer-events-auto`}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex-1 flex flex-col bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl rounded-[28px] md:rounded-[32px] shadow-2xl border border-blue-100/60 dark:border-blue-900/40 overflow-hidden ring-1 ring-black/5 relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-b border-white/10 shadow-sm select-none shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                      <Bot size={20} className="text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-blue-700 rounded-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm md:text-base leading-tight">InterBypass AI</h3>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider">
                        Copilot
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-blue-100 flex items-center gap-1">
                        {isDewa ? (
                          <span className="text-amber-300 font-bold flex items-center gap-0.5">
                            <Sparkles size={10} /> Dewa Mode
                          </span>
                        ) : isAdmin ? (
                          <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                            <ShieldCheck size={10} /> Admin Active
                          </span>
                        ) : user ? (
                          <span className="text-blue-200">Mahasiswa</span>
                        ) : (
                          <span className="text-blue-300/80">Guest (Tamu)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Controls */}
                <div className="flex items-center gap-1">
                  {/* Template Drawer Toggle */}
                  <button
                    onClick={() => {
                      setShowTemplates(!showTemplates);
                      setActiveGuidedTemplate(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      showTemplates 
                        ? 'bg-white text-blue-700 shadow-md' 
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    title="Buka Format & Template Perintah"
                  >
                    <LayoutTemplate size={14} />
                    <span className="hidden sm:inline">Template</span>
                  </button>

                  <button
                    onClick={handleClearHistory}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                    title="Bersihkan Riwayat"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hidden sm:flex p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                    title={isExpanded ? 'Perkecil' : 'Perbesar'}
                  >
                    {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all ml-0.5"
                    title="Tutup"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* 📋 Template Drawer Overlay */}
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute inset-x-0 top-[57px] bottom-[68px] z-30 bg-white/98 dark:bg-[#0f172a]/98 backdrop-blur-xl flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-800"
                  >
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                          <LayoutTemplate size={15} />
                        </div>
                        <div>
                          <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100">
                            Format & Template Siap Pakai
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Pilih template agar data langsung tepat sasaran dan bebas salah paham.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowTemplates(false);
                          setActiveGuidedTemplate(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Guided Form Mode */}
                    {activeGuidedTemplate ? (
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${activeGuidedTemplate.color} text-white`}>
                              <activeGuidedTemplate.icon size={15} />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Form Cepat: {activeGuidedTemplate.title}
                              </h5>
                              <span className="text-[10px] text-slate-400">
                                Isi kolom di bawah untuk langsung dieksekusi oleh AI
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveGuidedTemplate(null)}
                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            Kembali ke Daftar
                          </button>
                        </div>

                        <div className="space-y-3">
                          {activeGuidedTemplate.fields.map((f) => (
                            <div key={f.key} className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {f.label}
                              </label>
                              {f.type === 'textarea' ? (
                                <textarea
                                  value={guidedFormValues[f.key] || ''}
                                  onChange={(e) => setGuidedFormValues({ ...guidedFormValues, [f.key]: e.target.value })}
                                  placeholder={f.placeholder}
                                  rows={3}
                                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : f.type === 'select' ? (
                                <select
                                  value={guidedFormValues[f.key] || f.options?.[0]}
                                  onChange={(e) => setGuidedFormValues({ ...guidedFormValues, [f.key]: e.target.value })}
                                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {f.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={guidedFormValues[f.key] || ''}
                                  onChange={(e) => setGuidedFormValues({ ...guidedFormValues, [f.key]: e.target.value })}
                                  placeholder={f.placeholder}
                                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setActiveGuidedTemplate(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitGuidedForm}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5"
                          >
                            <Sparkles size={13} />
                            Jalankan Perintah AI
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Template Cards List */
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-2">
                          <HelpCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                          <p className="leading-relaxed text-[11px]">
                            <strong>Tips Pintas:</strong> Kamu bisa klik <strong>"Isi Form Cepat"</strong> untuk mengetik data di kolom form khusus, atau klik <strong>"Salin Template"</strong> untuk menaruh format ke ruang ketik.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {PRESET_TEMPLATES.map((tpl) => {
                            const IconComponent = tpl.icon;
                            const isCopied = copiedId === tpl.id;

                            return (
                              <div
                                key={tpl.id}
                                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:border-blue-400/60 transition-all space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${tpl.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                                      <IconComponent size={16} />
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                        {tpl.title}
                                      </h5>
                                      <span className="text-[10px] text-slate-400">
                                        {tpl.category}
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    tpl.requiresAdmin 
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40' 
                                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                                  }`}>
                                    {tpl.badge}
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {tpl.description}
                                </p>

                                {/* Template Code Preview */}
                                <div className="bg-slate-100 dark:bg-[#151f32] p-2.5 rounded-xl text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap select-all">
                                  {tpl.rawTemplate}
                                </div>

                                {/* Template Buttons */}
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <button
                                    onClick={() => handleCopyTemplate(tpl)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-all"
                                  >
                                    {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                    {isCopied ? 'Tersalin!' : 'Salin Format'}
                                  </button>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleInsertTemplateToInput(tpl)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1 transition-all"
                                      title="Masukkan ke kolom chat"
                                    >
                                      <Edit3 size={12} />
                                      Tulis di Chat
                                    </button>

                                    {tpl.fields.length > 0 ? (
                                      <button
                                        onClick={() => handleStartGuidedForm(tpl)}
                                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 transition-all"
                                      >
                                        <Sparkles size={12} />
                                        Isi Form Cepat
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setShowTemplates(false);
                                          handleSendMessage(tpl.samplePrompt);
                                        }}
                                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 transition-all"
                                      >
                                        <Sparkles size={12} />
                                        Eksekusi
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[88%]">
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 mb-1 shadow-sm">
                          <Bot size={15} />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                        {/* Template Code Suggestion from AI */}
                        {msg.templateCode && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 text-xs font-mono">
                            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800 text-[10px] text-slate-400 font-sans">
                              <span>📋 Rekomendasi Format Template</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.templateCode || '');
                                  setCopiedId(msg.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                              >
                                {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                                {copiedId === msg.id ? 'Tersalin' : 'Salin'}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed select-all font-mono text-emerald-300">
                              {msg.templateCode}
                            </pre>
                            <button
                              onClick={() => {
                                setInputMessage(msg.templateCode || '');
                                inputRef.current?.focus();
                              }}
                              className="mt-2 w-full py-1 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold font-sans transition-all"
                            >
                              Gunakan Format Ini di Chat
                            </button>
                          </div>
                        )}

                        {/* Executed Action Cards */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                            {msg.actions.map((action, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border text-xs ${
                                  action.status === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                                    : action.status === 'permission_denied'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                                    : action.status === 'error'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    {action.type === 'create_event' && <CalendarIcon size={14} className="text-blue-500" />}
                                    {action.type === 'create_announcement' && <Bell size={14} className="text-amber-500" />}
                                    {action.type === 'create_note' && <FileText size={14} className="text-purple-500" />}
                                    {action.type === 'create_poll' && <Vote size={14} className="text-emerald-500" />}
                                    {action.type === 'create_aspirasi' && <MessageSquare size={14} className="text-pink-500" />}
                                    {action.type === 'create_absen_table' && <Table size={14} className="text-indigo-500" />}
                                    {action.type === 'spin_wheel' && <RotateCw size={14} className="text-sky-500" />}
                                    <span>{action.title || 'Aksi Otomatis'}</span>
                                  </div>

                                  {/* Status badge */}
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                    {action.status === 'success' && (
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Berhasil
                                      </span>
                                    )}
                                    {action.status === 'permission_denied' && (
                                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Lock size={12} /> Butuh Izin
                                      </span>
                                    )}
                                    {action.status === 'error' && (
                                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                        <ShieldAlert size={12} /> Gagal
                                      </span>
                                    )}
                                    {action.status === 'executing' && (
                                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <Loader2 size={12} className="animate-spin" /> Menjalankan
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {action.description && (
                                  <p className="text-[11px] opacity-80 mb-2 leading-relaxed">
                                    {action.description}
                                  </p>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {action.status === 'success' && (
                                    <>
                                      {action.type === 'create_event' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('kalender');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Buka Kalender <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {action.type === 'create_announcement' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('pengumuman');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Buka Pengumuman <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {action.type === 'create_note' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('notulensi');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Buka Notulensi <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {action.type === 'create_poll' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('voting');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Lihat Voting <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {action.type === 'create_aspirasi' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('aspirasi');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Lihat di Yapping Wall <ChevronRight size={12} />
                                        </button>
                                      )}
                                      {action.type === 'create_absen_table' && (
                                        <button
                                          onClick={() => {
                                            setActivePage('absen');
                                            setIsOpen(false);
                                          }}
                                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Buka Absensi <ChevronRight size={12} />
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {action.status === 'permission_denied' && (
                                    <>
                                      {action.requiresAdmin && !isAdmin && !isDewa && (
                                        <button
                                          onClick={() => {
                                            onOpenAdminModal?.();
                                          }}
                                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          <Lock size={12} /> Masukkan PIN Admin
                                        </button>
                                      )}
                                      {action.requiresAuth && !user && (
                                        <button
                                          onClick={handleLoginClick}
                                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                          Login Google
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleManualActionExecute(msg.id, idx)}
                                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                                      >
                                        Coba Lagi
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <span
                          className={`text-[9px] block mt-1.5 opacity-60 ${
                            msg.role === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Quick suggestion pills from AI */}
                    {msg.quickSuggestions && msg.quickSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-9">
                        {msg.quickSuggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-left"
                          >
                            💡 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 mb-1">
                      <Bot size={15} />
                    </div>
                    <div className="bg-slate-100 dark:bg-[#1e293b] rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-2 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                      <Loader2 size={15} className="animate-spin text-blue-500" />
                      <span>InterBypass sedang menganalisis & menjalankan perintah...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick default suggestions bar on bottom */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar flex items-center gap-1.5">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-blue-600 text-white font-bold shadow-sm hover:bg-blue-700 transition-all shrink-0 flex items-center gap-1"
                  >
                    <LayoutTemplate size={12} />
                    Format Template
                  </button>
                  {PRESET_TEMPLATES.slice(0, 4).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSendMessage(tpl.samplePrompt)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all shrink-0"
                    >
                      {tpl.category}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-[#0f172a] border-t border-slate-200/60 dark:border-slate-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={isListening ? 'Mendengarkan suara Anda...' : 'Ketik perintah atau gunakan template (contoh: [Jadwal] Judul:...)'}
                      disabled={isLoading}
                      className={`w-full py-3 pl-4 pr-10 text-xs md:text-sm bg-slate-100 dark:bg-slate-800/90 text-slate-850 dark:text-white rounded-2xl border ${
                        isListening
                          ? 'border-red-500 ring-2 ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      } outline-none transition-all`}
                    />
                    
                    {/* Voice button */}
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={isListening ? 'Berhenti mendengar' : 'Input Suara'}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                    title="Kirim Perintah"
                  >
                    <Send size={16} />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span className="flex items-center gap-1">
                    <LayoutTemplate size={11} className="text-blue-500" />
                    Klik tombol <strong>Template</strong> di atas untuk format rapi & form terpandu
                  </span>
                  <span className="hidden sm:inline">Tekan Enter ↵</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
