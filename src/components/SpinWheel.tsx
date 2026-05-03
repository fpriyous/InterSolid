import { useState, useRef, useEffect } from 'react';
import { RotateCw, Trash2, Plus, Users, Lock } from 'lucide-react';
import { User } from 'firebase/auth';

const COLORS = ['#3a9ce5', '#1168b0', '#63b5ed', '#0d5290', '#9bcff4', '#1a82d4', '#c5e3f9', '#164a72', '#5eb3ee', '#0f3050'];

export default function SpinWheel({ user }: { user: User | null }) {
  const [members, setMembers] = useState<string[]>(() => {
    const saved = localStorage.getItem('IS_spinMembers');
    return saved ? JSON.parse(saved) : [
      'Bhintank Mi\'thori Danial Firdaus', 'Dimas Ardiansyah Nur Ismail', 'Fatin Atikah Sandy', 
      'Ixmel Kaisa Elfatio Mohammad', 'Mahrezia Labidi Maziyyah Bahar', 'Nur Fika Rayhanatul Firdausiyah', 
      'Safira Fathia Arrozaqul Azzahrania', 'Siti Nur Rahmawati', 'Ahmaddin Oemar', 'Ananda Rizki Putravian', 
      'Arina Abna Al Izza', 'Eugenia Ivana Aurellia Purnama', 'Faiza Syan Bintang Pradipa Al-Ashar', 
      'Fauziyah Khansa Auliya', 'Kaisar El Kasyaf Hermawan', 'Khadijah Zahra Mumtaz', 'Laily Nur Izahrany', 
      'Munjidah Amalia', 'Najwa Alicia Syarifudin', 'Nidaan Khafiyya', 'Priyous Farrel Dwi Herlambang', 
      'Raniah Naurah Fauzan', 'Sabila Rahma Aulia', 'Shafiyyah Az-zahra', 'Shinta Anggraeni Trisnaningrum', 
      'Zadin Aisyah Al Amin', 'Muhammad Naufal Fairuzudin', 'Rafa Nureka Rasyida', 'Ahmad Syarifil Maqom', 
      'Maulana Izza Dien Sultan', 'Muhammad Harwin Wahyu Dinata', 'Viona Aulya Rahma'
    ];
  });
  const [newMember, setNewMember] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupCount, setGroupCount] = useState(3);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'single' | 'all', index?: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('IS_spinMembers', JSON.stringify(members));
    drawWheel();
  }, [members, angle]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const cx = W / 2;
    const cy = W / 2;
    const R = cx - 10;
    
    ctx.clearRect(0, 0, W, W);

    const n = members.length || 1;
    const arc = (2 * Math.PI) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    members.forEach((m, i) => {
      const startAngle = i * arc - Math.PI / 2;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, startAngle, endAngle);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(m, R - 15, 0);
      ctx.restore();
    });
    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#3a9ce5';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = () => {
    if (spinning || members.length < 2) return;
    setSpinning(true);
    setWinner(null);

    const rounds = 5 + Math.random() * 5;
    const targetAngle = Math.random() * (Math.PI * 2);
    const totalRotation = (Math.PI * 2 * rounds) + targetAngle;
    
    const startTime = performance.now();
    const duration = 4000;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      
      const currentAngle = angle + totalRotation * ease;
      const normalizedAngle = currentAngle % (Math.PI * 2);
      setAngle(normalizedAngle);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        const n = members.length;
        const arc = (2 * Math.PI) / n;
        const stopAngle = (Math.PI * 2 - (normalizedAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const index = Math.floor(((stopAngle + Math.PI / 2) % (Math.PI * 2)) / arc) % n;
        setWinner(members[index]);
        setSpinning(false);
      }
    };

    requestAnimationFrame(animate);
  };

  const splitGroups = () => {
    if (members.length < groupCount) return;
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const newGroups: string[][] = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((m, i) => newGroups[i % groupCount].push(m));
    setGroups(newGroups);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8 flex flex-col items-center">
        <div className="bg-white dark:bg-[#1a252f] p-10 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-xl flex flex-col items-center gap-8 w-full max-w-md">
          <div className="relative">
            <canvas ref={canvasRef} width={360} height={360} className="rounded-full shadow-2xl" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[30px] border-r-blue-500 drop-shadow-md" />
          </div>

          <div className="text-center h-12 flex items-center justify-center">
            {winner ? (
              <div className="animate-bounce">
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest">Terpilih!</span>
                <span className="font-serif text-2xl font-bold text-blue-500">{winner}</span>
              </div>
            ) : spinning ? (
              <span className="text-xs text-gray-400 italic">Memutar...</span>
            ) : (
              <span className="text-xs text-gray-400">Siapa keberuntungan hari ini?</span>
            )}
          </div>

          <button 
            onClick={spin}
            disabled={spinning || members.length < 2}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-serif text-xl font-bold shadow-lg shadow-blue-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            Putar Sekarang!
          </button>
        </div>

        <div className="w-full bg-white dark:bg-[#1a252f] p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase text-gray-400">Bagi Kelompok (N):</label>
              <input 
                type="number" 
                min={2} 
                max={10} 
                value={isNaN(groupCount) ? '' : groupCount}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setGroupCount(isNaN(val) ? 2 : val);
                }}
                className="w-16 px-3 py-1.5 text-xs rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
              />
              <button 
                onClick={splitGroups}
                className="px-4 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                Bagi Otomatis
              </button>
            </div>
            <button onClick={() => setGroups([])} className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500">Reset Kelompok</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {groups.map((group, i) => (
              <div key={i} className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-2">Kelompok {i + 1}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.map(m => (
                    <span key={m} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-[10px] font-medium shadow-sm border border-gray-100 dark:border-gray-700">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm">Daftar Anggota</h4>
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">{members.length}</span>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Tambahkan nama..." 
              value={newMember}
              onChange={e => setNewMember(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setMembers([...members, newMember])}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
            />
            <button 
              onClick={() => {
                if (newMember) {
                  setMembers([...members, newMember]);
                  setNewMember('');
                }
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Plus size={16}/>
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl group hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                <span className="text-xs font-medium">{m}</span>
                <button onClick={() => setConfirmDelete({ type: 'single', index: i })} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <button onClick={() => setConfirmDelete({ type: 'all' })} className="flex-1 py-1.5 text-[10px] font-bold text-gray-400 hover:bg-gray-50 rounded-lg">Kosongkan</button>
        <button 
          onClick={() => setMembers([
            'Bhintank Mi\'thori Danial Firdaus', 'Dimas Ardiansyah Nur Ismail', 'Fatin Atikah Sandy', 
            'Ixmel Kaisa Elfatio Mohammad', 'Mahrezia Labidi Maziyyah Bahar', 'Nur Fika Rayhanatul Firdausiyah', 
            'Safira Fathia Arrozaqul Azzahrania', 'Siti Nur Rahmawati', 'Ahmaddin Oemar', 'Ananda Rizki Putravian', 
            'Arina Abna Al Izza', 'Eugenia Ivana Aurellia Purnama', 'Faiza Syan Bintang Pradipa Al-Ashar', 
            'Fauziyah Khansa Auliya', 'Kaisar El Kasyaf Hermawan', 'Khadijah Zahra Mumtaz', 'Laily Nur Izahrany', 
            'Munjidah Amalia', 'Najwa Alicia Syarifudin', 'Nidaan Khafiyya', 'Priyous Farrel Dwi Herlambang', 
            'Raniah Naurah Fauzan', 'Sabila Rahma Aulia', 'Shafiyyah Az-zahra', 'Shinta Anggraeni Trisnaningrum', 
            'Zadin Aisyah Al Amin', 'Muhammad Naufal Fairuzudin', 'Rafa Nureka Rasyida', 'Ahmad Syarifil Maqom', 
            'Maulana Izza Dien Sultan', 'Muhammad Harwin Wahyu Dinata', 'Viona Aulya Rahma'
          ])} 
          className="flex-1 py-1.5 text-[10px] font-bold text-blue-500 hover:bg-blue-50 rounded-lg uppercase tracking-wider"
        >
          Isi Nama Kelas
        </button>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-blue-100 dark:border-blue-900/30 p-8 max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-500" size={32} />
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2">reyall or faqeee?</h3>
            <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">
              {confirmDelete.type === 'all' 
                ? 'Seluruh daftar anggota akan dikosongkan' 
                : 'Pilihan ini akan dihapus dari daftar'}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                faqeee
              </button>
              <button 
                onClick={() => {
                  if (confirmDelete.type === 'all') {
                    setMembers([]);
                  } else if (confirmDelete.index !== undefined) {
                    setMembers(members.filter((_, idx) => idx !== confirmDelete.index));
                  }
                  setConfirmDelete(null);
                }}
                className="py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
              >
                reyal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
