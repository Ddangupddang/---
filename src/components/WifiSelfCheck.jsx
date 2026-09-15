// src/components/WifiSelfCheck.jsx
// 교사용: 지금 이 기기가 바깥으로 어떤 주소로 나가는지 보여준다.
//
// 출석 체크는 학생의 공인 IP가 등록된 학원 IP와 "정확히 같은지"로 판정한다.
// 그래서 학원 회선이 바뀌거나 출구가 여럿이면 조용히 전원 또는 일부가 실패한다.
// 그때 필요한 것은 "지금 학원 주소가 뭔지"인데, 그걸 알 방법이 없었다.
// 이 칸이 그 숫자를 보여준다 — 등록이 필요하면 그대로 읽어서 넘기면 된다.
import { useState } from 'react'
import { checkAcademyWifi } from '../utils/checkWifi'

export default function WifiSelfCheck() {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setResult(await checkAcademyWifi())
    setBusy(false)
  }

  return (
    <div className="border border-line rounded p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-soft">WiFi 주소 확인</p>
          <p className="text-xs text-ink-mute mt-0.5">
            지금 이 기기가 학원 WiFi로 보이는지 확인합니다.
          </p>
        </div>
        <button type="button" onClick={run} disabled={busy}
          className="shrink-0 text-xs border border-line rounded px-3 py-2 hover:bg-surface-alt disabled:opacity-50">
          {busy ? '확인 중...' : '확인'}
        </button>
      </div>

      {result && (
        <div className="mt-2 pt-2 border-t border-line-soft">
          <p className={`text-sm font-medium ${result.ok ? 'text-navy' : 'text-danger'}`}>
            {result.ok ? '학원 WiFi로 인식됩니다' : '학원 WiFi로 인식되지 않습니다'}
          </p>
          <p className="text-xs text-ink-faint mt-1">이 기기가 보이는 주소</p>
          <p className="font-mono text-xs text-ink break-all">{result.clientIp ?? '(확인 실패)'}</p>
          <p className="text-xs text-ink-mute mt-1">
            등록된 학원 주소 {result.registered ?? '?'}개
            {!result.ok && ' · 학원 안에서 이 주소가 나오면 등록이 필요합니다'}
          </p>
        </div>
      )}
    </div>
  )
}
