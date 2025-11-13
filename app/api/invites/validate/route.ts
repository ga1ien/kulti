import { NextRequest, NextResponse } from 'next/server'
import { validateInviteCode } from '@/lib/invites/service'
import { withRateLimit, RateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  return withRateLimit(request, RateLimiters.inviteValidation(), async () => {
    try {
      const body = await request.json()
      const { code } = body

      if (!code) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 })
      }

      const result = await validateInviteCode(code)

      return NextResponse.json(result)
    } catch (error) {
      console.error('Validate invite error:', error)
      return NextResponse.json(
        { error: 'Failed to validate invite' },
        { status: 500 }
      )
    }
  })
}
