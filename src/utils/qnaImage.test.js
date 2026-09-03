// src/utils/qnaImage.test.js
import { describe, it, expect } from 'vitest'
import {
  MAX_QNA_IMAGES, fitWithin, validateQnaImage, qnaImagePath,
} from './qnaImage'

// 검증은 name·type·size만 본다. 실제 File을 만들면 테스트가 무거워진다.
const file = (name, type, size) => ({ name, type, size })
const photo = () => file('IMG_1234.jpg', 'image/jpeg', 3 * 1024 * 1024)

describe('fitWithin', () => {
  it('가로가 길면 가로를 한계에 맞추고 비율을 지킨다', () => {
    expect(fitWithin(3000, 2000, 1600)).toEqual({ width: 1600, height: 1067 })
  })

  it('세로가 길면 세로를 한계에 맞춘다', () => {
    expect(fitWithin(2000, 3000, 1600)).toEqual({ width: 1067, height: 1600 })
  })

  it('한계보다 작은 사진은 늘리지 않는다', () => {
    // 작은 사진을 억지로 키우면 용량만 커지고 화질은 그대로다
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('validateQnaImage', () => {
  it('이미지가 아니면 사유를 돌려준다', () => {
    expect(validateQnaImage(file('메모.pdf', 'application/pdf', 1000), 0))
      .toMatch(/사진만/)
  })

  it('이미 3장이면 더 받지 않는다', () => {
    expect(validateQnaImage(photo(), MAX_QNA_IMAGES)).toMatch(/3장/)
  })

  it('원본이 너무 크면 사유를 돌려준다', () => {
    expect(validateQnaImage(file('큰사진.jpg', 'image/jpeg', 30 * 1024 * 1024), 0))
      .toMatch(/큽니다/)
  })

  it('문제가 없으면 null을 돌려준다', () => {
    expect(validateQnaImage(photo(), 2)).toBeNull()
  })
})

describe('qnaImagePath', () => {
  it('학생별 폴더로 나눈다', () => {
    expect(qnaImagePath(7, 'abc123')).toBe('7/abc123.jpg')
  })

  it('원본 파일명을 쓰지 않고 확장자는 항상 jpg다', () => {
    // 파일명에 학생 이름이 들어 있는 경우가 흔하다. 올릴 때 실려 가면 안 된다.
    // 업로드 전에 JPEG로 다시 굽기 때문에 확장자도 jpg로 고정한다.
    const path = qnaImagePath(7, 'abc123')
    expect(path).not.toContain('IMG_1234')
    expect(path.endsWith('.jpg')).toBe(true)
  })
})
