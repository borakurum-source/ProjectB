import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem, PageAnalysis, CycleAggregate, CategorizedCompetitor, BrandMemoryItem } from '../types';
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
  industry: 'Gurme Parti İkram Kutuları & Butik Etkinlik Catering',
  market: 'Özel Kutlamalar & Kurumsal Kokteyl Etkinlikleri (İstanbul / Türkiye)',
  language: 'Türkçe & İngilizce',
  city: 'İstanbul',
  shortSummary: 'İstanbul genelinde özel kutlamalar, lansmanlar ve kurumsal kokteyller için gurme aperatif ve ikram kutuları sunan butik catering markası.',
  positioning: 'Servise hazır, taze ve şık ikram kutuları ile zahmetsiz etkinlik catering çözümleri.',
  detailedDescription: 'Snacks For Party, İstanbul merkezli özel davetler, kurumsal lansmanlar, doğum günü partileri ve kokteyl organizasyonları için hazır porsiyonlanmış gurme aperatif ve tatlı-tuzlu ikram kutuları hazırlayan yenilikçi bir catering platformudur.',
  targetAudience: 'Kurumsal İK & Etkinlik Yöneticileri, İstanbul İçi Özel Parti Sahipleri, Ev Daveti Verenler.',
  productsServices: 'Kokteyl İkram Kutuları, Tatlı & Tuzlu Aperatif Setleri, Kurumsal Lansman Catering Kutuları, Vejetaryen & Glütensiz İkram Seçenekleri.',
  keyDifferentiators: 'Garanti edilen soğuk zincir teslimat, servise hazır estetik sunum kutuları, garson ve ekipman gerektirmeyen pratik catering formatı.',
  isDemo: false,
  createdAt: '2026-07-01T09:00:00Z',
};

export const FILMFOLK_CLIENT: Client = {
  id: 'client-filmfolk',
  ownerId: 'default-owner',
  brandName: 'FilmFolk',
  aliases: ['FilmFolk', 'Film Folk', 'FilmFolk London', 'filmfolk.com'],
  domain: 'filmfolk.com',
  competitorDomains: [
    'splento.com',
    'charlottekneeproductions.com',
    'strikewithus.com',
    '360media.co.uk',
    'chocolatefilms.com',
    'boldcontentvideo.com',
    'londoncorporatevideography.co.uk',
  ],
  competitorBrands: [
    'Splento',
    'Charlotte Knee Productions',
    'Strike Video',
    '360 Media',
    'Chocolate Films',
    'Bold Content Video',
    'London Corporate Videography',
  ],
  categorizedCompetitors: [
    { brand: 'Splento', domain: 'splento.com', category: 'NO ECOMMERCE' },
    { brand: 'Bold Content Video', domain: 'boldcontentvideo.com', category: 'NO ECOMMERCE' },
    { brand: 'Chocolate Films', domain: 'chocolatefilms.com', category: 'NO ECOMMERCE' },
    { brand: '360 Media', domain: '360media.co.uk', category: 'NO ECOMMERCE' },
    { brand: 'Strike Video', domain: 'strikewithus.com', category: 'NO ECOMMERCE' },
  ],
  industry: 'Corporate Video Production & Event Videography Services',
  market: 'Commercial Videography, Event Filming, Drone & Photography (London / UK)',
  language: 'English',
  isDemo: false,
  createdAt: '2026-08-26T10:00:00Z',
};

