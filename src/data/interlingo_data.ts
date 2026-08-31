export type DiplomaticLanguage = 'zh' | 'en';
export type TTSLang = 'zh-CN' | 'en-US';

export interface StudyCard {
  id: string;
  term: string; // Hanzi
  transliteration?: string; // Pinyin with tone marks
  language: DiplomaticLanguage;
  meaning: string;
  contextHI: string;
  exampleSentence: string;
  audioText: string;
  audioLang: TTSLang;
  tag?: string;
}

export interface TheoryBrief {
  title: string;
  summary: string;
  theoreticalPerspective: string;
  diplomaticProtocol: string;
  keyVocabularyHighlights: string[];
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'sentence_builder' | 'matching' | 'scenario_dilemma' | 'listening' | 'true_false';
  question: string;
  subtext?: string;
  options?: string[];
  correctAnswer?: number;
  wordTokens?: string[];
  correctOrder?: string[];
  matchingPairs?: MatchingPair[];
  scenario?: string;
  isTrue?: boolean;
  explanation: string;
  pinyin?: string;
  transliteration?: string;
  audioText?: string;
  audioLang?: TTSLang;
}

export interface Lesson {
  id: string;
  stageNumber: number;
  tier: 1 | 2 | 3 | 4;
  tierLabel: string;
  difficulty: string;
  title: string;
  subtitle: string;
  description: string;
  xp: number;
  catMentor: string;
  theoryBrief: TheoryBrief;
  studyCards: StudyCard[];
  questions: Question[];
}

export interface CatMentor {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  overlayType: 'hat' | 'paw' | 'tongue' | 'cool' | 'rebel' | 'closeup';
  catchphrase: string;
  color: string;
  institution: string;
  tukangSuaraTitle: string;
  geminiVoice: 'Charon' | 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';
  voicePersona: 'baritone_warlord' | 'warm_diplomat' | 'hyperactive_vtuber' | 'sigma_cold' | 'military_fierce' | 'gossipy_auntie';
  voiceModelLabel: string;
  voiceProfile: {
    pitch: number;
    rate: number;
    accent: 'zh-CN' | 'id-ID' | 'en-US';
    meowType: 'baritone_grunt' | 'aristocrat_purr' | 'squeak_chipmunk' | 'sigma_bass' | 'commanding_rawr' | 'gossip_trill';
  };
  feedingVoices: {
    speech: string;
    subtext: string;
    hanzi: string;
  }[];
}

export const CAT_MENTORS: Record<string, CatMentor> = {
  explorer: {
    id: 'explorer',
    name: 'Prof. Oyen Lurah Selat Hormuz (王橘长)',
    role: 'Lurah Selat Hormuz & Panglima Oyen Barbar Antarbangsa',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400',
    overlayType: 'hat',
    catchphrase: 'Selat Hormuz saya gembok pake rantai kapal kalau kapal tanker gak setor seblak & Whiskas! Nǐ hǎo!',
    color: 'from-red-600 via-rose-600 to-amber-500',
    institution: 'Pusat Blokade Maritim & RT 04 Selat Hormuz',
    tukangSuaraTitle: 'Dubber: Suhu Bariton Berat (Vocal Fry Oyen)',
    geminiVoice: 'Charon',
    voicePersona: 'baritone_warlord',
    voiceModelLabel: 'Model Gemini: Charon (Baritone Warlord 🎙️)',
    voiceProfile: {
      pitch: 0.65,
      rate: 0.88,
      accent: 'zh-CN',
      meowType: 'baritone_grunt'
    },
    feedingVoices: [
      {
        speech: 'Miaww! Nǐ hǎo! Selat Hormuz aman terkendali bang! Kapal tanker bebas lewat karena kamu traktir seblak ceker!',
        subtext: '“Miaww! Nǐ hǎo! Jalur tanker minyak dibuka kembali berkat traktat seblak!” 🚢💥',
        hanzi: '霍尔木兹海峡已解锁！(Huò\'ěrmùzī Hǎixiá yǐ jiěsuǒ!)'
      },
      {
        speech: 'MROOOWW! Siapa berani embargo saya?! Sekali meong, harga minyak mentah dunia langsung naik 200 persen!',
        subtext: '“MROOOWW! Jangan main-main sama hegemoni oyen!” 🛢️🔥',
        hanzi: '谁敢制裁我！(Shéi gǎn zhìcái wǒ!)'
      },
      {
        speech: 'Xiexie delegasi! Traktat bebek peking ini resmi mengakhiri perang dagang di kawasan teluk!',
        subtext: '“Xiexie! Bebek peking kenegaraan telah meratifikasi perdamaian dunia!” 🦆📜',
        hanzi: '谢谢你的北京烤鸭！(Xièxie nǐ de Běijīng kǎoyā!)'
      },
      {
        speech: 'Mroow mroow! Skibidi rizz geopolitik saya meningkat seribu poin setelah makan jiaozi lezat ini!',
        subtext: '“Mroow! Aura diplomatik bertambah 10.000 aura!” 🥟✨',
        hanzi: '太好吃了，多谢多谢！(Tài hǎochī le, duōxiè duōxiè!)'
      }
    ]
  },
  diplomat: {
    id: 'diplomat',
    name: 'Lord Li Seblak Laily Lv.100 (李大帅)',
    role: 'Atase Gastrodiplomasi Seblak Mercon & Negosiator Gencatan Senjata',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=400',
    overlayType: 'paw',
    catchphrase: 'Diplomasi itu ibarat seblak Laily level 100: pedas, bikin nangis, tapi semua delegasi minta nambah! 一言九鼎!',
    color: 'from-amber-500 via-red-600 to-rose-700',
    institution: 'Direktorat Gastrodiplomasi Meja Hijau & Cobek Panas',
    tukangSuaraTitle: 'Dubber: Bangsawan Aristokrat Mewah (Dramatic Tenor)',
    geminiVoice: 'Aoede',
    voicePersona: 'warm_diplomat',
    voiceModelLabel: 'Model Gemini: Aoede (Dramatic Diplomat 🎭)',
    voiceProfile: {
      pitch: 1.25,
      rate: 0.95,
      accent: 'zh-CN',
      meowType: 'aristocrat_purr'
    },
    feedingVoices: [
      {
        speech: 'Meeooww~ Nǐ hǎo ya duta besar! Seblak Laily level 100 ini sukses melunakkan hati para negosiator Dewan Keamanan!',
        subtext: '“Meeooww~ Seblak cobek panas ini mengamankan kesepakatan bilateral!” 🌶️🥣',
        hanzi: '辣味外交，一言九鼎！(Làwèi wàijiāo, yī yán jiǔ dǐng!)'
      },
      {
        speech: 'Purrr~ Miaww! Diplomasi multilateral tanpa boba chagee itu cacat hukum menurut Traktat Wina!',
        subtext: '“Purrr~ Boba diplomasi adalah instrumen soft power paling mutakhir!” 🧋👑',
        hanzi: '软实力天下第一！(Ruǎn shílì tiānxià dì-yī!)'
      },
      {
        speech: 'Ahhh lezat sekali! Satu suapan bebek peking ini bernilai setara investasi lima puluh triliun yuan!',
        subtext: '“Nota kesepahaman investasi ekonomi resmi ditandatangani!” 💰🤝',
        hanzi: '双边经贸协议正式生效！(Shuāngbiān jīngmào xiéyì zhèngshì shēngxiào!)'
      },
      {
        speech: 'Miau miau nǐ hǎo! Besok kita gelar KTT Seblak se-Asia Tenggara di Istana Terlarang!',
        subtext: '“KTT Seblak Internasional resmi dijadwalkan!” 🏛️🏮',
        hanzi: '明天召开国际高峰会！(Míngtiān zhàokāi guójì gāofēnghuì!)'
      }
    ]
  },
  blep: {
    id: 'blep',
    name: 'Chen Blep Becak Gunung Anyar (陈三轮)',
    role: 'Duta Besar Becak Turbo Jalur Sutra & Atase Transportasi IKN',
    imageUrl: 'https://images.unsplash.com/photo-1574158622643-69d34d72650a?auto=format&fit=crop&q=80&w=400',
    overlayType: 'tongue',
    catchphrase: 'Blep! Dari Gunung Anyar Surabaya ke Lapangan Tiananmen cuma 5 menit naik becak turbo! Nǐ chī fàn le ma?!',
    color: 'from-yellow-500 via-amber-500 to-red-600',
    institution: 'Divisi Logistik Becak Cepat & Notulensi Sat-Set PBB',
    tukangSuaraTitle: 'Dubber: Vtuber Cempreng Hiperaktif (High Chipmunk Speed)',
    geminiVoice: 'Puck',
    voicePersona: 'hyperactive_vtuber',
    voiceModelLabel: 'Model Gemini: Puck (Hyperactive & Playful ⚡)',
    voiceProfile: {
      pitch: 1.85,
      rate: 1.28,
      accent: 'zh-CN',
      meowType: 'squeak_chipmunk'
    },
    feedingVoices: [
      {
        speech: 'NYAAAN BLEP BLEP! Nǐ chī fàn le ma?! Becak Gunung Anyar siap antar nota protes ke Jenewa dalam hitungan detik!',
        subtext: '“NYAAAN! Becak balap antarbenua melaju 300 km/jam demi tugas negara!” 🚲💨',
        hanzi: '三轮车冲啊！(Sānlúnchē chōng a!)'
      },
      {
        speech: 'Mew mew! Dimsum mentai dan cilok ini bikin tenaga genjot becak turbo naik 500 horsepower!',
        subtext: '“Mew mew! Suplemen karbohidrat untuk diplomasi sat-set!” 🥟⚡',
        hanzi: '动力加满，准备起飞！(Dònglì jiāmǎn, zhǔnbèi qǐfēi!)'
      },
      {
        speech: 'Blep! Ongkos becak Gunung Anyar ke Beijing cuma lima perak plus sepiring kerupuk kaleng!',
        subtext: '“Tarif diplomasi rakyat paling merakyat!” 🏮😂',
        hanzi: '五块钱送你到北京！(Wǔ kuài qián sòng nǐ dào Běijīng!)'
      },
      {
        speech: 'Nǐ hǎo kawan! Siapapun yang kasih makan Chen Blep dijamin skripsi HI-nya langsung acc dosen penguji!',
        subtext: '“Doa restu atase becak: Skripsi HI auto tamat A+!” 🎓✨',
        hanzi: '论文全过，顺利毕业！(Lùnwén quán guò, shùnlì bìyè!)'
      }
    ]
  },
  cool: {
    id: 'cool',
    name: 'Zhang Xiao Sigma Skibidi (张西格玛)',
    role: 'Pakar Veto Dewan Keamanan & Guru Besar Mewing Geopolitik',
    imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=400',
    overlayType: 'cool',
    catchphrase: 'Mewing di sidang Majelis Umum PBB, langsung keluarin hak veto sambil minum Boba Chagee. 🗿🔥',
    color: 'from-red-700 via-rose-800 to-amber-600',
    institution: 'Institut Rizz Internasional & Pertahanan Jawline Bilateral',
    tukangSuaraTitle: 'Dubber: Sigma Bass Robotik (Ultra Low Cold Tone)',
    geminiVoice: 'Zephyr',
    voicePersona: 'sigma_cold',
    voiceModelLabel: 'Model Gemini: Zephyr (Sigma Zen & Low Bass 🗿)',
    voiceProfile: {
      pitch: 0.5,
      rate: 0.82,
      accent: 'zh-CN',
      meowType: 'sigma_bass'
    },
    feedingVoices: [
      {
        speech: 'Meow. Nǐ hǎo. Sedang mewing di sidang DK PBB. Hak veto saya simpan, resolusi damai kamu saya setujui.',
        subtext: '“🗿 MEOW. Aura sigma diplomasi tak tertandingi oleh superpower manapun.” 🕶️🍷',
        hanzi: '西格玛外交，一票否决！(Xīgémǎ wàijiāo, yī piào fǒujué!)'
      },
      {
        speech: 'Skibidi mewing meow. Jangan ajak saya debat geopolitik kalau jawline kamu belum setajam traktat perbatasan.',
        subtext: '“Skibidi rizz: Diplomasi tegas tanpa banyak bicara.” 🗿✨',
        hanzi: '保持沉默，保持霸气！(Bǎochí chénmò, bǎochí bàqì!)'
      },
      {
        speech: 'Teh Longjing ini menyegarkan fokus analisis hegemoni global saya. Nilai aura kamu naik sepuluh ribu poin.',
        subtext: '“+10,000 Aura Geopolitik untuk delegasi dermawan!” 🍵📈',
        hanzi: '龙井茶加持，气场全开！(Lóngjǐngchá jiāchí, qìchǎng quán kāi!)'
      },
      {
        speech: 'Dingin, tenang, berwibawa. Bebek peking ini dinikmati dalam keheningan protokol kenegaraan tingkat tinggi.',
        subtext: '“Protokol makan berwibawa kelas diplomatik elit.” 🦆🖤',
        hanzi: '最高国礼待遇。(Zuìgāo guólǐ dàiyù.)'
      }
    ]
  },
  rebel: {
    id: 'rebel',
    name: 'Kapitan Zhao Cireng Krispi (赵霸总)',
    role: 'Panglima Armada Laut Natuna & Komandan Satgas Gorengan Panas',
    imageUrl: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=400',
    overlayType: 'rebel',
    catchphrase: 'Wǒ fǎnduì! Cireng krispi kuah cuko adalah satu-satunya traktat perdamaian yang sah menurut hukum laut UNCLOS!',
    color: 'from-rose-600 via-red-700 to-amber-600',
    institution: 'Komando Armada Satgas Anti-Kapal Asing & Cireng Isi Keju',
    tukangSuaraTitle: 'Dubber: Komandan Lapangan Berapi-api (Loud Energetic Voice)',
    geminiVoice: 'Fenrir',
    voicePersona: 'military_fierce',
    voiceModelLabel: 'Model Gemini: Fenrir (Military Fierce 🐺)',
    voiceProfile: {
      pitch: 0.9,
      rate: 1.15,
      accent: 'zh-CN',
      meowType: 'commanding_rawr'
    },
    feedingVoices: [
      {
        speech: 'RAWRRR MEOW BLYAT! Nǐ hǎo delegasi! Cireng krispi kuah cuko ini memperkuat pertahanan garis pantai 200 mil!',
        subtext: '“RAWRRR! Kedaulatan maritim dan pasokan cireng panas aman terkendali!” ⚓🛡️',
        hanzi: '保卫海疆，寸步不让！(Bǎowèi hǎijiāng, cùnbù bù ràng!)'
      },
      {
        speech: 'Wǒ fǎnduì! Semua kapal asing yang melanggar batas ZEE wajib menyetor lima porsi jiaozi udang!',
        subtext: '“Sanksi maritim: Denda jiaozi udang untuk pelanggar batas!” 🥟🌊',
        hanzi: '没收所有饺子！(Mòshōu suǒyǒu jiǎozi!)'
      },
      {
        speech: 'Lapor! Jamuan kenegaraan berhasil! Seluruh awak kapal perang sekarang sedang tidur siang kekenyangan!',
        subtext: '“Armada perang tertidur pulas setelah pesta jamuan!” 🚢💤',
        hanzi: '全员吃饱，就地休息！(Quányuán chībǎo, jiùdì xiūxi!)'
      },
      {
        speech: 'Meowww siap komandan! Sate dan seblak ini bahan bakar revolusi diplomasi maritim Nusantara-Tiongkok!',
        subtext: '“Bahan bakar revolusi maritim siap meluncur!” 🍢🔥',
        hanzi: '友谊长存，共同繁荣！(Yǒuyì chángcún, gòngtóng fánróng!)'
      }
    ]
  },
  closeup: {
    id: 'closeup',
    name: 'Kanjeng Mami Lin Pus Pus (林大妈)',
    role: 'Juru Bicara Menlu & Admin Akun Gosip Meja Hijau PBB',
    imageUrl: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&q=80&w=400',
    overlayType: 'closeup',
    catchphrase: 'Spill the tea! Duta besar negara sebelah kemarin ketahuan ngutang cilok di kantin Jenewa! Miauww!',
    color: 'from-red-500 via-rose-600 to-amber-500',
    institution: 'Biro Lambe Turah Diplomasi & Siaran Pers Darurat',
    tukangSuaraTitle: 'Dubber: Akun Gosip Cepat & Renyah (Fast Chatty Auntie)',
    geminiVoice: 'Kore',
    voicePersona: 'gossipy_auntie',
    voiceModelLabel: 'Model Gemini: Kore (Warm & Gossipy Auntie 🌸)',
    voiceProfile: {
      pitch: 1.45,
      rate: 1.22,
      accent: 'zh-CN',
      meowType: 'gossip_trill'
    },
    feedingVoices: [
      {
        speech: 'Mrr-mrr-miauww! Nǐ hǎo bestie! Spill the tea, duta besar kemarin rebutan bebek peking sampai lupa bawa teks pidato!',
        subtext: '“Mrr-miauww! Bocoran rahasia meja makan diplomasi internasional!” 🦆🗞️',
        hanzi: '外交独家大爆料！(Wàijiāo dújiā dà bàoliào!)'
      },
      {
        speech: 'Miau miau miau! Gosip diplomatik terpanas: Traktat damai diteken gara-gara delegasi disogok cilok kuah traktat!',
        subtext: '“Cilok kuah kacang meluluhkan sengketa 10 tahun!” 🍢 gossip',
        hanzi: '美味化解千年恩怨！(Měiwèi huàjiě qiānnián ēnyuàn!)'
      },
      {
        speech: 'Wàijiāobù fāyánrén biǎoshì: Jamuan boba ini sah secara de facto, de jure, dan masuk trending topik Twitter!',
        subtext: '“Siaran pers resmi: Boba diplomasi masuk trending topic sedunia!” 🧋📱',
        hanzi: '登上全球热搜第一！(Dēng shàng quánqiú rèsōu dì-yī!)'
      },
      {
        speech: 'Aduh enaknya nampol! Makasih ya mahasiswa HI kesayangan, besok saya spill kisi-kisi ujian sidang PBB!',
        subtext: '“Bocoran kisi-kisi ujian diplomasi resmi diturunkan!” 📝💖',
        hanzi: '外交密卷提前奉送！(Wàijiāo mījuàn tíqián fèngsòng!)'
      }
    ]
  }
};

