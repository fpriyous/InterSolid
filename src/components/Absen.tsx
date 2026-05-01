import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Table } from 'lucide-react';

interface Row {
  name: string;
  checks: Record<string, boolean>;
}

interface Column {
  id: string;
  label: string;
}

interface TableData {
  id: string;
  name: string;
  cols: Column[];
  rows: Row[];
}

export default function Absen() {
  const [tables, setTables] = useState<Record<string, TableData>>(() => {
    const saved = localStorage.getItem('IS_absenTables');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [activeTableId, setActiveTableId] = useState<string>('');
  const [newRowName, setNewRowName] = useState('');

  useEffect(() => {
    localStorage.setItem('IS_absenTables', JSON.stringify(tables));
  }, [tables]);

  const activeTable = tables[activeTableId];

  const createTable = () => {
    const name = prompt('Nama tabel baru:');
    if (!name) return;
    const id = 'tbl_' + Date.now();
    const newTable: TableData = {
      id,
      name,
      cols: [{ id: 'c1', label: 'Hadir' }, { id: 'c2', label: 'Iuran' }],
      rows: []
    };
    setTables({ ...tables, [id]: newTable });
    setActiveTableId(id);
  };

  const deleteTable = () => {
    if (!activeTableId || !confirm('Hapus tabel ini?')) return;
    const newTables = { ...tables };
    delete newTables[activeTableId];
    setTables(newTables);
    setActiveTableId('');
  };

  const addRow = () => {
    if (!newRowName || !activeTableId) return;
    const newTables = { ...tables };
    newTables[activeTableId].rows.push({ name: newRowName, checks: {} });
    setTables(newTables);
    setNewRowName('');
  };

  const toggleCheck = (rowIdx: number, colId: string) => {
    const newTables = { ...tables };
    const row = newTables[activeTableId].rows[rowIdx];
    row.checks[colId] = !row.checks[colId];
    setTables(newTables);
  };

  const addColumn = () => {
    const label = prompt('Nama kolom baru:');
    if (!label) return;
    const newTables = { ...tables };
    newTables[activeTableId].cols.push({ id: 'c' + Date.now(), label });
    setTables(newTables);
  };

  const exportCSV = () => {
    if (!activeTable) return;
    let csv = 'No,Nama,' + activeTable.cols.map(c => c.label).join(',') + '\n';
    activeTable.rows.forEach((r, i) => {
      csv += `${i + 1},${r.name},` + activeTable.cols.map(c => r.checks[c.id] ? 'V' : '').join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable.name}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#1a252f] p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
        <button 
          onClick={createTable}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus size={14}/> Tabel Baru
        </button>
        
        <select 
          value={activeTableId} 
          onChange={e => setActiveTableId(e.target.value)}
          className="px-4 py-2 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 outline-none flex-1 md:flex-none md:min-w-[200px]"
        >
          <option value="">— Pilih Tabel —</option>
          {Object.values(tables).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {activeTableId && (
          <button 
            onClick={deleteTable}
            className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
          >
            Hapus Tabel
          </button>
        )}
      </div>

      {activeTable ? (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-serif text-xl font-bold">{activeTable.name}</h3>
              <p className="text-[10px] text-gray-400 mt-1">{activeTable.rows.length} anggota · {activeTable.cols.length} kolom</p>
            </div>
            <div className="flex gap-2">
              <button onClick={addColumn} className="px-3 py-1.5 text-xs font-bold text-blue-500 hover:bg-blue-50 rounded-lg border border-blue-100">+ Kolom</button>
              <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5"><Download size={14}/> Export</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-16">#</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[200px]">Nama</th>
                  {activeTable.cols.map(col => (
                    <th key={col.id} className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">{col.label}</th>
                  ))}
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {activeTable.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-6 py-4 text-xs font-medium">{row.name}</td>
                    {activeTable.cols.map(col => (
                      <td key={col.id} className="px-6 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={!!row.checks[col.id]}
                          onChange={() => toggleCheck(i, col.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20"
                        />
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          const nt = {...tables};
                          nt[activeTableId].rows.splice(i, 1);
                          setTables(nt);
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex gap-2 border-t border-gray-100 dark:border-gray-800">
            <input 
              type="text" 
              placeholder="Tambahkan nama anggota baru..." 
              value={newRowName}
              onChange={e => setNewRowName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRow()}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
            <button 
              onClick={addRow}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              Tambah
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-blue-100 dark:border-blue-900/30 p-16 text-center shadow-sm">
          <Table size={48} className="mx-auto mb-4 text-blue-200" />
          <p className="text-sm text-gray-400">Pilih tabel absen atau buat tabel baru untuk mulai mendata.</p>
        </div>
      )}
    </div>
  );
}
