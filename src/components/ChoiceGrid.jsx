// src/components/ChoiceGrid.jsx
// ①②③④⑤ 객관식 선택 격자 — 과제/테스트 공용 재사용 컴포넌트
// mode='input'  : 입력 가능 (클릭/숫자키 1~5로 토글, Enter·화살표로 이동)
// mode='check'  : 제출 전 확인 — 틀린 문항만 알려주고 계속 고칠 수 있다.
//                 정답은 받지도 보여주지도 않는다(answerKey를 쓰지 않는다).
// mode='result' : 읽기 전용, answerKey와 비교해 정답/오답 표시
//
// 문항 번호는 numbers로 받는다. 주지 않으면 1..count로 센다.
// 예전에는 count만 받아 항상 1번부터 셌는데, 부르는 쪽은 실제 문항 번호로
// 답을 찾았다. 번호가 1..N이 아닌 순간 학생이 고른 답이 엉뚱한 번호에 붙거나
// 통째로 사라졌다 — 화면에는 아무 표시도 없이.
import { useState } from 'react'
import { toggleChoice } from '../utils/answerSet'

const CHOICES = ['①', '②', '③', '④', '⑤']

export default function ChoiceGrid({
  count, numbers: numbersProp, values = {}, onChange,
  mode = 'input', answerKey = {}, wrong = [],
}) {
  const numbers = numbersProp ?? Array.from({ length: count ?? 0 }, (_, i) => i + 1)
  // check 모드에서도 답을 고쳐야 한다 — 고칠 수 없으면 확인할 이유가 없다
  const editable = mode === 'input' || mode === 'check'
  const wrongSet = new Set(wrong)
  // 키보드 입력 중인 칸 (문항 번호)
  const [focused, setFocused] = useState(() => numbers[0] ?? 1)

  // 번호가 띄엄띄엄해도 옆 칸으로 옮겨야 하므로 번호가 아니라 자리로 센다
  function move(delta) {
    setFocused((n) => {
      const at = numbers.indexOf(n)
      const next = Math.max(0, Math.min(numbers.length - 1, (at < 0 ? 0 : at) + delta))
      return numbers[next] ?? n
    })
  }

  function handleKeyDown(e) {
    if (!editable) return
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault()
      // 다중선택을 키보드로 넣을 수 있어야 해서 자동 이동을 하지 않는다.
      // 다음 문항으로는 Enter나 화살표로 옮긴다.
      onChange(focused, toggleChoice(values[focused], CHOICES[Number(e.key) - 1]))
    } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      move(-1)
    }
  }

  // result 모드에서 이 선지의 의미를 판정한다. 색상 결정과 테스트용 data 속성이
  // 같은 판정을 따로 두면 어긋날 수 있어 판정 로직을 한 곳(cellResult)에만 둔다.
  //   correct : 정답을 골랐다
  //   wrong   : 오답을 골랐다
  //   answer  : 고르지 않았지만 실제 정답이다
  //   none    : 그 밖(input 모드 포함)
  function cellResult(number, choice) {
    if (mode !== 'result') return 'none'
    // 값에 그 선지가 들어 있는지로 본다 — 다중 정답이면 여러 글자가 담긴다
    const picked = Boolean(values[number]?.includes(choice))
    const isAnswer = Boolean(answerKey[number]?.includes(choice))
    if (isAnswer && picked) return 'correct'
    if (isAnswer) return 'answer'
    if (picked) return 'wrong'
    return 'none'
  }

  // 한 선지 버튼의 색상 클래스 결정
  function cellClass(number, choice) {
    if (mode === 'result') {
      switch (cellResult(number, choice)) {
        case 'correct': return 'bg-navy text-white'               // 맞게 고름
        case 'answer':  return 'border-2 border-navy text-navy'   // 실제 정답 표시
        case 'wrong':   return 'bg-danger text-white'              // 틀리게 고름
        // 옅은 회색 배경 위라 ink-faint는 2.94:1로 읽히지 않는다 → 한 단계 진하게
        default:        return 'bg-surface-alt text-ink-mute'
      }
    }
    const picked = Boolean(values[number]?.includes(choice))
    return picked ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
  }

  // 열 수는 창 너비(sm:/lg:)가 아니라 실제 들어갈 공간에 맞춘다.
  // 한 칸에 최소 208px(번호 28 + 선지 5×28 + 여백)이 필요하고,
  // 공간이 모자라면 자동으로 1열이 된다 → 좁은 학생 화면에서 칸이 겹치지 않는다.
  return (
    <div
      data-testid="choice-grid"
      tabIndex={editable ? 0 : -1}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] gap-1.5 focus:outline-none"
    >
      {numbers.map((number) => {
        const isFocused = editable && number === focused
        const isWrong = mode === 'check' && wrongSet.has(number)
        return (
          <div
            key={number}
            data-testid={`cell-${number}`}
            data-wrong={String(isWrong)}
            onClick={() => editable && setFocused(number)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded ${
              isWrong ? 'ring-2 ring-danger bg-danger-soft' : isFocused ? 'ring-2 ring-navy bg-navy-soft' : ''
            }`}
          >
            <span className="text-xs font-semibold text-ink-mute w-7 shrink-0">{number}번</span>
            <div className="flex gap-1">
              {CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  data-testid={`cell-${number}-${choice}`}
                  data-selected={Boolean(values[number]?.includes(choice))}
                  data-result={cellResult(number, choice)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!editable) return
                    setFocused(number)
                    onChange(number, toggleChoice(values[number], choice))
                  }}
                  className={`w-7 h-7 rounded-full text-sm font-medium transition-colors ${cellClass(number, choice)}`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