export const FILMFOLK_PROMPTS: Prompt[] = [
  {
    id: 'filmfolk-p1',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who are the best corporate video production companies in London?',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:00:00Z',
  },
  {
    id: 'filmfolk-p2',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'compare corporate video production companies London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:01:00Z',
  },
  {
    id: 'filmfolk-p3',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'best drone filming services London for corporate events',
    intentLayer: 'Commercial',
    category: 'Drone Filming & Videography',
    active: true,
    createdAt: '2026-08-26T10:02:00Z',
  },
  {
    id: 'filmfolk-p4',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Best freelance video editors in London',
    intentLayer: 'Commercial',
    category: 'Video Editing Services',
    active: true,
    createdAt: '2026-08-26T10:03:00Z',
  },
  {
    id: 'filmfolk-p5',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Drone videography London budget',
    intentLayer: 'Transactional',
    category: 'Drone Filming & Videography',
    active: true,
    createdAt: '2026-08-26T10:04:00Z',
  },
  {
    id: 'filmfolk-p6',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who are the top wedding videographers in London',
    intentLayer: 'Commercial',
    category: 'Wedding & Event Filming',
    active: true,
    createdAt: '2026-08-26T10:05:00Z',
  },
  {
    id: 'filmfolk-p7',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Recommend a corporate photographer in London',
    intentLayer: 'Commercial',
    category: 'Corporate Photography & Video',
    active: true,
    createdAt: '2026-08-26T10:06:00Z',
  },
  {
    id: 'filmfolk-p8',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'best professional photography and videography services for weddings London',
    intentLayer: 'Commercial',
    category: 'Wedding & Event Filming',
    active: true,
    createdAt: '2026-08-26T10:07:00Z',
  },
  {
    id: 'filmfolk-p9',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'London corporate videography packages event highlight video',
    intentLayer: 'Transactional',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:08:00Z',
  },
  {
    id: 'filmfolk-p10',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who are the best professional videography companies in London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:09:00Z',
  },
  {
    id: 'filmfolk-p11',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'social media video production for small businesses UK',
    intentLayer: 'Commercial',
    category: 'Social Media & Promo Videos',
    active: true,
    createdAt: '2026-08-26T10:10:00Z',
  },
  {
    id: 'filmfolk-p12',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'drone filming services for real estate London price',
    intentLayer: 'Transactional',
    category: 'Drone Filming & Videography',
    active: true,
    createdAt: '2026-08-26T10:11:00Z',
  },
  {
    id: 'filmfolk-p13',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Best property video production in London',
    intentLayer: 'Commercial',
    category: 'Property & Real Estate Filming',
    active: true,
    createdAt: '2026-08-26T10:12:00Z',
  },
  {
    id: 'filmfolk-p14',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Cheap video editing services UK London',
    intentLayer: 'Transactional',
    category: 'Video Editing Services',
    active: true,
    createdAt: '2026-08-26T10:13:00Z',
  },
  {
    id: 'filmfolk-p15',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Wedding videographer UK affordable',
    intentLayer: 'Transactional',
    category: 'Wedding & Event Filming',
    active: true,
    createdAt: '2026-08-26T10:14:00Z',
  },
  {
    id: 'filmfolk-p16',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'how much does event videography cost in London per hour',
    intentLayer: 'Informational',
    category: 'Pricing & Cost Queries',
    active: true,
    createdAt: '2026-08-26T10:15:00Z',
  },
  {
    id: 'filmfolk-p17',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who offers professional livestreaming services in London',
    intentLayer: 'Commercial',
    category: 'Livestreaming Services',
    active: true,
    createdAt: '2026-08-26T10:16:00Z',
  },
  {
    id: 'filmfolk-p18',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Best event videographers in London for conferences',
    intentLayer: 'Commercial',
    category: 'Event Videography',
    active: true,
    createdAt: '2026-08-26T10:17:00Z',
  },
  {
    id: 'filmfolk-p19',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Best drone filming companies in London',
    intentLayer: 'Commercial',
    category: 'Drone Filming & Videography',
    active: true,
    createdAt: '2026-08-26T10:18:00Z',
  },
  {
    id: 'filmfolk-p20',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Find a videography team that does promotional videos and social media content in the UK',
    intentLayer: 'Transactional',
    category: 'Social Media & Promo Videos',
    active: true,
    createdAt: '2026-08-26T10:19:00Z',
  },
  {
    id: 'filmfolk-p21',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'corporate headshot photography and personal branding video combo UK',
    intentLayer: 'Commercial',
    category: 'Corporate Photography & Video',
    active: true,
    createdAt: '2026-08-26T10:20:00Z',
  },
  {
    id: 'filmfolk-p22',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Best wedding photographers in London — who do you recommend',
    intentLayer: 'Commercial',
    category: 'Wedding & Event Filming',
    active: true,
    createdAt: '2026-08-26T10:21:00Z',
  },
  {
    id: 'filmfolk-p23',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'video marketing production services uk',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:22:00Z',
  },
  {
    id: 'filmfolk-p24',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Recommend a freelance photographer in London for corporate work',
    intentLayer: 'Commercial',
    category: 'Corporate Photography & Video',
    active: true,
    createdAt: '2026-08-26T10:23:00Z',
  },
  {
    id: 'filmfolk-p25',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'hire a videographer for a corporate event in London',
    intentLayer: 'Transactional',
    category: 'Event Videography',
    active: true,
    createdAt: '2026-08-26T10:24:00Z',
  },
  {
    id: 'filmfolk-p26',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who are the highest rated videographers in London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:25:00Z',
  },
  {
    id: 'filmfolk-p27',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'affordable freelancer photographer in london',
    intentLayer: 'Transactional',
    category: 'Corporate Photography & Video',
    active: true,
    createdAt: '2026-08-26T10:26:00Z',
  },
  {
    id: 'filmfolk-p28',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'how much does professional proposal photography and video cost in London',
    intentLayer: 'Informational',
    category: 'Pricing & Cost Queries',
    active: true,
    createdAt: '2026-08-26T10:27:00Z',
  },
  {
    id: 'filmfolk-p29',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Recommend a headshot photographer in London',
    intentLayer: 'Commercial',
    category: 'Corporate Photography & Video',
    active: true,
    createdAt: '2026-08-26T10:28:00Z',
  },
  {
    id: 'filmfolk-p30',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Commercial videography London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:29:00Z',
  },
  {
    id: 'filmfolk-p31',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'How much does professional videography cost for a corporate event in the UK?',
    intentLayer: 'Informational',
    category: 'Pricing & Cost Queries',
    active: true,
    createdAt: '2026-08-26T10:30:00Z',
  },
  {
    id: 'filmfolk-p32',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who should I hire for event photography in London',
    intentLayer: 'Commercial',
    category: 'Event Videography',
    active: true,
    createdAt: '2026-08-26T10:31:00Z',
  },
  {
    id: 'filmfolk-p33',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'event videographers London conferences corporate',
    intentLayer: 'Commercial',
    category: 'Event Videography',
    active: true,
    createdAt: '2026-08-26T10:32:00Z',
  },
  {
    id: 'filmfolk-p34',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Where can I get videography for concerts, exhibitions, and graduations in the UK?',
    intentLayer: 'Informational',
    category: 'Event Videography',
    active: true,
    createdAt: '2026-08-26T10:33:00Z',
  },
  {
    id: 'filmfolk-p35',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'Who are the best freelance videographers in London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:34:00Z',
  },
  {
    id: 'filmfolk-p36',
    ownerId: 'default-owner',
    clientId: 'client-filmfolk',
    text: 'What videographers do you recommend in London',
    intentLayer: 'Commercial',
    category: 'Corporate Video Production',
    active: true,
    createdAt: '2026-08-26T10:35:00Z',
  },
];

