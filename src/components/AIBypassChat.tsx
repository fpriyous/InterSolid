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
  Layers,
  Search,
  LayoutGrid,
  ImageIcon,
  Video,
  Trophy,
  CheckCircle,
  Zap,
  ExternalLink
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
  isOpenControlled?: boolean;
  setIsOpenControlled?: (open: boolean) => void;
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

export interface AppFeatureItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  badge: string;
}

export const APP_FEATURES: AppFeatureItem[] = [
  { id: 'kalender', label: 'Kalender & Jadwal', description: 'Atur jadwal kuliah, deadline tugas & ujian', icon: CalendarIcon, color: 'from-blue-500 to-indigo-600', badge: 'Jadwal' },
  { id: 'pengumuman', label: 'Pengumuman Kelas', description: 'Broadcast info resmi pengurus', icon: Bell, color: 'from-amber-500 to-orange-600', badge: 'Info Resmi' },
  { id: 'notulensi', label: 'Notulensi & Catatan', description: 'Catatan rapat, resume materi kuliah', icon: FileText, color: 'from-purple-500 to-indigo-600', badge: 'Materi' },
  { id: 'voting', label: 'Vote & Polling', description: 'Pemungutan suara & ballot digital', icon: Vote, color: 'from-emerald-500 to-teal-600', badge: 'Polling' },
  { id: 'aspirasi', label: 'Yapping Wall', description: 'Aspirasi & curhat anonim mahasiswa', icon: MessageSquare, color: 'from-pink-500 to-rose-600', badge: 'Anonim' },
  { id: 'absen', label: 'Data & Absensi', description: 'Checklist absensi & catatan kas', icon: CheckCircle, color: 'from-indigo-500 to-cyan-600', badge: 'Absensi' },
  { id: 'spin', label: 'Spin Wheel', description: 'Undian acak giliran & doorprize', icon: RotateCw, color: 'from-sky-500 to-blue-600', badge: 'Undian' },
  { id: 'study', label: 'Auto Paham AI', description: 'Tutor pintar Hubungan Internasional', icon: Sparkles, color: 'from-violet-500 to-indigo-600', badge: 'Tutor AI' },
  { id: 'memory', label: 'Galeri Memo', description: 'Foto kenangan & dokumentasi angkatan', icon: ImageIcon, color: 'from-rose-500 to-red-600', badge: 'Galeri' },
  { id: 'profiles', label: 'Video Profile', description: 'Video perkenalan 10 detik mahasiswa', icon: Video, color: 'from-teal-500 to-emerald-600', badge: 'Perkenalan' },
  { id: 'interlingo', label: 'InterLingo', description: 'Kuis mini kosakata Mandarin santai', icon: Trophy, color: 'from-yellow-500 to-amber-600', badge: 'Mandarin' },
  { id: 'home', label: 'Dashboard Utama', description: 'Beranda & statistik kelas real-time', icon: LayoutGrid, color: 'from-slate-600 to-slate-800', badge: 'Utama' },
];

export const normalizePage = (p?: string | null): string => {
  if (!p) return 'home';
  const raw = p.toLowerCase().trim();
  if (raw === 'home' || raw.includes('dashboard') || raw.includes('beranda') || raw.includes('utama')) return 'home';
  if (raw.includes('kalender') || raw.includes('calendar') || raw.includes('jadwal') || raw.includes('event')) return 'kalender';
  if (raw.includes('pengumuman') || raw.includes('announce') || raw.includes('broadcast')) return 'pengumuman';
  if (raw.includes('notulensi') || raw.includes('note') || raw.includes('catatan') || raw.includes('materi')) return 'notulensi';
  if (raw.includes('voting') || raw.includes('vote') || raw.includes('poll') || raw.includes('pemungutan')) return 'voting';
  if (raw.includes('aspirasi') || raw.includes('yapping') || raw.includes('curhat') || raw.includes('saran')) return 'aspirasi';
  if (raw.includes('absen') || raw.includes('attendance') || raw.includes('tabel') || raw.includes('kas')) return 'absen';
  if (raw.includes('spin') || raw.includes('wheel') || raw.includes('undian') || raw.includes('acak')) return 'spin';
  if (raw.includes('study') || raw.includes('paham') || raw.includes('tutor') || raw.includes('companion')) return 'study';
  if (raw.includes('memory') || raw.includes('memo') || raw.includes('galeri') || raw.includes('gallery') || raw.includes('foto')) return 'memory';
  if (raw.includes('profile') || raw.includes('profil') || raw.includes('video')) return 'profiles';
  if (raw.includes('lingo') || raw.includes('mandarin') || raw.includes('bahasa')) return 'interlingo';
  return raw;
};

