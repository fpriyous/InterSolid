import { useState, useRef } from 'react';
import { ShieldCheck, Sparkles, Download, Loader2, X, Terminal, GraduationCap, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import html2pdf from 'html2pdf.js';

interface SkripsiData {
  title: string;
  abstract: string;
  introduction: string;
  theories: string;
  findings: string;
  grade: string;
  notes: string;
}

export default function GodMode({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [skripsi, setSkripsi] = useState<SkripsiData | null>(null);
  const [showGPA, setShowGPA] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const triggerGPAConfetti = () => {
    setShowGPA(true);
    
    // Multi-angle dramatic confetti explosion
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleGenerateSkripsi = async () => {
    setGenerating(true);
    setSkripsi(null);

    try {
      const res = await fetch('/api/skripsi-bypass/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() })
      });

      const contentType = res.headers.get('content-type') || '';
      let result: any = {};
      if (contentType.includes('application/json')) {
        result = await res.json();
      } else {
        const rawText = await res.text();
        console.error('[GodMode Server Response Error]:', rawText);
        throw new Error(`Server mengembalikan status HTTP ${res.status}. Pastikan DEEPSEEK_API_KEY sudah terpasang di Vercel Environment Variables.`);
      }

      if (res.ok && result.status === 'success') {
        setSkripsi(result.data);
      } else {
        throw new Error(result.error || "Gagal membuat skripsi");
      }
    } catch (e: any) {
      console.error(e);
      (window as any).showAppAlert?.('Gagal Memproses', e.message || 'Sistem gagal menghubungi server AI.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!skripsi || !printAreaRef.current) return;

    // Use absolute legacy HEX styling inside the printable node
    // to strictly prevent "Attempting to parse an unsupported color function 'oklab'"
    const opt = {
      margin: 0.5,
      filename: `Draft_Skripsi_Bypass_${keyword.trim() || 'HI'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(printAreaRef.current).set(opt).save();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* God Mode Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-2xl bg-[#0b0f14] border-2 border-emerald-500/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] text-[#d1f4e0] max-h-[90vh] overflow-y-auto z-10"
          >
            {/* Hacker Header */}
            <div className="px-6 py-5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-mono font-bold text-sm tracking-widest text-emerald-400">JALUR DALAM: DEWA_MODE_CONSOLE</h3>
                  <p className="text-[9px] font-mono text-emerald-500/70 uppercase">System Clearance Level: Dewa</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Feature 1: IPK 4.0 Suntik */}
              <div className="p-5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-mono text-sm font-bold text-emerald-400 uppercase tracking-wider">Modul Suntik IPK 4.00</h4>
                </div>
                <p className="text-xs text-emerald-500/70 leading-relaxed font-mono">
                  Mengubah pencapaian nilai akademis Anda menjadi Maha Dewa (IPK 4.00) secara instan jalur kilat dengan efek selebrasi.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <button
                    onClick={triggerGPAConfetti}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0b0f14] font-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Suntik Nilai 4.00
                  </button>

                  <AnimatePresence>
                    {showGPA && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 w-full sm:w-auto"
                      >
                        <ShieldCheck className="w-5 h-5 text-emerald-400 animate-bounce" />
                        <div>
                          <p className="text-[10px] font-mono uppercase text-emerald-500/70">GPA Terkalkulasi</p>
                          <p className="text-sm font-mono font-black text-emerald-400">IPK: 4.00 (Maha Dewa)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Feature 2: Skripsi Bypass AI Generator */}
              <div className="p-5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-mono text-sm font-bold text-emerald-400 uppercase tracking-wider">Skripsi Bypass & Shinta 2 Title Generator</h4>
                </div>
                <p className="text-xs text-emerald-500/70 leading-relaxed font-mono">
                  Masukkan topik/kata kunci, asisten AI Dewa akan membuat judul skripsi super-ilmiah Shinta 2 beserta abstrak dan laporannya yang siap diunduh menjadi PDF.
                </p>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      placeholder="Masukkan kata kunci absurd (cth: Seblak, TikTok, Jastip)..."
                      className="w-full px-4 py-3 bg-black border border-emerald-500/20 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-emerald-300 placeholder:text-emerald-900"
                    />
                    <button
                      onClick={handleGenerateSkripsi}
                      disabled={generating}
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-[#0b0f14] font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 flex items-center justify-center"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bypass'}
                    </button>
                  </div>
                </div>

                {/* AI generated Skripsi preview */}
                <AnimatePresence>
                  {skripsi && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-4 border-t border-emerald-500/10"
                    >
                      <div className="p-4 bg-black rounded-xl border border-emerald-500/15 space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between text-[10px] text-emerald-500/60 pb-2 border-b border-emerald-500/10">
                          <span>SHINTA 2 GRADED CERTIFICATE</span>
                          <span className="text-emerald-400 font-bold">Grade: {skripsi.grade}</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-400">{skripsi.title}</p>
                        <p className="text-[11px] leading-relaxed text-emerald-500/75 mt-2"><span className="text-emerald-400 font-bold">Abstract:</span> {skripsi.abstract}</p>
                        <p className="text-[10px] text-amber-400 italic mt-2"><span className="font-bold">Prof Note:</span> "{skripsi.notes}"</p>
                      </div>

                      <button
                        onClick={handleDownloadPDF}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4" /> Unduh Draft PDF Skripsi Bypass
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Hidden Printable Academic Paper Node */}
            {/* Strict legacy styling elements with NO tailwind gradient/oklab properties */}
            {/* Avoid the html2pdf oklab parser crash entirely! */}
            <div style={{ display: 'none' }}>
              <div 
                ref={printAreaRef} 
                id="academic-paper-template"
                style={{ 
                  padding: '40px', 
                  fontFamily: 'serif', 
                  color: '#111827', 
                  backgroundColor: '#ffffff',
                  lineHeight: '1.6',
                  fontSize: '12px'
                }}
              >
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #111827', paddingBottom: '20px' }}>
                  <p style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    Jurnal Global InterSolid - Shinta 2 Accredited
                  </p>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 15px 0', lineHeight: '1.3' }}>
                    {skripsi?.title}
                  </h1>
                  <p style={{ fontStyle: 'italic', margin: '0', fontSize: '12px' }}>
                    Oleh: Mahasiswa Berprestasi Jalur Langit (InterSolid Portal)
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#4b5563' }}>
                    Fakultas Hubungan Internasional, Universitas InterSolid Mandiri
                  </p>
                </div>

                {/* Abstract Section */}
                <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 8px 0', textAlign: 'center' }}>
                    Abstrak
                  </h3>
                  <p style={{ margin: '0', textAlign: 'justify', fontStyle: 'italic', fontSize: '11px', color: '#374151' }}>
                    {skripsi?.abstract}
                  </p>
                </div>

                {/* Body Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', textAlign: 'justify' }}>
                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                      I. Pendahuluan
                    </h3>
                    <p style={{ margin: '0 0 12px 0' }}>
                      {skripsi?.introduction}
                    </p>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                      II. Landasan Teoritis
                    </h3>
                    <p style={{ margin: '0 0 12px 0' }}>
                      {skripsi?.theories}
                    </p>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', margin: '0 0 8px 0' }}>
                      III. Temuan Penelitian & Pembahasan
                    </h3>
                    <p style={{ margin: '0' }}>
                      {skripsi?.findings}
                    </p>
                  </div>
                </div>

                {/* Certificate Footer */}
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0', fontSize: '10px', color: '#6b7280' }}>Diterbitkan via Antigravity Bypass Engine</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 'bold', color: '#047857' }}>Status Kelulusan: JALUR CEPAT (Grade: {skripsi?.grade})</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontWeight: 'bold' }}>Tanda Tangan Dewan Penguji</p>
                    <div style={{ height: '30px', fontStyle: 'italic', fontSize: '16px', color: '#3b82f6', fontFamily: 'cursive' }}>
                      Auto Paham AI
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
