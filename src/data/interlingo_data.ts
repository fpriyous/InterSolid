export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  pinyin?: string;
  audioText?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  questions: Question[];
  catMentor: string;
}

export interface CatMentor {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  overlayType: 'hat' | 'paw' | 'tongue' | 'cool' | 'rebel' | 'closeup';
  catchphrase: string;
  color: string;
}

export const CAT_MENTORS: Record<string, CatMentor> = {
  explorer: {
    id: 'explorer',
    name: 'Prof. Meow-zi',
    role: 'Pakar Geopolitik Tropis',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400',
    overlayType: 'hat',
    catchphrase: 'Mari kita petakan konstelasi geopolitik meow-dunia!',
    color: 'from-amber-400 to-orange-500',
  },
  diplomat: {
    id: 'diplomat',
    name: 'Diplomat Orange',
    role: 'Utusan Bilateral Utama',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=400',
    overlayType: 'paw',
    catchphrase: 'Sini jabat tangan dulu sebelum tanda tangan memorandum!',
    color: 'from-orange-400 to-red-500',
  },
  blep: {
    id: 'blep',
    name: 'Blep-zi',
    role: 'Atase Keamanan & Sarden',
    imageUrl: 'https://images.unsplash.com/photo-1574158622643-69d34d72650a?auto=format&fit=crop&q=80&w=400',
    overlayType: 'tongue',
    catchphrase: 'Blep! Teori Liberalisme itu semanis kuah Whiskas!',
    color: 'from-yellow-300 to-amber-500',
  },
  cool: {
    id: 'cool',
    name: 'Chiko Smoke',
    role: 'Lobbyist Meja Makan',
    imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=400',
    overlayType: 'cool',
    catchphrase: 'Lobi-lobi kantin adalah kunci veto sesungguhnya, kawan.',
    color: 'from-blue-400 to-indigo-600',
  },
  rebel: {
    id: 'rebel',
    name: 'Sir Grumpy',
    role: 'Oposisi Garis Keras',
    imageUrl: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=400',
    overlayType: 'rebel',
    catchphrase: 'INTERUPSI DEWAN KEAMANAN! Mana jatah snack kucing soreku?!',
    color: 'from-gray-500 to-slate-700',
  },
  closeup: {
    id: 'closeup',
    name: 'Lick-o-Saurus',
    role: 'Atase Pers & Humas',
    imageUrl: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&q=80&w=400',
    overlayType: 'closeup',
    catchphrase: 'APAAA?! Berita hari ini sangat menggemparkan meow-media!',
    color: 'from-pink-400 to-rose-600',
  }
};