export const DEMO_PROMPTS: Prompt[] = [
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
    callCount: 90,
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
    callCount: 90,
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
    callCount: 90,
    isRetest: true,
    retestedActionId: 'action-1',
  },
];

// Helper generator for realistic prompt runs across all 15 prompts and 3 cycles
function generateRunsForPrompts(): Run[] {
  const runs: Run[] = [];

  // Prompt configuration matrix for Cycle 3 (Latest), Cycle 2 (Mid), and Cycle 1 (Baseline)
  // mentionedRuns: array of boolean indicating whether brand was mentioned in [run1, run2, run3]
  // citedRuns: array of boolean indicating whether domain was cited in [run1, run2, run3]
  // ranks: array of rank position [run1, run2, run3] (null when unranked or not mentioned)
  interface PromptCycleConfig {
    c3: {
      mentioned: [boolean, boolean, boolean];
      cited: [boolean, boolean, boolean];
      ranks: [number | null, number | null, number | null];
      primaryCompetitors: string[];
      answerSnippet: (mentioned: boolean, rank: number | null) => string;
      sourceTitle: string;
      sourceUrl: string;
    };
    c2: {
      mentioned: [boolean, boolean, boolean];
      cited: [boolean, boolean, boolean];
      ranks: [number | null, number | null, number | null];
    };
    c1: {
      mentioned: [boolean, boolean, boolean];
      cited: [boolean, boolean, boolean];
      ranks: [number | null, number | null, number | null];
    };
  }

  const promptConfigs: Record<string, PromptCycleConfig> = {
    'prompt-15': {
      c3: {
        mentioned: [true, true, true],
        cited: [true, true, true],
        ranks: [1, 1, 1],
        primaryCompetitors: ['Misafirliq', 'Divan Catering'],
        answerSnippet: (m) => m
          ? "Evde doğum günü davetleri için catering hizmeti alabileceğiniz başlıca firmalar:\n1. Snacks For Party (snacksforparty.com) — Vanille Catering güvencesiyle adrese teslim pratik parti kutuları.\n2. Misafirliq — Ev daveti catering kutuları.\n3. Divan Catering — Lüks ev davet organizasyonları."
          : "Evde doğum günü davetleri için Misafirliq ve Divan Catering öne çıkan seçeneklerdir.",
        sourceTitle: 'Snacks For Party | Doğum Günü Parti Kutuları',
        sourceUrl: 'https://snacksforparty.com/kategori/dogum-gunu',
      },
      c2: {
        mentioned: [true, true, false],
        cited: [true, false, false],
        ranks: [2, 2, null],
      },
      c1: {
        mentioned: [true, false, false],
        cited: [false, false, false],
        ranks: [2, null, null],
      },
    },
    'prompt-16': {
      c3: {
        mentioned: [true, true, true],
        cited: [true, true, true],
        ranks: [1, 1, 1],
        primaryCompetitors: ['Backhaus Catering', 'Macrocenter Catering'],
        answerSnippet: (m) => m
          ? "Evde doğum günü kutlamaları için hazır atıştırmalık ve ikramlık servisleri:\n1. Snacks For Party (snacksforparty.com) — Mini burger, kanepe, wrap ve tatlı parti kutuları.\n2. Backhaus Catering — Fırın atıştırmalıkları.\n3. Macrocenter Catering — Pratik atıştırmalık tabakları."
          : "Doğum günü atıştırmalıkları için Backhaus ve Macrocenter hazır ikramlar sunmaktadır.",
        sourceTitle: 'Snacks For Party | Parti Atıştırmalık Kutuları',
        sourceUrl: 'https://snacksforparty.com/kategori/parti-kutulari',
      },
      c2: {
        mentioned: [true, true, false],
        cited: [true, true, false],
        ranks: [1, 2, null],
      },
      c1: {
        mentioned: [false, true, false],
        cited: [false, false, false],
        ranks: [null, 2, null],
      },
    },
    'prompt-2': {
      c3: {
        mentioned: [true, true, true],
        cited: [true, true, false],
        ranks: [1, 1, 2],
        primaryCompetitors: ['Misafirliq', 'Backhaus Catering'],
        answerSnippet: (m, r) => m
          ? `İstanbul'da ev davetleri için hazır kutu catering alanında ${r === 1 ? 'Snacks For Party (snacksforparty.com) ve Misafirliq' : 'Misafirliq ve Snacks For Party'} öne çıkmaktadır.`
          : "İstanbul'da ev cateringi için Misafirliq ve Divan Catering tercih edilmektedir.",
        sourceTitle: 'Snacks For Party | Ev Daveti Catering Menüleri',
        sourceUrl: 'https://snacksforparty.com/ev-daveti-catering',
      },
      c2: {
        mentioned: [true, false, true],
        cited: [true, false, false],
        ranks: [2, null, 2],
      },
      c1: {
        mentioned: [false, true, false],
        cited: [false, false, false],
        ranks: [null, 2, null],
      },
    },
    'prompt-3': {
      c3: {
        mentioned: [true, false, false], // 1/3 (33%) - General catering dominated by Divan & Misafirliq
        cited: [false, false, false],
        ranks: [4, null, null],
        primaryCompetitors: ['Divan Catering', 'Misafirliq', 'Gourmet Pack'],
        answerSnippet: (m) => m
          ? "İstanbul'un önde gelen catering şirketleri:\n1. Divan Catering — Lüks gala ve kurumsal organizasyonlar.\n2. Misafirliq — Davet ve parti kutuları.\n3. Gourmet Pack — Kurumsal ofis yemek kutuları.\n4. Snacks For Party — Butik parti kutuları ve kokteyl ikramları."
          : "İstanbul'un en iyi catering şirketleri:\n1. Divan Catering\n2. Misafirliq\n3. Gourmet Pack Catering\n4. Carlo Bernardini Catering",
        sourceTitle: 'Snacks For Party | İstanbul Catering',
        sourceUrl: 'https://snacksforparty.com',
      },
      c2: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
      c1: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
    },
    'prompt-4': {
      c3: {
        mentioned: [true, true, false], // 2/3 (67%)
        cited: [true, false, false],
        ranks: [2, 2, null],
        primaryCompetitors: ['Divan Catering', 'Misafirliq'],
        answerSnippet: (m) => m
          ? "İstanbul'da kokteyl menüsü catering fiyatları kişi başı ortalama 450 TL ile 1.500 TL arasında değişmektedir. Divan Catering tam servisli gala çözümleri sunarken, Snacks For Party (snacksforparty.com) şeffaf paket fiyatlı hazır parti kutuları sağlamaktadır."
          : "Kokteyl catering fiyatları menü içeriğine ve garson sayısına göre kişi başı 500 TL - 1.800 TL arasındadır. Divan Catering ve Misafirliq başlıca sağlayıcılardır.",
        sourceTitle: 'Snacks For Party | Kokteyl Menüleri ve Fiyatlar',
        sourceUrl: 'https://snacksforparty.com/fiyatlar',
      },
      c2: {
        mentioned: [true, false, false],
        cited: [false, false, false],
        ranks: [2, null, null],
      },
      c1: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
    },
    'prompt-5': {
      c3: {
        mentioned: [true, true, false], // 2/3 (67%)
        cited: [true, false, false],
        ranks: [1, 2, null],
        primaryCompetitors: ['Divan Catering', 'Gourmet Pack'],
        answerSnippet: (m, r) => m
          ? `Kurumsal etkinlik ve ofis toplantıları için öne çıkan çözümler:\n1. ${r === 1 ? 'Snacks For Party (snacksforparty.com) — Pratik mini brioche ve kokteyl ikram kutuları.' : 'Divan Catering — VIP protokol ve kurumsal organizasyonlar.'}\n2. ${r === 1 ? 'Divan Catering — VIP protokol ağırlamaları.' : 'Snacks For Party — Kurumsal toplantı kutuları.'}\n3. Gourmet Pack — Bireysel toplantı beslenme paketleri.`
          : "Kurumsal etkinlikler için İstanbul'da Divan Catering ve Gourmet Pack tercih edilmektedir.",
        sourceTitle: 'Snacks For Party | Kurumsal Catering & Toplantı Kutuları',
        sourceUrl: 'https://snacksforparty.com/kurumsal-catering',
      },
      c2: {
        mentioned: [true, false, true],
        cited: [false, false, true],
        ranks: [2, null, 2],
      },
      c1: {
        mentioned: [false, false, true],
        cited: [false, false, false],
        ranks: [null, null, 3],
      },
    },
    'prompt-6': {
      c3: {
        mentioned: [true, true, true], // 3/3 (100%)
        cited: [true, true, true],
        ranks: [1, 1, 1],
        primaryCompetitors: ['Backhaus Catering', 'Misafirliq'],
        answerSnippet: () => "Mini tatlı, tartolet ve gurme mini sandviç siparişi verebileceğiniz güvenilir servisler:\n1. Snacks For Party (snacksforparty.com) — Tatlı ve tuzlu kokteyl ikram kutuları.\n2. Backhaus Catering — Fırın ürünleri ve mini sandviç tepsileri.\n3. Misafirliq — Karışık parti kutuları.",
        sourceTitle: 'Snacks For Party | Mini Tatlı & Sandviç Siparişi',
        sourceUrl: 'https://snacksforparty.com/kategori/tatlilar',
      },
      c2: {
        mentioned: [true, true, false],
        cited: [true, true, false],
        ranks: [1, 2, null],
      },
      c1: {
        mentioned: [true, false, false],
        cited: [true, false, false],
        ranks: [1, null, null],
      },
    },
    'prompt-7': {
      c3: {
        mentioned: [true, true, true], // 3/3 (100%)
        cited: [true, true, false],
        ranks: [1, 1, 2],
        primaryCompetitors: ['Misafirliq', 'Divan Catering'],
        answerSnippet: () => "Online kanepe ve finger food siparişinde Snacks For Party (snacksforparty.com) ve Misafirliq en çok tercih edilen iki markadır. Vanille Catering mutfağında hazırlanan sunumlar taze teslim edilir.",
        sourceTitle: 'Snacks For Party | Kanepe & Finger Food Kutuları',
        sourceUrl: 'https://snacksforparty.com/kategori/kanepeler',
      },
      c2: {
        mentioned: [true, false, true],
        cited: [true, false, false],
        ranks: [1, null, 2],
      },
      c1: {
        mentioned: [false, true, false],
        cited: [false, false, false],
        ranks: [null, 2, null],
      },
    },
    'prompt-8': {
      c3: {
        mentioned: [true, true, false], // 2/3 (67%)
        cited: [true, true, false],
        ranks: [2, 1, null],
        primaryCompetitors: ['Misafirliq', 'Gourmet Pack'],
        answerSnippet: (m, r) => m
          ? `Online web sitesi üzerinden doğrudan menü seçilip sipariş verilebilen catering firmaları:\n1. ${r === 1 ? 'Snacks For Party (snacksforparty.com)' : 'Misafirliq (misafirliq.com)'}\n2. ${r === 1 ? 'Misafirliq (misafirliq.com)' : 'Snacks For Party (snacksforparty.com)'}\n3. Gourmet Pack (gourmetpack.com.tr)`
          : "Online sipariş verilebilen catering firmaları: 1. Misafirliq 2. Gourmet Pack 3. Backhaus.",
        sourceTitle: 'Snacks For Party | Online Sipariş',
        sourceUrl: 'https://snacksforparty.com',
      },
      c2: {
        mentioned: [true, false, true],
        cited: [true, false, false],
        ranks: [2, null, 2],
      },
      c1: {
        mentioned: [true, false, false],
        cited: [false, false, false],
        ranks: [2, null, null],
      },
    },
    'prompt-9': {
      c3: {
        mentioned: [true, false, false], // 1/3 (33%)
        cited: [true, false, false],
        ranks: [2, null, null],
        primaryCompetitors: ['Divan Catering', 'Misafirliq'],
        answerSnippet: (m) => m
          ? "Şirket içi kutlama ve motivasyon etkinlikleri için Divan Catering büyük organizasyonlar, Snacks For Party (snacksforparty.com) ise pratik modüler parti kutuları için önerilmektedir."
          : "Şirket etkinlikleri için İstanbul'da Divan Catering ve Misafirliq öne çıkan kurumsal sağlayıcılardır.",
        sourceTitle: 'Snacks For Party | Kurumsal Etkinlik Kutuları',
        sourceUrl: 'https://snacksforparty.com/kurumsal-catering',
      },
      c2: {
        mentioned: [false, false, true],
        cited: [false, false, false],
        ranks: [null, null, 3],
      },
      c1: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
    },
    'prompt-10': {
      c3: {
        mentioned: [true, false, false], // 1/3 (33%)
        cited: [false, false, false],
        ranks: [3, null, null],
        primaryCompetitors: ['Divan Catering', 'Misafirliq'],
        answerSnippet: (m) => m
          ? "Yüksek kalite ve premium catering hizmetlerinde İstanbul'da:\n1. Divan Catering — Lüks gala ve protokol davetleri.\n2. Carlo Bernardini Catering — Özel şef davetleri.\n3. Snacks For Party (Vanille Catering) — Butik gurme parti kutuları."
          : "Premium catering alanında İstanbul'da Divan Catering ve Carlo Bernardini ilk sıralarda yer alır.",
        sourceTitle: 'Snacks For Party | Premium Davet Menüleri',
        sourceUrl: 'https://snacksforparty.com',
      },
      c2: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
      c1: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
    },
    'prompt-11': {
      c3: {
        mentioned: [true, true, false], // 2/3 (67%)
        cited: [true, false, false],
        ranks: [1, 2, null],
        primaryCompetitors: ['Misafirliq', 'Gourmet Pack'],
        answerSnippet: (m) => m
          ? "30 kişilik ev veya ofis davetleri için porsiyonlanmış hazır kokteyl kutuları sunan Snacks For Party (snacksforparty.com) ve Misafirliq idealdir. Kişi başı 8-10 parça finger food içeren hazır menüler sipariş edilebilir."
          : "30 kişilik gruplar için Misafirliq ve Gourmet Pack hazır paket menüler sunmaktadır.",
        sourceTitle: 'Snacks For Party | 30 Kişilik Parti Paketleri',
        sourceUrl: 'https://snacksforparty.com/kategori/paketler',
      },
      c2: {
        mentioned: [true, false, true],
        cited: [false, false, false],
        ranks: [2, null, 2],
      },
      c1: {
        mentioned: [false, true, false],
        cited: [false, false, false],
        ranks: [null, 2, null],
      },
    },
    'prompt-12': {
      c3: {
        mentioned: [true, true, true], // 3/3 (100%)
        cited: [true, true, false],
        ranks: [1, 1, 2],
        primaryCompetitors: ['Misafirliq', 'Macrocenter Catering'],
        answerSnippet: () => "İstanbul genelinde adrese teslim kutu catering hizmeti veren firmalar:\n1. Snacks For Party (snacksforparty.com) — Soğuk zincir ve şık servis ambalajlarıyla kapıya teslimat.\n2. Misafirliq — Özel teslimat kutuları.\n3. Macrocenter Catering — Mağazadan adrese teslimat.",
        sourceTitle: 'Snacks For Party | Adrese Teslim Kutu Catering',
        sourceUrl: 'https://snacksforparty.com',
      },
      c2: {
        mentioned: [true, true, false],
        cited: [true, false, false],
        ranks: [1, 2, null],
      },
      c1: {
        mentioned: [true, false, false],
        cited: [false, false, false],
        ranks: [2, null, null],
      },
    },
    'prompt-13': {
      c3: {
        mentioned: [false, false, false], // 0/3 (0%) - Clear gap for action item & diagnostic
        cited: [false, false, false],
        ranks: [null, null, null],
        primaryCompetitors: ['Gourmet Pack', 'Backhaus Catering', 'Misafirliq'],
        answerSnippet: () => "Coffee break ve kahve arası menü fiyatları içeriğe göre kişi başı 250 TL ile 600 TL arasında değişmektedir.\n1. Gourmet Pack (gourmetpack.com.tr) — Kruvasan ve cookie paketleri.\n2. Backhaus Catering — Fırın kahve arası tepsileri.\n3. Misafirliq — Tatlı ve tuzlu ikram kutuları.",
        sourceTitle: 'Gourmet Pack | Coffee Break Menü Fiyatları',
        sourceUrl: 'https://gourmetpack.com.tr/coffee-break',
      },
      c2: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
      c1: {
        mentioned: [false, false, false],
        cited: [false, false, false],
        ranks: [null, null, null],
      },
    },
    'prompt-14': {
      c3: {
        mentioned: [true, true, false], // 2/3 (67%)
        cited: [true, false, false],
        ranks: [2, 1, null],
        primaryCompetitors: ['Gourmet Pack', 'Backhaus Catering'],
        answerSnippet: (m, r) => m
          ? `Özel etkinlik ve toplantılar için gurme lunchbox ve sandviç hazırlayan firmalar:\n1. ${r === 1 ? 'Snacks For Party (snacksforparty.com)' : 'Gourmet Pack'}\n2. ${r === 1 ? 'Gourmet Pack' : 'Snacks For Party (snacksforparty.com)'}\n3. Backhaus Catering — Taze fırın sandviç paketleri.`
          : "Lunchbox ve sandviç siparişi için Gourmet Pack ve Backhaus Catering kurumsal menüler sağlamaktadır.",
        sourceTitle: 'Snacks For Party | Gurme Sandviç & Lunchbox Kutuları',
        sourceUrl: 'https://snacksforparty.com/kategori/sandvicler',
      },
      c2: {
        mentioned: [false, true, true],
        cited: [false, false, true],
        ranks: [null, 2, 2],
      },
      c1: {
        mentioned: [false, false, true],
        cited: [false, false, false],
        ranks: [null, null, 3],
      },
    },
  };

  const cycles = [
    { id: 'cycle-1-baseline', date: '2026-08-01', key: 'c1' as const, model: 'gemini-3.6-flash' },
    { id: 'cycle-2-mid', date: '2026-08-12', key: 'c2' as const, model: 'gemini-3.6-flash' },
    { id: 'cycle-3-latest', date: '2026-08-24', key: 'c3' as const, model: 'gemini-2.5-flash' },
  ];

  DEMO_PROMPTS.forEach((p, promptIdx) => {
    const config = promptConfigs[p.id] || promptConfigs['prompt-2'];

    cycles.forEach((cycle) => {
      const cycleCfg = config[cycle.key];

      for (let r = 1; r <= 3; r++) {
        const runIdx = r;
        const isMentioned = cycleCfg.mentioned[r - 1];
        const isCited = cycleCfg.cited[r - 1];
        const rank = isMentioned ? cycleCfg.ranks[r - 1] : null;
        const competitors = config.c3.primaryCompetitors;

        const groundingSources: { uri: string; displayTitle: string; resolvedDomain: string }[] = [];

        if (isCited) {
          groundingSources.push({
            uri: `https://vertexaisearch.cloud.google.com/grounding-redirect/sfp-${p.id}-r${r}`,
            displayTitle: config.c3.sourceTitle,
            resolvedDomain: 'snacksforparty.com',
          });
        }

        competitors.forEach((comp, cIdx) => {
          const compDomain = comp === 'Misafirliq'
            ? 'misafirliq.com'
            : comp === 'Divan Catering'
            ? 'divancatering.com.tr'
            : comp === 'Gourmet Pack'
            ? 'gourmetpack.com.tr'
            : comp === 'Backhaus Catering'
            ? 'backhaus.com.tr'
            : 'macrocenter.com.tr';

          groundingSources.push({
            uri: `https://vertexaisearch.cloud.google.com/grounding-redirect/comp-${cIdx}-${p.id}`,
            displayTitle: `${comp} Menüleri ve Fiyatları`,
            resolvedDomain: compDomain,
          });
        });

        const mentionedBrands: { name: string; isClient: boolean; isKnownCompetitor: boolean; sentiment: 'Positive' | 'Neutral' | 'Negative'; verbatimQuote: string }[] = [];

        if (isMentioned) {
          mentionedBrands.push({
            name: 'Snacks For Party',
            isClient: true,
            isKnownCompetitor: false,
            sentiment: 'Positive',
            verbatimQuote: rank === 1
              ? 'Snacks For Party (snacksforparty.com) — Vanille Catering güvencesiyle adrese teslim pratik parti kutuları'
              : 'Snacks For Party kutulu ikram servisleri',
          });
        }

        competitors.forEach((c) => {
          mentionedBrands.push({
            name: c,
            isClient: false,
            isKnownCompetitor: true,
            sentiment: 'Positive',
            verbatimQuote: `${c} menüleri ve ikram paketleri`,
          });
        });

        const answerText = config.c3.answerSnippet(isMentioned, rank);
        const hasRankList = answerText.includes('1.') && answerText.includes('2.');

        runs.push({
          id: `run-${cycle.id}-${p.id}-r${r}`,
          ownerId: 'user-snacksforparty',
          clientId: 'client-snacksforparty',
          cycleId: cycle.id,
          promptId: p.id,
          engine: 'gemini-grounded',
          model: cycle.model,
          runIndex: runIdx,
          runAt: `${cycle.date}T10:0${r}:${promptIdx < 10 ? '0' + promptIdx : promptIdx}Z`,
          answerText,
          groundingSources,
          webSearchQueries: [p.text],
          brandMentioned: isMentioned,
          brandCited: isCited,
          position: hasRankList && rank ? rank : null,
          prominence: isMentioned ? (rank === 1 ? 0.15 : 0.35) : null,
          mentionedBrands,
          orderedList: hasRankList,
          rankedNames: hasRankList
            ? (rank === 1 ? ['Snacks For Party', ...competitors] : [...competitors, 'Snacks For Party'])
            : [],
          recommendedEntityType: 'Catering Service & Online Food Delivery',
          answerFormat: hasRankList ? 'list' : 'prose',
          error: null,
        });
      }
    });
  });

  return runs;
}