export const getFeatureMeta = (pageId?: string | null) => {
  const normalized = normalizePage(pageId);
  return APP_FEATURES.find(f => f.id === normalized) || {
    id: normalized,
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    description: 'Buka fitur ' + normalized,
    icon: Compass,
    color: 'from-blue-600 to-indigo-600',
    badge: 'Fitur'
  };
};

/**
 * Parses markdown inline formatting (bold, italic, code) while strictly stripping
 * any raw unparsed asterisk (*) characters so zero asterisks are visible in the chat UI.
 */
const parseInlineFormatting = (text: string, isUser: boolean) => {
  if (!text) return null;

  // Split by inline backtick code `code`
  const codeRegex = /`([^`]+)`/g;
  const segments: (string | { type: 'code'; val: string })[] = [];
  let lastIdx = 0;
  let codeMatch;

  while ((codeMatch = codeRegex.exec(text)) !== null) {
    if (codeMatch.index > lastIdx) {
      segments.push(text.substring(lastIdx, codeMatch.index));
    }
    segments.push({ type: 'code', val: codeMatch[1] });
    lastIdx = codeRegex.lastIndex;
  }
  if (lastIdx < text.length) {
    segments.push(text.substring(lastIdx));
  }

  const resultNodes: React.ReactNode[] = [];

  segments.forEach((seg, segIdx) => {
    if (typeof seg !== 'string') {
      resultNodes.push(
        <code 
          key={`code-${segIdx}`} 
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
            isUser 
              ? 'bg-white/20 text-white' 
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40'
          }`}
        >
          {seg.val.replace(/\*/g, '')}
        </code>
      );
      return;
    }

    // Process bold (**bold**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldParts: (string | { type: 'bold'; val: string })[] = [];
    let bLast = 0;
    let bMatch;

    while ((bMatch = boldRegex.exec(seg)) !== null) {
      if (bMatch.index > bLast) {
        boldParts.push(seg.substring(bLast, bMatch.index));
      }
      boldParts.push({ type: 'bold', val: bMatch[1] });
      bLast = boldRegex.lastIndex;
    }
    if (bLast < seg.length) {
      boldParts.push(seg.substring(bLast));
    }

    boldParts.forEach((bPart, bIdx) => {
      if (typeof bPart !== 'string') {
        const cleanBoldVal = bPart.val.replace(/\*/g, '').trim();
        resultNodes.push(
          <strong 
            key={`b-${segIdx}-${bIdx}`} 
            className={`font-black ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`}
          >
            {cleanBoldVal}
          </strong>
        );
        return;
      }

      // Process italic (*italic* or _italic_)
      const italicRegex = /\*([^*]+)\*|_([^_]+)_/g;
      const iParts: (string | { type: 'italic'; val: string })[] = [];
      let iLast = 0;
      let iMatch;

      while ((iMatch = italicRegex.exec(bPart)) !== null) {
        if (iMatch.index > iLast) {
          iParts.push(bPart.substring(iLast, iMatch.index));
        }
        iParts.push({ type: 'italic', val: iMatch[1] || iMatch[2] });
        iLast = italicRegex.lastIndex;
      }
      if (iLast < bPart.length) {
        iParts.push(bPart.substring(iLast));
      }

      iParts.forEach((iPart, iIdx) => {
        if (typeof iPart !== 'string') {
          const cleanItalicVal = iPart.val.replace(/\*/g, '').trim();
          resultNodes.push(
            <em 
              key={`i-${segIdx}-${bIdx}-${iIdx}`} 
              className={`italic font-medium ${isUser ? 'text-blue-100' : 'text-slate-700 dark:text-slate-200'}`}
            >
              {cleanItalicVal}
            </em>
          );
        } else {
          // Plain text - strip any leftover asterisk symbol!
          const cleanText = iPart.replace(/\*/g, '');
          if (cleanText) {
            resultNodes.push(
              <React.Fragment key={`t-${segIdx}-${bIdx}-${iIdx}`}>
                {cleanText}
              </React.Fragment>
            );
          }
        }
      });
    });
  });

  return resultNodes;
};