export const LESSONS: Lesson[] = [
  {
    id: "lesson_1",
    title: "Sapaan Diplomatik (Greetings)",
    description: "Kuasai salam sapaan dasar Mandarin untuk diplomasi bilateral awal.",
    xp: 50,
    catMentor: 'diplomat',
    questions: [
      {
        id: "q1_1",
        question: "Bagaimana mengucapkan 'Halo' dalam bahasa Mandarin?",
        options: ["Nǐ hǎo (你好)", "Xièxiè (谢谢)", "Zàijiàn (再见)", "Duìbùqǐ (对不起)"],
        correctAnswer: 0,
        pinyin: "nǐ hǎo",
        audioText: "你好",
        explanation: "'Nǐ hǎo (你好)' adalah sapaan universal 'Halo' yang wajib diucapkan saat menyapa delegasi diplomatik."
      },
      {
        id: "q1_2",
        question: "Apa arti resmi dari salam penutup 'Zàijiàn (再见)'?",
        options: ["Terima Kasih", "Sama-sama", "Sampai Jumpa / Sampai Bertemu Lagi", "Maaf Saja"],
        correctAnswer: 2,
        pinyin: "zài jiàn",
        audioText: "再见",
        explanation: "'Zàijiàn (再见)' secara harfiah berarti 'bertemu kembali', merupakan salam perpisahan santun."
      },
      {
        id: "q1_3",
        question: "Bagaimana cara delegasi mengucapkan 'Terima Kasih'?",
        options: ["Hǎo (好)", "Xièxiè (谢谢)", "Bù kèqì (不客气)", "Měiguānxi (没关系)"],
        correctAnswer: 1,
        pinyin: "xiè xiè",
        audioText: "谢谢",
        explanation: "'Xièxiè (谢谢)' adalah ungkapan apresiasi standar dalam hubungan antarmasyarakat (G2G/P2P)."
      }
    ]
  },
  {
    id: "lesson_2",
    title: "Aktor & Negara (Geopolitics)",
    description: "Pelajari kosa kata geopolitik negara-negara hegemoni dunia.",
    xp: 60,
    catMentor: 'explorer',
    questions: [
      {
        id: "q2_1",
        question: "Bahasa Mandarin dari negara tuan rumah 'Tiongkok' (China) adalah...",
        options: ["Měiguó (美国)", "Zhōngguó (中国)", "Yìndù (印度)", "Rìběn (日本)"],
        correctAnswer: 1,
        pinyin: "zhōng guó",
        audioText: "中国",
        explanation: "'Zhōngguó (中国)' berarti 'Negara Tengah' (Tiongkok), episentrum Jalur Sutra."
      },
      {
        id: "q2_2",
        question: "Negara adidaya manakah yang diterjemahkan sebagai 'Měiguó (美国)'?",
        options: ["Amerika Serikat", "Inggris Raya", "Federasi Rusia", "Republik Prancis"],
        correctAnswer: 0,
        pinyin: "měi guó",
        audioText: "美国",
        explanation: "'Měiguó (美国)' berarti 'Negara Cantik/Indah', merujuk pada Amerika Serikat (USA)."
      },
      {
        id: "q2_3",
        question: "Apa arti dari peran sentral 'Dàshǐ (大使)' dalam HI?",
        options: ["Presiden", "Menteri Luar Negeri", "Duta Besar", "Konsul Jenderal"],
        correctAnswer: 2,
        pinyin: "dà shǐ",
        audioText: "大使",
        explanation: "'Dàshǐ (大使)' adalah Duta Besar Luar Biasa dan Berkuasa Penuh yang diutus mewakili kepentingan negara."
      }
    ]
  },
  {
    id: "lesson_3",
    title: "Paradigma Teori HI (Paradigms)",
    description: "Menerjemahkan ideologi perang & damai ke dialek Mandarin akademis.",
    xp: 80,
    catMentor: 'blep',
    questions: [
      {
        id: "q3_1",
        question: "Teori Realisme fokus pada 'Kekuasaan' (Power). Apa bahasa Mandarinnya?",
        options: ["Wénhuà (文化)", "Quánlì (权力)", "Guójiā (国家)", "Xíngdòng (行动)"],
        correctAnswer: 1,
        pinyin: "quán lì",
        audioText: "权力",
        explanation: "'Quánlì (权力)' adalah istilah Mandarin resmi untuk kekuasaan (Power) sebagai alat bertahan hidup di sistem anarki."
      },
      {
        id: "q3_2",
        question: "Teori Liberalisme mengagungkan 'Perdamaian' (Peace). Apa kosa katanya?",
        options: ["Hépíng (和平)", "Zhànzhēng (战争)", "Hézuò (合作)", "Chōngtū (冲突)"],
        correctAnswer: 0,
        pinyin: "hé píng",
        audioText: "和平",
        explanation: "'Hépíng (和平)' adalah perdamaian demokratis, pilar utama dari liberalisme internasional."
      },
      {
        id: "q3_3",
        question: "Apa istilah Mandarin untuk 'Kerjasama / Kolaborasi' (Cooperation)?",
        options: ["Zhànzhēng (战争)", "Chōngtū (冲突)", "Hézuò (合作)", "Tánpàn (谈判)"],
        correctAnswer: 2,
        pinyin: "hé zuò",
        audioText: "合作",
        explanation: "'Hézuò (合作)' melambangkan kerjasama institusional multilateral antar-aktor internasional."
      }
    ]
  },
  {
    id: "lesson_4",
    title: "Bahasa Lobi Kantin (Lobbying Tactics)",
    description: "Bahasa lobi diplomasi santai untuk mengamankan resolusi di kantin FISIP.",
    xp: 90,
    catMentor: 'cool',
    questions: [
      {
        id: "q4_1",
        question: "Bagaimana cara menyuap rekan aliansi dengan mengajak mereka 'Makan Nasi Goreng'?",
        options: ["Chī chǎofàn (吃炒饭)", "Hē chá (喝茶)", "Kàn diànyǐng (看电影)", "Shuìjiào (睡觉)"],
        correctAnswer: 0,
        pinyin: "chī chǎo fàn",
        audioText: "吃炒饭",
        explanation: "'Chī chǎofàn (吃炒饭)' berarti makan nasi goreng, umpan lobi diplomasi meja makan paling legendaris."
      },
      {
        id: "q4_2",
        question: "Apa istilah untuk diplomasi menyegarkan 'Es Teh Manis'?",
        options: ["Kāfēi (咖啡)", "Bīng nǎichá (冰奶茶)", "Bīng lùchá (冰绿茶)", "Bīng tián chá (冰甜茶)"],
        correctAnswer: 3,
        pinyin: "bīng tián chá",
        audioText: "冰甜茶",
        explanation: "'Bīng tián chá (冰甜茶)' berarti Es Teh Manis, instrumen peredam emosi saat sidang MUN memanas."
      },
      {
        id: "q4_3",
        question: "Frasa 'Wǒ qǐngkè (我请客)' sangat kuat saat melobi koalisi. Apa artinya?",
        options: ["Saya tidak punya uang", "Bagi dua tagihannya", "Saya traktir! (My treat)", "Bayar sendiri-sendiri"],
        correctAnswer: 2,
        pinyin: "wǒ qǐng kè",
        audioText: "我请客",
        explanation: "'Wǒ qǐngkè (我请客)' berarti 'Saya traktir!'. Menjamin 100% rekan delegasi setuju mendukung draf resolusi Anda."
      }
    ]
  },
  {
    id: "lesson_5",
    title: "Retorika Sidang PBB (UN Debate)",
    description: "Kuasai interupsi elegan dan tata tertib sidang PBB/MUN dalam Mandarin.",
    xp: 100,
    catMentor: 'rebel',
    questions: [
      {
        id: "q5_1",
        question: "Bagaimana menyatakan 'Interupsi / Saya Keberatan' dengan tegas dan berwibawa?",
        options: ["Wǒ tóngyì (我同意)", "Wǒ fǎnduì (我反对)", "Wǒ kàngyì (我抗议)", "Méiyǒu wèntí (没有问题)"],
        correctAnswer: 2,
        pinyin: "wǒ kàng yì",
        audioText: "我抗议",
        explanation: "'Wǒ kàngyì (我抗议)' berarti 'Saya mengajukan protes / keberatan (Point of Order)'. Gunakan untuk menghentikan debat kusir."
      },
      {
        id: "q5_2",
        question: "Apa sebutan untuk pimpinan sidang yang memegang palu ketukan, 'Pimpinan Sidang / Chair'?",
        options: ["Zhǔxí (主席)", "Mìshū (秘书)", "Dàbiǎo (代表)", "Xuéshēng (学生)"],
        correctAnswer: 0,
        pinyin: "zhǔ xí",
        audioText: "主席",
        explanation: "'Zhǔxí (主席)' adalah Pimpinan Sidang / Chair / Ketua yang memegang kendali penuh atas alur perdebatan."
      },
      {
        id: "q5_3",
        question: "Bagaimana menyatakan setuju secara diplomatik 'Saya Mendukung (Support)'?",
        options: ["Wǒ zhīchí (我支持)", "Wǒ fǎnduì (我反对)", "Wǒ bùguǎn (不管)", "Wǒ fàngqì (我放弃)"],
        correctAnswer: 0,
        pinyin: "wǒ zhī chí",
        audioText: "我支持",
        explanation: "'Wǒ zhīchí (我支持)' berarti 'Saya mendukung'. Sangat penting saat mensponsori draf resolusi koalisi."
      }
    ]
  },
  {
    id: "lesson_6",
    title: "Ekonomi Politik Global (IPE)",
    description: "Membahas sengketa dagang, inflasi, dan utang global ala diplomat santai.",
    xp: 110,
    catMentor: 'cool',
    questions: [
      {
        id: "q6_1",
        question: "Kosa kata fundamental dari ekonomi politik internasional 'Uang (Money)' adalah...",
        options: ["Yú (鱼)", "Qián (钱)", "Māo (猫)", "Shū (书)"],
        correctAnswer: 1,
        pinyin: "qián",
        audioText: "钱",
        explanation: "'Qián (钱)' adalah uang, bahan bakar utama dari seluruh interaksi ekonomi politik global."
      },
      {
        id: "q6_2",
        question: "Apa bahasa Mandarin dari aktivitas vital 'Perdagangan (Trade)'?",
        options: ["Màoyì (贸易)", "Hézuò (合作)", "Zhànzhēng (战争)", "Xíngshì (形势)"],
        correctAnswer: 0,
        pinyin: "mào yì",
        audioText: "贸易",
        explanation: "'Màoyì (贸易)' berarti perdagangan, episentrum perang tarif perdagangan AS-Tiongkok."
      },
      {
        id: "q6_3",
        question: "Membahas 'Pasar (Market)' sangat krusial dalam IPE. Apa istilah Mandarinnya?",
        options: ["Xuéxiào (学校)", "Shìchǎng (市场)", "Yínháng (银行)", "Gōngshāng (工商)"],
        correctAnswer: 1,
        pinyin: "shì chǎng",
        audioText: "市场",
        explanation: "'Shìchǎng (市场)' berarti pasar, tempat bertemunya pasokan global dan permintaan konsumen."
      }
    ]
  },
  {
    id: "lesson_7",
    title: "Perjanjian Rahasia (Secret Alliance)",
    description: "Frasa rahasia untuk membentuk aliansi bayangan tanpa terendus intel.",
    xp: 120,
    catMentor: 'closeup',
    questions: [
      {
        id: "q7_1",
        question: "Bagaimana membisikkan sandi aliansi rahasia: 'Sangat Rahasia'?",
        options: ["Juémì (绝密)", "Gōngkāi (公开)", "Yībān (一般)", "Dàzhòng (大众)"],
        correctAnswer: 0,
        pinyin: "jué mì",
        audioText: "绝密",
        explanation: "'Juémì (绝密)' berarti sangat rahasia (Top Secret), status dokumen aliansi rahasia para kucing."
      },
      {
        id: "q7_2",
        question: "Apa istilah untuk 'Teman Baik / Aliansi Sejati'?",
        options: ["Chōngtū (冲突)", "Péngyǒu (朋友)", "Méngyǒu (盟友)", "Dìrén (敌人)"],
        correctAnswer: 2,
        pinyin: "méng yǒu",
        audioText: "盟友",
        explanation: "'Méngyǒu (盟友)' adalah sekutu/aliansi resmi yang siap membela jika negara kita diserang sistem anarki."
      },
      {
        id: "q7_3",
        question: "Bagaimana cara menyuruh menyembunyikan rencana: 'Jangan Bicara (Shh...)'?",
        options: ["Bù yào shuōhuà (不要说话)", "Shuō fǎshāng (说吧)", "Dàshēng shuō (大声说)", "Bàngùn (办公)"],
        correctAnswer: 0,
        pinyin: "bù yào shuō huà",
        audioText: "不要说话",
        explanation: "'Bù yào shuōhuà (不要说话)' berarti jangan berbicara, taktik mengamankan dokumen diplomatik sensitif."
      }
    ]
  },
  {
    id: "lesson_8",
    title: "Diplomasi Panda (Panda Diplomacy)",
    description: "Cara meminjam Panda raksasa dari Tiongkok dengan sopan santun setinggi langit.",
    xp: 130,
    catMentor: 'diplomat',
    questions: [
      {
        id: "q8_1",
        question: "Kunci utama dari diplomasi ini, apa bahasa Mandarin dari 'Panda (Giant Panda)'?",
        options: ["Xióngmāo (熊猫)", "Kǎolā (考拉)", "Lǎohǔ (老虎)", "Shīzi (狮子)"],
        correctAnswer: 0,
        pinyin: "xióng māo",
        audioText: "熊猫",
        explanation: "'Xióngmāo (熊猫)' secara harfiah berarti 'Kucing Beruang', magnet soft-power terkuat di bumi."
      },
      {
        id: "q8_2",
        question: "Bagaimana memuji panda mereka sangat imut? 'Sangat Lucu/Imut'...",
        options: ["Hěn piàoliang (很漂亮)", "Hěn kě'ài (很可爱)", "Hěn guì (很贵)", "Hěn xiāng (很香)"],
        correctAnswer: 1,
        pinyin: "hěn kě ài",
        audioText: "很可爱",
        explanation: "'Hěn kě'ài (很可爱)' berarti sangat lucu/imut, frasa wajib agar permohonan peminjaman panda disetujui."
      },
      {
        id: "q8_3",
        question: "Apa sebutan diplomatik untuk aktivitas 'Meminjam (To Borrow)'?",
        options: ["Mǎi (买)", "Mài (卖)", "Jiè (借)", "Sòng (送)"],
        correctAnswer: 2,
        pinyin: "jiè",
        audioText: "借",
        explanation: "'Jiè (借)' berarti meminjam. Panda tidak pernah diberikan permanen, melainkan dipinjamkan sebagai wujud persahabatan bilateral."
      }
    ]
  },
  {
    id: "lesson_9",
    title: "Krisis Geopolitik Akut (Crisis Action)",
    description: "Cara menangani krisis diplomasi saat kucing duta besar memakan ikan koki presiden.",
    xp: 140,
    catMentor: 'rebel',
    questions: [
      {
        id: "q9_1",
        question: "Bagaimana cara meredakan kemarahan presiden tuan rumah dengan berkata: 'Sangat Menyesal / Mohon Maaf'?",
        options: ["Wèishénme (为什么)", "Méishì (没事)", "Jiùshì (就是)", "Fēicháng dǎoqù (非常抱歉)"],
        correctAnswer: 3,
        pinyin: "fēi cháng bào qiàn",
        audioText: "非常抱歉",
        explanation: "'Fēicháng bàoqiàn (非常抱歉)' adalah penyesalan terdalam resmi untuk meredakan tensi diplomatik bilateral."
      },
      {
        id: "q9_2",
        question: "Istilah formal untuk 'Kejadian Darurat / Krisis' dalam hubungan internasional adalah...",
        options: ["Wēijī (危机)", "Hépíng (和平)", "Lǚyóu (旅游)", "Chéngshì (城市)"],
        correctAnswer: 0,
        pinyin: "wēi jī",
        audioText: "危机",
        explanation: "'Wēijī (危机)' berarti krisis. Terdiri dari karakter 'Bahaya' dan 'Peluang' (Risk + Opportunity)."
      },
      {
        id: "q9_3",
        question: "Langkah darurat krisis, meluncurkan negosiasi instan 'Rapat Darurat'...",
        options: ["Jǐnjí huìyì (紧急会议)", "Wànhuì (晚会)", "Kǎoshì (考试)", "Zhōumò (周末)"],
        correctAnswer: 0,
        pinyin: "jǐn jí huì yì",
        audioText: "紧急会议",
        explanation: "'Jǐnjí huìyì (紧急会议)' berarti rapat darurat untuk menyusun taktik pencegahan eskalasi konflik militer."
      }
    ]
  },
  {
    id: "lesson_10",
    title: "Gala Dinner Formal (Dining Protocol)",
    description: "Etika makan formal diplomatik: Menghormati tuan rumah lewat apresiasi makanan.",
    xp: 150,
    catMentor: 'cool',
    questions: [
      {
        id: "q10_1",
        question: "Saat bersulang di gala dinner, apa ucapan resmi 'Tos / Cheers' dalam Mandarin?",
        options: ["Suíbiàn (随便)", "Bàituō (拜托)", "Gānbēi (干杯)", "Chīfàn (吃饭)"],
        correctAnswer: 2,
        pinyin: "gān bēi",
        audioText: "干杯",
        explanation: "'Gānbēi (干杯)' secara harfiah berarti 'keringkan gelas', ucapan bersulang universal yang menghangatkan suasana kerja sama."
      },
      {
        id: "q10_2",
        question: "Bagaimana cara memuji masakan koki istana negara: 'Enak Sekali'?",
        options: ["Hěn hào hē (很好喝)", "Hěn hǎochī (很好吃)", "Hěn nánhé (很难喝)", "Bù hǎochī (不好吃)"],
        correctAnswer: 1,
        pinyin: "hěn hǎo chī",
        audioText: "很好吃",
        explanation: "'Hěn hǎochī (很好吃)' berarti masakan sangat lezat, membuat kepala koki dan menteri luar negeri tersenyum lebar."
      },
      {
        id: "q10_3",
        question: "Sopan santun saat ditawari hidangan tambahan, berkata 'Terima kasih, saya kenyang'...",
        options: ["Xièxiè, wǒ bǎole (谢谢，我饱了)", "Wǒ hái è (我还饿)", "Bùyào gěi wǒ (不要给我)", "Wǒ yào chī kěyǐ (我要吃可以)"],
        correctAnswer: 0,
        pinyin: "xiè xiè, wǒ bǎo le",
        audioText: "谢谢我饱了",
        explanation: "'Xièxiè, wǒ bǎole (谢谢，我饱了)' adalah cara menolak hidangan tambahan dengan halus tanpa menyinggung perasaan koki tuan rumah."
      }
    ]
  },
  {
    id: "lesson_11",
    title: "Perang Dagang Kucing (Feline Trade War)",
    description: "Sengketa bea masuk makanan kucing impor vs perlindungan pakan lokal.",
    xp: 160,
    catMentor: 'rebel',
    questions: [
      {
        id: "q11_1",
        question: "Apa bahasa Mandarin dari 'Makanan Kucing (Cat Food)' yang diperebutkan?",
        options: ["Māoliáng (猫粮)", "Gǒuliáng (狗粮)", "Yúfàn (鱼饭)", "Niúròu (牛肉)"],
        correctAnswer: 0,
        pinyin: "māo liáng",
        audioText: "猫粮",
        explanation: "'Māoliáng (猫粮)' berarti makanan kucing, komoditas sengketa dagang utama antar-kerajaan kucing."
      },
      {
        id: "q11_2",
        question: "Bagaimana menyebut instrumen 'Tarif Impor / Bea Masuk'?",
        options: ["Guānshuì (关税)", "Shuǐshì (水事)", "Xìnyòngkǎ (信用卡)", "Jiàgé (价格)"],
        correctAnswer: 0,
        pinyin: "guān shuì",
        audioText: "关税",
        explanation: "'Guānshuì (关税)' berarti tarif impor, senjata retaliasi utama dalam perang dagang sengketa makanan basah."
      },
      {
        id: "q11_3",
        question: "Bagaimana cara menyerukan embargo: 'Boikot / Melarang Impor'?",
        options: ["Kěyǐ jìnkǒu (可以进口)", "Jǐnzhǐ jìnkǒu (禁止进口)", "Dàliàng jìnkǒu (大量进口)", "Mǎimài (买卖)"],
        correctAnswer: 1,
        pinyin: "jìn zhǐ jìn kǒu",
        audioText: "禁止进口",
        explanation: "'Jǐnzhǐ jìnkǒu (禁止进口)' berarti melarang impor, keputusan sepihak untuk proteksionisme pakan kucing dalam negeri."
      }
    ]
  },
  {
    id: "lesson_12",
    title: "KTT Akhir: Ketertiban Dunia (The Final Summit)",
    description: "Pidato pelantikan perdamaian dunia di hadapan KTT Kucing Sedunia.",
    xp: 200,
    catMentor: 'explorer',
    questions: [
      {
        id: "q12_1",
        question: "Puncak pidato: menyerukan 'Perdamaian Dunia (World Peace)'!",
        options: ["Guójiā hépíng (国家和平)", "Shìjiè hépíng (世界和平)", "Chōngtū jiějué (冲突解决)", "Hézuò gòngtuó (合作共赢)"],
        correctAnswer: 1,
        pinyin: "shì jiè hé píng",
        audioText: "世界和平",
        explanation: "'Shìjiè hépíng (世界和平)' adalah tujuan pamungkas dari seluruh aktivitas diplomasi, negosiasi, dan lobi global."
      },
      {
        id: "q12_2",
        question: "Apa istilah luhur untuk 'Kesejahteraan / Kemakmuran Bersama'?",
        options: ["Fánróng (繁荣)", "Gòngtóng fánróng (共同繁荣)", "Pínhùn (贫困)", "Jiǎnshǎo qián (减少钱)"],
        correctAnswer: 1,
        pinyin: "gòng tóng fán róng",
        audioText: "共同繁荣",
        explanation: "'Gòngtóng fánróng (共同繁荣)' melambangkan kemakmuran bersama, fondasi perdamaian jangka panjang di dunia kucing."
      },
      {
        id: "q12_3",
        question: "Slogan persahabatan selamanya: 'Teman Selamanya (Friends Forever)'!",
        options: ["Yǒngyuǎn de péngyǒu (永远的朋友)", "Wánshàng hǎo (晚上好)", "Zàijiàn fēicháng (再见非常)", "Bù kèqì (不客气)"],
        correctAnswer: 0,
        pinyin: "yǒng yuǎn de péng yǒu",
        audioText: "永远的朋友",
        explanation: "'Yǒngyuǎn de péngyǒu (永远的朋友)' berarti Teman Selamanya, penutup pidato epik yang membuat para delegasi menangis haru."
      }
    ]
  }
];
