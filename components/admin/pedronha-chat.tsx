'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Copy, Check, RotateCcw } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Escreve um gancho pra um cliente de academia que saiu de 2k pra 18k seguidores',
  'Faz um DM de prospecção pra coach que posta todo dia mas não converte',
  'Monta um script de reels sobre como aumentar seguidores sem pagar tráfego',
  'Cria um e-mail de follow-up pra prospect que não respondeu a proposta',
]

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-white/[0.07] text-zinc-100 rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-7 h-7 rounded-full bg-[#111] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#0f0f10] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        <button
          onClick={copy}
          className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-[#111] border border-white/[0.08] flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="bg-[#0f0f10] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

export default function PedronchaChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, loading])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setStreaming('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/pedronha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Erro na resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setStreaming(full)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreaming('')
    } catch {
      setLoading(false)
      setStreaming('')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tenta de novo.' }])
    }
  }

  function reset() {
    setMessages([])
    setStreaming('')
    setInput('')
  }

  const showEmpty = messages.length === 0 && !loading && !streaming

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#111] border border-white/[0.08] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Pedronha</h1>
            <p className="text-zinc-600 text-xs mt-0.5">Copywriter interno da UPFY Mídia</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <p className="text-zinc-400 text-sm font-medium">O que você quer escrever hoje?</p>
              <p className="text-zinc-700 text-xs mt-1">Legendas, scripts, pitches, cases, DMs — manda ver.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-zinc-500 hover:text-zinc-300 bg-[#0f0f10] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-xl px-4 py-3 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}

        {streaming && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#111] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="flex-1 bg-[#0f0f10] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {streaming}
              <span className="inline-block w-0.5 h-4 bg-zinc-500 ml-0.5 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-[#0f0f10] border border-white/[0.08] rounded-2xl p-3 flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => { setInput(e.target.value); autoResize() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Manda o que você quer escrever..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 resize-none outline-none leading-relaxed"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-zinc-300" />
        </button>
      </div>
      <p className="text-center text-[10px] text-zinc-800 mt-2">Enter para enviar · Shift+Enter para quebrar linha</p>
    </div>
  )
}