/**
 * Format chat message into beautiful paragraphs, lists, and headings
 * with zero raw asterisks visible.
 */
export const formatBypassText = (rawText: string, isUser: boolean = false) => {
  if (!rawText) return null;

  const lines = rawText.split('\n');

  return (
    <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Heading detection (###, ##, #)
        const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
          const headingText = headingMatch[1].replace(/\*/g, '');
          return (
            <h4 
              key={lineIdx} 
              className={`font-bold mt-2 mb-1 text-xs sm:text-sm ${
                isUser ? 'text-white font-black' : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {parseInlineFormatting(headingText, isUser)}
            </h4>
          );
        }

        // Bullet list detection (*, -, +, •)
        const isBullet = /^[*\-•+]\s+/.test(trimmed);
        // Numbered list detection (1., 2., etc.)
        const isNumbered = /^\d+\.\s+/.test(trimmed);

        let contentText = trimmed;
        let bulletIcon = null;

        if (isBullet) {
          contentText = trimmed.replace(/^[*\-•+]\s+/, '');
          bulletIcon = (
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 shrink-0 mt-1.5 ${
              isUser ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'
            }`} />
          );
        } else if (isNumbered) {
          const numMatch = trimmed.match(/^(\d+\.)\s+/);
          if (numMatch) {
            contentText = trimmed.substring(numMatch[0].length);
            bulletIcon = (
              <span className={`font-black text-[10px] sm:text-xs mr-1.5 shrink-0 ${
                isUser ? 'text-white' : 'text-blue-600 dark:text-blue-400'
              }`}>
                {numMatch[1]}
              </span>
            );
          }
        }

        const nodes = parseInlineFormatting(contentText, isUser);

        if (isBullet || isNumbered) {
          return (
            <div key={lineIdx} className="flex items-start pl-1 my-0.5">
              {bulletIcon}
              <div className="flex-1 min-w-0">{nodes}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="min-h-[1rem]">
            {nodes}
          </p>
        );
      })}
    </div>
  );
};

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
  onOpenAdminModal,
  isOpenControlled,
  setIsOpenControlled
}: AIBypassChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (setIsOpenControlled) {
      setIsOpenControlled(val);
    } else {
      setInternalIsOpen(val);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeGuidedTemplate, setActiveGuidedTemplate] = useState<PresetTemplate | null>(null);
  const [guidedFormValues, setGuidedFormValues] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>('all');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');

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
        text: 'Halo! Aku **InterBypass AI**, Copilot eksekutor cerdas portal InterSolid. Kamu bisa memerintahkan apa saja langsung dengan **bahasa santai sehari-hari tanpa template** (misal: *"Catat besok ada kuis HI jam 9 di R301"*, *"Buatkan voting lokasi makrab"*, *"Umumin kuliah pindah ke Jumat"*). Sistem akan otomatis mengeksekusi langsung ke database dan UI!',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        quickSuggestions: [
          '📅 Catat kuis HI besok jam 9 di R301',
          '🗳️ Buat voting lokasi makrab: Pantai, Villa, Kafe',
          '📢 Umumin kuliah diplomasi pindah ke Jumat',
          '📝 Catat hasil rapat proker baksos'
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

  // Safe navigation handler to switch page and close drawer smoothly
  const handleNavigateToFeature = (rawPageId: string, targetId: string | null = null) => {
    const page = normalizePage(rawPageId);
    try {
      setActivePage(page, targetId);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to navigate from AI Bypass:', err);
    }
  };

  const isDirectNavigationSuggestion = (text: string): string | null => {
    const t = text.toLowerCase().trim();
    if (
      t.startsWith('buka ') || 
      t.startsWith('lihat ') || 
      t.startsWith('menuju ') || 
      t.startsWith('ke ') ||
      t.includes('halaman') ||
      t.includes('kalender') ||
      t.includes('pengumuman') ||
      t.includes('voting') ||
      t.includes('notulensi') ||
      t.includes('aspirasi') ||
      t.includes('yapping') ||
      t.includes('absen') ||
      t.includes('spin') ||
      t.includes('study') ||
      t.includes('memory') ||
      t.includes('profiles') ||
      t.includes('interlingo')
    ) {
      return normalizePage(t);
    }
    return null;
  };

  // Keyboard shortcut: Escape to close drawer or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeGuidedTemplate) {
          setActiveGuidedTemplate(null);
        } else if (showTemplates) {
          setShowTemplates(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showTemplates, activeGuidedTemplate]);

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
          messages: updatedMessages.map(m => {
            let content = m.text;
            if (m.role === 'assistant' && m.actions && m.actions.length > 0) {
              const actionSummary = m.actions.map(a => `[Aksi Terdaftar: ${a.type}, Judul: "${a.title || a.payload?.title || a.payload?.name || ''}", Payload: ${JSON.stringify(a.payload || {})}]`).join('; ');
              content = `${content}\n\n(Catatan Konteks Aksi: ${actionSummary})`;
            }
            return {
              role: m.role,
              content
            };
          }),
          userContext: {
            isLoggedIn: !!user,
            isAdmin: isAdmin,
            isDewa: isDewa,
            userName: user?.displayName || 'Mahasiswa InterSolid',
            userEmail: user?.email || '',
            userId: user?.uid || '',
            currentActivePage: activePage
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
      {/* 🚀 Floating Launch Button (Always prominent on mobile & desktop) */}
      <div 
        id="ai-bypass-launcher-container"
        className="fixed z-[180] bottom-24 md:bottom-6 right-3.5 md:right-6 flex flex-col items-end pointer-events-auto select-none"
        style={{ touchAction: 'manipulation' }}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 15 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              {/* Pulsing Aura */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 rounded-full blur-md opacity-75 group-hover:opacity-100 animate-pulse transition duration-500" />
              
              {/* Tooltip Notification on Desktop */}
              <div className="hidden md:flex absolute -top-10 right-0 bg-[#0c1829] text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xl border border-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none items-center gap-1.5 z-20">
                <Sparkles size={12} className="text-yellow-400 animate-spin" />
                <span>InterBypass AI Copilot</span>
              </div>

              {/* Main Floating Button */}
              <button
                id="btn-ai-bypass-toggle"
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-full shadow-2xl border border-white/30 hover:shadow-blue-500/50 transition-all active:scale-95"
                title="Buka InterBypass AI"
              >
                <div className="relative shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Bot size={18} className="text-white" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-900 rounded-full animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-900 rounded-full" />
                </div>
                <div className="text-left flex flex-col justify-center pr-1">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-200 leading-none">Bypass AI</span>
                  <span className="text-[11px] sm:text-xs font-bold text-white leading-tight">Copilot</span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 💬 Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay for mobile & expanded */}
            <div 
              className={`fixed inset-0 z-[185] bg-slate-950/50 backdrop-blur-[3px] transition-opacity ${isExpanded ? 'block' : 'sm:hidden block'}`}
              onClick={() => setIsOpen(false)}
            />

            <div 
              id="ai-bypass-chat-modal"
              className={`fixed z-[190] ${
                isExpanded 
                  ? 'inset-3 sm:inset-6 md:inset-8 lg:inset-10 max-w-5xl mx-auto my-auto h-[min(90vh,880px)]' 
                  : 'inset-x-2.5 bottom-2.5 top-3.5 sm:top-auto sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[470px] md:w-[500px] lg:w-[520px] sm:h-[min(640px,calc(100dvh-4.5rem))]'
              } flex flex-col pointer-events-auto transition-all`}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="flex-1 flex flex-col bg-white dark:bg-[#0f172a] rounded-[26px] sm:rounded-[30px] shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden ring-1 ring-black/10 relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-b border-white/10 shadow-sm select-none shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                        <Bot size={18} className="text-white" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-700 rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xs sm:text-sm leading-tight truncate">InterBypass AI</h3>
                        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0">
                          Copilot
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 truncate">
                        <span className="text-[9px] sm:text-[10px] text-blue-100 flex items-center gap-1">
                          {isDewa ? (
                            <span className="text-amber-300 font-bold flex items-center gap-0.5">
                              <Sparkles size={9} /> Akses Dewa
                            </span>
                          ) : isAdmin ? (
                            <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                              <ShieldCheck size={9} /> Akses Admin
                            </span>
                          ) : user ? (
                            <span className="text-blue-200 truncate">Mahasiswa</span>
                          ) : (
                            <span className="text-blue-300/80 truncate">Tamu</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Controls */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Template Drawer Toggle (Prominent) */}
                    <button
                      onClick={() => {
                        setShowTemplates(!showTemplates);
                        setActiveGuidedTemplate(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
                        showTemplates 
                          ? 'bg-amber-300 text-slate-950 ring-2 ring-white/50' 
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:shadow-md'
                      }`}
                      title="Buka Format & Template Perintah"
                    >
                      <LayoutTemplate size={13} />
                      <span className="hidden xs:inline sm:inline">{showTemplates ? 'Tutup Format' : 'Format'}</span>
                    </button>

                    <button
                      onClick={handleClearHistory}
                      className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                      title="Bersihkan Riwayat"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="hidden sm:flex p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                      title={isExpanded ? 'Kecilkan' : 'Perbesar'}
                    >
                      {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 sm:p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl transition-all ml-0.5"
                      title="Tutup (Esc)"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Main Body Area: Relative container holding Template Drawer & Chat */}
                <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#0b1120]">
                  {/* 📋 Template Drawer Overlay */}
                  <AnimatePresence>
                    {showTemplates && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute inset-0 z-30 bg-white dark:bg-[#0f172a] flex flex-col overflow-hidden"
                      >
                        {/* Drawer Header */}
                        <div className="px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                              <LayoutTemplate size={14} />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                Format & Template Siap Pakai
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Pilih format atau isi formulir cepat agar AI langsung mengeksekusi
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowTemplates(false);
                              setActiveGuidedTemplate(null);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"
                            title="Tutup Template"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        {/* Search & Category Filter Bar */}
                        {!activeGuidedTemplate && (
                          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] space-y-2 shrink-0">
                            {/* Search */}
                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={templateSearchQuery}
                                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                                placeholder="Cari template (jadwal, voting, absen, catatan)..."
                                className="w-full text-xs py-1.5 pl-7 pr-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              {templateSearchQuery && (
                                <button
                                  onClick={() => setTemplateSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                              {[
                                { id: 'all', label: 'Semua' },
                                { id: 'shortcuts', label: '⚡ Pintasan Fitur' },
                                { id: 'jadwal', label: '📅 Jadwal' },
                                { id: 'pengumuman', label: '📢 Pengumuman' },
                                { id: 'notulensi', label: '📝 Notulensi' },
                                { id: 'voting', label: '🗳️ Voting' },
                                { id: 'aspirasi', label: '💬 Aspirasi' },
                                { id: 'absen', label: '📊 Absensi' },
                                { id: 'tools', label: '⚙️ Tools' },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => setTemplateFilterCategory(cat.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                                    templateFilterCategory === cat.id
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Guided Form Mode */}
                        {activeGuidedTemplate ? (
                          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
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
                                Kembali
                              </button>
                            </div>

                            <div className="space-y-2.5">
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
                                      rows={2}
                                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : f.type === 'select' ? (
                                    <select
                                      value={guidedFormValues[f.key] || f.options?.[0]}
                                      onChange={(e) => setGuidedFormValues({ ...guidedFormValues, [f.key]: e.target.value })}
                                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
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
                                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
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
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 active:scale-95 transition-all"
                              >
                                <Sparkles size={13} />
                                Jalankan Perintah AI
                              </button>
                            </div>
                          </div>
                        ) : templateFilterCategory === 'shortcuts' ? (
                          /* Direct Platform Feature Navigation Grid */
                          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 text-blue-950 dark:text-blue-200 text-xs flex items-center gap-2">
                              <Zap size={14} className="text-amber-500 shrink-0" />
                              <p className="text-[10px] sm:text-[11px] font-medium">
                                Klik tombol <strong>"Buka Halaman"</strong> untuk langsung berpindah ke fitur yang diinginkan secara instan tanpa error.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {APP_FEATURES.map((feat) => {
                                const FeatIcon = feat.icon;
                                return (
                                  <div
                                    key={feat.id}
                                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:border-blue-400/60 transition-all flex flex-col justify-between gap-2"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${feat.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                                        <FeatIcon size={16} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {feat.label}
                                          </h5>
                                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {feat.badge}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                          {feat.description}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => handleNavigateToFeature(feat.id)}
                                      className="w-full py-1.5 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                    >
                                      <span>Buka {feat.label}</span>
                                      <ChevronRight size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Template Cards List */
                          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-2">
                              <HelpCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                              <p className="leading-relaxed text-[10px] sm:text-[11px]">
                                Klik <strong>"Isi Form Cepat"</strong> untuk mengetik form khusus, atau <strong>"Tulis di Chat"</strong> untuk memuat format ke obrolan.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {PRESET_TEMPLATES
                                .filter((tpl) => {
                                  // Category filter
                                  if (templateFilterCategory === 'jadwal' && tpl.id !== 'template_event') return false;
                                  if (templateFilterCategory === 'pengumuman' && tpl.id !== 'template_announcement') return false;
                                  if (templateFilterCategory === 'notulensi' && tpl.id !== 'template_note') return false;
                                  if (templateFilterCategory === 'voting' && tpl.id !== 'template_poll') return false;
                                  if (templateFilterCategory === 'aspirasi' && tpl.id !== 'template_aspirasi') return false;
                                  if (templateFilterCategory === 'absen' && tpl.id !== 'template_table') return false;
                                  if (templateFilterCategory === 'tools' && tpl.id !== 'template_spin' && tpl.id !== 'template_navigate') return false;

                                  // Search filter
                                  if (templateSearchQuery.trim()) {
                                    const q = templateSearchQuery.toLowerCase();
                                    return (
                                      tpl.title.toLowerCase().includes(q) ||
                                      tpl.description.toLowerCase().includes(q) ||
                                      tpl.category.toLowerCase().includes(q) ||
                                      tpl.rawTemplate.toLowerCase().includes(q)
                                    );
                                  }
                                  return true;
                                })
                                .map((tpl) => {
                                  const IconComponent = tpl.icon;
                                  const isCopied = copiedId === tpl.id;

                                  return (
                                    <div
                                      key={tpl.id}
                                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:border-blue-400/60 transition-all space-y-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${tpl.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                                            <IconComponent size={14} />
                                          </div>
                                          <div>
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                              {tpl.title}
                                            </h5>
                                            <span className="text-[9px] text-slate-400">
                                              {tpl.category}
                                            </span>
                                          </div>
                                        </div>
                                        <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                          tpl.requiresAdmin 
                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40' 
                                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                                        }`}>
                                          {tpl.badge}
                                        </span>
                                      </div>

                                      <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {tpl.description}
                                      </p>

                                      {/* Template Code Preview */}
                                      <div className="bg-slate-100 dark:bg-[#151f32] p-2 rounded-xl text-[9px] sm:text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap select-all">
                                        {tpl.rawTemplate}
                                      </div>

                                      {/* Template Buttons */}
                                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                                        <button
                                          onClick={() => handleCopyTemplate(tpl)}
                                          className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-all"
                                        >
                                          {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                          {isCopied ? 'Tersalin' : 'Salin'}
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleInsertTemplateToInput(tpl)}
                                            className="px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1 transition-all"
                                            title="Masukkan ke kolom chat"
                                          >
                                            <Edit3 size={11} />
                                            Tulis di Chat
                                          </button>

                                          {tpl.fields.length > 0 ? (
                                            <button
                                              onClick={() => handleStartGuidedForm(tpl)}
                                              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[9px] sm:text-[10px] font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 transition-all"
                                            >
                                              <Sparkles size={11} />
                                              Isi Form Cepat
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setShowTemplates(false);
                                                handleSendMessage(tpl.samplePrompt);
                                              }}
                                              className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[9px] sm:text-[10px] font-bold shadow-sm hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1 transition-all"
                                            >
                                              <Sparkles size={11} />
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
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5 scroll-smooth">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[85%]">
                          {msg.role === 'assistant' && (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 mb-1 shadow-sm">
                              <Bot size={14} />
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-slate-700/60'
                            }`}
                          >
                            {/* Render text without raw asterisks */}
                            <div>{formatBypassText(msg.text, msg.role === 'user')}</div>

                            {/* Template Code Suggestion from AI */}
                            {msg.templateCode && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 text-xs font-mono">
                                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800 text-[9px] sm:text-[10px] text-slate-400 font-sans">
                                  <span>📋 Format Template Terstruktur</span>
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
                                <pre className="whitespace-pre-wrap text-[10px] sm:text-[11px] leading-relaxed select-all font-mono text-emerald-300">
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

                            {/* Suggested Navigation Shortcut Card */}
                            {msg.suggestedNavigation && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium truncate">
                                  <Compass size={12} className="text-blue-500 shrink-0" />
                                  <span>Pintasan Halaman:</span>
                                </span>
                                <button
                                  onClick={() => handleNavigateToFeature(msg.suggestedNavigation!)}
                                  className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0"
                                >
                                  <span>Buka {getFeatureMeta(msg.suggestedNavigation).label}</span>
                                  <ChevronRight size={11} />
                                </button>
                              </div>
                            )}

                            {/* Executed Action Cards */}
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                {msg.actions.map((action, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl border text-xs ${
                                      action.status === 'success'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                                        : action.status === 'permission_denied'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                                        : action.status === 'error'
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                                        : 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 font-bold truncate">
                                        {action.type === 'create_event' && <CalendarIcon size={13} className="text-blue-500 shrink-0" />}
                                        {action.type === 'create_announcement' && <Bell size={13} className="text-amber-500 shrink-0" />}
                                        {action.type === 'create_note' && <FileText size={13} className="text-purple-500 shrink-0" />}
                                        {action.type === 'create_poll' && <Vote size={13} className="text-emerald-500 shrink-0" />}
                                        {action.type === 'create_aspirasi' && <MessageSquare size={13} className="text-pink-500 shrink-0" />}
                                        {action.type === 'create_absen_table' && <Table size={13} className="text-indigo-500 shrink-0" />}
                                        {action.type === 'spin_wheel' && <RotateCw size={13} className="text-sky-500 shrink-0" />}
                                        {action.type === 'navigate_to' && <Compass size={13} className="text-blue-500 shrink-0" />}
                                        <span className="truncate">{action.title || 'Aksi Otomatis'}</span>
                                      </div>

                                      {/* Status badge */}
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                                        {action.status === 'success' && (
                                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 size={11} /> Berhasil
                                          </span>
                                        )}
                                        {action.status === 'permission_denied' && (
                                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <Lock size={11} /> Butuh PIN
                                          </span>
                                        )}
                                        {action.status === 'error' && (
                                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                            <ShieldAlert size={11} /> Gagal
                                          </span>
                                        )}
                                        {action.status === 'executing' && (
                                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <Loader2 size={11} className="animate-spin" /> Menjalankan
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    {action.description && (
                                      <p className="text-[10px] sm:text-[11px] opacity-80 mb-1.5 leading-relaxed">
                                        {action.description}
                                      </p>
                                    )}

                                    {/* Action Navigation Buttons */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {action.status === 'success' && (
                                        <>
                                          {action.type === 'create_event' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('kalender')}
                                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Kalender <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'create_announcement' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('pengumuman')}
                                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Pengumuman <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'create_note' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('notulensi')}
                                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Notulensi <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'create_poll' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('voting')}
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Lihat Voting <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'create_aspirasi' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('aspirasi')}
                                              className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Lihat Yapping Wall <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'create_absen_table' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('absen')}
                                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Absensi <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'spin_wheel' && (
                                            <button
                                              onClick={() => handleNavigateToFeature('spin')}
                                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Spin Wheel <ChevronRight size={11} />
                                            </button>
                                          )}
                                          {action.type === 'navigate_to' && (
                                            <button
                                              onClick={() => handleNavigateToFeature(action.payload?.page || msg.suggestedNavigation || 'home')}
                                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                            >
                                              Buka Halaman <ChevronRight size={11} />
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
                                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all"
                                            >
                                              <Lock size={11} /> Masukkan PIN Admin
                                            </button>
                                          )}
                                          {action.requiresAuth && !user && (
                                            <button
                                              onClick={handleLoginClick}
                                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all"
                                            >
                                              Login Akun
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleManualActionExecute(msg.id, idx)}
                                            className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[9px] sm:text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
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
                              className={`text-[8px] sm:text-[9px] block mt-1 opacity-60 ${
                                msg.role === 'user' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Quick suggestion pills from AI with safe direct navigation support */}
                        {msg.quickSuggestions && msg.quickSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5 pl-8">
                            {msg.quickSuggestions.map((sug, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  if (sug.includes('Template')) {
                                    setShowTemplates(true);
                                  } else {
                                    const navTarget = isDirectNavigationSuggestion(sug);
                                    if (navTarget && navTarget !== 'home') {
                                      handleNavigateToFeature(navTarget);
                                    } else {
                                      handleSendMessage(sug);
                                    }
                                  }
                                }}
                                className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-left flex items-center gap-1"
                              >
                                <span>💡 {sug}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-end gap-2 max-w-[85%]">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 mb-1">
                          <Bot size={14} />
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 shadow-sm">
                          <Loader2 size={14} className="animate-spin text-blue-500" />
                          <span>InterBypass sedang menjalankan perintah...</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Always accessible quick suggestion toolbar above input */}
                  <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-sm transition-all shrink-0 flex items-center gap-1"
                    >
                      <LayoutTemplate size={12} />
                      <span>{showTemplates ? 'Tutup Template' : '📋 Template Format'}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowTemplates(true);
                        setTemplateFilterCategory('shortcuts');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] sm:text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      <Zap size={11} className="text-amber-500" />
                      <span>Pintasan Fitur</span>
                    </button>

                    {APP_FEATURES.slice(0, 6).map((feat) => {
                      const FeatIcon = feat.icon;
                      return (
                        <button
                          key={feat.id}
                          onClick={() => handleNavigateToFeature(feat.id)}
                          className="px-2 py-0.5 rounded-lg text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all shrink-0 flex items-center gap-1"
                        >
                          <FeatIcon size={11} />
                          <span>{feat.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Area (Pinned at bottom, shrink-0) */}
                <div className="p-2.5 sm:p-3 bg-white dark:bg-[#0f172a] border-t border-slate-200/70 dark:border-slate-800/80 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-1.5 sm:gap-2"
                  >
                    <div className="relative flex-1 min-w-0">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={isListening ? 'Mendengarkan suara...' : 'Ketik perintah bebas (contoh: "catat kuis HI besok jam 9")...'}
                        disabled={isLoading}
                        className={`w-full py-2.5 pl-3.5 pr-9 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl sm:rounded-2xl border ${
                          isListening
                            ? 'border-red-500 ring-2 ring-red-500/20'
                            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        } outline-none transition-all`}
                      />
                      
                      {/* Voice button */}
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                          isListening 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={isListening ? 'Berhenti mendengar' : 'Input Suara'}
                      >
                        {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                      title="Kirim Perintah"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                  <div className="mt-1 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 px-1">
                    <span className="flex items-center gap-1">
                      <Sparkles size={10} className="text-amber-500" />
                      Gunakan tombol <strong>Template</strong> untuk format instan
                    </span>
                    <span className="hidden sm:inline">Tekan Esc untuk tutup</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
