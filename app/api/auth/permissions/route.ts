import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getUserRole } from '@/lib/admin/permissions-server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { isAdmin: false, isModerator: false, role: 'user' },
      { status: 401 }
    )
  }

  const role = await getUserRole(supabase, user.id)

  return NextResponse.json({
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
    role,
  })
}
