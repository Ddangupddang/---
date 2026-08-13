// src/components/ChoiceGrid.jsx
// ①②③④⑤ 객관식 선택 격자 — 과제/테스트 공용 재사용 컴포넌트
// mode='input'  : 입력 가능 (클릭 + 키보드 1~5, 화살표 이동)
// mode='result' : 읽기 전용, answerKey와 비교해 정답/오답 표시
import { useState } from 'react'

const CHOICES = ['①', '②', '③', '④', '⑤']

export default function ChoiceGrid({ count, values = {}, onChange, mode = 'input', answerKey = {} }) {
  // 키보드 입력 중인 칸 (1-based 문항 번호)
  const [focused, setFocused] = useState(1)
  const numbers = Array.from({ length: count }, (_, i) => i + 1)

  function handleKeyDown(e) {
    if (mode !== 'input') return
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault()
      onChange(focused, CHOICES[Number(e.key) - 1])
      setFocused((n) => Math.min(count, n + 1)) // 자동으로 다음 칸
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      setFocused((n) => Math.min(count, n + 1))
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocused((n) => Math.max(1, n - 1))
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
    const picked = values[number] === choice
    const isAnswer = answerKey[number] === choice
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
        default:        return 'bg-surface-alt text-ink-faint'
      }
    }
    const picked = values[number] === choice
    return picked ? 'bg-ink text-white' : 'bg-surface-alt text-ink-soft hover:bg-line-soft'
  }

  // 열 수는 창 너비(sm:/lg:)가 아니라 실제 들어갈 공간에 맞춘다.
  // 한 칸에 최소 208px(번호 28 + 선지 5×28 + 여백)이 필요하고,
  // 공간이 모자라면 자동으로 1열이 된다 → 좁은 학생 화면에서 칸이 겹치지 않는다.
  return (
    <div
      data-testid="choice-grid"
      tabIndex={mode === 'input' ? 0 : -1}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] gap-1.5 focus:outline-none"
    >
      {numbers.map((number) => {
        const isFocused = mode === 'input' && number === focused
        return (
          <div
            key={number}
            data-testid={`cell-${number}`}
            onClick={() => mode === 'input' && setFocused(number)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
              isFocused ? 'ring-2 ring-[#5B8FD4] bg-[#5B8FD4]/5' : ''
            }`}
          >
            <span className="text-xs font-semibold text-gray-500 w-7 shrink-0">{number}번</span>
            <div className="flex gap-1">
              {CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  data-testid={`cell-${number}-${choice}`}
                  data-selected={values[number] === choice}
                  data-result={cellResult(number, choice)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (mode !== 'input') return
                    setFocused(number)
                    onChange(number, choice)
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
