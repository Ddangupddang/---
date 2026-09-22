// src/hooks/useViewMode.js
// 한 페이지 안에서 화면을 갈아끼울 때, 그 상태를 주소에 남긴다.
//
// 왜 필요한가:
//   과제 화면에서 "제출 현황"으로 들어간 뒤 뒤로가기를 누르면 과제 목록이
//   아니라 그 전에 있던 페이지(Q&A 등)로 튕겼다. 화면을 useState로만 바꾸면
//   브라우저 입장에서는 아무 일도 일어나지 않은 것이라, 되돌릴 기록이 없다.
//
//   주소에 남기면 뒤로가기가 화면 단위로 동작하고, 새로고침해도 보던 화면이
//   유지된다. 홈 화면 앱(PWA)에는 주소창이 없어 앱 안의 새로고침 버튼을
//   쓰는데, 지금은 그걸 누를 때마다 목록으로 튕긴다.
//
// 쓰는 법:
//   const { mode, id, go } = useViewMode('list')
//   go('status')            → /homework?view=status
//   go('detail', 100)       → /qna?view=detail&id=100
//   go('list')              → /qna        (기본값은 주소에서 지운다)
import { useSearchParams } from 'react-router-dom'

export function useViewMode(defaultMode = 'list') {
  const [params, setParams] = useSearchParams()

  const mode = params.get('view') ?? defaultMode
  // 숫자로 바꿔 둔다 — 화면들은 id를 숫자로 견준다(q.id === selectedId).
  // 숫자가 아닌 값이 들어오면 없는 것으로 친다.
  const raw = params.get('id')
  const id = raw !== null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null

  // replace: 뒤로가기 기록을 남기지 않고 바꾼다.
  // 저장을 마치고 목록으로 돌아갈 때처럼, 되돌아갈 이유가 없는 이동에 쓴다 —
  // 기록을 남기면 뒤로가기가 방금 저장한 작성 화면을 다시 연다.
  function go(nextMode, nextId = null, { replace = false } = {}) {
    const next = new URLSearchParams(params)
    // 기본 화면은 주소를 더럽히지 않는다. /homework?view=list 보다 /homework 가 낫다.
    if (nextMode === defaultMode) next.delete('view')
    else next.set('view', nextMode)

    if (nextId === null || nextId === undefined) next.delete('id')
    else next.set('id', String(nextId))

    setParams(next, { replace })
  }

  return { mode, id, go }
}
