// api/delete-student-account.js
// 학생 로그인 계정 삭제 API (관리자 전용, 서비스 롤 키 사용)
//
// 학생을 명부에서 지워도 계정이 남으면 유령 계정이 된다. 그 계정으로 로그인하면
// 화면은 열리는데 질문 등록 같은 동작이 외래키 오류로 실패한다. 실제로 겪은 일이다.
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId가 필요합니다.' })
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
    .from('profiles').select('role').eq('id', caller.id).single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 계정을 삭제할 수 있습니다.' })
  }

  // 이 엔드포인트로 교사·관리자 계정을 지우지 못하게 막는다.
  // 교직원은 delete-staff-account가 따로 처리한다(본인 계정 보호 등 규칙이 다르다).
  const { data: targetProfile } = await admin
    .from('profiles').select('role').eq('id', userId).single()

  if (!targetProfile || targetProfile.role !== 'student') {
    return res.status(400).json({ error: '학생 계정만 삭제할 수 있습니다.' })
  }

  await admin.from('profiles').delete().eq('id', userId)
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)

  if (deleteErr) {
    return res.status(400).json({ error: '계정 삭제 실패: ' + deleteErr.message })
  }

  return res.status(200).json({ success: true })
}
