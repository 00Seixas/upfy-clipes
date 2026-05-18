import Link from 'next/link'
import { Plus, Zap, BookOpen, Target, Flame, MessageSquare, Eye, Clock } from 'lucide-react'

const HOOK_CATEGORIES = [
  {
    id: 'abertura',
    label: 'Aberturas de Impacto',
    icon: Zap,
    color: '#ef4444',
    description: 'Os primeiros 3 segundos que param o scroll',
    hooks: [
      { text: '"Isso mudou completamente como eu penso sobre [tema]"', type: 'Revelação' },
      { text: '"A maioria das pessoas faz isso errado — incluindo eu até [tempo] atrás"', type: 'Erro Comum' },
      { text: '"Ninguém fala sobre [aspecto específico] de [tema] — e deveria"', type: 'Segredo' },
      { text: '"Eu perdi [quantia/oportunidade] por não saber disso antes"', type: 'Consequência' },
      { text: '"Vou te mostrar o que acontece quando você para de [ação comum]"', type: 'Experimento' },
      { text: '"[Número] anos para aprender isso. Você vai aprender em [tempo]"', type: 'Contraste' },
    ],
  },
  {
    id: 'educativo',
    label: 'Educativo & Autoridade',
    icon: BookOpen,
    color: '#3b82f6',
    description: 'Constrói credibilidade e posicionamento de especialista',
    hooks: [
      { text: '"A diferença entre quem tem resultado e quem não tem é uma coisa só"', type: 'Divisor' },
      { text: '"Deixa eu te mostrar o framework que uso com todos os meus clientes"', type: 'Framework' },
      { text: '"Esse é um erro que custa caro — e quase todo mundo comete"', type: 'Alerta' },
      { text: '"A ciência por trás de [comportamento comum] vai te surpreender"', type: 'Ciência' },
      { text: '"Fiz [ação] por [tempo] e aqui está o que aconteceu de verdade"', type: 'Caso Real' },
      { text: '"O motivo pelo qual [estratégia popular] não funciona para maioria"', type: 'Mito' },
    ],
  },
  {
    id: 'polemico',
    label: 'Polêmico & Opinião Forte',
    icon: Flame,
    color: '#f59e0b',
    description: 'Gera engajamento e discussão nos comentários',
    hooks: [
      { text: '"Discordo completamente de [opinião popular] — e vou te explicar por quê"', type: 'Contra-corrente' },
      { text: '"Isso que te ensinaram sobre [tema] é mentira"', type: 'Desconstrução' },
      { text: '"Pode me cancelar por isso, mas preciso falar sobre [tema]"', type: 'Vulnerável' },
      { text: '"[Expert/Guru famoso] está errado sobre isso — e os dados provam"', type: 'Confronto' },
      { text: '"Parei de [prática comum] depois de perceber uma coisa"', type: 'Mudança' },
      { text: '"Por que eu recuso clientes que [característica] — e não me arrependo"', type: 'Posicionamento' },
    ],
  },
  {
    id: 'storytelling',
    label: 'Storytelling & Narrativa',
    icon: MessageSquare,
    color: '#a78bfa',
    description: 'Conecta emocionalmente e aumenta retenção',
    hooks: [
      { text: '"Era [contexto/ano] quando percebi que estava fazendo tudo errado"', type: 'Retrospectiva' },
      { text: '"Recebi uma mensagem que mudou como eu enxergo [tema]"', type: 'Gatilho' },
      { text: '"Vou te contar o dia que quase desisti de tudo"', type: 'Vulnerabilidade' },
      { text: '"Meu maior fracasso me ensinou mais do que meus sucessos"', type: 'Lição' },
      { text: '"A conversa que tive com [pessoa/mentor] que mudou minha carreira"', type: 'Personagem' },
      { text: '"Três anos atrás eu era [situação]. Hoje [contraste positivo]"', type: 'Jornada' },
    ],
  },
] as const

