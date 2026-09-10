// api/reset-student-password.js
// 학생 비밀번호를 초기 비밀번호로 되돌린다 (관리자 전용, 서비스 롤 키 사용).
//
// 비밀번호를 잊은 학생을 도우려면 지금까지는 계정을 지우고 다시 만드는 수밖에
// 없었다. 그러면 아이디가 바뀌고, 그 계정에 딸린 제출·질문 기록이 끊긴다.
// 여기서는 계정은 그대로 두고 비밀번호만 바꾼다.
//
// 새 비밀번호를 요청자가 정하게 하지 않는다. 정해진 초기값으로만 되돌리고
// password_changed를 false로 내려, 학생이 다음 로그인 때 반드시 새 비밀번호를
// 정하게 한다(ProtectedRoute가 /change-password로 보낸다).
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_STUDENT_PASSWORD } from '../src/constants/account.js'
import { resetRefusal } from '../src/utils/passwordReset.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body ?? {}
  if (!userId) return res.status(400).json({ error: 'userId가 필요합니다.' })

  const supabaseUrl    = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버 환경변수가 설정되지 않았습니다.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 요청자 확인 — 관리자만
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: '유효하지 않은 세션입니다.' })

  const [callerRes, targetRes] = await Promise.all([
    admin.from('profiles').select('role').eq('id', caller.id).single(),
    admin.from('profiles').select('role, name').eq('id', userId).single(),
  ])
  const target = targetRes.data

  // 누가 누구 것을 되돌릴 수 있는지는 utils/passwordReset에서 판단한다
  const refusal = resetRefusal(callerRes.data, target)
  if (refusal) {
    return res.status(refusal.startsWith('관리자만') ? 403 : 400).json({ error: refusal })
  }

  const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
    password: DEFAULT_STUDENT_PASSWORD,
  })
  if (pwErr) {
    return res.status(400).json({ error: '비밀번호 변경 실패: ' + pwErr.message })
  }

  // 표시를 못 내려도 비밀번호는 이미 바뀌었다. 되돌리지 않고 알리기만 한다 —
  // 학생은 로그인할 수 있고, 다만 새 비밀번호를 정하라는 안내를 안 받는다.
  const { error: flagErr } = await admin
    .from('profiles').update({ password_changed: false }).eq('id', userId)
  if (flagErr) {
    console.error('password_changed 내리기 실패:', userId, flagErr)
  }

  return res.status(200).json({
    success: true,
    name: target.name,
    password: DEFAULT_STUDENT_PASSWORD,
    mustChange: !flagErr,
  })
}
