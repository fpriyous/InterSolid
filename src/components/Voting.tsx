import { useState, useEffect } from 'react';
import { Vote, Trash2, Plus, CheckCircle2, Lock } from 'lucide-react';

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
}

export default function Voting({ isAdmin }: { isAdmin: boolean }) {
  const [polls, setPolls] = useState<Poll[]>(() => {
    const saved = localStorage.getItem('IS_polls');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('IS_hasVoted');
    return saved ? JSON.parse(saved) : {};
  });

  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });

  useEffect(() => {
    localStorage.setItem('IS_polls', JSON.stringify(polls));
    localStorage.setItem('IS_hasVoted', JSON.stringify(hasVoted));
  }, [polls, hasVoted]);

  const addPoll = () => {
    if (!newPoll.question || newPoll.options.some(o => !o)) return;
    const id = 'v_' + Date.now();
    const poll: Poll = {
      id,
      question: newPoll.question,
      options: newPoll.options.map((o, i) => ({ id: 'o' + i, label: o, votes: 0 })),
      isActive: true,
      totalVotes: 0
    };
    setPolls([poll, ...polls]);
    setNewPoll({ question: '', options: ['', ''] });
  };

  const handleVote = (pollId: string, optionId: string) => {
    if (hasVoted[pollId]) return;
    const newPolls = polls.map(p => {
      if (p.id === pollId) {
        return {
          ...p,
          totalVotes: p.totalVotes + 1,
          options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
        };
      }
      return p;
    });
    setPolls(newPolls);
    setHasVoted({ ...hasVoted, [pollId]: true });
  };

  const deletePoll = (id: string) => {
    if (!confirm('Hapus sesi voting ini?')) return;
    setPolls(polls.filter(p => p.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {polls.length > 0 ? (
          polls.map((p) => (
            <div key={p.id} className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg">{p.question}</h3>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{p.totalVotes} Suara Masuk</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deletePoll(p.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {p.options.map((opt) => {
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
        {isAdmin ? (
          <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6 shadow-sm">
            <h4 className="font-bold text-sm mb-4">Buat Voting Baru</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Pertanyaan</label>
                <input 
                  type="text" 
                  placeholder="Apa yang ingin divoting?" 
                  value={newPoll.question}
                  onChange={e => setNewPoll({...newPoll, question: e.target.value})}
                  className="w-full px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Opsi Jawaban</label>
                {newPoll.options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={`Opsi ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const newOpts = [...newPoll.options];
                        newOpts[i] = e.target.value;
                        setNewPoll({...newPoll, options: newOpts});
                      }}
                      className="flex-1 px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none"
                    />
                    {newPoll.options.length > 2 && (
                      <button onClick={() => setNewPoll({...newPoll, options: newPoll.options.filter((_, idx) => idx !== i)})} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                  className="w-full py-2 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={12}/> Tambah Opsi
                </button>
              </div>
              <button 
                onClick={addPoll}
                className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                Publikasikan Voting
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-center">
            <Lock size={24} className="mx-auto mb-3 text-blue-400" />
            <p className="text-[10px] font-bold uppercase text-blue-500 tracking-widest mb-1">Akses Terbatas</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Gunakan PIN Admin untuk membuat sesi voting baru.</p>
          </div>
        )}
      </div>
    </div>
  );
}
