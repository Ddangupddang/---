// src/utils/homework.test.js
import { describe, it, expect } from 'vitest'
import { gradeHomework, isLateSubmission, solutionFileName } from './homework'

describe('gradeHomework', () => {
  const questions = [
    { number: 1, answer: '③' },
    { number: 2, answer: '①' },
    { number: 3, answer: '⑤' },
  ]

  it('정답/오답을 문항별로 판정하고 정답 개수를 센다', () => {
    const answers = [
      { number: 1, answer: '③' }, // 정답
      { number: 2, answer: '④' }, // 오답
      { number: 3, answer: '⑤' }, // 정답
    ]
    const result = gradeHomework(questions, answers)
    expect(result.total).toBe(3)
    expect(result.correctCount).toBe(2)
    expect(result.results).toEqual([
      { number: 1, correct: true,  studentAnswer: '③' },
      { number: 2, correct: false, studentAnswer: '④' },
      { number: 3, correct: true,  studentAnswer: '⑤' },
    ])
  })

  it('답을 안 낸 문항은 studentAnswer=null, 오답 처리', () => {
    const answers = [{ number: 1, answer: '③' }]
    const result = gradeHomework(questions, answers)
    expect(result.correctCount).toBe(1)
    expect(result.results[1]).toEqual({ number: 2, correct: false, studentAnswer: null })
  })

  it('다중 정답은 전부 맞아야 정답이다', () => {
    const questions = [{ number: 1, answer: '①③' }]
    // 순서가 달라도 같은 집합이면 정답
    expect(gradeHomework(questions, [{ number: 1, answer: '③①' }]).correctCount).toBe(1)
    // 덜 고름
    expect(gradeHomework(questions, [{ number: 1, answer: '①' }]).correctCount).toBe(0)
    // 더 고름
    expect(gradeHomework(questions, [{ number: 1, answer: '①②③' }]).correctCount).toBe(0)
  })

  it('답을 아예 안 낸 문항은 정답이 아니다', () => {
    const questions = [{ number: 1, answer: '①③' }]
    expect(gradeHomework(questions, []).correctCount).toBe(0)
  })
})

describe('isLateSubmission', () => {
  it('제출일이 마감일보다 늦으면 true', () => {
    expect(isLateSubmission('2026-05-20T09:00:00.000Z', '2026-05-15')).toBe(true)
  })
  it('제출일이 마감일과 같거나 빠르면 false', () => {
    expect(isLateSubmission('2026-05-15T23:59:00.000Z', '2026-05-15')).toBe(false)
    expect(isLateSubmission('2026-05-10T09:00:00.000Z', '2026-05-15')).toBe(false)
  })
  it('값이 없으면 false', () => {
    expect(isLateSubmission(null, '2026-05-15')).toBe(false)
    expect(isLateSubmission('2026-05-20T09:00:00.000Z', null)).toBe(false)
  })
})

describe('solutionFileName', () => {
  it('업로드 타임스탬프를 떼고 원래 파일명만 남긴다', () => {
    expect(solutionFileName(
      'https://x.supabase.co/storage/v1/object/public/homework-solutions/naesin-5-2026-08-10/1723000000000_8월2주차해설.pdf'
    )).toBe('8월2주차해설.pdf')
  })
  it('URL 인코딩된 한글 파일명을 읽을 수 있게 되돌린다', () => {
    expect(solutionFileName(
      'https://x.supabase.co/storage/v1/object/public/homework-solutions/a/1723000000000_%ED%95%B4%EC%84%A4.pdf'
    )).toBe('해설.pdf')
  })
  it('값이 없으면 빈 문자열', () => {
    expect(solutionFileName('')).toBe('')
    expect(solutionFileName(null)).toBe('')
  })
})
