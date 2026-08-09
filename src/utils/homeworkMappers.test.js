import { describe, it, expect } from 'vitest'
import {
  toHomeworkSet, toHomeworkDay, toHomeworkQuestion, toHomeworkSubmission,
} from './homeworkMappers'

describe('homework 매퍼', () => {
  it('toHomeworkSet: snake→camel', () => {
    const row = { id: 1, category: 'naesin', target: 5, week_start: '2026-08-10',
      title: '8월 2주차', teacher_id: 'uid-t', created_at: '2026-08-09T00:00:00Z' }
    expect(toHomeworkSet(row)).toEqual({
      id: 1, category: 'naesin', target: 5, weekStart: '2026-08-10',
      title: '8월 2주차', teacherId: 'uid-t', createdAt: '2026-08-09T00:00:00Z',
    })
  })
  it('toHomeworkDay: null 해설은 빈 문자열로', () => {
    const row = { id: 3, set_id: 1, weekday: 1, date: '2026-08-10', question_count: 20,
      day_solution_video_url: null, day_solution_file_url: null }
    expect(toHomeworkDay(row)).toEqual({
      id: 3, setId: 1, weekday: 1, date: '2026-08-10', questionCount: 20,
      daySolutionVideoUrl: '', daySolutionFileUrl: '',
    })
  })
  it('toHomeworkQuestion: 문항 해설 매핑', () => {
    const row = { id: 9, day_id: 3, number: 1, answer: '③',
      solution_video_url: 'https://y', solution_file_url: '' }
    expect(toHomeworkQuestion(row)).toEqual({
      id: 9, dayId: 3, number: 1, answer: '③',
      solutionVideoUrl: 'https://y', solutionFileUrl: '',
    })
  })
  it('toHomeworkSubmission: answers 기본값 빈 배열', () => {
    const row = { id: 4, day_id: 3, student_id: 7, answers: null, submitted_at: '2026-08-10T09:00:00Z' }
    expect(toHomeworkSubmission(row)).toEqual({
      id: 4, dayId: 3, studentId: 7, answers: [], submittedAt: '2026-08-10T09:00:00Z',
    })
  })
})