export const TIERS = [
  {
    tier: 1,
    title: 'Tier 1: 基础外交与礼仪 (Fondasi Diplomasi Dasar & Tata Krama Mandarin)',
    subtitle: 'Tingkat Pemula Nol (HSK 1 - 2 / Diplomatik Dasar)',
    description: 'Pelajari sapaan diplomatik resmi, gelar duta besar, prinsip kedaulatan negara, kekebalan diplomatik, dan 5 Prinsip Hidup Berdampingan Secara Damai (和平共处五项原则).',
    color: 'border-red-500 text-red-600 bg-red-500/10'
  },
  {
    tier: 2,
    title: 'Tier 2: 国际组织与多边会议 (Organisasi Multilateral & Sidang PBB Mandarin)',
    subtitle: 'Tingkat Menengah Muda (HSK 3 - 4 / Model UN)',
    description: 'Kuasai tata tertib sidang PBB dalam bahasa Mandarin, perdebatan formal, mosi kaukus, penyusunan rancangan resolusi (决议草案), nota diplomatik, dan soft power.',
    color: 'border-amber-500 text-amber-600 bg-amber-500/10'
  },
  {
    tier: 3,
    title: 'Tier 3: 经贸、安全与人道主义 (Ekonomi Politik Global, Keamanan & Humaniter)',
    subtitle: 'Tingkat Menengah Lanjut (HSK 4 - 5 / Negosiasi Strategis)',
    description: 'Eksplorasi diplomasi ekonomi WTO, inisiatif sabuk dan jalan (一带一路), hukum humaniter Konvensi Jenewa, mediasi gencatan senjata, dan diplomasi iklim.',
    color: 'border-rose-600 text-rose-700 bg-rose-600/10'
  },
  {
    tier: 4,
    title: 'Tier 4: 高级战略谈判与全球治理 (Negosiasi Tingkat Tinggi & Tata Kelola Global)',
    subtitle: 'Tingkat Mahir Suhu (HSK 5 - 6 / Duta Besar Penuh)',
    description: 'Penyusunan traktat multilateral, hak veto Dewan Keamanan PBB (否决权), sengketa Mahkamah Internasional (ICJ), diplomasi siber, dan penandatanganan konvensi dunia.',
    color: 'border-amber-600 text-amber-700 bg-amber-600/10'
  }
];

