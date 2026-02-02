import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrReplaceShare, deleteShare, getShareForSession } from '@/lib/db/sharing'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const chatSessionId = request.nextUrl.searchParams.get('chatSessionId')
  if (!chatSessionId) return NextResponse.json({ error: 'Missing chatSessionId' }, { status: 400 })

  const share = await getShareForSession(chatSessionId)
  if (!share) return NextResponse.json(null)

  return NextResponse.json({ shareToken: share.shareToken, sharedAt: share.sharedAt.toISOString() })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatSessionId } = await request.json()
  if (!chatSessionId) return NextResponse.json({ error: 'Missing chatSessionId' }, { status: 400 })

  // Verify user has access to the session's workspace via RLS
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', chatSessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const share = await createOrReplaceShare(chatSessionId)
  return NextResponse.json({ shareToken: share.shareToken, sharedAt: share.sharedAt.toISOString() })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatSessionId } = await request.json()
  if (!chatSessionId) return NextResponse.json({ error: 'Missing chatSessionId' }, { status: 400 })

  // Verify user has access
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', chatSessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  await deleteShare(chatSessionId)
  return new NextResponse(null, { status: 204 })
}
