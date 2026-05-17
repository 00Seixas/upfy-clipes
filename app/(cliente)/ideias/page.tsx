export default function IdeiasPage() {
  const hooks = [
    { category: 'Hook de abertura', suggestions: ['A maioria das pessoas não sabe que...', 'Pare tudo. Isso vai mudar como você pensa sobre...', 'Em 60 segundos vou te mostrar como...', 'O maior erro que você comete todos os dias é...'] },
    { category: 'Conteúdo educativo', suggestions: ['3 segredos que aprendi depois de X anos', 'Como eu fiz X sem Y', 'A verdade sobre X que ninguém fala', 'O método que profissionais usam para X'] },
    { category: 'Polêmico & Debate', suggestions: ['Por que X está errado (e o que fazer em vez disso)', 'Pare de acreditar nisso sobre X', 'A mentira que todo mundo aceita sobre X', 'Eu discordo de X. Aqui está o porquê.'] },
    { category: 'Storytelling', suggestions: ['Isso aconteceu comigo e mudou tudo', 'Perdi X. Aprendi Y. Aqui está o Z.', 'A história que ninguém da minha área conta', 'Foi o meu pior dia. Mas ensinou X.'] },
  ]

  const formats = [
    { icon: '🎯', label: 'Tutorial rápido', desc: '30–60s · Alta retenção · Fácil de testar' },
    { icon: '💬', label: 'Ponto de vista', desc: '45–90s · Alto engajamento · Gera debate' },
    { icon: '📖', label: 'Micro história', desc: '60–120s · Alta emoção · Compartilhável' },
    { icon: '🔢', label: 'Lista numerada', desc: '30–60s · Alta clareza · Salvo facilmente' },
    { icon: '🤔', label: 'Pergunta polêmica', desc: '15–30s · Alto alcance · Gera comentários' },
    { icon: '📊', label: 'Dado surpresa', desc: '20–45s · Alta credibilidade · Viral' },
  ]

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white">Central de Ideias</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Sugestões de hooks, formatos e conteúdos de alta performance.</p>
      </div>

      {/* Formats */}
      <div className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5">
        <p className="text-white text-sm font-semibold mb-4">Formatos que performam</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {formats.map((f, i) => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4">
              <span className="text-2xl mb-2 block">{f.icon}</span>
              <p className="text-white text-sm font-semibold">{f.label}</p>
              <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hooks by category */}
      {hooks.map((section, i) => (
        <div key={i} className="bg-[#111113] border border-zinc-800/60 rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-3">{section.category}</p>
          <div className="space-y-2">
            {section.suggestions.map((s, j) => (
              <div key={j} className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-lg hover:border-violet-700/30 transition-colors group cursor-pointer">
                <span className="text-violet-500 text-xs shrink-0">→</span>
                <p className="text-zinc-300 text-sm flex-1">"{s}"</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Coming soon */}
      <div className="bg-gradient-to-br from-violet-950/30 to-zinc-900/20 border border-violet-800/20 rounded-xl p-5 text-center">
        <p className="text-violet-400 text-xs uppercase tracking-widest mb-2">Em breve</p>
        <p className="text-white font-semibold">Sugestões personalizadas com IA</p>
        <p className="text-zinc-500 text-sm mt-1">Baseadas no seu histórico de clipes e performance.</p>
      </div>
    </div>
  )
}