export const LESSONS: Lesson[] = [
  // =========================================================================
  // TIER 1: FONDASI DIPLOMASI DASAR & TATA KRAMA MANDARIN
  // =========================================================================
  {
    id: "lesson_1",
    stageNumber: 1,
    tier: 1,
    tierLabel: "Tier 1: 基础外交",
    difficulty: "Pemula (HSK 1+)",
    title: "外交问候与称谓 (Sapaan Diplomatik & Gelar Formal)",
    subtitle: "Diplomatic Greetings & Official Honorifics in Mandarin",
    description: "Kuasai gelar kehormatan resmi dalam bahasa Mandarin: 您好 (Nín hǎo), 大使阁下 (Dàshǐ Géxià), 尊敬的代表 (Zūnjìng de Dàibiǎo), dan 欢迎 (Huānyíng).",
    xp: 50,
    catMentor: 'diplomat',
    theoryBrief: {
      title: "Tata Krama Penyambutan Tamu Diplomatik Berbahasa Mandarin",
      summary: "Dalam diplomasi internasional berbahasa Mandarin, penggunaan bentuk hormat '您' (Nín) dan gelar resmi '阁下' (Géxià / Excellency) adalah standar etika protokoler tertinggi untuk menghormati perwakilan negara sahabat.",
      theoreticalPerspective: "Bahasa Mandarin adalah satu dari 6 bahasa resmi Perserikatan Bangsa-Bangsa (PBB) dan memegang peranan krusial dalam diplomasi bilateral dan multilateral di kawasan Asia dan dunia.",
      diplomaticProtocol: "Gelar '大使阁下' (Dàshǐ Géxià) digunakan saat menyapa Duta Besar Luar Biasa dan Berkuasa Penuh (特命全权大使).",
      keyVocabularyHighlights: ["您好 (Nín hǎo)", "大使阁下 (Dàshǐ Géxià)", "尊敬的代表 (Zūnjìng de dàibiǎo)", "欢迎 (Huānyíng)"]
    },
    studyCards: [
      {
        id: "c1_1",
        term: "您好，大使阁下",
        transliteration: "Nín hǎo, Dàshǐ Géxià",
        language: "zh",
        meaning: "Salam sejahtera, Yang Mulia Duta Besar (Your Excellency Ambassador)",
        contextHI: "Sapaan formal tertinggi saat menyambut Duta Besar di pertemuan bilateral atau konferensi internasional.",
        exampleSentence: "您好，大使阁下，欢迎访问我国。(Nín hǎo, Dàshǐ Géxià, huānyíng fǎngwèn wǒ guó - Salam hormat Yang Mulia Duta Besar, selamat datang berkunjung ke negara kami.)",
        audioText: "您好，大使阁下，欢迎访问我国。",
        audioLang: "zh-CN",
        tag: "Gelar Diplomatik"
      },
      {
        id: "c1_2",
        term: "尊敬的代表",
        transliteration: "Zūnjìng de dàibiǎo",
        language: "zh",
        meaning: "Yang Terhormat Delegasi (Distinguished Delegate)",
        contextHI: "Sapaan baku dalam sidang majelis umum dan komite multilateral PBB berbahasa Mandarin.",
        exampleSentence: "尊敬的代表，请在大会上发言。(Zūnjìng de dàibiǎo, qǐng zài dàhuì shàng fāyán - Yang Terhormat Delegasi, silakan menyampaikan pidato di majelis.)",
        audioText: "尊敬的代表，请在大会上发言。",
        audioLang: "zh-CN",
        tag: "Protokol Sidang"
      },
      {
        id: "c1_3",
        term: "热烈欢迎",
        transliteration: "Rèliè huānyíng",
        language: "zh",
        meaning: "Menyambut dengan hangat (Warm welcome)",
        contextHI: "Ungkapan sambutan kenegaraan resmi saat delegasi asing tiba di bandara atau kementerian luar negeri.",
        exampleSentence: "我们热烈欢迎各国代表团的到来。(Wǒmen rèliè huānyíng gèguó dàibiǎotuán de dàolái - Kami menyambut hangat kedatangan delegasi seluruh negara.)",
        audioText: "我们热烈欢迎各国代表团的到来。",
        audioLang: "zh-CN",
        tag: "Sambutan Resmi"
      },
      {
        id: "c1_4",
        term: "外交部",
        transliteration: "Wàijiāobù",
        language: "zh",
        meaning: "Kementerian Luar Negeri (Ministry of Foreign Affairs)",
        contextHI: "Institusi eksekutif negara yang mengelola hubungan luar negeri dan perwakilan diplomatik.",
        exampleSentence: "外交部今天举行了新闻发布会。(Wàijiāobù jīntiān jǔxíngle xīnwén fābùhuì - Kementerian Luar Negeri hari ini menggelar konferensi pers.)",
        audioText: "外交部今天举行了新闻发布会。",
        audioLang: "zh-CN",
        tag: "Institusi Luar Negeri"
      }
    ],
    questions: [
      {
        id: "q1_1",
        type: "multiple_choice",
        question: "Bagaimana cara menyapa 'Yang Mulia Duta Besar' dalam bahasa Mandarin formal yang baku?",
        options: ["大使阁下 (Dàshǐ Géxià)", "你好朋友 (Nǐ hǎo péngyǒu)", "代表团长 (Dàibiǎotuán zhǎng)", "秘书先生 (Mìshū xiānsheng)"],
        correctAnswer: 0,
        explanation: "'大使阁下' (Dàshǐ Géxià) adalah padanan baku untuk 'Your Excellency Ambassador' dalam protokol diplomasi Mandarin."
      },
      {
        id: "q1_2",
        type: "sentence_builder",
        question: "Susun kalimat bahasa Mandarin: 'Salam hormat Yang Mulia Duta Besar, selamat datang berkunjung ke negara kami':",
        wordTokens: ["您好", "大使阁下", "欢迎", "访问", "我国"],
        correctOrder: ["您好", "大使阁下", "欢迎", "访问", "我国"],
        explanation: "Kalimat tersusun rapi: 您好，大使阁下，欢迎访问我国。(Nín hǎo, Dàshǐ Géxià, huānyíng fǎngwèn wǒ guó)."
      },
      {
        id: "q1_3",
        type: "matching",
        question: "Cocokkan kosakata bahasa Mandarin diplomasi dengan artinya:",
        matchingPairs: [
          { left: "外交部 (Wàijiāobù)", right: "Kementerian Luar Negeri" },
          { left: "尊敬的代表 (Zūnjìng de dàibiǎo)", right: "Yang Terhormat Delegasi" },
          { left: "大使阁下 (Dàshǐ Géxià)", right: "Yang Mulia Duta Besar" },
          { left: "热烈欢迎 (Rèliè huānyíng)", right: "Menyambut dengan Hangat" }
        ],
        explanation: "Semua frasa ini merupakan kosakata pondasi tingkat satu dalam diplomasi bahasa Mandarin."
      },
      {
        id: "q1_4",
        type: "listening",
        question: "Dengarkan pelafalan Mandarin berikut dan tentukan artinya:",
        audioText: "您好，大使阁下，欢迎访问我国。",
        audioLang: "zh-CN",
        options: [
          "Salam hormat Yang Mulia Duta Besar, selamat datang berkunjung ke negara kami.",
          "Duta besar menolak hadir di konferensi pers hari ini.",
          "Delegasi asing meminta izin meninggalkan ruang perundingan.",
          "Kementerian luar negeri menunda pembicaraan bilateral."
        ],
        correctAnswer: 0,
        explanation: "Suara menyebutkan: '您好，大使阁下，欢迎访问我国' (Nín hǎo, Dàshǐ Géxià, huānyíng fǎngwèn wǒ guó)."
      }
    ]
  },

  {
    id: "lesson_2",
    stageNumber: 2,
    tier: 1,
    tierLabel: "Tier 1: 基础外交",
    difficulty: "Pemula (HSK 2)",
    title: "国家主权与领土完整 (Kedaulatan Negara & Integritas Teritorial)",
    subtitle: "State Sovereignty & Territorial Integrity in Mandarin",
    description: "Kuasai istilah kunci hukum internasional: 国家主权 (Guójiā zhǔquán), 领土完整 (Lǐngtǔ wánzhěng), 互不干涉内政 (Hù bù gānshè nèizhèng).",
    xp: 60,
    catMentor: 'explorer',
    theoryBrief: {
      title: "Prinsip Kedaulatan & Hukum Internasional dalam Bahasa Mandarin",
      summary: "Dalam hubungan internasional, kedaulatan negara (国家主权) dan integritas teritorial (领土完整) adalah prinsip mutlak yang dijamin dalam Piagam PBB.",
      theoreticalPerspective: "Pemerintah dan diplomat Tiongkok secara konsisten menekankan '互不干涉内政' (tidak mencampuri urusan dalam negeri) sebagai pilar utama tata pergaulan internasional.",
      diplomaticProtocol: "Dalam pidato resmi kenegaraan, frasa '坚定维护国家主权和领土完整' (tegas membela kedaulatan negara dan integritas teritorial) sangat sering digunakan.",
      keyVocabularyHighlights: ["国家主权 (Guójiā zhǔquán)", "领土完整 (Lǐngtǔ wánzhěng)", "互不干涉 (Hù bù gānshè)", "国际法 (Guójìfǎ)"]
    },
    studyCards: [
      {
        id: "c2_1",
        term: "国家主权",
        transliteration: "Guójiā zhǔquán",
        language: "zh",
        meaning: "Kedaulatan Negara (National Sovereignty)",
        contextHI: "Hak tertinggi negara untuk menjalankan pemerintahan dan kebijakan tanpa intervensi pihak luar.",
        exampleSentence: "我们坚定维护国家主权。(Wǒmen jiāndìng wéihù guójiā zhǔquán - Kami tegas mempertahankan kedaulatan negara.)",
        audioText: "我们坚定维护国家主权。",
        audioLang: "zh-CN",
        tag: "Prinsip HI"
      },
      {
        id: "c2_2",
        term: "领土完整",
        transliteration: "Lǐngtǔ wánzhěng",
        language: "zh",
        meaning: "Integritas Teritorial (Territorial Integrity)",
        contextHI: "Keutuhan wilayah daratan, perairan kepulauan, dan ruang udara suatu negara berdaulat.",
        exampleSentence: "任何国家都应尊重彼此的领土完整。(Rènhé guójiā dōu yīng zūnzhòng bǐcǐ de lǐngtǔ wánzhěng - Setiap negara harus menghormati integritas teritorial satu sama lain.)",
        audioText: "任何国家都应尊重彼此的领土完整。",
        audioLang: "zh-CN",
        tag: "Hukum Internasional"
      },
      {
        id: "c2_3",
        term: "互不干涉内政",
        transliteration: "Hù bù gānshè nèizhèng",
        language: "zh",
        meaning: "Saling tidak mencampuri urusan dalam negeri (Non-interference in internal affairs)",
        contextHI: "Prinsip fundamental hubungan antarnegara merdeka dalam diplomasi global.",
        exampleSentence: "两国关系建立在互不干涉内政的基础之上。(Liǎng guó guānxì jiànlì zài hù bù gānshè nèizhèng de jīchǔ zhī shàng - Hubungan kedua negara dibangun di atas landasan saling tidak mencampuri urusan dalam negeri.)",
        audioText: "两国关系建立在互不干涉内政的基础之上。",
        audioLang: "zh-CN",
        tag: "Norma Diplomasi"
      },
      {
        id: "c2_4",
        term: "国际法",
        transliteration: "Guójìfǎ",
        language: "zh",
        meaning: "Hukum Internasional (International Law)",
        contextHI: "Kaidah dan traktat yang disepakati bersama oleh komunitas bangsa-bangsa dunia.",
        exampleSentence: "我们要维护以国际法为基础的国际秩序。(Wǒmen yào wéihù yǐ guójìfǎ wéi jīchǔ de guójì zhìxù - Kita harus memelihara tatanan internasional yang berlandaskan hukum internasional.)",
        audioText: "我们要维护以国际法为基础的国际秩序。",
        audioLang: "zh-CN",
        tag: "Tatanan Global"
      }
    ],
    questions: [
      {
        id: "q2_1",
        type: "multiple_choice",
        question: "Apa arti dari frasa bahasa Mandarin '国家主权' (Guójiā zhǔquán)?",
        options: ["Kedaulatan Negara (National Sovereignty)", "Kekuatan Militer (Military Power)", "Perdagangan Luar Negeri (Foreign Trade)", "Bantuan Kemanusiaan (Humanitarian Aid)"],
        correctAnswer: 0,
        explanation: "'国家' (Guójiā) = Negara, '主权' (Zhǔquán) = Kedaulatan / Hak Berdaulat."
      },
      {
        id: "q2_2",
        type: "sentence_builder",
        question: "Susun kalimat: 'Kami dengan teguh membela kedaulatan negara' (Wǒmen jiāndìng wéihù guójiā zhǔquán):",
        wordTokens: ["我们", "坚定", "维护", "国家", "主权"],
        correctOrder: ["我们", "坚定", "维护", "国家", "主权"],
        explanation: "Struktur baku: 我们 (Kami) + 坚定维护 (teguh mempertahankan) + 国家主权 (kedaulatan negara)."
      },
      {
        id: "q2_3",
        type: "true_false",
        question: "Frasa '互不干涉内政' (Hù bù gānshè nèizhèng) berarti negara berhak melakukan intervensi militer ke negara tetangga tanpa izin.",
        isTrue: false,
        explanation: "Salah! '互不干涉内政' justru berarti 'saling TIDAK mencampuri urusan dalam negeri satu sama lain' (Non-interference)."
      }
    ]
  },

  {
    id: "lesson_3",
    stageNumber: 3,
    tier: 1,
    tierLabel: "Tier 1: 基础外交",
    difficulty: "Pemula (HSK 2+)",
    title: "外交豁免权与不受欢迎的人 (Kekebalan Diplomatik & Persona Non Grata)",
    subtitle: "Diplomatic Immunity & Persona Non Grata in Mandarin",
    description: "Pelajari hukum diplomatik Konvensi Wina dalam bahasa Mandarin: 外交豁免权 (Wàijiāo huòmiǎnquán), 使馆馆舍不受侵犯 (Shǐguǎn guǎnshè bùshòu qīnfàn), dan 不受欢迎的人 (Bù shòu huānyíng de rén).",
    xp: 70,
    catMentor: 'blep',
    theoryBrief: {
      title: "Hukum Kekebalan Diplomatik Berdasarkan Konvensi Wina 1961",
      summary: "Untuk menjalankan tugas tanpa tekanan yurisdiksi lokal, diplomat asing dilindungi oleh '外交豁免权' (Kekebalan Diplomatik) dan gedung kedutaan memiliki status '馆舍不可侵犯' (Inviolability).",
      theoreticalPerspective: "Jika diplomat melanggar hukum berat atau melakukan spionase, negara penerima dapat menyatakannya sebagai '不受欢迎的人' (Persona Non Grata) dan mengusirnya.",
      diplomaticProtocol: "Tas diplomatik resmi disebut '外交邮袋' (Wàijiāo yóudài) dan tidak boleh diperiksa atau disita di pos bea cukai.",
      keyVocabularyHighlights: ["外交豁免权 (Wàijiāo huòmiǎnquán)", "不受欢迎的人 (Bù shòu huānyíng de rén)", "大使馆 (Dàshǐguǎn)", "外交官 (Wàijiāoguān)"]
    },
    studyCards: [
      {
        id: "c3_1",
        term: "外交豁免权",
        transliteration: "Wàijiāo huòmiǎnquán",
        language: "zh",
        meaning: "Kekebalan Diplomatik (Diplomatic Immunity)",
        contextHI: "Hak kekebalan hukum dari yurisdiksi peradilan pidana dan perdata negara penerima bagi diplomat resmi.",
        exampleSentence: "外交官享有国际法赋予的外交豁免权。(Wàijiāoguān xiǎngyǒu guójìfǎ fùyǔ de wàijiāo huòmiǎnquán - Diplomat menikmati hak kekebalan diplomatik yang diberikan hukum internasional.)",
        audioText: "外交官享有国际法赋予的外交豁免权。",
        audioLang: "zh-CN",
        tag: "Konvensi Wina 1961"
      },
      {
        id: "c3_2",
        term: "不受欢迎的人",
        transliteration: "Bù shòu huānyíng de rén",
        language: "zh",
        meaning: "Persona Non Grata (Diplomat yang Tidak Disukai / Diusir)",
        contextHI: "Status resmi penolakan kehadiran diplomat asing oleh Kementerian Luar Negeri negara penerima.",
        exampleSentence: "外交部宣布该国外交官为不受欢迎的人。(Wàijiāobù xuānbù gāi guó wàijiāoguān wéi bù shòu huānyíng de rén - Kementerian Luar Negeri menyatakan diplomat negara tersebut sebagai persona non grata.)",
        audioText: "外交部宣布该国外交官为不受欢迎的人。",
        audioLang: "zh-CN",
        tag: "Pengusiran Diplomatik"
      },
      {
        id: "c3_3",
        term: "大使馆",
        transliteration: "Dàshǐguǎn",
        language: "zh",
        meaning: "Kedutaan Besar (Embassy)",
        contextHI: "Kantor perwakilan diplomatik permanen suatu negara di ibu kota negara sahabat.",
        exampleSentence: "大使馆馆舍不可侵犯。(Dàshǐguǎn guǎnshè bùkě qīnfàn - Gedung kedutaan besar tidak boleh diganggu gugat/inviolable.)",
        audioText: "大使馆馆舍不可侵犯。",
        audioLang: "zh-CN",
        tag: "Perwakilan Resmi"
      },
      {
        id: "c3_4",
        term: "外交官",
        transliteration: "Wàijiāoguān",
        language: "zh",
        meaning: "Diplomat / Pejabat Korps Diplomatik",
        contextHI: "Aparatur perunding resmi yang mewakili kepala negara di forum antarbangsa.",
        exampleSentence: "年轻的外交官积极参与双边谈判。(Niánqīng de wàijiāoguān jījí cānyù shuāngbiān tánpàn - Diplomat muda aktif berpartisipasi dalam perundingan bilateral.)",
        audioText: "年轻的外交官积极参与双边谈判。",
        audioLang: "zh-CN",
        tag: "Aktor Diplomatik"
      }
    ],
    questions: [
      {
        id: "q3_1",
        type: "multiple_choice",
        question: "Bagaimana istilah resmi bahasa Mandarin untuk 'Persona Non Grata' (diplomat yang diusir atau ditolak kedatangannya)?",
        options: ["不受欢迎的人 (Bù shòu huānyíng de rén)", "外交代表团 (Wàijiāo dàibiǎotuán)", "特别使团 (Tèbié shǐtuán)", "领事官员 (Lǐngshì guānyuán)"],
        correctAnswer: 0,
        explanation: "'不受欢迎的人' secara harfiah berarti 'orang yang tidak disambut / Persona Non Grata' dalam hukum diplomatik Mandarin."
      },
      {
        id: "q3_2",
        type: "matching",
        question: "Cocokkan istilah hukum diplomatik Mandarin dengan pengertiannya:",
        matchingPairs: [
          { left: "外交豁免权 (Wàijiāo huòmiǎnquán)", right: "Kekebalan yurisdiksi hukum diplomat" },
          { left: "不受欢迎的人 (Bù shòu huānyíng de rén)", right: "Persona Non Grata / Pengusiran diplomat" },
          { left: "大使馆 (Dàshǐguǎn)", right: "Gedung Kedutaan Besar" },
          { left: "外交官 (Wàijiāoguān)", right: "Petugas Perwakilan Diplomatik" }
        ],
        explanation: "Terminologi ini merupakan instrumen penting dalam Konvensi Wina 1961."
      },
      {
        id: "q3_3",
        type: "scenario_dilemma",
        scenario: "Seorang atase perdagangan asing tertangkap tangan membawa dokumen rahasia negara tuan rumah tanpa izin.",
        question: "Langkah diplomatik resmi apa yang diambil oleh Kementerian Luar Negeri (外交部)?",
        options: [
          "Menerbitkan nota diplomatik yang menyatakan atase tersebut sebagai '不受欢迎的人' (Persona Non Grata) dan memintanya keluar dalam 48 jam.",
          "Menyerbu gedung kedutaan asing dengan pasukan militer secara sepihak.",
          "Mengabaikan kejadian tersebut tanpa peringatan diplomatik.",
          "Meminta uang denda tunai langsung kepada Duta Besar di tempat."
        ],
        correctAnswer: 0,
        explanation: "Sesuai Pasal 9 Konvensi Wina 1961, status '不受欢迎的人' (Persona Non Grata) adalah mekanisme resmi pengusiran diplomat yang melanggar hukum."
      }
    ]
  },

  {
    id: "lesson_4",
    stageNumber: 4,
    tier: 1,
    tierLabel: "Tier 1: 基础外交",
    difficulty: "Pemula Menengah (HSK 2-3)",
    title: "和平共处五项原则 (Lima Prinsip Hidup Berdampingan Secara Damai)",
    subtitle: "The Five Principles of Peaceful Coexistence in Mandarin",
    description: "Pelajari doktrin diplomasi bersejarah: 互相尊重主权和领土完整, 互不侵犯, 互不干涉内政, 平等互利, 和平共处.",
    xp: 75,
    catMentor: 'cool',
    theoryBrief: {
      title: "Panchsheel & Lima Prinsip Hidup Berdampingan Secara Damai (1954)",
      summary: "Dirumuskan pada tahun 1954 oleh Tiongkok, India, dan Myanmar (serta ditegaskan kembali dalam KTT Asia-Afrika Bandung 1955), '和平共处五项原则' menjadi salah satu norma fundamental diplomasi negara-negara berkembang dan Gerakan Non-Blok.",
      theoreticalPerspective: "Prinsip ini menekankan kesetaraan semua bangsa (平等互利) dan penyelesaian sengketa melalui dialog damai tanpa hegemoni kekerasan.",
      diplomaticProtocol: "Diplomat sering mengutip 5 prinsip ini sebagai landasan perjanjian persahabatan dan kemitraan strategis komprehensif.",
      keyVocabularyHighlights: ["和平共处 (Hépíng gòngchǔ)", "互不侵犯 (Hù bù qīnfàn)", "平等互利 (Píngděng hùlì)", "互利共赢 (Hùlì gòngyíng)"]
    },
    studyCards: [
      {
        id: "c4_1",
        term: "和平共处",
        transliteration: "Hépíng gòngchǔ",
        language: "zh",
        meaning: "Hidup Berdampingan Secara Damai (Peaceful Coexistence)",
        contextHI: "Kondisi di mana negara-negara dengan sistem politik berbeda dapat hidup berdampingan tanpa ancaman perang.",
        exampleSentence: "我们坚持和平共处的原则。(Wǒmen jiānchí hépíng gòngchǔ de yuánzé - Kami berpegang teguh pada prinsip hidup berdampingan secara damai.)",
        audioText: "我们坚持和平共处的原则。",
        audioLang: "zh-CN",
        tag: "Doktrin Diplomasi"
      },
      {
        id: "c4_2",
        term: "互不侵犯",
        transliteration: "Hù bù qīnfàn",
        language: "zh",
        meaning: "Saling Tidak Menyerang (Mutual Non-Aggression)",
        contextHI: "Larangan agresi militer antarnegara tetangga atau anggota perjanjian persahabatan.",
        exampleSentence: "两国签署了互不侵犯条约。(Liǎng guó qiānshǔle hù bù qīnfàn tiáoyuē - Kedua negara menandatangani traktat non-agresi / saling tidak menyerang.)",
        audioText: "两国签署了互不侵犯条约。",
        audioLang: "zh-CN",
        tag: "Traktat Keamanan"
      },
      {
        id: "c4_3",
        term: "平等互利",
        transliteration: "Píngděng hùlì",
        language: "zh",
        meaning: "Kesetaraan dan Saling Menguntungkan (Equality and Mutual Benefit)",
        contextHI: "Prinsip negosiasi ekonomi dan politik di mana kedua pihak mendapatkan manfaat yang adil (win-win).",
        exampleSentence: "在平等互利的基础上开展经贸合作。(Zài píngděng hùlì de jīchǔ shàng kāizhǎn jīngmào hézuò - Melaksanakan kerjasama ekonomi dan perdagangan atas dasar kesetaraan dan saling menguntungkan.)",
        audioText: "在平等互利的基础上开展经贸合作。",
        audioLang: "zh-CN",
        tag: "Kerjasama Ekonomi"
      },
      {
        id: "c4_4",
        term: "互利共赢",
        transliteration: "Hùlì gòngyíng",
        language: "zh",
        meaning: "Win-Win Solution / Saling Menguntungkan Bersama",
        contextHI: "Slogan diplomatik kontemporer dalam traktat investasi bilateral dan multilateral.",
        exampleSentence: "推动构建互利共赢的国际伙伴关系。(Tuīdòng gòujiàn hùlì gòngyíng de guójì huǒbàn guānxì - Mendorong pembangunan kemitraan internasional yang saling menguntungkan / win-win.)",
        audioText: "推动构建互利共赢的国际伙伴关系。",
        audioLang: "zh-CN",
        tag: "Kemitraan Global"
      }
    ],
    questions: [
      {
        id: "q4_1",
        type: "multiple_choice",
        question: "Konsep '和平共处五项原则' dalam Hubungan Internasional merujuk pada:",
        options: [
          "Lima Prinsip Hidup Berdampingan Secara Damai (1954)",
          "Lima Hak Veto Anggota Tetap PBB",
          "Lima Bahasa Resmi Pertama PBB",
          "Lima Lautan Internasional Bebas Navigasi"
        ],
        correctAnswer: 0,
        explanation: "'和平共处五项原则' adalah The Five Principles of Peaceful Coexistence yang dirumuskan tahun 1954."
      },
      {
        id: "q4_2",
        type: "sentence_builder",
        question: "Susun kalimat Mandarin: 'Mendorong pembangunan kemitraan internasional yang saling menguntungkan':",
        wordTokens: ["推动", "构建", "互利共赢", "的", "国际伙伴关系"],
        correctOrder: ["推动", "构建", "互利共赢", "的", "国际伙伴关系"],
        explanation: "Frasa lengkap: 推动构建互利共赢的国际伙伴关系 (Tuīdòng gòujiàn hùlì gòngyíng de guójì huǒbàn guānxì)."
      },
      {
        id: "q4_3",
        type: "listening",
        question: "Dengarkan audio Mandarin berikut dan tentukan konsep yang diucapkan:",
        audioText: "在平等互利的基础上开展经贸合作。",
        audioLang: "zh-CN",
        options: [
          "Melaksanakan kerjasama ekonomi atas dasar kesetaraan dan saling menguntungkan.",
          "Menyatakan perang terbuka terhadap aliansi militer musuh.",
          "Membatalkan seluruh izin penerbangan internasional.",
          "Menutup perbatasan darat tanpa perundingan damai."
        ],
        correctAnswer: 0,
        explanation: "Audio melafalkan kerjasama berbasis kesetaraan dan manfaat bersama (在平等互利的基础上开展经贸合作)."
      }
    ]
  },

  // =========================================================================
  // TIER 2: ORGANISASI MULTILATERAL & SIDANG PBB MANDARIN
  // =========================================================================
  {
    id: "lesson_5",
    stageNumber: 5,
    tier: 2,
    tierLabel: "Tier 2: 国际组织",
    difficulty: "Menengah (HSK 3)",
    title: "联合国议事规则与动议 (Tata Tertib Sidang PBB & Mosi MUN)",
    subtitle: "UN Rules of Procedure & Motions in Mandarin",
    description: "Kuasai bahasa Mandarin sidang PBB: 动议 (Dòngyì / Motion), 议事规则 (Yìshì guīzé), 程序性问题 (Point of Order), 有主持核心会议 (Moderated Caucus).",
    xp: 80,
    catMentor: 'blep',
    theoryBrief: {
      title: "Tata Tertib Sidang Sidang PBB Bahasa Mandarin (Rules of Procedure)",
      summary: "Dalam sidang PBB dan simulasi Model United Nations (MUN) berbahasa Mandarin, delegasi menggunakan terminologi prosedural presisi untuk mengajukan interupsi dan perdebatan.",
      theoreticalPerspective: "PBB mengakui 6 bahasa resmi: 中文 (Mandarin), 英语 (Inggris), 阿拉伯语 (Arab), 法语 (Prancis), 俄语 (Rusia), dan 西班牙语 (Spanyol). Notulensi dan dokumen resmi diterjemahkan secara simultan.",
      diplomaticProtocol: "Saat ingin berbicara di depan komite, delegasi menyatakan: '本代表动议举行有主持核心会议' (Delegasi kami mengajukan mosi untuk moderated caucus).",
      keyVocabularyHighlights: ["动议 (Dòngyì)", "议事规则 (Yìshì guīzé)", "程序性问题 (Chéngxùxìng wèntí)", "代表团 (Dàibiǎotuán)"]
    },
    studyCards: [
      {
        id: "c5_1",
        term: "动议",
        transliteration: "Dòngyì",
        language: "zh",
        meaning: "Mosi Sidang (Floor Motion)",
        contextHI: "Usulan resmi delegasi kepada pimpinan sidang untuk mengubah format perdebatan atau menunda sesi.",
        exampleSentence: "本代表提出动议，延长讨论时间。(Běn dàibiǎo tíchū dòngyì, yáncháng tǎolùn shíjiān - Delegasi kami mengajukan mosi untuk memperpanjang waktu diskusi.)",
        audioText: "本代表提出动议，延长讨论时间。",
        audioLang: "zh-CN",
        tag: "Prosedur MUN"
      },
      {
        id: "c5_2",
        term: "程序性问题",
        transliteration: "Chéngxùxìng wèntí",
        language: "zh",
        meaning: "Point of Order (Interupsi Masalah Tata Tertib)",
        contextHI: "Interupsi yang diajukan delegasi jika terjadi kekeliruan tata tertib atau pelanggaran alokasi waktu bicara.",
        exampleSentence: "主席先生，本代表提出程序性问题。(Zhǔxí xiānsheng, běn dàibiǎo tíchū chéngxùxìng wèntí - Pimpinan sidang, delegasi kami mengajukan Point of Order.)",
        audioText: "主席先生，本代表提出程序性问题。",
        audioLang: "zh-CN",
        tag: "Interupsi Sidang"
      },
      {
        id: "c5_3",
        term: "有主持核心会议",
        transliteration: "Yǒu zhǔchí héxīn huìyì",
        language: "zh",
        meaning: "Moderated Caucus (Kaukus Terarah dengan Moderator)",
        contextHI: "Format debat terstruktur di mana pimpinan sidang menunjuk giliran delegasi berbicara dengan batasan waktu.",
        exampleSentence: "动议举行二十分钟的有主持核心会议。(Dòngyì jǔxíng èrshí fēnzhōng de yǒu zhǔchí héxīn huìyì - Mosi mengadakan moderated caucus selama 20 menit.)",
        audioText: "动议举行二十分钟的有主持核心会议。",
        audioLang: "zh-CN",
        tag: "Format Debat"
      },
      {
        id: "c5_4",
        term: "代表团",
        transliteration: "Dàibiǎotuán",
        language: "zh",
        meaning: "Delegasi Negara (National Delegation)",
        contextHI: "Rombongan utusan resmi negara yang dipimpin oleh Duta Besar atau Ketua Delegasi.",
        exampleSentence: "印尼代表团在大会上发表了重要演讲。(Yìnní dàibiǎotuán zài dàhuì shàng fābiǎole zhòngyào yǎnjiǎng - Delegasi Indonesia menyampaikan pidato penting di sidang majelis.)",
        audioText: "印尼代表团在大会上发表了重要演讲。",
        audioLang: "zh-CN",
        tag: "Aktor Sidang"
      }
    ],
    questions: [
      {
        id: "q5_1",
        type: "multiple_choice",
        question: "Jika delegasi ingin mengajukan interupsi 'Point of Order' dalam sidang PBB berbahasa Mandarin, frasa apa yang diucapkan?",
        options: ["程序性问题 (Chéngxùxìng wèntí)", "个人特权点 (Gèrén tèquán diǎn)", "自由磋商 (Zìyóu cuōshāng)", "决议草案 (Juéyì cǎo'àn)"],
        correctAnswer: 0,
        explanation: "'程序性问题' (Chéngxùxìng wèntí) adalah istilah resmi untuk Point of Order terkait tata tertib sidang."
      },
      {
        id: "q5_2",
        type: "matching",
        question: "Pasangkan istilah sidang PBB Mandarin dengan artinya:",
        matchingPairs: [
          { left: "动议 (Dòngyì)", right: "Mosi Sidang (Motion)" },
          { left: "代表团 (Dàibiǎotuán)", right: "Delegasi Negara" },
          { left: "有主持核心会议", right: "Moderated Caucus" },
          { left: "程序性问题", right: "Point of Order" }
        ],
        explanation: "Keempat istilah ini sering digunakan dalam sidang Model United Nations (MUN)."
      },
      {
        id: "q5_3",
        type: "sentence_builder",
        question: "Susun kalimat: 'Delegasi kami mengajukan mosi untuk memperpanjang waktu diskusi':",
        wordTokens: ["本代表", "提出", "动议", "延长", "讨论时间"],
        correctOrder: ["本代表", "提出", "动议", "延长", "讨论时间"],
        explanation: "Susunan benar: 本代表提出动议，延长讨论时间 (Běn dàibiǎo tíchū dòngyì, yáncháng tǎolùn shíjiān)."
      }
    ]
  },

  {
    id: "lesson_6",
    stageNumber: 6,
    tier: 2,
    tierLabel: "Tier 2: 国际组织",
    difficulty: "Menengah (HSK 3+)",
    title: "决议草案起草与投票表决 (Penyusunan Resolusi PBB & Voting)",
    subtitle: "Drafting UN Resolutions & Voting in Mandarin",
    description: "Kuasai anatomi resolusi PBB: 决议草案 (Juéyì cǎo'àn), 序言条款 (Preambulatory Clause), 执行条款 (Operative Clause), 赞成 (In favor), 反对 (Against), 弃权 (Abstain).",
    xp: 85,
    catMentor: 'rebel',
    theoryBrief: {
      title: "Anatomi Resolusi Majelis Umum & Dewan Keamanan PBB",
      summary: "Dokumen resmi PBB terbagi atas '序言条款' (latar belakang masalah) dan '执行条款' (rekomendasi aksi nyata).",
      theoreticalPerspective: "Dalam pemungutan suara (投票表决), delegasi dapat memilih: 赞成 (Zànchéng / Yes), 反对 (Fǎnduì / No), atau 弃权 (Qìquán / Abstain).",
      diplomaticProtocol: "Resolusi yang disepakati tanpa pemungutan suara disebut '协商一致通过' (Adoption by Consensus).",
      keyVocabularyHighlights: ["决议草案 (Juéyì cǎo'àn)", "赞成 (Zànchéng)", "反对 (Fǎnduì)", "弃权 (Qìquán)", "执行条款 (Zhíxíng tiáokuǎn)"]
    },
    studyCards: [
      {
        id: "c6_1",
        term: "决议草案",
        transliteration: "Juéyì cǎo'àn",
        language: "zh",
        meaning: "Rancangan Resolusi (Draft Resolution)",
        contextHI: "Dokumen tertulis yang diusulkan oleh negara-negara sponsor untuk disahkan menjadi resolusi PBB.",
        exampleSentence: "我们共同起草了这份决议草案。(Wǒmen gòngtóng qǐcǎole zhè fèn juéyì cǎo'àn - Kami bersama-sama menyusun rancangan resolusi ini.)",
        audioText: "我们共同起草了这份决议草案。",
        audioLang: "zh-CN",
        tag: "Dokumen Sidang"
      },
      {
        id: "c6_2",
        term: "赞成 / 反对 / 弃权",
        transliteration: "Zànchéng / Fǎnduì / Qìquán",
        language: "zh",
        meaning: "Setuju (In favor) / Menolak (Against) / Abstain",
        contextHI: "Tiga opsi suara delegasi saat pemungutan suara formal di Majelis Umum PBB.",
        exampleSentence: "大会以一百票赞成通过了决议。(Dàhuì yǐ yībǎi piào zànchéng tōngguòle juéyì - Majelis mengesahkan resolusi dengan 100 suara setuju.)",
        audioText: "大会以一百票赞成通过了决议。",
        audioLang: "zh-CN",
        tag: "Voting PBB"
      },
      {
        id: "c6_3",
        term: "协商一致",
        transliteration: "Xiéshāng yīzhì",
        language: "zh",
        meaning: "Konsensus (Consensus)",
        contextHI: "Pengambilan keputusan mufakat bersama tanpa perlu mengadakan pemungutan suara terbuka.",
        exampleSentence: "该声明已获得协商一致通过。(Gāi shēngmíng yǐ huòdé xiéshāng yīzhì tōngguò - Pernyataan tersebut telah diadopsi secara konsensus.)",
        audioText: "该声明已获得协商一致通过。",
        audioLang: "zh-CN",
        tag: "Keputusan Konsensus"
      },
      {
        id: "c6_4",
        term: "执行条款",
        transliteration: "Zhíxíng tiáokuǎn",
        language: "zh",
        meaning: "Klausul Operatif (Operative Clauses)",
        contextHI: "Bagian resolusi bernomor yang berisi instruksi dan langkah konkrit yang diserukan kepada negara anggota.",
        exampleSentence: "执行条款明确呼吁各方保持克制。(Zhíxíng tiáokuǎn míngquè hūyù gè fāng bǎochí kèzhì - Klausul operatif secara tegas menyerukan semua pihak menahan diri.)",
        audioText: "执行条款明确呼吁各方保持克制。",
        audioLang: "zh-CN",
        tag: "Klausul Resolusi"
      }
    ],
    questions: [
      {
        id: "q6_1",
        type: "multiple_choice",
        question: "Jika seorang delegasi memilih 'Abstain' (tidak memilih setuju maupun menolak) dalam pemungutan suara PBB berbahasa Mandarin, ia menyatakan:",
        options: ["弃权 (Qìquán)", "赞成 (Zànchéng)", "反对 (Fǎnduì)", "缺席 (Quēxí)"],
        correctAnswer: 0,
        explanation: "'弃权' (Qìquán) adalah istilah resmi untuk hak Abstain dalam pemungutan suara."
      },
      {
        id: "q6_2",
        type: "matching",
        question: "Cocokkan status pemungutan suara Mandarin dengan artinya:",
        matchingPairs: [
          { left: "赞成 (Zànchéng)", right: "Setuju / In favor" },
          { left: "反对 (Fǎnduì)", right: "Menolak / Against" },
          { left: "弃权 (Qìquán)", right: "Abstain / Tidak memilih" },
          { left: "协商一致 (Xiéshāng yīzhì)", right: "Konsensus / Mufakat bulat" }
        ],
        explanation: "Pilihan suara ini adalah mekanisme pengambilan keputusan standar di Majelis PBB."
      },
      {
        id: "q6_3",
        type: "true_false",
        question: "Dalam istilah diplomasi Mandarin, '决议草案' (Juéyì cǎo'àn) berarti traktat perdamaian yang sudah ditandatangani oleh presiden.",
        isTrue: false,
        explanation: "Salah! '决议草案' berarti 'Rancangan Resolusi' (Draft Resolution) yang masih dalam tahap pengajuan dan pembahasan sidang."
      }
    ]
  },

  {
    id: "lesson_7",
    stageNumber: 7,
    tier: 2,
    tierLabel: "Tier 2: 国际组织",
    difficulty: "Menengah (HSK 4)",
    title: "双边外交与外交照会 (Diplomasi Bilateral & Nota Diplomatik)",
    subtitle: "Bilateral Diplomacy & Diplomatic Notes in Mandarin",
    description: "Pahami surat-menyurat resmi antar Kementerian Luar Negeri: 外交照会 (Wàijiāo zhàohuì / Note Verbale), 备忘录 (MOU), 联合公报 (Joint Communiqué).",
    xp: 90,
    catMentor: 'closeup',
    theoryBrief: {
      title: "Format Korespondensi Diplomatik Resmi Berbahasa Mandarin",
      summary: "Komunikasi tertulis resmi antar Kedutaan Besar dan Kementerian Luar Negeri menggunakan '外交照会' (Nota Diplomatik). Dokumen ini ditulis dalam sudut pandang institusi orang ketiga dengan tata bahasa kesantunan baku.",
      theoreticalPerspective: "Kesepakatan bilateral sering dituangkan dalam '合作备忘录' (Memorandum of Understanding / MOU) atau '联合公报' (Komunike Bersama).",
      diplomaticProtocol: "Nota diplomatik selalu diawali dengan frasa: '中华人民共和国外交部向...使馆致意' (Kementerian Luar Negeri menyampaikan salam kehormatan kepada Kedutaan Besar...).",
      keyVocabularyHighlights: ["外交照会 (Wàijiāo zhàohuì)", "备忘录 (Bèiwànglù)", "联合声明 (Liánhé shēngmíng)", "双边会谈 (Shuāngbiān huìtán)"]
    },
    studyCards: [
      {
        id: "c7_1",
        term: "外交照会",
        transliteration: "Wàijiāo zhàohuì",
        language: "zh",
        meaning: "Nota Diplomatik (Note Verbale)",
        contextHI: "Surat dinas resmi berkop dan berstempel antar kedutaan besar dan kementerian luar negeri.",
        exampleSentence: "大使馆向外交部递交了正式外交照会。(Dàshǐguǎn xiàng wàijiāobù dìjiāole zhèngshì wàijiāo zhàohuì - Kedutaan Besar menyerahkan nota diplomatik resmi kepada kementerian luar negeri.)",
        audioText: "大使馆向外交部递交了正式外交照会。",
        audioLang: "zh-CN",
        tag: "Surat Resmi"
      },
      {
        id: "c7_2",
        term: "合作备忘录",
        transliteration: "Hézuò bèiwànglù",
        language: "zh",
        meaning: "Memorandum of Understanding (MOU Kerjasama)",
        contextHI: "Dokumen kesepahaman bilateral sebelum traktat hukum formal ditandatangani.",
        exampleSentence: "双方签署了教育与科技合作备忘录。(Shuāngfāng qiānshǔle jiàoyù yǔ kējì hézuò bèiwànglù - Kedua pihak menandatangani MOU kerjasama pendidikan dan teknologi.)",
        audioText: "双方签署了教育与科技合作备忘录。",
        audioLang: "zh-CN",
        tag: "MOU Bilateral"
      },
      {
        id: "c7_3",
        term: "联合声明 / 联合公报",
        transliteration: "Liánhé shēngmíng / Liánhé gōngbào",
        language: "zh",
        meaning: "Pernyataan Bersama / Komunike Bersama (Joint Communiqué)",
        contextHI: "Pernyataan pers resmi yang dirilis kedua kepala negara setelah menyelesaikan pertemuan tingkat tinggi (KTT).",
        exampleSentence: "会谈结束后，两国发表了联合声明。(Huìtán jiéshù hòu, liǎng guó fābiǎole liánhé shēngmíng - Setelah perundingan selesai, kedua negara merilis pernyataan bersama.)",
        audioText: "会谈结束后，两国发表了联合声明。",
        audioLang: "zh-CN",
        tag: "Hasil KTT"
      },
      {
        id: "c7_4",
        term: "双边会晤",
        transliteration: "Shuāngbiān huìwù",
        language: "zh",
        meaning: "Pertemuan Bilateral Tingkat Tinggi (Bilateral Meeting)",
        contextHI: "Pertemuan tatap muka antar dua menteri luar negeri atau kepala pemerintahan.",
        exampleSentence: "两国领导人举行了富有成效的双边会晤。(Liǎng guó lǐngdǎorén jǔxíngle fùyǒu chéngxiào de shuāngbiān huìwù - Pemimpin kedua negara menggelar pertemuan bilateral yang produktif.)",
        audioText: "两国领导人举行了富有成效的双边会晤。",
        audioLang: "zh-CN",
        tag: "Diplomasi Bilateral"
      }
    ],
    questions: [
      {
        id: "q7_1",
        type: "multiple_choice",
        question: "Surat diplomatik resmi berkop yang disampaikan kedutaan kepada kementerian luar negeri disebut:",
        options: ["外交照会 (Wàijiāo zhàohuì)", "私人信件 (Sīrén xìnjiàn)", "商业合同 (Shāngyè hétong)", "新闻稿件 (Xīnwéngǎo jiàn)"],
        correctAnswer: 0,
        explanation: "'外交照会' (Wàijiāo zhàohuì) adalah padanan bahasa Mandarin untuk Diplomatic Note / Note Verbale."
      },
      {
        id: "q7_2",
        type: "sentence_builder",
        question: "Susun kalimat: 'Kedua pihak menandatangani nota kesepahaman kerjasama (MOU)':",
        wordTokens: ["双方", "签署了", "合作", "备忘录"],
        correctOrder: ["双方", "签署了", "合作", "备忘录"],
        explanation: "Kalimat terangkai sempurna: 双方签署了合作备忘录 (Shuāngfāng qiānshǔle hézuò bèiwànglù)."
      },
      {
        id: "q7_3",
        type: "listening",
        question: "Dengarkan pengumuman diplomatik berikut dan pilih intinya:",
        audioText: "会谈结束后，两国发表了联合声明。",
        audioLang: "zh-CN",
        options: [
          "Setelah perundingan selesai, kedua negara mengeluarkan pernyataan bersama.",
          "Kedua negara memutuskan hubungan diplomatik tanpa penjelasan.",
          "Pertemuan tingkat tinggi dibatalkan karena cuaca buruk.",
          "Menteri luar negeri menolak menghadiri jamuan makan malam."
        ],
        correctAnswer: 0,
        explanation: "Suara menyatakan: 会谈结束后，两国发表了联合声明 (Setelah pertemuan selesai, kedua negara merilis pernyataan bersama)."
      }
    ]
  },

  {
    id: "lesson_8",
    stageNumber: 8,
    tier: 2,
    tierLabel: "Tier 2: 国际组织",
    difficulty: "Menengah (HSK 4)",
    title: "软实力与公共外交 (Soft Power & Diplomasi Publik)",
    subtitle: "Soft Power & Cultural Diplomacy in Mandarin",
    description: "Kuasai konsep daya pikat diplomasi: 软实力 (Ruǎnshílì / Soft Power), 文化交流 (Wénhuà jiāoliú), 美食外交 (Gastrodiplomacy), 人文交流 (People-to-people exchange).",
    xp: 95,
    catMentor: 'cool',
    theoryBrief: {
      title: "Konsep Soft Power & Diplomasi Budaya dalam Bahasa Mandarin",
      summary: "Soft Power (软实力) adalah kemampuan memengaruhi pihak lain melalui daya tarik kebudayaan, nilai positif, dan program pertukaran pemuda/pelajar (人文交流), bukan dengan paksaan militer atau sanksi ekonomi.",
      theoreticalPerspective: "Diplomasi publik (公共外交) mencakup festival budaya, promosi kuliner (美食外交), dan beasiswa internasional untuk memperkuat citra positif negara di mata dunia.",
      diplomaticProtocol: "Jamuan kenegaraan (国宴) adalah sarana diplomasi gastronomi paling bergengsi untuk menjalin persahabatan antar pemimpin dunia.",
      keyVocabularyHighlights: ["软实力 (Ruǎnshílì)", "公共外交 (Gōnggòng wàijiāo)", "人文交流 (Rénwén jiāoliú)", "文化互鉴 (Wénhuà hùjiàn)"]
    },
    studyCards: [
      {
        id: "c8_1",
        term: "软实力",
        transliteration: "Ruǎnshílì",
        language: "zh",
        meaning: "Soft Power (Kekuatan Lunak Budaya & Nilai)",
        contextHI: "Konsep Joseph Nye mengenai kekuatan daya tarik budaya dan diplomasi tanpa kekerasan militer.",
        exampleSentence: "文化传播提升了国家的国际软实力。(Wénhuà chuánbō tíshēngle guójiā de guójì ruǎnshílì - Penyebaran budaya meningkatkan soft power internasional negara.)",
        audioText: "文化传播提升了国家的国际软实力。",
        audioLang: "zh-CN",
        tag: "Teori HI"
      },
      {
        id: "c8_2",
        term: "公共外交",
        transliteration: "Gōnggòng wàijiāo",
        language: "zh",
        meaning: "Diplomasi Publik (Public Diplomacy)",
        contextHI: "Komunikasi diplomatik yang ditujukan langsung kepada masyarakat sipil dan media negara asing.",
        exampleSentence: "我们通过公共外交增进各国人民的友谊。(Wǒmen tōngguò gōnggòng wàijiāo zēngjìn gèguó rénmín de yǒuyì - Melalui diplomasi publik kita mempererat persahabatan masyarakat dunia.)",
        audioText: "我们通过公共外交增进各国人民的友谊。",
        audioLang: "zh-CN",
        tag: "Diplomasi Publik"
      },
      {
        id: "c8_3",
        term: "人文交流",
        transliteration: "Rénwén jiāoliú",
        language: "zh",
        meaning: "Pertukaran Sosial-Budaya & Antar-Warga (People-to-People Exchange)",
        contextHI: "Program pertukaran mahasiswa, akademisi, atlet, dan seniman antarnegara.",
        exampleSentence: "深化青年与学者之间的人文交流。(Shēnhuà qīngnián yǔ xuézhě zhī jiān de rénwén jiāoliú - Memperdalam pertukaran antar-warga di kalangan pemuda dan sarjana.)",
        audioText: "深化青年与学者之间的人文交流。",
        audioLang: "zh-CN",
        tag: "Pertukaran Warga"
      },
      {
        id: "c8_4",
        term: "国宴",
        transliteration: "Guóyàn",
        language: "zh",
        meaning: "Jamuan Kenegaraan Resmi (State Banquet / Gastrodiplomacy)",
        contextHI: "Makan malam resmi kenegaraan yang diselenggarakan kepala negara untuk menghormati kepala negara tamu.",
        exampleSentence: "国家主席为外国元首举行隆重国宴。(Guójiā zhǔxí wèi wàiguó yuánshǒu jǔxíng lóngzhòng guóyàn - Presiden menyelenggarakan jamuan kenegaraan agung untuk kepala negara asing.)",
        audioText: "国家主席为外国元首举行隆重国宴。",
        audioLang: "zh-CN",
        tag: "Gastrodiplomasi"
      }
    ],
    questions: [
      {
        id: "q8_1",
        type: "multiple_choice",
        question: "Istilah bahasa Mandarin untuk konsep 'Soft Power' (kekuatan daya tarik budaya dan diplomasi) adalah:",
        options: ["软实力 (Ruǎnshílì)", "硬实力 (Yìngshílì)", "巧实力 (Qiǎoshílì)", "经济制裁 (Jīngjì zhìcái)"],
        correctAnswer: 0,
        explanation: "'软' (Ruǎn) = Lembut/Lunak, '实力' (Shílì) = Kekuatan -> 软实力 = Soft Power."
      },
      {
        id: "q8_2",
        type: "matching",
        question: "Cocokkan bentuk diplomasi budaya dengan artinya:",
        matchingPairs: [
          { left: "软实力 (Ruǎnshílì)", right: "Soft Power" },
          { left: "公共外交 (Gōnggòng wàijiāo)", right: "Diplomasi Publik" },
          { left: "人文交流 (Rénwén jiāoliú)", right: "Pertukaran Antar-Warga" },
          { left: "国宴 (Guóyàn)", right: "Jamuan Kenegaraan Resmi" }
        ],
        explanation: "Instrumen diplomasi publik berperan vital dalam membangun rasa saling percaya internasional."
      },
      {
        id: "q8_3",
        type: "true_false",
        question: "Jamuan kenegaraan (国宴 / Guóyàn) hanya bertujuan untuk makan bersama tanpa dampak politik atau diplomasi simbolik.",
        isTrue: false,
        explanation: "Salah! Jamuan kenegaraan adalah instrumen diplomasi kultural dan gastrodiplomasi yang sarat dengan simbol penghormatan antarnegara."
      }
    ]
  },

  // =========================================================================
  // TIER 3: EKONOMI POLITIK GLOBAL, KEAMANAN & HUMANITER
  // =========================================================================
  {
    id: "lesson_9",
    stageNumber: 9,
    tier: 3,
    tierLabel: "Tier 3: 经贸与安全",
    difficulty: "Menengah Lanjut (HSK 4-5)",
    title: "国际经贸与一带一路倡议 (Ekonomi Internasional & Inisiatif Sabuk-Jalan)",
    subtitle: "International Trade & The Belt and Road in Mandarin",
    description: "Kuasai kosakata ekonomi politik global: 一带一路 (Belt and Road), 自由贸易协定 (Free Trade Agreement), 关税 (Tarif/Bea Masuk), 互联互通 (Konektivitas).",
    xp: 100,
    catMentor: 'diplomat',
    theoryBrief: {
      title: "Diplomasi Ekonomi & Kerjasama Infrastruktur Global",
      summary: "Diplomasi ekonomi modern berfokus pada negosiasi perdagangan bebas (自由贸易协定 / FTA), penurunan tarif pabean (降低关税), dan pembangunan konektivitas infrastruktur global (互联互通).",
      theoreticalPerspective: "Inisiatif Sabuk dan Jalan (一带一路倡议) berlandaskan prinsip '共商共建共享' (bermusyawarah bersama, membangun bersama, dan berbagi manfaat bersama).",
      diplomaticProtocol: "Diplomat ekonomi bertugas mengamankan akses pasar, melindungi investasi luar negeri, dan menangani sengketa di Organisasi Perdagangan Dunia (WTO / 世界贸易组织).",
      keyVocabularyHighlights: ["一带一路 (Yīdài yīlù)", "自由贸易 (Zìyóu màoyì)", "关税 (Guānshuì)", "互联互通 (Hùlián hùtōng)"]
    },
    studyCards: [
      {
        id: "c9_1",
        term: "一带一路",
        transliteration: "Yīdài yīlù",
        language: "zh",
        meaning: "Inisiatif Sabuk dan Jalan (Belt and Road Initiative / BRI)",
        contextHI: "Inisiatif mega-proyek konektivitas maritim dan darat internasional untuk mendorong perdagangan dan infrastruktur.",
        exampleSentence: "高质量共建一带一路促进了区域经济增长。(Gāo zhìliàng gòngjiàn yīdài yīlù cùjìnle qūyù jīngjì zēngzhǎng - Pembangunan bersama Belt and Road berkualitas tinggi mendorong pertumbuhan ekonomi kawasan.)",
        audioText: "高质量共建一带一路促进了区域经济增长。",
        audioLang: "zh-CN",
        tag: "Inisiatif Global"
      },
      {
        id: "c9_2",
        term: "自由贸易协定",
        transliteration: "Zìyóu màoyì xiédìng",
        language: "zh",
        meaning: "Perjanjian Perdagangan Bebas (Free Trade Agreement / FTA)",
        contextHI: "Traktat perdagangan untuk menghapus atau menurunkan bea masuk dan hambatan non-tarif antarnegara anggota.",
        exampleSentence: "两国正式签署双边自由贸易协定。(Liǎng guó zhèngshì qiānshǔ shuāngbiān zìyóu màoyì xiédìng - Kedua negara resmi menandatangani perjanjian perdagangan bebas bilateral.)",
        audioText: "两国正式签署双边自由贸易协定。",
        audioLang: "zh-CN",
        tag: "Traktat Dagang"
      },
      {
        id: "c9_3",
        term: "降低关税",
        transliteration: "Jiàngdī guānshuì",
        language: "zh",
        meaning: "Menurunkan Tarif / Bea Masuk Impor-Ekspor",
        contextHI: "Langkah liberalisasi perdagangan untuk meningkatkan volume arus barang antarnegara mitra.",
        exampleSentence: "协议生效后，双方将大幅降低进出口关税。(Xiéyì shēngxiào hòu, shuāngfāng jiāng dàfú jiàngdī jìnchūkǒu guānshuì - Setelah perjanjian berlaku, kedua pihak akan memangkas tarif impor-ekspor secara signifikan.)",
        audioText: "协议生效后，双方将大幅降低进出口关税。",
        audioLang: "zh-CN",
        tag: "Kebijakan Tarif"
      },
      {
        id: "c9_4",
        term: "互联互通",
        transliteration: "Hùlián hùtōng",
        language: "zh",
        meaning: "Konektivitas dan Keterhubungan (Connectivity)",
        contextHI: "Integrasi jaringan rel kereta api, pelabuhan laut, bandara, kabel serat optik, dan regulasi antarnegara.",
        exampleSentence: "加强跨国基础设施的互联互通。(Jiāqiáng kuàguó jīchǔ shèshī de hùlián hùtōng - Memperkuat konektivitas infrastruktur lintas batas negara.)",
        audioText: "加强跨国基础设施的互联互通。",
        audioLang: "zh-CN",
        tag: "Infrastruktur"
      }
    ],
    questions: [
      {
        id: "q9_1",
        type: "multiple_choice",
        question: "Istilah resmi bahasa Mandarin untuk 'Perjanjian Perdagangan Bebas' (Free Trade Agreement / FTA) adalah:",
        options: ["自由贸易协定 (Zìyóu màoyì xiédìng)", "国际货币基金 (Guójì huòbì jījīn)", "边境安全条约 (Biānjìng ānquán tiáoyuē)", "引渡协定 (Yǐndù xiédìng)"],
        correctAnswer: 0,
        explanation: "'自由' (Zìyóu) = Bebas, '贸易' (Màoyì) = Perdagangan, '协定' (Xiédìng) = Perjanjian."
      },
      {
        id: "q9_2",
        type: "sentence_builder",
        question: "Susun kalimat: 'Kedua negara resmi menandatangani perjanjian perdagangan bebas bilateral':",
        wordTokens: ["两国", "正式", "签署", "双边", "自由贸易协定"],
        correctOrder: ["两国", "正式", "签署", "双边", "自由贸易协定"],
        explanation: "Struktur lengkap: 两国正式签署双边自由贸易协定 (Liǎng guó zhèngshì qiānshǔ shuāngbiān zìyóu màoyì xiédìng)."
      },
      {
        id: "q9_3",
        type: "matching",
        question: "Cocokkan istilah ekonomi politik internasional Mandarin dengan artinya:",
        matchingPairs: [
          { left: "一带一路 (Yīdài yīlù)", right: "Belt and Road Initiative" },
          { left: "自由贸易协定", right: "Free Trade Agreement" },
          { left: "关税 (Guānshuì)", right: "Tarif / Bea Masuk" },
          { left: "互联互通", right: "Konektivitas Infrastruktur" }
        ],
        explanation: "Kosakata ini esensial dalam diplomasi perdagangan bilateral dan multilateral modern."
      }
    ]
  },

  {
    id: "lesson_10",
    stageNumber: 10,
    tier: 3,
    tierLabel: "Tier 3: 经贸与安全",
    difficulty: "Menengah Lanjut (HSK 5)",
    title: "国际人道法与日内瓦公约 (Hukum Humaniter & Konvensi Jenewa)",
    subtitle: "International Humanitarian Law & Geneva Conventions in Mandarin",
    description: "Pelajari hukum perang internasional: 国际人道法 (Guójì réndàofǎ), 日内瓦公约 (Rìnèiwǎ gōngyuē), 人道主义走廊 (Humanitarian Corridor), 难民保护 (Perlindungan Pengungsi).",
    xp: 105,
    catMentor: 'explorer',
    theoryBrief: {
      title: "Prinsip Perlindungan Korban Konflik Bersenjata (IHL)",
      summary: "Hukum Humaniter Internasional (国际人道法) mewajibkan perlindungan bagi warga sipil (平民), tawanan perang (战俘), dan tenaga medis dalam situasi konflik bersenjata.",
      theoreticalPerspective: "Konvensi Jenewa 1949 (日内瓦公约) dan Protokol Tambahannya melarang serangan terhadap rumah sakit, sekolah, dan konvoi bantuan kemanusiaan.",
      diplomaticProtocol: "Diplomat mendesak pembukaan '人道主义走廊' (koridor kemanusiaan) untuk evakuasi warga sipil yang terjebak di zona perang.",
      keyVocabularyHighlights: ["国际人道法 (Guójì réndàofǎ)", "日内瓦公约 (Rìnèiwǎ gōngyuē)", "人道主义走廊 (Réndàozhǔyì zǒuláng)", "难民 (Nànmín)"]
    },
    studyCards: [
      {
        id: "c10_1",
        term: "国际人道法",
        transliteration: "Guójì réndàofǎ",
        language: "zh",
        meaning: "Hukum Humaniter Internasional (International Humanitarian Law / IHL)",
        contextHI: "Aturan hukum internasional yang membatasi dampak perang dan melindungi pihak yang tidak ikut berperang.",
        exampleSentence: "各方必须严格遵守国际人道法。(Gè fāng bìxū yángé zūnshǒu guójì réndàofǎ - Semua pihak wajib mematuhi hukum humaniter internasional secara ketat.)",
        audioText: "各方必须严格遵守国际人道法。",
        audioLang: "zh-CN",
        tag: "Hukum Humaniter"
      },
      {
        id: "c10_2",
        term: "日内瓦公约",
        transliteration: "Rìnèiwǎ gōngyuē",
        language: "zh",
        meaning: "Konvensi Jenewa (Geneva Conventions)",
        contextHI: "Traktat internasional empat pilar yang mengatur perlindungan korban perang, tawanan, dan warga sipil.",
        exampleSentence: "日内瓦公约明确禁止针对平民的攻击。(Rìnèiwǎ gōngyuē míngquè jìnzhǐ zhēnduì píngmín de gōngjī - Konvensi Jenewa secara tegas melarang serangan terhadap warga sipil.)",
        audioText: "日内瓦公约明确禁止针对平民的攻击。",
        audioLang: "zh-CN",
        tag: "Konvensi Jenewa"
      },
      {
        id: "c10_3",
        term: "人道主义走廊",
        transliteration: "Réndàozhǔyì zǒuláng",
        language: "zh",
        meaning: "Koridor Kemanusiaan (Humanitarian Corridor)",
        contextHI: "Zona aman sementara yang disepakati untuk menyalurkan makanan, obat-obatan, dan evakuasi korban luka.",
        exampleSentence: "联合国呼吁立即开辟人道主义走廊。(Liánhéguó hūyù lìjí kāipì réndàozhǔyì zǒuláng - PBB menyerukan pembukaan segera koridor kemanusiaan.)",
        audioText: "联合国呼吁立即开辟人道主义走廊。",
        audioLang: "zh-CN",
        tag: "Bantuan Darurat"
      },
      {
        id: "c10_4",
        term: "难民保护",
        transliteration: "Nànmín bǎohù",
        language: "zh",
        meaning: "Perlindungan Pengungsi (Refugee Protection)",
        contextHI: "Mandat Konvensi Pengungsi 1951 (UNHCR) untuk menjamin hak suaka dan keselamatan korban konflik.",
        exampleSentence: "国际社会应共同承担难民保护责任。(Guójì shèhuì yīng gòngtóng chéngdān nànmín bǎohù zérèn - Komunitas internasional harus bersama-sama memikul tanggung jawab perlindungan pengungsi.)",
        audioText: "国际社会应共同承担难民保护责任。",
        audioLang: "zh-CN",
        tag: "UNHCR"
      }
    ],
    questions: [
      {
        id: "q10_1",
        type: "multiple_choice",
        question: "Zona aman sementara yang disepakati oleh pihak berkonflik untuk menyalurkan bantuan makanan dan evakuasi warga sipil disebut:",
        options: ["人道主义走廊 (Réndàozhǔyì zǒuláng)", "军事禁区 (Jūnshì jìnqū)", "经济特区 (Jīngjì tèqū)", "关税同盟 (Guānshuì tóngméng)"],
        correctAnswer: 0,
        explanation: "'人道主义走廊' (Humanitarian Corridor) adalah jalur aman evakuasi dan pengiriman bantuan kemanusiaan darurat."
      },
      {
        id: "q10_2",
        type: "true_false",
        question: "Berdasarkan 日内瓦公约 (Konvensi Jenewa), fasilitas medis dan rumah sakit lapangan boleh dijadikan target serangan militer.",
        isTrue: false,
        explanation: "Salah! Konvensi Jenewa secara mutlak melindungi rumah sakit, tenaga medis, dan ambulans dari serangan bersenjata."
      },
      {
        id: "q10_3",
        type: "sentence_builder",
        question: "Susun kalimat seruan diplomatik PBB: 'Semua pihak wajib secara ketat mematuhi hukum humaniter internasional':",
        wordTokens: ["各方", "必须", "严格", "遵守", "国际人道法"],
        correctOrder: ["各方", "必须", "严格", "遵守", "国际人道法"],
        explanation: "Urutan tepat: 各方必须严格遵守国际人道法 (Gè fāng bìxū yángé zūnshǒu guójì réndàofǎ)."
      }
    ]
  },

  {
    id: "lesson_11",
    stageNumber: 11,
    tier: 3,
    tierLabel: "Tier 3: 经贸与安全",
    difficulty: "Menengah Lanjut (HSK 5)",
    title: "危机斡旋与停火协议 (Mediasi Krisis & Perjanjian Gencatan Senjata)",
    subtitle: "Crisis Mediation & Ceasefire Agreements in Mandarin",
    description: "Kuasai bahasa mediasi damai: 斡旋 (Wòxuán / Good Offices), 停火协议 (Tínghuǒ xiédìng / Ceasefire), 联合国维和部队 (UN Peacekeeping Forces).",
    xp: 110,
    catMentor: 'diplomat',
    theoryBrief: {
      title: "Teknik Negosiasi Mediasi Damai Internasional",
      summary: "Ketika terjadi sengketa antarnegara, mediator pihak ketiga dapat memberikan '斡旋' (Jasa Baik / Good Offices) atau '调停' (Mediasi) guna mempertemukan pihak yang berselisih ke meja perundingan.",
      theoreticalPerspective: "Pemberlakuan '停火协议' (Perjanjian Gencatan Senjata) sering diawasi oleh Pasukan Penjaga Perdamaian PBB ('联合国维持和平部队' / UN Blue Helmets).",
      diplomaticProtocol: "Juru runding mengutamakan dialog konstruktif: '呼吁各方保持冷静克制，通过对话解决分歧' (Menyerukan semua pihak tetap tenang, menahan diri, dan menyelesaikan perbedaan melalui dialog).",
      keyVocabularyHighlights: ["斡旋 (Wòxuán)", "停火协议 (Tínghuǒ xiédìng)", "维和部队 (Wéihé bùduì)", "保持克制 (Bǎochí kèzhì)"]
    },
    studyCards: [
      {
        id: "c11_1",
        term: "斡旋与调解",
        transliteration: "Wòxuán yǔ tiáojiě",
        language: "zh",
        meaning: "Mediasi dan Jasa Baik (Mediation and Good Offices)",
        contextHI: "Upaya pihak ketiga netral untuk mendamaikan pihak yang berkonflik demi tercapainya gencatan senjata.",
        exampleSentence: "特使积极开展外交斡旋以恢复和平。(Tèshǐ jījí kāizhǎn wàijiāo wòxuán yǐ huīfù hépíng - Utusan khusus aktif melakukan mediasi diplomatik untuk memulihkan perdamaian.)",
        audioText: "特使积极开展外交斡旋以恢复和平。",
        audioLang: "zh-CN",
        tag: "Resolusi Konflik"
      },
      {
        id: "c11_2",
        term: "停火协议",
        transliteration: "Tínghuǒ xiédìng",
        language: "zh",
        meaning: "Perjanjian Gencatan Senjata (Ceasefire Agreement)",
        contextHI: "Kesepakatan penghentian baku tembak sementara atau permanen antar pihak bersenjata.",
        exampleSentence: "冲突双方达成了全面停火协议。(Chōngtū shuāngfāng dáchéngle quánmiàn tínghuǒ xiédìng - Kedua pihak yang berkonflik mencapai perjanjian gencatan senjata menyeluruh.)",
        audioText: "冲突双方达成了全面停火协议。",
        audioLang: "zh-CN",
        tag: "Gencatan Senjata"
      },
      {
        id: "c11_3",
        term: "联合国维和部队",
        transliteration: "Liánhéguó wéihé bùduì",
        language: "zh",
        meaning: "Pasukan Penjaga Perdamaian PBB (UN Peacekeeping Forces / Blue Helmets)",
        contextHI: "Pasukan multinasional berhelm biru dengan mandat Dewan Keamanan PBB untuk mengawasi zona gencatan senjata.",
        exampleSentence: "联合国维和部队进驻缓冲区维持秩序。(Liánhéguó wéihé bùduì jìnzhù huǎnchōngqū wéichí zhìxù - Pasukan penjaga perdamaian PBB memasuki zona penyangga untuk memelihara ketertiban.)",
        audioText: "联合国维和部队进驻缓冲区维持秩序。",
        audioLang: "zh-CN",
        tag: "Misi PBB"
      },
      {
        id: "c11_4",
        term: "保持克制",
        transliteration: "Bǎochí kèzhì",
        language: "zh",
        meaning: "Menahan Diri / Exercise Restraint",
        contextHI: "Frasa standar juru bicara Kemenlu untuk meredakan eskalasi ketegangan perbatasan.",
        exampleSentence: "我们呼吁各方保持最大限度的克制。(Wǒmen hūyù gè fāng bǎochí zuìdà xiàndù de kèzhì - Kami menyerukan semua pihak untuk menahan diri semaksimal mungkin.)",
        audioText: "我们呼吁各方保持最大限度的克制。",
        audioLang: "zh-CN",
        tag: "Pernyataan Krisis"
      }
    ],
    questions: [
      {
        id: "q11_1",
        type: "multiple_choice",
        question: "Apa istilah bahasa Mandarin untuk kesepakatan penghentian tembak-menembak antar pihak yang bertikai?",
        options: ["停火协议 (Tínghuǒ xiédìng)", "宣战通告 (Xuānzhàn tōnggào)", "贸易禁运 (Màoyì jìnyùn)", "引渡条约 (Yǐndù tiáoyuē)"],
        correctAnswer: 0,
        explanation: "'停火' (Tínghuǒ) = Menghentikan tembakan / Ceasefire, '协议' (Xiédìng) = Perjanjian."
      },
      {
        id: "q11_2",
        type: "matching",
        question: "Cocokkan peran penjaga perdamaian Mandarin dengan artinya:",
        matchingPairs: [
          { left: "停火协议 (Tínghuǒ xiédìng)", right: "Perjanjian Gencatan Senjata" },
          { left: "联合国维和部队", right: "Pasukan Penjaga Perdamaian PBB" },
          { left: "外交斡旋 (Wàijiāo wòxuán)", right: "Mediasi / Jasa Baik Diplomatik" },
          { left: "保持克制 (Bǎochí kèzhì)", right: "Menahan Diri dari Eskalasi" }
        ],
        explanation: "Istilah-istilah ini adalah pilar diplomasi resolusi konflik multilateral."
      },
      {
        id: "q11_3",
        type: "listening",
        question: "Dengarkan pernyataan juru bicara Kementerian Luar Negeri berikut:",
        audioText: "我们呼吁各方保持最大限度的克制。",
        audioLang: "zh-CN",
        options: [
          "Kami menyerukan semua pihak untuk menahan diri semaksimal mungkin.",
          "Kami memutuskan untuk menambah pangkalan militer di wilayah konflik.",
          "Kami menolak segala bentuk perundingan damai.",
          "Kami menghentikan seluruh jalur komunikasi diplomatik."
        ],
        correctAnswer: 0,
        explanation: "Suara menyerukan agar semua pihak menahan diri (我们呼吁各方保持最大限度的克制)."
      }
    ]
  },

  {
    id: "lesson_12",
    stageNumber: 12,
    tier: 3,
    tierLabel: "Tier 3: 经贸与安全",
    difficulty: "Menengah Lanjut (HSK 5)",
    title: "气候变化与绿色外交 (Diplomasi Perubahan Iklim & Lingkungan Hidup)",
    subtitle: "Climate Change Diplomacy & The Paris Agreement in Mandarin",
    description: "Pelajari diplomasi iklim multilateral: 气候变化 (Qìhòu biànhuà), 巴黎协定 (Paris Agreement), 碳达峰与碳中和 (Carbon Peak & Carbon Neutrality), 共同但有区别的责任 (CBDR).",
    xp: 115,
    catMentor: 'cool',
    theoryBrief: {
      title: "Konferensi Tingkat Tinggi Perubahan Iklim (UNFCCC / COP)",
      summary: "Negosiasi iklim di forum COP PBB mengedepankan implementasi '巴黎协定' (Perjanjian Paris) guna membatasi kenaikan suhu bumi di bawah 1.5 derajat Celsius.",
      theoreticalPerspective: "Prinsip utama yang diperjuangkan negara berkembang adalah '共同但有区别的责任' (Common but Differentiated Responsibilities / CBDR).",
      diplomaticProtocol: "Komitmen iklim modern mencakup target '碳达峰' (Puncak Emisi Karbon) dan '碳中和' (Netralitas Karbon / Net Zero Emissions).",
      keyVocabularyHighlights: ["气候变化 (Qìhòu biànhuà)", "巴黎协定 (Bālí xiédìng)", "碳中和 (Tàn zhōnghé)", "绿色转型 (Lǜsè zhuǎnxíng)"]
    },
    studyCards: [
      {
        id: "c12_1",
        term: "气候变化与巴黎协定",
        transliteration: "Qìhòu biànhuà yǔ Bālí xiédìng",
        language: "zh",
        meaning: "Perubahan Iklim & Perjanjian Paris 2015",
        contextHI: "Kerangka traktat global untuk mitigasi pemanasan global dan pendanaan adaptasi iklim.",
        exampleSentence: "全面落实应对气候变化的巴黎协定。(Quánmiàn luòshí yìngduì qìhòu biànhuà de Bālí xiédìng - Mengimplementasikan secara komprehensif Perjanjian Paris dalam menghadapi perubahan iklim.)",
        audioText: "全面落实应对气候变化的巴黎协定。",
        audioLang: "zh-CN",
        tag: "Traktat Iklim"
      },
      {
        id: "c12_2",
        term: "碳中和",
        transliteration: "Tàn zhōnghé",
        language: "zh",
        meaning: "Netralitas Karbon (Carbon Neutrality / Net Zero)",
        contextHI: "Target di mana jumlah emisi karbon yang dihasilkan seimbang dengan jumlah emisi yang diserap kembali.",
        exampleSentence: "各国制定了实现碳中和的时间表。(Gèguó zhìdìngle shíxiàn tàn zhōnghé de shíjiānbiǎo - Negara-negara menetapkan peta jalan untuk mencapai netralitas karbon.)",
        audioText: "各国制定了实现碳中和的时间表。",
        audioLang: "zh-CN",
        tag: "Target Emisi"
      },
      {
        id: "c12_3",
        term: "共同但有区别的责任",
        transliteration: "Gòngtóng dàn yǒu qūbié de zérèn",
        language: "zh",
        meaning: "Tanggung Jawab Bersama dengan Pembedaan Beban (CBDR)",
        contextHI: "Prinsip bahwa negara maju yang memproduksi emisi historis terbanyak harus memberikan pendanaan teknologi kepada negara berkembang.",
        exampleSentence: "坚持共同但有区别的责任原则。(Jiānchí gòngtóng dàn yǒu qūbié de zérèn yuánzé - Mempertahankan prinsip tanggung jawab bersama tetapi dibedakan.)",
        audioText: "坚持共同但有区别的责任原则。",
        audioLang: "zh-CN",
        tag: "Prinsip CBDR"
      },
      {
        id: "c12_4",
        term: "绿色转型",
        transliteration: "Lǜsè zhuǎnxíng",
        language: "zh",
        meaning: "Transisi Energi Hijau (Green Transition)",
        contextHI: "Peralihan dari bahan bakar fosil menuju energi terbarukan (solar, angin, hidro).",
        exampleSentence: "推动全球能源结构的绿色转型。(Tuīdòng quánqiú néngyuán jiégòu de lǜsè zhuǎnxíng - Mendorong transisi hijau pada struktur energi global.)",
        audioText: "推动全球能源结构的绿色转型。",
        audioLang: "zh-CN",
        tag: "Energi Bersih"
      }
    ],
    questions: [
      {
        id: "q12_1",
        type: "multiple_choice",
        question: "Prinsip diplomasi iklim internasional yang menyatakan negara maju harus menanggung beban kompensasi historis lebih besar dikenal sebagai:",
        options: [
          "共同但有区别的责任 (Gòngtóng dàn yǒu qūbié de zérèn / CBDR)",
          "单边制裁原则 (Dānbiān zhìcái yuánzé)",
          "自由航行权 (Zìyóu hángxíngquán)",
          "无核区条约 (Wú hé qū tiáoyuē)"
        ],
        correctAnswer: 0,
        explanation: "CBDR (Common but Differentiated Responsibilities) dalam bahasa Mandarin adalah '共同但有区别的责任'."
      },
      {
        id: "q12_2",
        type: "sentence_builder",
        question: "Susun kalimat: 'Mendorong transisi hijau pada struktur energi global':",
        wordTokens: ["推动", "全球", "能源结构", "的", "绿色转型"],
        correctOrder: ["推动", "全球", "能源结构", "的", "绿色转型"],
        explanation: "Kalimat lengkap: 推动全球能源结构的绿色转型 (Tuīdòng quánqiú néngyuán jiégòu de lǜsè zhuǎnxíng)."
      },
      {
        id: "q12_3",
        type: "true_false",
        question: "Istilah '碳中和' (Tàn zhōnghé) berarti negara diperbolehkan menambah emisi batu bara tanpa batas.",
        isTrue: false,
        explanation: "Salah! '碳中和' berarti Carbon Neutrality (Netralitas Karbon / emisi bersih nol)."
      }
    ]
  },

  // =========================================================================
  // TIER 4: NEGOSIASI TINGKAT TINGGI & TATA KELOLA GLOBAL (SUHU DIPLOMASI)
  // =========================================================================
  {
    id: "lesson_13",
    stageNumber: 13,
    tier: 4,
    tierLabel: "Tier 4: 高级战略谈判",
    difficulty: "Mahir (HSK 5-6)",
    title: "联合国安理会与一票否决权 (Dewan Keamanan PBB & Hak Veto)",
    subtitle: "UN Security Council & Veto Power in Mandarin",
    description: "Kuasai organ paling berkuasa di dunia: 安全理事会 (Security Council), 常任理事国 (P5 Permanent Members), 否决权 (Veto Power), 国际制裁 (Sanctions).",
    xp: 120,
    catMentor: 'rebel',
    theoryBrief: {
      title: "Kekuasaan Hukum Bab VII Piagam PBB & Hak Veto P5",
      summary: "Dewan Keamanan PBB (联合国安全理事会) terdiri atas 5 Anggota Tetap (常任理事国: Tiongkok, AS, Rusia, Inggris, Prancis) yang memiliki '一票否决权' (Hak Veto) dan 10 Anggota Tidak Tetap.",
      theoreticalPerspective: "Resolusi yang disahkan di bawah Bab VII Piagam PBB bersifat mengikat secara hukum (具有法律约束力) dan dapat menjatuhkan sanksi ekonomi maupun mandat pengerahan militer.",
      diplomaticProtocol: "Jika satu anggota tetap menggunakan hak veto ('行使否决权'), rancangan resolusi otomatis gugur meskipun disetujui mayoritas negara anggota.",
      keyVocabularyHighlights: ["安全理事会 (Ānquán lǐshìhuì)", "常任理事国 (Chángrèn lǐshìguó)", "否决权 (Fǒujuéquán)", "法律约束力 (Fǎlǜ yuēshùlì)"]
    },
    studyCards: [
      {
        id: "c13_1",
        term: "安全理事会与常任理事国",
        transliteration: "Ānquán lǐshìhuì yǔ Chángrèn lǐshìguó",
        language: "zh",
        meaning: "Dewan Keamanan PBB & 5 Anggota Tetap (P5)",
        contextHI: "Organ tertinggi PBB yang memegang tanggung jawab utama memelihara perdamaian dan keamanan dunia.",
        exampleSentence: "安理会常任理事国承担着特殊的全球安全责任。(Ānlǐhuì chángrèn lǐshìguó chéngdānzhe tèshū de quánqiú ānquán zérèn - Anggota tetap Dewan Keamanan memikul tanggung jawab keamanan global khusus.)",
        audioText: "安理会常任理事国承担着特殊的全球安全责任。",
        audioLang: "zh-CN",
        tag: "Organ Utama PBB"
      },
      {
        id: "c13_2",
        term: "一票否决权",
        transliteration: "Yī piào fǒujuéquán",
        language: "zh",
        meaning: "Hak Veto Anggota Tetap Dewan Keamanan PBB (Veto Power)",
        contextHI: "Hak istimewa salah satu anggota P5 untuk membatalkan pengesahan resolusi substantif.",
        exampleSentence: "该国在安理会投票中行使了一票否决权。(Gāi guó zài ānlǐhuì tóupiào zhōng xíngshǐle yī piào fǒujuéquán - Negara tersebut menggunakan hak veto dalam pemungutan suara Dewan Keamanan.)",
        audioText: "该国在安理会投票中行使了一票否决权。",
        audioLang: "zh-CN",
        tag: "Hak Veto P5"
      },
      {
        id: "c13_3",
        term: "国际制裁",
        transliteration: "Guójì zhìcái",
        language: "zh",
        meaning: "Sanksi Internasional (International Sanctions)",
        contextHI: "Pembatasan ekonomi, embargo senjata, atau pembekuan aset yang disahkan melalui Resolusi Dewan Keamanan PBB.",
        exampleSentence: "安理会决定对违反决议的实体实施制裁。(Ānlǐhuì juédìng duì wéifǎn juéyì de shítǐ shíshī zhìcái - Dewan Keamanan memutuskan menerapkan sanksi kepada entitas yang melanggar resolusi.)",
        audioText: "安理会决定对违反决议的实体实施制裁。",
        audioLang: "zh-CN",
        tag: "Sanksi PBB"
      },
      {
        id: "c13_4",
        term: "具有法律约束力",
        transliteration: "Jùyǒu fǎlǜ yuēshùlì",
        language: "zh",
        meaning: "Memiliki Kekuatan Hukum Mengikat (Legally Binding)",
        contextHI: "Status hukum keputusan Dewan Keamanan di bawah Bab VII yang wajib ditaati seluruh anggota PBB.",
        exampleSentence: "安理会第七章通过的决议具有法律约束力。(Ānlǐhuì dì qī zhāng tōngguò de juéyì jùyǒu fǎlǜ yuēshùlì - Resolusi yang disahkan Bab VII Dewan Keamanan memiliki kekuatan hukum mengikat.)",
        audioText: "安理会第七章通过的决议具有法律约束力。",
        audioLang: "zh-CN",
        tag: "Kekuatan Hukum"
      }
    ],
    questions: [
      {
        id: "q13_1",
        type: "multiple_choice",
        question: "Hak istimewa anggota tetap Dewan Keamanan PBB (P5) untuk membatalkan rancangan resolusi disebut:",
        options: ["否决权 (Fǒujuéquán / Veto Power)", "豁免权 (Huòmiǎnquán)", "优先权 (Yōuxiānquán)", "表决权 (Biǎojuéquán)"],
        correctAnswer: 0,
        explanation: "'否决权' (Fǒujuéquán) adalah istilah resmi bahasa Mandarin untuk Hak Veto."
      },
      {
        id: "q13_2",
        type: "matching",
        question: "Pasangkan istilah Dewan Keamanan PBB Mandarin dengan artinya:",
        matchingPairs: [
          { left: "常任理事国", right: "Anggota Tetap Dewan Keamanan (P5)" },
          { left: "一票否决权", right: "Hak Veto" },
          { left: "国际制裁 (Guójì zhìcái)", right: "Sanksi Internasional" },
          { left: "具有法律约束力", right: "Mengikat Secara Hukum (Legally Binding)" }
        ],
        explanation: "Dewan Keamanan PBB adalah badan pemegang otoritas penegakan perdamaian tertinggi."
      },
      {
        id: "q13_3",
        type: "scenario_dilemma",
        scenario: "Sebuah rancangan resolusi gencatan senjata di Dewan Keamanan PBB mendapatkan 14 suara setuju dari 15 anggota, namun 1 anggota tetap memilih '反对' (Menolak).",
        question: "Bagaimana status hukum rancangan resolusi tersebut?",
        options: [
          "Resolusi dinyatakan GUGUR karena terkena hak veto ('行使否决权') dari anggota tetap.",
          "Resolusi tetap disahkan karena sudah mencapai mayoritas 14 suara.",
          "Resolusi otomatis dialihkan menjadi traktat perdagangan bilateral.",
          "Semua anggota langsung keluar dari keanggotaan PBB."
        ],
        correctAnswer: 0,
        explanation: "Sesuai Piagam PBB, satu suara menolak dari anggota tetap (P5) menggugurkan resolusi Dewan Keamanan."
      }
    ]
  },

  {
    id: "lesson_14",
    stageNumber: 14,
    tier: 4,
    tierLabel: "Tier 4: 高级战略谈判",
    difficulty: "Mahir (HSK 6)",
    title: "联合国海洋法公约与国际法院 (Hukum Laut UNCLOS & Mahkamah Internasional)",
    subtitle: "UNCLOS & The International Court of Justice in Mandarin",
    description: "Pelajari hukum maritim dan yurisdiksi peradilan internasional: 联合国海洋法公约 (UNCLOS), 专属经济区 (EEZ), 领海 (Territorial Sea), 国际法院 (ICJ).",
    xp: 125,
    catMentor: 'explorer',
    theoryBrief: {
      title: "Rezim Hukum Laut Internasional (UNCLOS 1982) & Mahkamah Den Haag",
      summary: "Konvensi PBB tentang Hukum Laut ('联合国海洋法公约' / UNCLOS 1982) menetapkan pembagian zonasi maritim: 领海 (Laut Teritorial 12 mil) dan 专属经济区 (Zona Ekonomi Eksklusif 200 mil).",
      theoreticalPerspective: "Sengketa kedaulatan batas teritorial dan yurisdiksi antarnegara dapat diselesaikan melalui Mahkamah Internasional ('国际法院' / ICJ di Den Haag) atau Mahkamah Arbitrase Internasional.",
      diplomaticProtocol: "Negara kepulauan seperti Indonesia diakui hak maritimnya sebagai '群岛国' (Archipelagic State) dalam hukum internasional.",
      keyVocabularyHighlights: ["海洋法公约 (Hǎiyángfǎ gōngyuē)", "专属经济区 (Zhuānshǔ jīngjìqū)", "领海 (Lǐnghǎi)", "国际法院 (Guójì fǎyuàn)"]
    },
    studyCards: [
      {
        id: "c14_1",
        term: "联合国海洋法公约",
        transliteration: "Liánhéguó hǎiyángfǎ gōngyuē",
        language: "zh",
        meaning: "Konvensi Hukum Laut PBB (UNCLOS 1982)",
        contextHI: "Konstitusi samudra dunia yang mengatur batas wilayah laut, navigasi pelayaran, dan eksplorasi dasar laut.",
        exampleSentence: "根据联合国海洋法公约妥善处理海洋事务。(Gēnjù Liánhéguó hǎiyángfǎ gōngyuē tuǒshàn chǔlǐ hǎiyáng shìwù - Menangani urusan maritim secara tepat berdasarkan UNCLOS.)",
        audioText: "根据联合国海洋法公约妥善处理海洋事务。",
        audioLang: "zh-CN",
        tag: "Hukum Laut"
      },
      {
        id: "c14_2",
        term: "专属经济区",
        transliteration: "Zhuānshǔ jīngjìqū",
        language: "zh",
        meaning: "Zona Ekonomi Eksklusif (Exclusive Economic Zone / EEZ 200 Mil)",
        contextHI: "Wilayah laut hingga 200 mil laut di mana negara pantai memiliki hak berdaulat atas sumber daya perikanan dan migas.",
        exampleSentence: "沿海国在其专属经济区内享有勘探自然资源的权利。(Yánhǎiguó zài qí zhuānshǔ jīngjìqū nèi xiǎngyǒu kāntàn zìrán zīyuán de quánlì - Negara pantai memiliki hak mengeksplorasi sumber daya alam di dalam ZEE-nya.)",
        audioText: "沿海国在其专属经济区内享有勘探自然资源的权利。",
        audioLang: "zh-CN",
        tag: "ZEE Maritim"
      },
      {
        id: "c14_3",
        term: "领海与无害通过权",
        transliteration: "Lǐnghǎi yǔ Wúhài tōngguòquán",
        language: "zh",
        meaning: "Laut Teritorial (12 Mil) & Hak Lintas Damai (Innocent Passage)",
        contextHI: "Wilayah kedaulatan laut mutlak negara dan hak kapal asing melintas selama tidak mengancam keamanan.",
        exampleSentence: "外国船只在领海内享有无害通过权。(Wàiguó chuánzhī zài lǐnghǎi nèi xiǎngyǒu wúhài tōngguòquán - Kapal asing menikmati hak lintas damai di dalam laut teritorial.)",
        audioText: "外国船只在领海内享有无害通过权。",
        audioLang: "zh-CN",
        tag: "Navigasi Laut"
      },
      {
        id: "c14_4",
        term: "国际法院",
        transliteration: "Guójì fǎyuàn",
        language: "zh",
        meaning: "Mahkamah Internasional (International Court of Justice / ICJ Den Haag)",
        contextHI: "Organ peradilan utama PBB untuk mengadili sengketa hukum antarnegara berdaulat.",
        exampleSentence: "两国同意将领土争端提交国际法院裁决。(Liǎng guó tóngyì jiāng lǐngtǔ zhēngduān tíjiāo Guójì fǎyuàn cáijué - Kedua negara sepakat menyerahkan sengketa wilayah ke Mahkamah Internasional untuk diadili.)",
        audioText: "两国同意将领土争端提交国际法院裁决。",
        audioLang: "zh-CN",
        tag: "Peradilan ICJ"
      }
    ],
    questions: [
      {
        id: "q14_1",
        type: "multiple_choice",
        question: "Singkatan ZEE (Zona Ekonomi Eksklusif 200 Mil Laut) dalam terminologi hukum maritim bahasa Mandarin adalah:",
        options: ["专属经济区 (Zhuānshǔ jīngjìqū)", "公海自由区 (Gōnghǎi zìyóuqū)", "国际海底区域 (Guójì hǎidǐ qūyù)", "领海基线 (Lǐnghǎi jīxiàn)"],
        correctAnswer: 0,
        explanation: "'专属' (Zhuānshǔ) = Eksklusif, '经济区' (Jīngjìqū) = Zona Ekonomi -> 专属经济区 = EEZ."
      },
      {
        id: "q14_2",
        type: "matching",
        question: "Cocokkan rezim hukum laut Mandarin dengan definisinya:",
        matchingPairs: [
          { left: "专属经济区", right: "Zona Ekonomi Eksklusif (200 Mil)" },
          { left: "领海 (Lǐnghǎi)", right: "Laut Teritorial (12 Mil Kedaulatan)" },
          { left: "无害通过权", right: "Hak Lintas Damai Kapal Asing" },
          { left: "国际法院", right: "Mahkamah Internasional di Den Haag" }
        ],
        explanation: "Rezim ini diatur secara komprehensif dalam UNCLOS 1982."
      },
      {
        id: "q14_3",
        type: "listening",
        question: "Dengarkan pernyataan putusan peradilan internasional berikut:",
        audioText: "根据联合国海洋法公约妥善处理海洋事务。",
        audioLang: "zh-CN",
        options: [
          "Menangani urusan maritim secara tepat berdasarkan Konvensi Hukum Laut PBB (UNCLOS).",
          "Melarang seluruh kapal dagang memasuki jalur perairan internasional.",
          "Menghapuskan batas zona ekonomi eksklusif 200 mil.",
          "Menolak yurisdiksi mahkamah internasional."
        ],
        correctAnswer: 0,
        explanation: "Suara menegaskan penanganan urusan kelautan sesuai UNCLOS (根据联合国海洋法公约妥善处理海洋事务)."
      }
    ]
  },

  {
    id: "lesson_15",
    stageNumber: 15,
    tier: 4,
    tierLabel: "Tier 4: 高级战略谈判",
    difficulty: "Mahir (HSK 6)",
    title: "网络空间安全与数字外交 (Diplomasi Siber & Tata Kelola Digital)",
    subtitle: "Cybersecurity & Digital Diplomacy in Mandarin",
    description: "Kuasai diplomasi era kecerdasan buatan dan siber: 网络主权 (Cyber Sovereignty), 数据安全 (Data Security), 人工智能治理 (AI Governance), 跨境监管 (Cross-border Regulation).",
    xp: 130,
    catMentor: 'diplomat',
    theoryBrief: {
      title: "Tata Kelola Ruang Siber Global & Etika Kecerdasan Buatan (AI)",
      summary: "Diplomasi abad ke-21 meluas ke domain siber dan kecerdasan buatan. Konsep '网络空间主权' (Kedaulatan Ruang Siber) menegaskan hak negara melindungi infrastruktur informasi dan data nasionalnya dari serangan siber.",
      theoreticalPerspective: "PBB membentuk Kelompok Kerja Ahli Pemerintah (GGE & OEWG) untuk menyusun norma hukum perilaku negara yang bertanggung jawab di ruang siber.",
      diplomaticProtocol: "Traktat siber menekankan '全球人工智能治理倡议' (Inisiatif Tata Kelola AI Global) untuk memastikan teknologi kecerdasan buatan berorientasi pada kemanusiaan.",
      keyVocabularyHighlights: ["网络空间 (Wǎngluò kōngjiān)", "网络主权 (Wǎngluò zhǔquán)", "人工智能治理 (Réngōng zhìnéng zhìlǐ)", "数据安全 (Shùjù ānquán)"]
    },
    studyCards: [
      {
        id: "c15_1",
        term: "网络空间主权",
        transliteration: "Wǎngluò kōngjiān zhǔquán",
        language: "zh",
        meaning: "Kedaulatan Ruang Siber (Cyber Space Sovereignty)",
        contextHI: "Prinsip bahwa hukum kedaulatan negara berlaku penuh dalam pengelolaan infrastruktur internet domestik.",
        exampleSentence: "尊重各国在网络空间的主权与管辖权。(Zūnzhòng gèguó zài wǎngluò kōngjiān de zhǔquán yǔ guǎnxiáquán - Menghormati kedaulatan dan yurisdiksi setiap negara di ruang siber.)",
        audioText: "尊重各国在网络空间的主权与管辖权。",
        audioLang: "zh-CN",
        tag: "Diplomasi Siber"
      },
      {
        id: "c15_2",
        term: "全球人工智能治理",
        transliteration: "Quánqiú réngōng zhìnéng zhìlǐ",
        language: "zh",
        meaning: "Tata Kelola AI Global (Global Artificial Intelligence Governance)",
        contextHI: "Kerjasama multilateral untuk mengatur standar etika, keamanan, dan keselamatan teknologi kecerdasan buatan.",
        exampleSentence: "共同推动构建普惠包容的全球人工智能治理体系。(Gòngtóng tuīdòng gòujiàn pǔhuì bāoróng de quánqiú réngōng zhìnéng zhìlǐ tǐxì - Bersama mendorong pembentukan sistem tata kelola AI global yang inklusif.)",
        audioText: "共同推动构建普惠包容的全球人工智能治理体系。",
        audioLang: "zh-CN",
        tag: "Etika AI"
      },
      {
        id: "c15_3",
        term: "关键信息基础设施保护",
        transliteration: "Guānjiàn xìnxī jīchǔ shèshī bǎohù",
        language: "zh",
        meaning: "Perlindungan Infrastruktur Informasi Kritis (CIIP)",
        contextHI: "Perlindungan sistem komputasi vital negara (perbankan, listrik, satelit) dari serangan siber militer asing.",
        exampleSentence: "加强国际合作，保护关键信息基础设施。(Jiāqiáng guójì hézuò, bǎohù guānjiàn xìnxī jīchǔ shèshī - Memperkuat kerjasama internasional untuk melindungi infrastruktur informasi kritis.)",
        audioText: "加强国际合作，保护关键信息基础设施。",
        audioLang: "zh-CN",
        tag: "Keamanan Siber"
      },
      {
        id: "c15_4",
        term: "跨境数据流动",
        transliteration: "Kuàjìng shùjù liúdòng",
        language: "zh",
        meaning: "Arus Data Lintas Batas Negara (Cross-border Data Flow)",
        contextHI: "Regulasi privasi dan keamanan transfer data digital internasional dalam perjanjian perdagangan digital.",
        exampleSentence: "在保障安全的前提下促进跨境数据有序流动。(Zài bǎozhàng ānquán de qiántí xià cùjìn kuàjìng shùjù yǒuxù liúdòng - Mendorong arus data lintas batas yang tertib di bawah prasyarat jaminan keamanan.)",
        audioText: "在保障安全的前提下促进跨境数据有序流动。",
        audioLang: "zh-CN",
        tag: "Ekonomi Digital"
      }
    ],
    questions: [
      {
        id: "q15_1",
        type: "multiple_choice",
        question: "Prinsip yang menegaskan bahwa yurisdiksi dan hukum negara berdaulat berlaku di domain internet domestik disebut:",
        options: ["网络主权 (Wǎngluò zhǔquán / Cyber Sovereignty)", "数字垄断 (Shùzì lǒngduàn)", "网络无政府状态 (Wǎngluò wúzhèngfǔ zhuàngtài)", "单边断网 (Dānbiān duànwǎng)"],
        correctAnswer: 0,
        explanation: "'网络主权' (Cyber Sovereignty) adalah konsep hukum kedaulatan di ruang siber."
      },
      {
        id: "q15_2",
        type: "sentence_builder",
        question: "Susun kalimat visi tata kelola kecerdasan buatan dunia: 'Bersama mendorong pembentukan sistem tata kelola AI global yang inklusif':",
        wordTokens: ["共同推动", "构建", "全球人工智能治理", "体系"],
        correctOrder: ["共同推动", "构建", "全球人工智能治理", "体系"],
        explanation: "Susunan benar: 共同推动构建全球人工智能治理体系 (Gòngtóng tuīdòng gòujiàn quánqiú réngōng zhìnéng zhìlǐ tǐxì)."
      },
      {
        id: "q15_3",
        type: "true_false",
        question: "Dalam diplomasi siber internasional, serangan terhadap rumah sakit dan jaringan listrik negara lain dianggap sah tanpa batasan hukum perang.",
        isTrue: false,
        explanation: "Salah! Norma siber PBB (GGE 11 Norms) melarang keras serangan siber terhadap infrastruktur sipil kritis."
      }
    ]
  },

  {
    id: "lesson_16",
    stageNumber: 16,
    tier: 4,
    tierLabel: "Tier 4: 高级战略谈判",
    difficulty: "Mahir / Suhu Tertinggi (HSK 6 / Duta Besar Penuh)",
    title: "全球多边峰会与条约签署生效 (KTT Meja Bundar & Penandatanganan Traktat)",
    subtitle: "Global Summitry & Treaty Ratification in Mandarin",
    description: "Tingkat Suhu Duta Besar: 签署条约 (Signing Treaties), 批准生效 (Ratification), 互换批准书 (Exchange of Instruments), 终身成就 (Master Diplomat).",
    xp: 150,
    catMentor: 'diplomat',
    theoryBrief: {
      title: "Puncak Diplomasi: Prosedur Ratifikasi & Penandatanganan Traktat Multilateral",
      summary: "Puncak dari seluruh proses diplomasi internasional adalah penyelenggaraan Konferensi Tingkat Tinggi (全球多边峰会 / Summitry) dan penandatanganan traktat resmi antar kepala negara.",
      theoreticalPerspective: "Sesuai Konvensi Wina tentang Hukum Perjanjian 1969 (VCLT), sebuah traktat baru mengikat secara penuh setelah melalui proses '批准' (Ratifikasi Parlemen) dan '互换批准书' (Pertukaran Piagam Ratifikasi).",
      diplomaticProtocol: "Saat penandatanganan naskah traktat, Duta Besar berkuasa penuh menggunakan pena diplomatik resmi di hadapan seluruh saksi internasional.",
      keyVocabularyHighlights: ["多边峰会 (Duōbiān fēnghuì)", "签署条约 (Qiānshǔ tiáoyuē)", "批准生效 (Pīzhǔn shēngxiào)", "公约保存人 (Depositary)"]
    },
    studyCards: [
      {
        id: "c16_1",
        term: "多边峰会与条约签署",
        transliteration: "Duōbiān fēnghuì yǔ Tiáoyuē qiānshǔ",
        language: "zh",
        meaning: "KTT Multilateral & Penandatanganan Traktat Resmi",
        contextHI: "Pertemuan puncak para kepala negara berdaulat untuk meratifikasi perjanjian perdamaian dan kerjasama masa depan.",
        exampleSentence: "各国领导人在多边峰会上庄严签署了和平条约。(Gèguó lǐngdǎorén zài duōbiān fēnghuì shàng zhuāngyán qiānshǔle hépíng tiáoyuē - Para pemimpin negara secara khidmat menandatangani traktat perdamaian di KTT multilateral.)",
        audioText: "各国领导人在多边峰会上庄严签署了和平条约。",
        audioLang: "zh-CN",
        tag: "Puncak Diplomasi"
      },
      {
        id: "c16_2",
        term: "批准生效",
        transliteration: "Pīzhǔn shēngxiào",
        language: "zh",
        meaning: "Ratifikasi dan Mulai Berlaku Resmi (Ratification & Entry into Force)",
        contextHI: "Persetujuan formal oleh lembaga legislatif/parlemen nasional yang membuat traktat mengikat secara hukum negara.",
        exampleSentence: "该条约经议会批准后正式生效。(Gāi tiáoyuē jīng yìhuì pīzhǔn hòu zhèngshì shēngxiào - Traktat tersebut resmi mulai berlaku setelah diratifikasi oleh parlemen.)",
        audioText: "该条约经议会批准后正式生效。",
        audioLang: "zh-CN",
        tag: "Ratifikasi Hukum"
      },
      {
        id: "c16_3",
        term: "互换批准书",
        transliteration: "Hùhuàn pīzhǔnshū",
        language: "zh",
        meaning: "Pertukaran Instrumen Ratifikasi (Exchange of Instruments of Ratification)",
        contextHI: "Upacara seremonial diplomatik di mana dokumen ratifikasi asli diserahkan kepada pihak depositari atau negara mitra.",
        exampleSentence: "两国外长在仪式上正式互换批准书。(Liǎng guó wàizhǎng zài yíshì shàng zhèngshì hùhuàn pīzhǔnshū - Menteri luar negeri kedua negara secara resmi bertukar instrumen ratifikasi dalam upacara kenegaraan.)",
        audioText: "两国外长在仪式上正式互换批准书。",
        audioLang: "zh-CN",
        tag: "Protokol Traktat"
      },
      {
        id: "c16_4",
        term: "特命全权大使",
        transliteration: "Tèmìng quánquán dàshǐ",
        language: "zh",
        meaning: "Duta Besar Luar Biasa dan Berkuasa Penuh (Ambassador Extraordinary & Plenipotentiary)",
        contextHI: "Gelar diplomatik tertinggi perwakilan resmi kepala negara yang memegang mandat penuh menandatangani traktat.",
        exampleSentence: "特命全权大使代表国家行使全部条约签署权。(Tèmìng quánquán dàshǐ dàibiǎo guójiā xíngshǐ quánbù tiáoyuē qiānshǔquán - Duta Besar Berkuasa Penuh mewakili negara menjalankan hak penuh penandatanganan traktat.)",
        audioText: "特命全权大使代表国家行使全部条约签署权。",
        audioLang: "zh-CN",
        tag: "Gelar Tertinggi"
      }
    ],
    questions: [
      {
        id: "q16_1",
        type: "multiple_choice",
        question: "Gelar resmi bahasa Mandarin untuk 'Duta Besar Luar Biasa dan Berkuasa Penuh' yang memegang mandat tertinggi negara adalah:",
        options: [
          "特命全权大使 (Tèmìng quánquán dàshǐ)",
          "代办 (Dàibàn / Chargé d'Affaires)",
          "一等秘书 (Yī děng mìshū)",
          "文化随员 (Wénhuà suíyuán)"
        ],
        correctAnswer: 0,
        explanation: "'特命全权大使' adalah gelar diplomatik tertinggi bagi Duta Besar berkuasa penuh."
      },
      {
        id: "q16_2",
        type: "sentence_builder",
        question: "Susun kalimat puncak kenegaraan: 'Para pemimpin negara secara khidmat menandatangani traktat perdamaian di KTT multilateral':",
        wordTokens: ["各国领导人", "在多边峰会上", "庄严签署了", "和平条约"],
        correctOrder: ["各国领导人", "在多边峰会上", "庄严签署了", "和平条约"],
        explanation: "Puncak pencapaian diplomatik: 各国领导人在多边峰会上庄严签署了和平条约 (Gèguó lǐngdǎorén zài duōbiān fēnghuì shàng zhuāngyán qiānshǔle hépíng tiáoyuē)."
      },
      {
        id: "q16_3",
        type: "matching",
        question: "Cocokkan tahapan akhir penandatanganan traktat Mandarin:",
        matchingPairs: [
          { left: "多边峰会 (Duōbiān fēnghuì)", right: "KTT Multilateral Tingkat Tinggi" },
          { left: "签署条约 (Qiānshǔ tiáoyuē)", right: "Penandatanganan Traktat" },
          { left: "批准生效 (Pīzhǔn shēngxiào)", right: "Ratifikasi & Mulai Berlaku" },
          { left: "特命全权大使", right: "Duta Besar Luar Biasa & Berkuasa Penuh" }
        ],
        explanation: "Selamat! Kamu telah menyelesaikan seluruh 16 tingkatan kurikulum Bahasa Mandarin Diplomasi Global & Hubungan Internasional!"
      }
    ]
  }
];
