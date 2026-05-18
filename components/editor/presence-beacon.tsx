'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PresenceBeacon({ userId, userName }: { userId: string; userName: string }) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('editor-presence', {
      config: { presence: { key: userId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, userName, onlineAt: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [userId, userName])
  return null
}
