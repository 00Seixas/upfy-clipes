export const CREDIT_COSTS = {
  REEL: 1800,
  LONGO: 2500,
} as const

export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 10_000,
    price: 29700,  // em centavos
    priceLabel: 'R$297',
    reels: Math.floor(10_000 / 1800),    // 5
    longos: Math.floor(10_000 / 2500),   // 4
    pricePerReel: Math.round(29700 / Math.floor(10_000 / 1800)),   // ~R$59,40
    stripePrice: process.env.STRIPE_PRICE_STARTER!,
    popular: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    credits: 20_000,
    price: 49700,
    priceLabel: 'R$497',
    reels: Math.floor(20_000 / 1800),    // 11
    longos: Math.floor(20_000 / 2500),   // 8
    pricePerReel: Math.round(49700 / Math.floor(20_000 / 1800)),   // ~R$45,18
    stripePrice: process.env.STRIPE_PRICE_CREATOR!,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 40_000,
    price: 79700,
    priceLabel: 'R$797',
    reels: Math.floor(40_000 / 1800),    // 22
    longos: Math.floor(40_000 / 2500),   // 16
    pricePerReel: Math.round(79700 / Math.floor(40_000 / 1800)),   // ~R$36,23
    stripePrice: process.env.STRIPE_PRICE_PRO!,
    popular: false,
  },
] as const

// Planos mensais: sem crédito — X clipes por dia, fixo e automático
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter-mensal',
    name: 'Starter',
    clips_per_day: 1,
    clips_per_month: 30,
    price: 59700,
    priceLabel: 'R$597',
    pricePerClip: Math.round(59700 / 30),  // ~R$19,90
    stripePrice: process.env.STRIPE_PRICE_ESSENCIAL!,
    popular: false,
  },
  {
    id: 'crescimento-mensal',
    name: 'Crescimento',
    clips_per_day: 2,
    clips_per_month: 60,
    price: 99700,
    priceLabel: 'R$997',
    pricePerClip: Math.round(99700 / 60),  // ~R$16,62
    stripePrice: process.env.STRIPE_PRICE_CRESCIMENTO!,
    popular: true,
  },
  {
    id: 'diario-mensal',
    name: 'Diário',
    clips_per_day: 3,
    clips_per_month: 90,
    price: 129700,
    priceLabel: 'R$1.297',
    pricePerClip: Math.round(129700 / 90),  // ~R$14,41
    stripePrice: process.env.STRIPE_PRICE_DIARIO!,
    popular: false,
  },
] as const

// Limiar de alerta de créditos
export const CREDIT_ALERT_THRESHOLDS = {
  LOW: CREDIT_COSTS.REEL * 3,      // < 5.400 créditos
  CRITICAL: CREDIT_COSTS.REEL * 1, // < 1.800 créditos
} as const

export const UPSELL_TRIGGERS = {
  USAGE_PERCENT: 50,
  DAYS_IN_PLATFORM: 7,
} as const

// Temperatura de viralização: frio → morno → quente → viral
export const VIRALITY_GRADES = ['frio', 'morno', 'quente', 'viral'] as const

export const ORDER_STATUSES = [
  'pending',
  'in_production',
  'review',
  'delivered',
  'revision_requested',
] as const

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const

export const INITIAL_STYLES = [
  {
    id: 'raiam',
    name: 'Estilo Raiam Santos',
    description: 'Ritmo acelerado, cortes rápidos e legendas dinâmicas',
    preview_url: '',
  },
  {
    id: 'corte-direto',
    name: 'Estilo Corte Direto',
    description: 'Sem rodeios, vai direto ao ponto com impacto visual',
    preview_url: '',
  },
  {
    id: 'podcast-viral',
    name: 'Estilo Podcast Viral',
    description: 'Ideal para cortes de conversas e entrevistas',
    preview_url: '',
  },
  {
    id: 'educativo',
    name: 'Estilo Educativo',
    description: 'Clareza, didática e retenção alta do início ao fim',
    preview_url: '',
  },
] as const
