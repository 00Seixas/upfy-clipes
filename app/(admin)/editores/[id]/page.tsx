import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Detalhe do Editor' }

interface Props {
  params: { id: string }
}

export default function EditorDetailPage({ params }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Editor</h1>
      <p className="text-muted-foreground">ID: {params.id}</p>
      <p className="text-muted-foreground mt-2">Histórico de jobs e performance do editor.</p>
    </div>
  )
}
