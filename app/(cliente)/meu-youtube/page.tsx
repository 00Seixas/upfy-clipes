import MeuYouTubeClient from '@/components/cliente/meu-youtube-client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MeuYouTubePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_channel_id, youtube_channel_handle, youtube_channel_title')
    .eq('id', user?.id ?? '')
    .single()

  const savedChannel = profile?.youtube_channel_id
    ? {
        id:     profile.youtube_channel_id as string,
        handle: profile.youtube_channel_handle as string ?? '',
        title:  profile.youtube_channel_title as string ?? '',
      }
    : null

  return <MeuYouTubeClient savedChannel={savedChannel} />
}
