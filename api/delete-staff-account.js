// api/delete-staff-account.js
// 교사/관리자 계정 삭제 API (관리자 전용, 서비스 롤 키 사용)
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
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 계정을 삭제할 수 있습니다.' })
  }

  // 자기 자신 삭제 방지
  if (caller.id === userId) {
    return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다.' })
  }

  // 삭제 대상이 admin/teacher인지 확인
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!targetProfile || !['admin', 'teacher'].includes(targetProfile.role)) {
    return res.status(400).json({ error: '교사/관리자 계정만 삭제할 수 있습니다.' })
  }

  // profiles 삭제 후 Auth 계정 삭제
  await admin.from('profiles').delete().eq('id', userId)
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)

  if (deleteErr) {
    return res.status(400).json({ error: '계정 삭제 실패: ' + deleteErr.message })
  }

  return res.status(200).json({ success: true })
}
