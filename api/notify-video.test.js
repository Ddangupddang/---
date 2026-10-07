// api/notify-video.test.js
import { describe, it, expect } from 'vitest'
import { videoNotifyTargets, videoNotification } from './notify-video.js'

const CLASSES = [{ id: 10, teacher_id: 't1' }, { id: 20, teacher_id: null }]
const ADMINS = [{ id: 'a1' }, { id: 'a2' }]

describe('videoNotifyTargets', () => {
  it('학생 반 담당 교사와 관리자 전원', () => {
    expect(videoNotifyTargets({ id: 1, class_id: 10 }, CLASSES, ADMINS)).toEqual(['t1', 'a1', 'a2'])
  })
  it('담당 교사가 관리자를 겸하면 한 번만', () => {
    expect(videoNotifyTargets({ id: 1, class_id: 10 }, [{ id: 10, teacher_id: 'a1' }], ADMINS)).toEqual(['a1', 'a2'])
  })
  it('반이 없거나 담당 교사가 없어도 관리자에게는 간다', () => {
    expect(videoNotifyTargets({ id: 1, class_id: null }, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
    expect(videoNotifyTargets({ id: 1, class_id: 20 }, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
    expect(videoNotifyTargets(undefined, CLASSES, ADMINS)).toEqual(['a1', 'a2'])
  })
})

describe('videoNotification', () => {
  it('시작 · 완료 문구 — 진행률 같은 세부는 넣지 않는다', () => {
    expect(videoNotification('start', { name: '김하은' }, { title: '현대시 개념 정리 1강' }))
      .toEqual({ title: '영상 시청 시작', body: '김하은 · 현대시 개념 정리 1강' })
    expect(videoNotification('complete', { name: '김하은' }, { title: '현대시 개념 정리 1강' }))
      .toEqual({ title: '영상 시청 완료', body: '김하은 · 현대시 개념 정리 1강' })
  })
  it('이름·제목을 못 찾아도 알림은 간다', () => {
    expect(videoNotification('start', undefined, undefined)).toEqual({ title: '영상 시청 시작', body: '학생 · 영상' })
  })
})
