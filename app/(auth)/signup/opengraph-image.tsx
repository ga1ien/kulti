import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const runtime = 'edge'
export const alt = 'Join Kulti'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Short cache - regenerate every 5 minutes
export const revalidate = 300

export default async function Image({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams

  let inviterName = 'Someone'

  if (invite) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('invites')
        .select('creator:profiles!created_by(display_name)')
        .eq('code', invite)
        .single()

      // Type assertion: Supabase returns array for relationships, but we know it's single
      const creator = Array.isArray(data?.creator) ? data.creator[0] : data?.creator
      if (creator?.display_name) {
        inviterName = creator.display_name
      }
    } catch (error) {
      logger.error('Failed to fetch inviter name:', { error })
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(163, 230, 53, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
        }}
      >
        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Icon/Logo Area */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '30px',
              background: 'linear-gradient(135deg, #a3e635 0%, #22c55e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              boxShadow: '0 20px 60px rgba(163, 230, 53, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '72px',
                display: 'flex',
              }}
            >
              ✨
            </div>
          </div>

          {/* Main Headline */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              lineHeight: 1.2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex' }}>
              <span style={{ color: '#a3e635' }}>{inviterName}</span>
            </div>
            <div style={{ display: 'flex', marginTop: '10px' }}>
              wants you on Kulti!
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '42px',
              color: '#a1a1aa',
              marginBottom: '40px',
              fontStyle: 'italic',
              display: 'flex',
            }}
          >
            create the future, live
          </div>

          {/* Invite Code Badge (if available) */}
          {invite && (
            <div
              style={{
                background: 'rgba(163, 230, 53, 0.1)',
                border: '3px solid #a3e635',
                borderRadius: '16px',
                padding: '16px 40px',
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#a3e635',
                letterSpacing: '4px',
                display: 'flex',
              }}
            >
              {invite.toUpperCase()}
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '8px',
            background: 'linear-gradient(90deg, #a3e635 0%, #22c55e 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
