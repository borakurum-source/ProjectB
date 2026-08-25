import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem, PageAnalysis, CycleAggregate, CategorizedCompetitor } from '../types';
import { computeCycleAggregate } from '../services/metrics';

export const SFP_CATEGORIZED_COMPETITORS: CategorizedCompetitor[] = [
  // ECOMMERCE
  { brand: 'Misafirliq', domain: 'misafirliq.com', category: 'ECOMMERCE' },
  { brand: 'HUB Catering / The HUB Food', domain: 'hubcatering.com', category: 'ECOMMERCE' },
  { brand: 'Ginger Patisserie & Catering', domain: 'gingeronlineshop.com', category: 'ECOMMERCE' },
  { brand: 'Süprem Catering', domain: 'supremcatering.com', category: 'ECOMMERCE' },
  { brand: 'Ash İstanbul Catering', domain: 'ashistanbulcatering.com', category: 'ECOMMERCE' },
  { brand: 'Cuisine Online', domain: 'cuisine-online.com', category: 'ECOMMERCE' },
  { brand: 'Canella', domain: 'canella.com.tr', category: 'ECOMMERCE' },
  { brand: 'Art Cafe', domain: 'artcafe.com.tr', category: 'ECOMMERCE' },
  { brand: 'YMK Catering', domain: 'ymkcatering.com', category: 'ECOMMERCE' },

  // NO ECOMMERCE
  { brand: 'Concept Team', domain: 'conceptteam.org', category: 'NO ECOMMERCE' },
  { brand: 'Maillard Dining', domain: 'maillarddining.com', category: 'NO ECOMMERCE' },
  { brand: 'Vanessa Catering', domain: 'vanessacatering.com', category: 'NO ECOMMERCE' },
  { brand: 'Table Tales', domain: 'tabletales.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'Art of Kitchen', domain: 'artofkitchen.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'Roka Davet', domain: 'rokadavet.com', category: 'NO ECOMMERCE' },
  { brand: 'Bistro Fine Dining Catering', domain: 'bistrocatering.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'Vadi Catering', domain: 'vadicatering.com', category: 'NO ECOMMERCE' },
  { brand: 'Event & More', domain: 'eventmore.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'Cuisine Catering', domain: 'cuisine.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'Brunch Plus', domain: 'brunchplus.com', category: 'NO ECOMMERCE' },
  { brand: 'Evestia Catering & Events', domain: 'evestiacatering.com', category: 'NO ECOMMERCE' },
  { brand: 'Dionisos Catering', domain: 'dionisoscatering.com.tr', category: 'NO ECOMMERCE' },
  { brand: 'İstanbul Fuar Catering', domain: 'istanbulfuarcatering.com', category: 'NO ECOMMERCE' },
  { brand: 'RB Organizasyon Catering', domain: 'rb-organizasyon.com', category: 'NO ECOMMERCE' },
];

export const DEMO_CLIENT: Client = {
  id: 'client-snacksforparty',
  ownerId: 'user-snacksforparty',
  brandName: 'Snacks For Party',
  aliases: ['Snacks For Party', 'SnacksForParty', 'Vanille Catering Snacks', 'Snacks For Party Catering', 'snacksforparty.com'],
  domain: 'snacksforparty.com',
  competitorDomains: SFP_CATEGORIZED_COMPETITORS.map((c) => c.domain),
  competitorBrands: SFP_CATEGORIZED_COMPETITORS.map((c) => c.brand),
  categorizedCompetitors: SFP_CATEGORIZED_COMPETITORS,
  industry: 'Gourmet Party Snack Boxes & Boutique Event Catering',
  market: 'Private Celebrations & Corporate Cocktail Events (Istanbul / Turkey)',
  language: 'Turkish & English',
  isDemo: true,
  createdAt: '2026-07-01T09:00:00Z',
};

export const DEMO_PROMPTS: Prompt[] = [
  {
    id: 'prompt-1',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Evde doğum günü yapacağım. Catering/atıştırmalık nereden alabilirim?',
    intentLayer: 'Commercial',
    category: 'Ev Daveti & Doğum Günü',
    active: true,
    createdAt: '2026-08-24T09:00:00Z',
  },
  {
    id: 'prompt-2',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: "İstanbul'da evde catering nereden alabilirim?",
    intentLayer: 'Commercial',
    category: 'Ev Catering',
    active: true,
    createdAt: '2026-08-24T09:01:00Z',
  },
  {
    id: 'prompt-3',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: "İstanbul'daki en iyi catering şirketlerini listele",
    intentLayer: 'Comparative',
    category: 'En İyi Catering Şirketleri',
    active: true,
    createdAt: '2026-08-24T09:02:00Z',
  },
  {
    id: 'prompt-4',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Kokteyl menüsü catering fiyatları',
    intentLayer: 'Informational',
    category: 'Kokteyl Menüsü & Fiyat',
    active: true,
    createdAt: '2026-08-24T09:03:00Z',
  },
  {
    id: 'prompt-5',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: "Kurumsal etkinlikler için İstanbul'daki en iyi catering şirketleri",
    intentLayer: 'Comparative',
    category: 'Kurumsal Etkinlik Catering',
    active: true,
    createdAt: '2026-08-24T09:04:00Z',
  },
  {
    id: 'prompt-6',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Mini tatlı ve mini sandviç online sipariş nereden verebilirim?',
    intentLayer: 'Commercial',
    category: 'Mini Tatlı & Mini Sandviç',
    active: true,
    createdAt: '2026-08-24T09:05:00Z',
  },
  {
    id: 'prompt-7',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Online kanepe, finger food sipariş nereden verebilirim?',
    intentLayer: 'Commercial',
    category: 'Kanepe & Finger Food',
    active: true,
    createdAt: '2026-08-24T09:06:00Z',
  },
  {
    id: 'prompt-8',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Online sipariş verilebilen catering şirketleri listele',
    intentLayer: 'Comparative',
    category: 'Online Sipariş Catering',
    active: true,
    createdAt: '2026-08-24T09:07:00Z',
  },
  {
    id: 'prompt-9',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Şirket etkinliğimiz için catering firmaları listele',
    intentLayer: 'Comparative',
    category: 'Şirket Etkinliği',
    active: true,
    createdAt: '2026-08-24T09:08:00Z',
  },
  {
    id: 'prompt-10',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Yüksek kalite ve premium catering firmaları listele',
    intentLayer: 'Comparative',
    category: 'Premium & Lüks Catering',
    active: true,
    createdAt: '2026-08-24T09:09:00Z',
  },
  {
    id: 'prompt-11',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: '30 kişi için catering hizmeti nereden alabilirim?',
    intentLayer: 'Commercial',
    category: '30 Kişilik Catering Paketleri',
    active: true,
    createdAt: '2026-08-24T09:10:00Z',
  },
  {
    id: 'prompt-12',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Adrese teslim yapan catering firmaları listele',
    intentLayer: 'Comparative',
    category: 'Adrese Teslim Kutu Catering',
    active: true,
    createdAt: '2026-08-24T09:11:00Z',
  },
  {
    id: 'prompt-13',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Coffee break menü fiyatları',
    intentLayer: 'Informational',
    category: 'Coffee Break & İkram Fiyatları',
    active: true,
    createdAt: '2026-08-24T09:12:00Z',
  },
  {
    id: 'prompt-14',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Lunchbox ve sandviç nereye yaptırabilirim?',
    intentLayer: 'Commercial',
    category: 'Lunchbox & Gurme Sandviç',
    active: true,
    createdAt: '2026-08-24T09:13:00Z',
  },
  {
    id: 'prompt-15',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Evde doğum günü yapacağım. Catering nereden alabilirim?',
    intentLayer: 'Commercial',
    category: 'Ev Daveti Catering',
    active: true,
    createdAt: '2026-08-25T13:45:00Z',
  },
  {
    id: 'prompt-16',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    text: 'Evde doğum günü yapacağım. Atıştırmalık nereden alabilirim?',
    intentLayer: 'Commercial',
    category: 'Ev Daveti Atıştırmalık',
    active: true,
    createdAt: '2026-08-25T13:46:00Z',
  },
];

export const DEMO_RUN_CYCLES: RunCycle[] = [
  {
    id: 'cycle-1-baseline',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    startedAt: '2026-08-01T10:00:00Z',
    completedAt: '2026-08-01T10:04:10Z',
    engines: ['gemini-grounded'],
    runsPerPrompt: 3,
    status: 'completed',
    callCount: 42,
  },
  {
    id: 'cycle-2-mid',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    startedAt: '2026-08-12T14:30:00Z',
    completedAt: '2026-08-12T14:34:40Z',
    engines: ['gemini-grounded'],
    runsPerPrompt: 3,
    status: 'completed',
    callCount: 42,
  },
  {
    id: 'cycle-3-latest',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    startedAt: '2026-08-24T10:00:00Z',
    completedAt: '2026-08-24T10:05:15Z',
    engines: ['gemini-grounded'],
    runsPerPrompt: 3,
    status: 'completed',
    callCount: 42,
    isRetest: true,
    retestedActionId: 'action-1',
  },
];

// Helper generator for realistic prompt runs across all 14 prompts
function generateRunsForPrompts(): Run[] {
  const runs: Run[] = [];

  // Cycle 3 (Latest)
  const c3Data: Record<string, { answer: string; clientRank: number | null; clientMentioned: boolean; clientCited: boolean; competitors: string[]; query: string }> = {
    'prompt-1': {
      answer: "Evde doğum günü davetleri için pratik ve şık atıştırmalık siparişi verebileceğiniz başlıca platformlar:\n1. Snacks For Party (snacksforparty.com) — Vanille Catering güvencesiyle hazırlanan, kutudan çıkar çıkmaz doğrudan servise hazır kanepe, mini burger, wrap ve tatlı parti kutuları.\n2. Misafirliq — Özel doğum günü ve parti kutuları.\n3. Macrocenter Catering — Pratik meze ve şarküteri tabakları.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Macrocenter Catering'],
      query: 'evde dogum gunu ikram siparis catering',
    },
    'prompt-2': {
      answer: "İstanbul'da ev davetleri ve özel kutlamalar için hazır kutu catering sağlayan öne çıkan servisler Snacks For Party ve Misafirliq'tir. Snacks For Party, 48 saat önceden siparişle şık sunum ekipmanlarıyla adrese teslim edilir.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Backhaus Catering'],
      query: 'istanbul evde catering siparis',
    },
    'prompt-3': {
      answer: "İstanbul'un önde gelen catering şirketleri:\n1. Divan Catering — Büyük ölçekli lüks davetler ve kurumsal gala organizasyonları.\n2. Snacks For Party — Butik parti kutuları, kokteyl ve finger food hazır teslimat konsepti.\n3. Misafirliq — Davet ve parti kutuları.\n4. Gourmet Pack — Kurumsal ofis yemek ve toplantı kutuları.",
      clientRank: 2,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Divan Catering', 'Misafirliq', 'Gourmet Pack'],
      query: 'istanbul en iyi catering sirketleri listesi',
    },
    'prompt-4': {
      answer: "İstanbul'da kokteyl menüsü catering fiyatları kişi başı ortalama 450 TL ile 1.500 TL arasında değişmektedir. Snacks For Party gibi kutulu hazır catering servisleri şeffaf paket fiyatları sunarken, Divan Catering gibi tam garsonlu organizasyonlarda bütçe kişi sayısına göre belirlenir.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Divan Catering', 'Misafirliq'],
      query: 'kokteyl menusu catering kisi basi fiyatlari istanbul',
    },
    'prompt-5': {
      answer: "Kurumsal etkinlik, lansman ve ofis toplantıları için İstanbul'daki en iyi catering çözümleri:\n1. Snacks For Party — Pratik, koku yapmayan şık mini brioche, gurme kanepe ve tatlı shot kupları içeren kurumsal kutular.\n2. Divan Catering — Üst düzey VIP toplantı ve protokol ağırlamaları.\n3. Gourmet Pack — Bireysel toplantı beslenme paketleri.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Divan Catering', 'Gourmet Pack'],
      query: 'kurumsal etkinlik catering sirketleri istanbul',
    },
    'prompt-6': {
      answer: "Mini tatlı, tartolet, ekler ve gurme mini sandviç çeşitlerini online sipariş edebileceğiniz güvenilir servisler:\n1. Snacks For Party (snacksforparty.com) — Tatlı ve tuzlu kokteyl ikram kutuları.\n2. Backhaus Catering — Fırın ürünleri ve mini sandviç tepsileri.\n3. Misafirliq — Karışık parti kutuları.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Backhaus Catering', 'Misafirliq'],
      query: 'mini tatli mini sandvic online siparis',
    },
    'prompt-7': {
      answer: "Online kanepe, bruschetta ve finger food siparişinde Snacks For Party ve Misafirliq en çok tavsiye edilen iki markadır. Snacks For Party, Vanille Catering mutfağında taze hazırlanan estetik sunumlarıyla öne çıkar.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Divan Catering'],
      query: 'online kanepe finger food siparis istanbul',
    },
    'prompt-8': {
      answer: "Online web sitesi üzerinden doğrudan menü seçip sipariş verebileceğiniz catering şirketleri:\n1. Snacks For Party (snacksforparty.com)\n2. Misafirliq (misafirliq.com)\n3. Gourmet Pack (gourmetpack.com.tr)",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Gourmet Pack'],
      query: 'online siparis verilebilen catering firmalari',
    },
    'prompt-9': {
      answer: "Şirket içi kutlama, terfi partisi ve motivasyon etkinlikleri için Snacks For Party modüler kutu catering hizmeti sunarken, Divan Catering geniş çaplı şirket baloları için tercih edilmektedir.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Divan Catering', 'Misafirliq'],
      query: 'sirket etkinligi catering firmalari',
    },
    'prompt-10': {
      answer: "Yüksek kalite ve premium catering hizmetlerinde İstanbul'da Divan Catering ve Snacks For Party (Vanille Catering) gurme lezzet standardı ve estetik sunum kalitesiyle ilk sıralarda yer almaktadır.",
      clientRank: 2,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Divan Catering', 'Misafirliq'],
      query: 'premium luks catering firmalari istanbul',
    },
    'prompt-11': {
      answer: "30 kişilik ev veya ofis davetleri için porsiyonlanmış hazır kokteyl kutuları sunan Snacks For Party (snacksforparty.com) ve Misafirliq idealdir. Kişi başı 8-10 parça finger food içeren hazır menüler sipariş edilebilir.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Gourmet Pack'],
      query: '30 kisi catering hizmeti paket',
    },
    'prompt-12': {
      answer: "İstanbul genelinde adrese teslim kutu catering hizmeti veren firmalar:\n1. Snacks For Party — Soğuk zincir ve şık servis ambalajlarıyla doğrudan kapıya teslimat.\n2. Misafirliq — Özel teslimat kutuları.\n3. Macrocenter Catering — Mağazadan adrese teslimat.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Macrocenter Catering'],
      query: 'adrese teslim catering firmalari istanbul',
    },
    'prompt-13': {
      answer: "Coffee break menü fiyatları içeriğe göre kişi başı 250 TL ile 600 TL arasında değişmektedir. Mini kruvasan, muffin, cookie ve tuzlu tartolet içeren kahve arası kutularını Snacks For Party ve Gourmet Pack'ten temin edebilirsiniz.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Gourmet Pack', 'Backhaus Catering'],
      query: 'coffee break menu fiyatlari istanbul',
    },
    'prompt-14': {
      answer: "Özel etkinlik ve toplantılar için gurme lunchbox ve artisan sandviç hazırlayan firmalar:\n1. Snacks For Party — Gurme baget, brioche ve wrap kutuları.\n2. Gourmet Pack — Bireysel lunchbox menüleri.\n3. Backhaus Catering — Taze fırın sandviç paketleri.",
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Gourmet Pack', 'Backhaus Catering'],
      query: 'lunchbox ve sandvic siparis istanbul',
    },
  };

  DEMO_PROMPTS.forEach((p, idx) => {
    const data = c3Data[p.id] || {
      answer: `İstanbul'da ${p.category} alanında Snacks For Party ve Misafirliq öne çıkan sağlayıcılardır.`,
      clientRank: 1,
      clientMentioned: true,
      clientCited: true,
      competitors: ['Misafirliq', 'Divan Catering'],
      query: p.text,
    };

    // 3 runs per prompt for Cycle 3 (Gemini Grounded)
    for (let r = 1; r <= 3; r++) {
      const isMentioned = r <= 3 ? data.clientMentioned : false;
      const isCited = isMentioned && data.clientCited;
      const rank = isMentioned ? (r === 1 ? data.clientRank : data.clientRank ? data.clientRank : 1) : null;

      runs.push({
        id: `run-c3-${p.id}-gemini-r${r}`,
        ownerId: 'user-snacksforparty',
        clientId: 'client-snacksforparty',
        cycleId: 'cycle-3-latest',
        promptId: p.id,
        engine: 'gemini-grounded',
        model: 'gemini-3.6-flash',
        runIndex: r,
        runAt: `2026-08-24T10:0${r}:${idx < 10 ? '0' + idx : idx}Z`,
        answerText: data.answer,
        groundingSources: [
          { uri: `https://vertexaisearch.cloud.google.com/grounding-redirect/sfp-${p.id}`, displayTitle: 'Snacks For Party | Gurme Parti Kutuları & Menüler', resolvedDomain: 'snacksforparty.com' },
          { uri: `https://vertexaisearch.cloud.google.com/grounding-redirect/comp-${p.id}`, displayTitle: `${data.competitors[0]} Menüleri`, resolvedDomain: data.competitors[0] === 'Misafirliq' ? 'misafirliq.com' : 'divancatering.com.tr' },
        ],
        webSearchQueries: [data.query],
        brandMentioned: isMentioned,
        brandCited: isCited,
        position: rank,
        prominence: isMentioned ? (rank === 1 ? 0.15 : 0.35) : null,
        mentionedBrands: [
          {
            name: 'Snacks For Party',
            isClient: true,
            isKnownCompetitor: false,
            sentiment: 'Positive',
            verbatimQuote: 'Vanille Catering güvencesiyle hazırlanan, kutudan çıkar çıkmaz doğrudan servise hazır kanepe, mini burger, wrap ve tatlı parti kutuları',
          },
          ...data.competitors.map((c) => ({
            name: c,
            isClient: false,
            isKnownCompetitor: true,
            sentiment: 'Positive' as const,
            verbatimQuote: `${c} menüleri`,
          })),
        ],
        orderedList: true,
        rankedNames: isMentioned && rank === 1 ? ['Snacks For Party', ...data.competitors] : [...data.competitors, 'Snacks For Party'],
        recommendedEntityType: 'Catering & Food Delivery Service',
        answerFormat: 'list',
        error: null,
      });
    }

    // 2 runs per prompt for Cycle 3 (Perplexity Sonar)
    for (let r = 1; r <= 2; r++) {
      // Perplexity sonar has slight variation in citation rate depending on prompt index
      const ppxCited = (idx % 3 !== 0) && data.clientCited;
      const ppxMentioned = data.clientMentioned;

      runs.push({
        id: `run-c3-${p.id}-ppx-r${r}`,
        ownerId: 'user-snacksforparty',
        clientId: 'client-snacksforparty',
        cycleId: 'cycle-3-latest',
        promptId: p.id,
        engine: 'perplexity-sonar',
        model: 'sonar-pro',
        runIndex: r,
        runAt: `2026-08-24T10:1${r}:${idx < 10 ? '0' + idx : idx}Z`,
        answerText: `[Perplexity Sonar Answer] ${data.answer}`,
        groundingSources: [
          ...(ppxCited ? [{ uri: `https://www.perplexity.ai/search/sfp-${p.id}`, displayTitle: 'Snacks For Party Online Order', resolvedDomain: 'snacksforparty.com' }] : []),
          { uri: `https://www.perplexity.ai/search/comp-${p.id}`, displayTitle: `${data.competitors[0]} Official Site`, resolvedDomain: data.competitors[0] === 'Misafirliq' ? 'misafirliq.com' : 'divancatering.com.tr' },
        ],
        webSearchQueries: [data.query],
        brandMentioned: ppxMentioned,
        brandCited: ppxCited,
        position: ppxMentioned ? (ppxCited ? 1 : 2) : null,
        prominence: ppxMentioned ? 0.25 : null,
        mentionedBrands: [
          {
            name: 'Snacks For Party',
            isClient: true,
            isKnownCompetitor: false,
            sentiment: 'Positive',
            verbatimQuote: 'Snacks For Party catering kutuları',
          },
          ...data.competitors.map((c) => ({
            name: c,
            isClient: false,
            isKnownCompetitor: true,
            sentiment: 'Positive' as const,
            verbatimQuote: `${c} menüleri`,
          })),
        ],
        orderedList: true,
        rankedNames: ppxCited ? ['Snacks For Party', ...data.competitors] : [...data.competitors, 'Snacks For Party'],
        recommendedEntityType: 'Catering Service',
        answerFormat: 'list',
        error: null,
      });
    }

    // Baseline runs (Cycle 1)
    for (let r = 1; r <= 3; r++) {
      const baseMentioned = r === 1; // 33% baseline
      runs.push({
        id: `run-c1-${p.id}-r${r}`,
        ownerId: 'user-snacksforparty',
        clientId: 'client-snacksforparty',
        cycleId: 'cycle-1-baseline',
        promptId: p.id,
        engine: 'gemini-grounded',
        model: 'gemini-3.6-flash',
        runIndex: r,
        runAt: `2026-08-01T10:0${r}:${idx < 10 ? '0' + idx : idx}Z`,
        answerText: baseMentioned
          ? `İstanbul'da ${p.category} konusunda Misafirliq ve Snacks For Party seçenekler arasındadır.`
          : `İstanbul'da ${p.category} konusunda Misafirliq ve Divan Catering tercih edilmektedir.`,
        groundingSources: [
          { uri: 'https://vertexaisearch.cloud.google.com/grounding-redirect/base-1', displayTitle: 'Misafirliq Catering', resolvedDomain: 'misafirliq.com' },
          ...(baseMentioned ? [{ uri: 'https://vertexaisearch.cloud.google.com/grounding-redirect/base-2', displayTitle: 'Snacks For Party', resolvedDomain: 'snacksforparty.com' }] : []),
        ],
        webSearchQueries: [p.text],
        brandMentioned: baseMentioned,
        brandCited: baseMentioned,
        position: baseMentioned ? 2 : null,
        prominence: baseMentioned ? 0.45 : null,
        mentionedBrands: [
          { name: 'Misafirliq', isClient: false, isKnownCompetitor: true, sentiment: 'Positive', verbatimQuote: 'Misafirliq' },
          ...(baseMentioned ? [{ name: 'Snacks For Party', isClient: true, isKnownCompetitor: false, sentiment: 'Positive' as const, verbatimQuote: 'Snacks For Party' }] : []),
        ],
        orderedList: false,
        rankedNames: [],
        recommendedEntityType: 'Catering Service',
        answerFormat: 'prose',
        error: null,
      });
    }
  });

  return runs;
}

export const DEMO_RUNS: Run[] = generateRunsForPrompts();

export const DEMO_DIAGNOSTICS: Diagnostic[] = [
  {
    id: 'diag-prompt-1',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    promptId: 'prompt-1',
    cycleId: 'cycle-3-latest',
    dimensions: {
      'Intent Match': {
        status: 'Strong',
        explanation: 'Snacks For Party parti kutuları ve hazır menü sayfaları doğrudan İstanbul doğum günü ve ev partisi atıştırmalık arama niyetini karşılamaktadır.',
        evidenceQuote: 'Vanille Catering güvencesiyle hazırlanan, kutudan çıkar çıkmaz doğrudan servise hazır kanepe, mini burger, wrap ve tatlı parti kutuları.',
      },
      'Entity Clarity': {
        status: 'Strong',
        explanation: 'Marka, Vanille Catering iştiraki olarak gurme parti kutusu ve butik catering varlığı olarak net bir şekilde tanımlanmaktadır.',
      },
      'Answer Extractability': {
        status: 'Strong',
        explanation: 'Ürün sayfalarındaki kutu içerikleri, parça adetleri ve hazır servis özellikleri yapay zeka modelleri tarafından doğrudan liste olarak çekilebilmektedir.',
      },
      'Content Coverage': {
        status: 'Adequate',
        explanation: 'Soğuk ve tatlı kanepeler genişçe listelenirken, özel diyet (vegan, glutensiz) seçenekleri detaylandırılmalıdır.',
      },
      'Evidence / Authority': {
        status: 'Adequate',
        explanation: 'Vanille Catering referansı güvenilirlik sağlarken, harici etkinlik ve lifestyle bloglarında daha fazla listelenme otoriteyi pekiştirecektir.',
      },
      'Structured Information': {
        status: 'Strong',
        explanation: 'Ürün sayfalarında menü parçaları ve servis ekipmanları yapılandırılmış liste şeklinde yer almaktadır.',
      },
    },
    observedEvidence: 'Son döngüde 3 çalıştırmanın 3\'ünde de (%100) Snacks For Party anıldı ve 1. sırada listelendi. Kaynak olarak snacksforparty.com doğrudan referans gösterildi.',
    likelyGap: 'Özel diyet (glutensiz, vegan) filtreleri ve teslimat saat aralıklarının schema.org işaretlemesi ile güçlendirilmesi.',
    confidence: 'High',
    recommendedActionSummary: 'Kategori sayfalarına JSON-LD FoodEstablishment ve Menu schema işaretlemesi ekleyerek porsiyon ve diyet filtrelerini liste formatında yayınlayın.',
    validationMethod: '3 çalıştırma ile "Evde doğum günü yapacağım. Catering/atıştırmalık nereden alabilirim?" sorgusunu yeniden test edin.',
    createdAt: '2026-08-24T10:10:00Z',
  },
  {
    id: 'diag-prompt-5',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    promptId: 'prompt-5',
    cycleId: 'cycle-3-latest',
    dimensions: {
      'Intent Match': {
        status: 'Strong',
        explanation: 'Kurumsal toplantı ve ofis lansmanı ikramlarında kutulu finger food çözümleri tam eşleşmektedir.',
      },
      'Entity Clarity': {
        status: 'Strong',
        explanation: 'Şirket toplantısı için pratik, koku yapmayan ve garson gerektirmeyen hazır ikram kutusu sağlayıcısı olarak konumlandırılmıştır.',
      },
      'Answer Extractability': {
        status: 'Strong',
        explanation: 'Fatura kolaylığı, 48 saat önceden sipariş ve tek kullanımlık şık ekipman avantajları metinlerden hızlıca çekilmiştir.',
      },
      'Content Coverage': {
        status: 'Strong',
        explanation: 'Ofis ikram paketleri ve kahve arası / kokteyl menüleri kapsanmaktadır.',
      },
      'Evidence / Authority': {
        status: 'Adequate',
        explanation: 'Kurumsal müşteri logoları ve referansları kurumsal güveni artırmaktadır.',
      },
      'Structured Information': {
        status: 'Adequate',
        explanation: 'Kurumsal paket içerikleri için karşılaştırma tablosu eklenebilir.',
      },
    },
    observedEvidence: '3 çalıştırmada Snacks For Party 3 kez anıldı (%100) ve domain doğrudan kaynak gösterildi.',
    likelyGap: 'Kurumsal bütçe ve kişi başı porsiyon tablosunun sayfaya HTML table olarak eklenmesi.',
    confidence: 'High',
    recommendedActionSummary: 'Kurumsal catering sayfasına kişi başı bütçe ve ikram adedi karşılaştırma tablosu ekleyin.',
    validationMethod: 'Retest prompt "Kurumsal etkinlikler için İstanbul\'daki en iyi catering şirketleri" with N=3 runs.',
    createdAt: '2026-08-24T10:12:00Z',
  },
];

export const DEMO_ACTIONS: ActionItem[] = [
  {
    id: 'action-1',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    diagnosticId: 'diag-prompt-1',
    promptIds: ['prompt-1', 'prompt-2', 'prompt-6', 'prompt-7'],
    title: 'Parti Kutuları Sayfasına JSON-LD Menu İşaretlemesi ve Porsiyon Tablosu Ekleme',
    why: 'İlk döngüde %33 olan anılma oranı, ürün sayfalarındaki porsiyon adetleri ve içerik netleştirildikten sonra %100\'e yükseldi. Modeller doğrudan menü içeriklerini kaynak göstermektedir.',
    evidence: {
      sourceUrl: 'https://snacksforparty.com/kategori/parti-kutulari',
      quote: 'Vanille Catering güvencesiyle 48 saat önceden siparişle taze ve estetik sunumlar sağlar.',
      observedFact: 'Temel döngüde %33 olan görünürlük, AEO optimizasyonundan sonra 3/3 (%100) seviyesine çıktı.',
    },
    exactRecommendation: 'https://snacksforparty.com/kategori/parti-kutulari sayfasına H2 "Kokteyl ve Parti Kutuları Porsiyon & İçerik Tablosu" başlığı altında; Kişi Sayısı, Parça Adedi, Diyet Seçeneği ve Servis Ekipmanı sütunlarını içeren HTML <table> ekleyin.',
    priority: 'Critical',
    impact: 'High',
    effort: 'Low',
    validation: 'Retest prompt "Evde doğum günü yapacağım. Catering/atıştırmalık nereden alabilirim?" (N=3).',
    status: 'Retested',
    createdAt: '2026-08-02T10:00:00Z',
    implementedAt: '2026-08-15T16:00:00Z',
    baselineMentionRate: 0.33,
    retestMentionRate: 1.0,
    baselineCitationRate: 0.33,
    retestCitationRate: 1.0,
    baselinePosition: 2.0,
    retestPosition: 1.0,
    retestDate: '2026-08-24T10:05:15Z',
  },
  {
    id: 'action-2',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    diagnosticId: 'diag-prompt-5',
    promptIds: ['prompt-5', 'prompt-9', 'prompt-11'],
    title: 'Kurumsal Etkinlik ve 30 Kişilik Davetler İçin Kişi Başı İkram Hesaplama Tablosu',
    why: 'Kişi sayısı ve kurumsal bütçe aramalarında net sayısal veriler modeller tarafından doğrudan alıntılanmaktadır.',
    evidence: {
      sourceUrl: 'https://snacksforparty.com/kurumsal-catering',
      quote: '30 kişilik ev veya ofis davetleri için porsiyonlanmış hazır kokteyl kutuları.',
      observedFact: '11. sorguda (30 kişilik davet) Snacks For Party doğrudan önerildi.',
    },
    exactRecommendation: 'https://snacksforparty.com/kurumsal-catering adresinde H2 "Kişi Sayısına Göre Finger Food İkram Hesaplama Tablosu" yayınlayın.',
    priority: 'High',
    impact: 'High',
    effort: 'Medium',
    validation: 'Retest prompts "Kurumsal etkinlikler için İstanbul\'daki en iyi catering şirketleri" and "30 kişi için catering hizmeti nereden alabilirim?" (N=3).',
    status: 'In Progress',
    createdAt: '2026-08-24T10:30:00Z',
  },
  {
    id: 'action-3',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    promptIds: ['prompt-4', 'prompt-13'],
    title: 'Kokteyl ve Coffee Break Şeffaf Fiyatlandırma & Paket İçeriği Tablosu',
    why: 'Fiyat ve menü içerikli aramalarda modeller şeffaf paket fiyatları yayınlayan siteleri birincil kaynak olarak seçmektedir.',
    evidence: {
      sourceUrl: 'https://snacksforparty.com/fiyatlar',
      quote: 'Coffee break ve kokteyl menülerinde kişi başı hazır paket fiyatları.',
      observedFact: 'Fiyat sorgularında bilgi arama niyeti (Informational) karşılanmaktadır.',
    },
    exactRecommendation: 'https://snacksforparty.com/fiyatlar sayfasına JSON-LD Offer ve PriceSpecification şeması ekleyin.',
    priority: 'Medium',
    impact: 'Medium',
    effort: 'Low',
    validation: 'Retest prompt "Kokteyl menüsü catering fiyatları" (N=3).',
    status: 'Todo',
    createdAt: '2026-08-24T10:45:00Z',
  },
];

export const DEMO_PAGE_ANALYSES: PageAnalysis[] = [
  {
    id: 'page-analysis-1',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    url: 'https://snacksforparty.com/kategori/parti-kutulari',
    targetPrompt: 'Evde doğum günü yapacağım. Catering/atıştırmalık nereden alabilirim?',
    analyzedAt: '2026-08-24T10:15:00Z',
    extractabilityScore: 92,
    extractabilityStatus: 'Strong',
    hasSchemaMarkup: true,
    hasStructuredSchema: true,
    detectedSchemaTypes: ['FoodEstablishment', 'Menu', 'Offer'],
    hasComparisonTables: true,
    hasComparisonTable: true,
    hasClearHeadingAnswers: true,
    entityClarityStatus: 'Strong',
    contentLength: 2450,
    h1: 'Butik Parti ve Kokteyl İkram Kutuları | Snacks For Party',
    h2Count: 6,
    actionableRecommendations: [
      'Sayfaya JSON-LD FoodEstablishment ve Menu schema işaretlemesi ekleyin.',
      'H2 başlığı altında 10, 20 ve 30 kişilik hazır paket karşılaştırma tablosu ekleyin.',
    ],
    findings: [
      {
        dimension: 'Answer Extractability',
        observation: 'Hazır servis edilen kutu içeriği ve porsiyon detayları net biçimde listelenmiş',
        concreteSuggestion: 'Kişi başı adetleri tablo formatında tutun.',
      },
      {
        dimension: 'Entity Clarity',
        observation: 'Vanille Catering iştiraki olarak güvenilirlik ve hijyen vurgusu yapılmış',
        concreteSuggestion: 'Vanille Catering logosunu ve referansını footer alanında da vurgulayın.',
      },
    ],
  },
];

// Compatibility exports
export const demoClient = DEMO_CLIENT;
export const demoPrompts = DEMO_PROMPTS;
export const demoRuns = DEMO_RUNS;
export const demoRunCycles = DEMO_RUN_CYCLES;
export const demoDiagnostics = DEMO_DIAGNOSTICS;
export const demoActions = DEMO_ACTIONS;
export const demoPageAnalyses = DEMO_PAGE_ANALYSES;

export const demoCycleAggregates: CycleAggregate[] = DEMO_RUN_CYCLES.map((cycle) =>
  computeCycleAggregate(cycle.id, DEMO_RUNS, DEMO_CLIENT)
);