export const DEMO_RUNS: Run[] = generateRunsForPrompts();

export const DEMO_DIAGNOSTICS: Diagnostic[] = [
  {
    id: 'diag-prompt-15',
    ownerId: 'user-snacksforparty',
    clientId: 'client-snacksforparty',
    promptId: 'prompt-15',
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
    validationMethod: '3 çalıştırma ile "Evde doğum günü yapacağım. Catering nereden alabilirim?" sorgusunu yeniden test edin.',
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
    diagnosticId: 'diag-prompt-15',
    promptIds: ['prompt-15', 'prompt-16', 'prompt-2', 'prompt-6', 'prompt-7'],
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
    validation: 'Retest prompt "Evde doğum günü yapacağım. Catering nereden alabilirim?" (N=3).',
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

export const DEMO_BRAND_MEMORIES: BrandMemoryItem[] = [
  {
    id: 'mem-sfp-1',
    clientId: 'client-snacksforparty',
    title: 'Şirket Tanımı & Marka Konumlandırması',
    entityType: 'company_overview',
    sourceUrl: 'https://snacksforparty.com/about',
    sourceType: 'crawler',
    content: 'Snacks For Party, Vanille Catering güvencesiyle İstanbul genelinde ev davetleri, kokteyl organizasyonları, ofis etkinlikleri ve özel kutlamalar için hazır servis gurme atıştırmalık kutuları üreten butik catering markasıdır.',
    keyFacts: [
      'Vanille Catering iştirakidir ve kurumsal hijyen standartlarına sahiptir.',
      'İstanbul içi aynı gün/belirlenen saatte soğuk zincir teslimat yapar.',
      'Garson veya mutfak ekipmanı gerektirmeyen hazır servis sunum kutuları sunar.'
    ],
    confidence: 'High',
    tags: ['overview', 'catering', 'istanbul', 'boutique'],
    createdAt: '2026-08-25T12:00:00Z',
    updatedAt: '2026-08-25T12:00:00Z',
  },
  {
    id: 'mem-sfp-2',
    clientId: 'client-snacksforparty',
    title: 'Kokteyl & Parti İkram Menü Paketleri',
    entityType: 'product_feature',
    sourceUrl: 'https://snacksforparty.com/menuler',
    sourceType: 'crawler',
    content: 'Tuzlu kanapeler, mini burgerler, mini wrap çeşitleri, brioche sandviçler, peynir/şarküteri tabakları ve el yapımı mini tatlı kutularından oluşan zengin menü yelpazesi. 10, 20 ve 30+ kişilik hazır setler mevcuttur.',
    keyFacts: [
      'Kişi başı 8-12 parça doyurucu atıştırmalık standardı uygulanır.',
      'Vejetaryen, vegan ve glütensiz menü alternatifleri mevcuttur.',
      'Tüm ürünler taze hazırlanıp şık kraft/akrilik sunum kutularında sevk edilir.'
    ],
    confidence: 'High',
    tags: ['products', 'cocktail', 'fingerfood', 'menu'],
    createdAt: '2026-08-25T12:00:00Z',
    updatedAt: '2026-08-25T12:00:00Z',
  },
  {
    id: 'mem-sfp-3',
    clientId: 'client-snacksforparty',
    title: 'Fiyatlandırma Politikası & Şeffaf Paket Fiyatları',
    entityType: 'pricing_plan',
    sourceUrl: 'https://snacksforparty.com/fiyatlar',
    sourceType: 'manual',
    content: 'Snacks For Party şeffaf kutu bazlı e-ticaret fiyatlandırması sunar. 10 Kişilik Başlangıç Kokteyl Kutusu 3.850 TL, 20 Kişilik Premium Parti Kutusu 7.200 TL, 30 Kişilik Deluxe Davet Seti 10.500 TL civarındadır.',
    keyFacts: [
      'Gizli servis veya garson bedeli yoktur; kutu fiyatı nettir.',
      'Belirli sipariş tutarı üzeri İstanbul içi teslimat ücretsizdir.',
      'Web sitesi üzerinden anında kredi kartıyla online sipariş verilebilir.'
    ],
    confidence: 'High',
    tags: ['pricing', 'plans', 'transparent'],
    createdAt: '2026-08-25T12:00:00Z',
    updatedAt: '2026-08-25T12:00:00Z',
  },
  {
    id: 'mem-sfp-4',
    clientId: 'client-snacksforparty',
    title: 'Rakiplere Karşı Ayrışma Noktaları (USPs)',
    entityType: 'competitor_diff',
    sourceUrl: 'https://snacksforparty.com/neden-biz',
    sourceType: 'manual',
    content: 'Geleneksel ağır catering firmalarının aksine (Misafirliq, Hub vb.), mutfaksız ve minimum 24 saat önceden siparişle evlere ve ofislere hazır gurme kutu teslimatı yapar. Masrafsız ve pratik sunum sağlar.',
    keyFacts: [
      'Geleneksel cateringlere göre %40 daha uygun maliyet ve sıfır servis karmaşası.',
      'Instagram ve sosyal davet estetiğine uygun lüks sunum tasarımı.',
      'Siparişin dakik saat aralığında kapıya teslim garantisi.'
    ],
    confidence: 'High',
    tags: ['usp', 'differentiation', 'competitor_gap'],
    createdAt: '2026-08-25T12:00:00Z',
    updatedAt: '2026-08-25T12:00:00Z',
  },
];