const FORMAT_CARDS = [
  {
    format: 'Opinião Polêmica',
    duration: '30–60s',
    icon: Flame,
    desc: 'Tome uma posição forte sobre algo no seu nicho. Discorde do mainstream com argumentos sólidos.',
    viralRate: 'Muito Alto',
    rateColor: '#ef4444',
    tip: 'Comece com a opinião crua, sem rodeios. Explique depois.',
  },
  {
    format: 'Tutorial Rápido',
    duration: '45–90s',
    icon: Target,
    desc: 'Ensine uma habilidade específica em passos claros. Quanto mais concreto, melhor.',
    viralRate: 'Alto',
    rateColor: '#f59e0b',
    tip: 'Mostre o resultado final nos primeiros 3 segundos.',
  },
  {
    format: 'Caso Real',
    duration: '60–120s',
    icon: Eye,
    desc: 'Documente uma transformação, resultado ou experimento real. Dados e números são ouro.',
    viralRate: 'Alto',
    rateColor: '#f59e0b',
    tip: 'Seja específico: "cliente X, resultado Y em Z dias".',
  },
  {
    format: 'Reação / Comentário',
    duration: '30–60s',
    icon: MessageSquare,
    desc: 'Reaja a uma notícia, trend ou conteúdo do seu setor com sua perspectiva única.',
    viralRate: 'Médio-Alto',
    rateColor: '#3b82f6',
    tip: 'Surfe trends antes de 48h — depois é tarde demais.',
  },
  {
    format: 'Erro & Aprendizado',
    duration: '45–90s',
    icon: Zap,
    desc: 'Compartilhe um erro real que cometeu e o que aprendeu. Vulnerabilidade gera conexão.',
    viralRate: 'Alto',
    rateColor: '#f59e0b',
    tip: 'Quanto maior o erro, mais poderoso. Não minimize.',
  },
  {
    format: 'Lista Rápida',
    duration: '30–60s',
    icon: Clock,
    desc: '"5 coisas que aprendi sobre X." Formato ágil com alta retenção se cada item for denso.',
    viralRate: 'Médio',
    rateColor: '#6b7280',
    tip: 'Deixe o item mais surpreendente por último.',
  },
]

const TRIGGER_WORDS = [
  'Nunca', 'Sempre', 'Erro grave', 'Segredo', 'Finalmente', 'Pare de', 'Antes e depois',
  'Ninguém fala', 'A verdade sobre', 'O que os experts escondem', 'Eu descobri', 'Me custou',
  'Sem esforço', 'Em X dias', 'Método comprovado', 'Diferente de tudo', 'Aviso importante',
  'Aconteceu comigo', 'Você vai se arrepender', 'Não cometa esse erro',
]

export default function IdeiasPage() {
  return (
    <div className="space-y-8 pb-16">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-[#080809] border border-white/[0.06]">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.2) 0%, transparent 50%)' }} />
        <div className="relative px-8 py-10">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.2em] font-bold mb-6 flex items-center gap-3">
            <span className="inline-block w-5 h-px bg-zinc-800" />
            Biblioteca de Conteúdo
          </p>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">Arsenal de Conteúdo</h1>
              <p className="text-zinc-500 text-sm">Hooks, formatos e gatilhos para clipes de alto impacto</p>
            </div>
            <Link href="/enviar-videos" className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Pedir Clipe
            </Link>
          </div>
        </div>
      </div>

      {/* HOOK CATEGORIES */}
      <div className="space-y-4">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold">Biblioteca de Hooks</p>
        {HOOK_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <div key={cat.id} className="bg-[#080809] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.04] flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cat.color}10`, border: `1px solid ${cat.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <div>
                  <p className="text-zinc-200 text-sm font-semibold">{cat.label}</p>
                  <p className="text-zinc-700 text-[10px]">{cat.description}</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {cat.hooks.map((hook, i) => (
                  <div key={i} className="px-6 py-4 flex items-start gap-4 group hover:bg-white/[0.02] transition-colors">
                    <span className="shrink-0 mt-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/[0.06] text-zinc-700">{hook.type}</span>
                    <p className="text-zinc-400 text-sm leading-relaxed flex-1">{hook.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* FORMAT CARDS */}
      <div>
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-4">Formatos de Alto Desempenho</p>
        <div className="grid md:grid-cols-2 gap-3">
          {FORMAT_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.format} className="bg-[#080809] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-600 shrink-0" />
                    <p className="text-zinc-200 text-sm font-semibold">{card.format}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[8px] font-black tracking-wider" style={{ color: card.rateColor }}>{card.viralRate}</span>
                    <span className="text-zinc-700 text-[9px]">{card.duration}</span>
                  </div>
                </div>
                <p className="text-zinc-600 text-xs leading-relaxed mb-3">{card.desc}</p>
                <div className="flex items-start gap-2 bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                  <span className="text-[8px] font-bold text-zinc-700 mt-0.5 shrink-0 tracking-wider">DICA</span>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">{card.tip}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* TRIGGER WORDS */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-6">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-2">Palavras-Gatilho</p>
        <p className="text-zinc-700 text-xs mb-5">Termos que ativam curiosidade e aumentam retenção nos primeiros segundos</p>
        <div className="flex flex-wrap gap-2">
          {TRIGGER_WORDS.map((word) => (
            <span key={word} className="text-xs text-zinc-500 border border-white/[0.06] px-3 py-1.5 rounded-lg hover:border-white/[0.12] hover:text-zinc-300 transition-all cursor-default">
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* CTA BOTTOM */}
      <div className="bg-[#080809] border border-white/[0.06] rounded-xl p-8 text-center">
        <p className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] font-bold mb-4">Pronto para criar?</p>
        <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
          Escolha um hook, define o formato e envie seu vídeo. Nossa equipe transforma em clipe de alto impacto.
        </p>
        <Link href="/enviar-videos" className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-zinc-100 text-black font-bold text-sm rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Pedir Clipe Agora
        </Link>
      </div>

    </div>
  )
}
