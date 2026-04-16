// api/create-student-account.js
// 학생 계정 생성 API (서비스 롤 키 사용 — 서버에서만 실행)
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password, name, classId, studentId } = req.body

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  // 서비스 롤 클라이언트 (RLS 우회, 서버에서만 사용)
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 요청자 토큰으로 관리자/교사 여부 확인
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: '유효하지 않은 세션입니다.' })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (!callerProfile || !['admin', 'teacher'].includes(callerProfile.role)) {
    return res.status(403).json({ error: '관리자 또는 교사만 계정을 생성할 수 있습니다.' })
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
    role:             'student',
    class_id:         classId   || null,
    student_id:       studentId || null,
    password_changed: false,
  })

  if (profileErr) {
    // 롤백: Auth 계정 삭제
    await admin.auth.admin.deleteUser(newUser.user.id)
    return res.status(400).json({ error: '프로필 생성 실패: ' + profileErr.message })
  }

  return res.status(200).json({ success: true })
}
