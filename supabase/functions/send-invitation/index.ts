import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const fromEmail = Deno.env.get('INVITATION_FROM_EMAIL')
const appUrl = Deno.env.get('APP_URL')

const allowedOrigin = appUrl ? new URL(appUrl).origin : ''
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (origin && origin !== allowedOrigin) {
    return jsonResponse(403, { error: 'Origin not allowed.' })
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }
  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !fromEmail || !appUrl) {
    return jsonResponse(500, { error: 'Invitation service is not configured.' })
  }

  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) {
    return jsonResponse(401, { error: 'Sign in as an administrator to continue.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return jsonResponse(401, { error: 'Your session is invalid or expired.' })
  }

  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse(400, { error: 'A valid email address is required.' })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { error: 'Enter a valid email address.' })
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invitationData, error: invitationError } = await supabase.rpc(
    'admin_create_invitation',
    { p_email: email, p_expires_at: expiresAt },
  )
  const invitation = Array.isArray(invitationData) ? invitationData[0] : invitationData

  if (invitationError || !invitation?.invitation_id || !invitation?.invitation_token) {
    return jsonResponse(403, {
      error: 'Invitation creation is unavailable. Confirm your administrator access.',
    })
  }

  const inviteUrl = new URL('/register', appUrl)
  inviteUrl.hash = new URLSearchParams({
    invitation: invitation.invitation_token,
  }).toString()

  let emailSent = false
  try {
    const mailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'You are invited to Pondo',
        html: `<p>You have been invited to create a Pondo account.</p><p><a href="${escapeHtml(inviteUrl.toString())}">Accept your invitation</a></p><p>This link expires in 7 days and can only be accepted by signing up with this email address.</p>`,
      }),
    })
    emailSent = mailResponse.ok
  } catch {
    emailSent = false
  }

  if (!emailSent) {
    const { error: revokeError } = await supabase.rpc('admin_revoke_invitation', {
      p_invitation_id: invitation.invitation_id,
    })
    return jsonResponse(502, {
      error: revokeError
        ? 'Email delivery failed and the pending invitation may need administrator review.'
        : 'Email delivery failed. The pending invitation was revoked; try again later.',
    })
  }

  return jsonResponse(200, {
    invitationId: invitation.invitation_id,
    expiresAt,
  })
})
