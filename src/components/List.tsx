import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Table, Lock, Unlock, Check, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Column {
  id: string;
  label: string;
  order: number;
}

interface Row {
  id: string;
  name: string;
  checks: Record<string, boolean>;
  order: number;
}

import * as XLSX from 'xlsx';

interface TableData {
  id: string;
  name: string;
  authorId: string;
  isLocked?: boolean;
  createdAt?: Timestamp;
}

export default function List({ isAdmin, user }: { isAdmin: boolean, user: User | null }) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableId, setActiveTableId] = useState<string>('');
  const [cols, setCols] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [newRowName, setNewRowName] = useState('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'table' | 'row', id?: string } | null>(null);

  // Sync Tables list
  useEffect(() => {
    const q = query(collection(db, 'absenTables'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: TableData[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data() as any, id: doc.id });
      });
      // Sort manually to handle missing createdAt or non-Timestamp types
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setTables(data);
      setLoading(false);
    }, (error) => {
      console.error("Absen tables listener error:", error);
      if (error.code === 'permission-denied') {
        alert("Gagal memuat daftar tabel: Izin ditolak. Anda tetap bisa melihat data yang sudah terbuka.");
      } else {
        alert("Gagal memuat daftar tabel: " + error.message);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync active table data
  useEffect(() => {
    if (!activeTableId) {
      setCols([]);
      setRows([]);
      return;
    }

    setLoading(true);

    const unsubCols = onSnapshot(
      query(collection(db, 'absenTables', activeTableId, 'cols'), orderBy('order', 'asc')),
      (snap) => {
        const c: Column[] = [];
        snap.forEach(d => c.push({ ...d.data() as any, id: d.id }));
        setCols(c);
      },
      (error) => {
        console.error("Absen cols listener error:", error);
        alert("Gagal memuat kolom: " + error.message);
      }
    );

    const unsubRows = onSnapshot(
      query(collection(db, 'absenTables', activeTableId, 'rows'), orderBy('order', 'asc')),
      (snap) => {
        const r: Row[] = [];
        snap.forEach(d => r.push({ ...d.data() as any, id: d.id }));
        setRows(r);
        setLoading(false);
      },
      (error) => {
        console.error("Absen rows listener error:", error);
        alert("Gagal memuat baris: " + error.message);
        setLoading(false);
      }
    );

    return () => {
      unsubCols();
      unsubRows();
    };
  }, [activeTableId]);

  const createTable = async () => {
    if (!user) return alert('Anda harus Login Google terlebih dahulu untuk bisa menyimpan data!');
    if (!newTableName.trim()) return alert('Nama tabel tidak boleh kosong!');

    setLoading(true);
    try {
      const tablesRef = collection(db, 'absenTables');
      const docRef = await addDoc(tablesRef, {
        name: newTableName.trim(),
        authorId: user.uid,
        isLocked: false,
        createdAt: Timestamp.now()
      });

      setActiveTableId(docRef.id);
      setIsCreatingTable(false);
      setNewTableName('');
    } catch (e: any) {
      console.error("Error creating table:", e);
      alert('Gagal membuat tabel: ' + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (tableId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'absenTables', tableId), {
        isLocked: !currentStatus
      });
    } catch (e: any) {
      alert('Gagal mengubah status kunci: ' + e.message);
    }
  };

  const deleteTable = async () => {
    if (!isAdmin) return alert('Hanya admin yang bisa menghapus tabel!');
    if (!activeTableId) return;
    
    setLoading(true);
    try {
      console.log("Nuclear deleting table:", activeTableId);
      // Deleting subcollections first (Rows & Cols)
      const batch = writeBatch(db);
      
      const rowsSnap = await getDocs(collection(db, 'absenTables', activeTableId, 'rows'));
      rowsSnap.forEach(d => batch.delete(d.ref));

      const colsSnap = await getDocs(collection(db, 'absenTables', activeTableId, 'cols'));
      colsSnap.forEach(d => batch.delete(d.ref));

      // Delete the main document
      batch.delete(doc(db, 'absenTables', activeTableId));
      
      await batch.commit();
      setActiveTableId('');
      setConfirmDelete(null);
    } catch (e: any) {
      console.error("Delete table error:", e);
      alert('Gagal menghapus tabel: ' + (e.message || e.toString()));
      setConfirmDelete(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (rowId: string) => {
    const table = tables.find(t => t.id === activeTableId);
    if (table?.isLocked && !isAdmin) return alert('Tabel dikunci admin!');
    
    try {
      await deleteDoc(doc(db, 'absenTables', activeTableId, 'rows', rowId));
      setConfirmDelete(null);
    } catch (e: any) {
      console.error("Delete row error:", e);
      alert("Gagal menghapus baris: " + e.message);
      setConfirmDelete(null);
    }
  };

  const addRow = async () => {
    const table = tables.find(t => t.id === activeTableId);
    if (table?.isLocked && !isAdmin) return alert('Tabel dikunci admin!');
    if (!user) return alert('Login Google dulu!');
    if (!newRowName || !activeTableId) return;
    try {
      await addDoc(collection(db, 'absenTables', activeTableId, 'rows'), {
        name: newRowName,
        checks: {},
        order: rows.length,
        createdAt: Timestamp.now()
      });
      setNewRowName('');
    } catch (e: any) {
      alert('Gagal menambah baris: ' + e.message);
    }
  };

  const addClassRows = async () => {
    const table = tables.find(t => t.id === activeTableId);
    if (table?.isLocked && !isAdmin) return alert('Tabel dikunci admin!');
    if (!user) return alert('Login Google dulu!');
    if (!activeTableId) return;
    const names = [
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
    
    try {
      const batch = writeBatch(db);
      names.forEach((name, i) => {
        const ref = doc(collection(db, 'absenTables', activeTableId, 'rows'));
        batch.set(ref, { 
          name, 
          checks: {}, 
          order: rows.length + i,
          createdAt: Timestamp.now() 
        });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheck = async (rowId: string, colId: string, currentVal: boolean) => {
    const table = tables.find(t => t.id === activeTableId);
    if (table?.isLocked && !isAdmin) return alert('Tabel ini telah dikunci oleh Admin.');
    if (!user) return alert('Login Google untuk mengisi data.');
    
    try {
      await updateDoc(doc(db, 'absenTables', activeTableId, 'rows', rowId), {
        [`checks.${colId}`]: !currentVal
      });

      // Log activity for chart
      addDoc(collection(db, 'table_activity'), {
        tableId: activeTableId,
        rowId,
        colId,
        value: !currentVal,
        userId: user.uid,
        userName: user.displayName || 'Anonim',
        createdAt: Timestamp.now()
      }).catch(console.error);
    } catch (e: any) {
      console.error("Error updating check:", e);
      alert("Gagal mengupdate data: " + (e.message || e.toString()));
    }
  };

  const addColumn = async () => {
    const table = tables.find(t => t.id === activeTableId);
    if (table?.isLocked && !isAdmin) return alert('Tabel dikunci admin!');
    if (!user) return alert('Login Google dulu!');
    if (!newColumnLabel.trim() || !activeTableId) return;
    try {
      await addDoc(collection(db, 'absenTables', activeTableId, 'cols'), {
        label: newColumnLabel.trim(),
        order: cols.length
      });
      setIsAddingColumn(false);
      setNewColumnLabel('');
    } catch (e: any) {
      alert('Gagal menambah kolom: ' + e.message);
    }
  };

  const exportExcel = () => {
    const activeTable = tables.find(t => t.id === activeTableId);
    if (!activeTable) return;

    const data = rows.map((r, i) => {
      const rowData: any = {
        'No': i + 1,
        'Nama': r.name
      };
      cols.forEach(c => {
        rowData[c.label] = r.checks[c.id] ? 'V' : '';
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${activeTable.name}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Memuat Data...</p>
      </div>
    );
  }

  const activeTable = tables.find(t => t.id === activeTableId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">Daftar List</h2>
          <p className="text-xs md:text-sm text-gray-400">Buat tabel custom untuk absensi, pembayaran, atau ceklis apapun</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button 
          onClick={() => setIsCreatingTable(true)}
          className="flex-1 md:flex-none px-6 py-3 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus size={14}/> Tabel Baru
        </button>
        
        <div className="relative flex-1 md:max-w-xs">
          <select 
            value={activeTableId} 
            onChange={e => setActiveTableId(e.target.value)}
            className="w-full px-6 py-3 text-xs rounded-xl border border-gray-200 dark:border-blue-900/30 bg-white dark:bg-[#1a252f] outline-none appearance-none font-bold pr-10 shadow-sm"
          >
            <option value="">— Pilih Tabel —</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <Table size={14} />
          </div>
        </div>

        {activeTableId && isAdmin && (
          <button 
            onClick={() => setConfirmDelete({ type: 'table' })}
            className="px-6 py-3 bg-white dark:bg-red-900/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border border-red-50 dark:border-red-900/10"
          >
            Hapus Tabel
          </button>
        )}
      </div>

      {isCreatingTable && (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-gray-200 dark:border-blue-900/40 p-6 shadow-2xl shadow-gray-200 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <h4 className="font-serif text-lg font-bold mb-4">Buat Tabel Baru</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Masukkan nama tabel (contoh: Absensi Smt 1)..."
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <button 
              onClick={createTable}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20"
            >
              Simpan
            </button>
            <button 
              onClick={() => setIsCreatingTable(false)}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl text-xs font-bold"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {activeTable ? (
        <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-gray-200 dark:border-blue-900/30 overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold">{activeTable.name}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{rows.length} anggota · {cols.length} kolom</p>
              
              <div className="mt-4 flex flex-wrap gap-4">
                {cols.map(c => {
                  const count = rows.filter(r => r.checks && r.checks[c.id]).length;
                  const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
                  return (
                    <div key={c.id} className="flex-1 min-w-[150px]">
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span className="text-gray-400 uppercase tracking-tighter">{c.label}</span>
                        <span className="text-blue-500">{count}/{rows.length} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 self-start">
              {isAdmin && (
                <button 
                  onClick={() => toggleLock(activeTable.id, !!activeTable.isLocked)}
                  className={`p-1.5 rounded-lg transition-all ${activeTable.isLocked ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:text-blue-500 hover:bg-gray-100'}`}
                  title={activeTable.isLocked ? "Buka Kunci" : "Kunci Tabel"}
                >
                  {activeTable.isLocked ? <Lock size={18}/> : <Unlock size={18}/>}
                </button>
              )}
              {(isAdmin || !activeTable.isLocked) && (
                <div className="flex gap-2">
                  {isAddingColumn ? (
                    <div className="flex gap-1 animate-in slide-in-from-right-2">
                      <input 
                        type="text"
                        placeholder="Nama kolom..."
                        value={newColumnLabel}
                        onChange={e => setNewColumnLabel(e.target.value)}
                        className="px-3 py-1.5 text-[10px] rounded-lg border border-blue-200 outline-none w-32"
                        autoFocus
                      />
                      <button onClick={addColumn} className="px-2 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-bold">OK</button>
                      <button onClick={() => setIsAddingColumn(false)} className="px-2 py-1 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-bold">X</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingColumn(true)} className="px-3 py-1.5 text-xs font-bold text-blue-500 hover:bg-blue-50 rounded-lg border border-blue-100">+ Kolom</button>
                  )}
                </div>
              )}
              <button onClick={exportExcel} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-1.5"><Download size={14}/> Export</button>
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse table-fixed md:table-auto">
              <thead>
                <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                  <th className="sticky left-0 z-20 bg-blue-50 dark:bg-blue-950 px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 w-12 md:w-16">#</th>
                  <th className="sticky left-12 md:left-16 z-20 bg-blue-50 dark:bg-blue-950 px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[150px] md:min-w-[200px]">Nama Anggota</th>
                  {cols.map(col => (
                    <th key={col.id} className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center min-w-[80px]">{col.label}</th>
                  ))}
                  {isAdmin && <th className="px-6 py-4 w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#1a252f] px-4 md:px-6 py-4 text-xs text-gray-400 font-medium">{i + 1}</td>
                    <td className="sticky left-12 md:left-16 z-10 bg-white dark:bg-[#1a252f] px-4 md:px-6 py-4 text-xs font-bold truncate group-hover:whitespace-normal transition-all">{row.name}</td>
                    {cols.map(col => (
                    <td key={col.id} className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleCheck(row.id, col.id, !!(row.checks && row.checks[col.id]))}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto ${
                          row.checks && row.checks[col.id] 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-gray-100 dark:bg-gray-800 text-transparent hover:text-gray-300 border border-transparent hover:border-gray-200'
                        } ${(activeTable?.isLocked && !isAdmin) ? 'cursor-not-allowed group opacity-50' : 'cursor-pointer group'}`}
                      >
                        <Check size={16} strokeWidth={3} />
                        {(activeTable?.isLocked && !isAdmin) ? (
                          <div className="absolute opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[8px] px-2 py-1 rounded-md pointer-events-none transition-opacity">Tabel Dikunci Admin</div>
                        ) : !isAdmin && !(row.checks && row.checks[col.id]) && (
                          <div className="absolute opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[8px] px-2 py-1 rounded-md pointer-events-none transition-opacity">Khusus Anggota</div>
                        )}
                      </button>
                    </td>
                    ))}
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setConfirmDelete({ type: 'row', id: row.id })}
                          className="text-gray-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      {(isAdmin || (activeTable && !activeTable.isLocked)) && (
        <div className="p-4 bg-gray-50 dark:bg-gray-950/50 flex flex-col md:flex-row gap-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="Tambahkan nama anggota baru..." 
              value={newRowName}
              onChange={e => setNewRowName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRow()}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
            <button 
              onClick={addRow}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/10"
            >
              Tambah
            </button>
          </div>
          <button 
            onClick={addClassRows}
            className="px-6 py-2.5 bg-white dark:bg-gray-800 text-blue-500 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Isi Nama Sekelas
          </button>
        </div>
      )}
    </div>
  ) : tables.length > 0 ? (
        <div className="animate-in fade-in duration-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
              <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
              Lemari Tabel <span className="text-sm font-sans font-normal text-gray-400">({tables.length} arsip)</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {tables.map((t, idx) => (
               <motion.div
                 key={t.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.05 }}
                 onClick={() => setActiveTableId(t.id)}
                 className="group relative cursor-pointer"
               >
                 <div className="absolute inset-0 bg-blue-500 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
                 <div className="relative h-full bg-white dark:bg-[#1a252f] rounded-[32px] border border-gray-200 dark:border-blue-900/20 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300">
                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform shadow-inner">
                      {t.isLocked ? <Lock size={28} className="text-amber-500" /> : <Table size={28} />}
                    </div>
                    <h4 className="font-serif text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors flex items-center gap-2">
                      {t.name}
                      {t.isLocked && <Lock size={14} className="text-amber-500" />}
                    </h4>
                    <div className="flex items-center gap-2 mb-6">
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-blue-400/50 transition-colors">Digital Archive</span>
                       <div className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-[10px] font-bold text-gray-300">2026</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                       <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter flex items-center gap-1">
                          Buka Tabel <Check size={10} strokeWidth={3} />
                       </span>
                       <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <ArrowRight size={14} />
                       </div>
                    </div>
                 </div>
               </motion.div>
             ))}
             
             {isAdmin && (
               <div 
                 onClick={() => setIsCreatingTable(true)}
                 className="flex flex-col items-center justify-center p-8 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all cursor-pointer group h-full min-h-[220px]"
               >
                 <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-500 group-hover:text-white mb-4 transition-all shadow-sm">
                   <Plus size={24} />
                 </div>
                 <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500">Tambah Tabel</span>
               </div>
             )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a252f] rounded-[32px] border border-gray-200 dark:border-blue-900/30 p-20 text-center shadow-2xl shadow-gray-200/60 dark:shadow-blue-500/5 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-200 mb-6">
            <Table size={40} />
          </div>
          <h3 className="font-serif text-2xl font-bold mb-2">Daftar List & Pendataan</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-8">Pilih tabel yang sudah ada atau buat tabel baru untuk mulai mengelola data anggota kelas.</p>
          {!isAdmin ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                <Lock size={12}/> Mode Admin Dibutuhkan untuk Mengedit
              </div>
              <p className="text-[10px] text-gray-400">Silakan klik ikon perisai di pojok kanan atas untuk login Admin</p>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreatingTable(true)}
              className="px-8 py-3 bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all font-sans uppercase tracking-widest"
            >
              Buat Tabel Pertama Sekarang
            </button>
          )}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
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
              <p className="text-xs text-gray-400 mb-8 font-medium uppercase tracking-widest leading-relaxed">
                {confirmDelete.type === 'table' 
                  ? 'Seluruh tabel dan data di dalamnya akan dihapus permanen' 
                  : 'Baris anggota ini akan dihapus permanen'}
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
                    if (confirmDelete.type === 'table') deleteTable();
                    else if (confirmDelete.id) deleteRow(confirmDelete.id);
                  }}
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
