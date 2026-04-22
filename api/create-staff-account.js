// api/create-staff-account.js
// 교사/관리자 계정 생성 API (관리자 전용, 서비스 롤 키 사용)
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password, name, role } = req.body

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' })
  }

  if (!['teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: '유효하지 않은 역할입니다.' })
  }

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 요청자 토큰 확인 — 관리자만 사용 가능
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: '유효하지 않은 세션입니다.' })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 교사/관리자 계정을 생성할 수 있습니다.' })
  }

  // 아이디 중복 확인
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) {
    return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' })
  }

  // Auth 계정 생성
  const email = `${username}@soomoonjae.com`
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr) {
    const msg = createErr.message.includes('already registered')
      ? '이미 존재하는 이메일 계정입니다.'
      : createErr.message
    return res.status(400).json({ error: msg })
  }

  // profiles 행 생성 (password_changed = false → 첫 로그인 시 변경 유도)
  const { error: profileErr } = await admin.from('profiles').insert({
    id:               newUser.user.id,
    username,
    name,
    role,
    password_changed: false,
  })

  if (profileErr) {
    // 롤백: Auth 계정 삭제
    await admin.auth.admin.deleteUser(newUser.user.id)
    return res.status(400).json({ error: '프로필 생성 실패: ' + profileErr.message })
  }

  return res.status(200).json({ success: true })
}
