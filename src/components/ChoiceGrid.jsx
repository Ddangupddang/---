// src/components/ChoiceGrid.jsx
// ①②③④⑤ 객관식 선택 격자 — 과제/테스트 공용 재사용 컴포넌트
// mode='input'  : 입력 가능 (클릭 + 키보드 1~5, 화살표 이동)
// mode='result' : 읽기 전용, answerKey와 비교해 정답/오답 표시
import { useState } from 'react'

export const CHOICES = ['①', '②', '③', '④', '⑤']

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

  // 한 선지 버튼의 색상 클래스 결정
  function cellClass(number, choice) {
    const picked = values[number] === choice
    if (mode === 'result') {
      const correctChoice = answerKey[number]
      if (choice === correctChoice && picked) return 'bg-green-500 text-white'        // 맞게 고름
      if (choice === correctChoice) return 'border-2 border-green-500 text-green-600' // 실제 정답 표시
      if (picked) return 'bg-[#C0392B] text-white'                                   // 틀리게 고름
      return 'bg-gray-100 text-gray-400'
    }
    return picked ? 'bg-[#2B2B2B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }

  return (
    <div
      data-testid="choice-grid"
      tabIndex={mode === 'input' ? 0 : -1}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 focus:outline-none"
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
