export interface CanteenDish {
  id: string;
  name: string;
  hanzi: string;
  desc: string;
  icon: string;
  cost: number;
  crunchType: 'crunch' | 'slurp' | 'boba_pop' | 'spicy_sizzle' | 'soup_sip' | 'munch';
  buffEffect: string;
  flavorText: string;
}

export const CANTEEN_DISHES: CanteenDish[] = [
  {
    id: 'peking_duck',
    name: 'Bebek Peking Kenegaraan',
    hanzi: '北京烤鸭 (Běijīng Kǎoyā)',
    desc: 'Resep rahasia Dinasti Ming dengan stempel segel traktat damai bilateral.',
    icon: '🦆',
    cost: 30,
    crunchType: 'crunch',
    buffEffect: '+100% Aura Kedaulatan',
    flavorText: 'Kulitnya renyah krispi, membuat resolusi DK PBB disahkan tanpa veto!'
  },
  {
    id: 'seblak_laily',
    name: 'Seblak Ceker Laily Lv.100',
    hanzi: '百级麻辣爪 (Bǎi Jí Málà Zhuǎ)',
    desc: 'Pedas merconnya setara tensi embargo minyak & perang tarif multilateral.',
    icon: '🌶️',
    cost: 25,
    crunchType: 'spicy_sizzle',
    buffEffect: '+500 Heat Bilateral',
    flavorText: 'Pedasnya bikin delegasi musuh menangis minta damai sambil keringatan!'
  },
  {
    id: 'boba_chagee',
    name: 'Boba Chagee Diplomasi',
    hanzi: '外交珍珠奶茶 (Wàijiāo Zhēnzhū Nǎichá)',
    desc: 'Soft power teh susu penghangat negosiasi yang sempat macet di Jenewa.',
    icon: '🧋',
    cost: 20,
    crunchType: 'boba_pop',
    buffEffect: '+10.000 Aura Rizz',
    flavorText: 'Manis legitnya menyegarkan diplomasi meja makan tingkat tinggi!'
  },
  {
    id: 'jiaozi_mentai',
    name: 'Jiaozi Dimas Mentai',
    hanzi: '和平水饺 (Hépíng Shuǐjiǎo)',
    desc: 'Pangsit montok berkulit tipis berbalut saus mentai gurih simbol aliansi strategis.',
    icon: '🥟',
    cost: 20,
    crunchType: 'munch',
    buffEffect: '+50 Harmoni Traktat',
    flavorText: 'Satu suapan mentai mempererat persahabatan 200 negara anggota PBB!'
  },
  {
    id: 'cilok_traktat',
    name: 'Cilok Kuah Traktat Beijing',
    hanzi: '北京条约丸子 (Běijīng Tiáoyuè Wánzi)',
    desc: 'Cilok kenyal diselimuti bumbu kacang ratifikasi nota diplomatik.',
    icon: '🍢',
    cost: 15,
    crunchType: 'slurp',
    buffEffect: '+30 Kecepatan Sat-Set',
    flavorText: 'Kenyalnya bikin dosen penguji skripsi HI langsung kasih nilai A bulat!'
  },
  {
    id: 'longjing_tea',
    name: 'Teh Hijau Longjing Abena',
    hanzi: '西湖龙井茶 (Xīhú Lóngjǐng Chá)',
    desc: 'Dipetik langsung saat delegasi Abena beristirahat di kebun teh Hangzhou.',
    icon: '🍵',
    cost: 15,
    crunchType: 'soup_sip',
    buffEffect: '+100 Ketenangan Mewing',
    flavorText: 'Aroma teh menenangkan pikiran saat menghadapi sidang interpelasi.'
  },
  {
    id: 'cireng_natuna',
    name: 'Cireng Krispi Laut Natuna',
    hanzi: '纳土纳酥脆饼 (Nàtǔnà Sūcuì Bǐng)',
    desc: 'Gorengan renyah kuah cuko penjaga kedaulatan batas laut ZEE 200 mil.',
    icon: '🍘',
    cost: 10,
    crunchType: 'crunch',
    buffEffect: '+200 Pertahanan Maritim',
    flavorText: 'Gurih kriuknya mengamankan rute perdagangan internasional!'
  },
  {
    id: 'tongkol_malaka',
    name: 'Tongkol Asap Selat Malaka',
    hanzi: '马六甲熏鱼 (Mǎliùjiǎ Xūnyú)',
    desc: 'Ikan segar tangkapan diplomasi maritim tanpa gesekan sengketa teritorial.',
    icon: '🐟',
    cost: 10,
    crunchType: 'munch',
    buffEffect: '+80 Pasokan Energi Kapal',
    flavorText: 'Disukai para pelaut dan duta besar lintas samudera!'
  }
];

export interface CatFeedRecord {
  id: string; // `${catId}_${userId}`
  catId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  feedCount: number;
  totalXpSpent: number;
  lastDish: string;
  lastDishIcon?: string;
  lastFedAt: string;
  topTitle?: string;
}

export function getFeederTitle(count: number): { title: string; badge: string; color: string } {
  if (count >= 50) {
    return { title: 'Raja Sugar Daddy/Mommy Kucing Internasional', badge: '👑 SULTAN AKUT', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
  } else if (count >= 25) {
    return { title: 'Duta Besar Kehormatan Traktir Seblak', badge: '💎 DUTA MAHA BESAR', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
  } else if (count >= 10) {
    return { title: 'Atase Gastrodiplomasi & Bebek Peking', badge: '⭐ DONATUR ELIT', color: 'text-red-500 bg-red-500/10 border-red-500/30' };
  } else if (count >= 5) {
    return { title: 'Sahabat Sejati Oyen & Chen Blep', badge: '🐾 JURAGAN JAJAN', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
  }
  return { title: 'Magang Traktir Kantin Diplomatik', badge: '🥟 PENDATANG BARU', color: 'text-slate-500 bg-slate-500/10 border-slate-500/30' };
}
