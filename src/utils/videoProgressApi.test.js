// src/utils/videoProgressApi.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const range = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => ({ in: () => ({ order: () => ({ range: (...a) => range(...a) }) }) }) }),
  },
}))

import { toProgress, saveVideoProgress, fetchProgressForVideos } from './videoProgressApi'

const DB = { id: 7, video_id: 3, student_id: 11, duration_sec: 100, last_position_sec: 44,
  watched_buckets: [0, 1], watched_sec: 10, started_at: 's', completed_at: null, updated_at: 'u' }

beforeEach(() => { rpc.mockReset(); range.mockReset() })

describe('videoProgressApi', () => {
  it('DB 행을 화면 모양으로 바꾼다 (칸 목록은 화면에 필요 없다)', () => {
    expect(toProgress(DB)).toEqual({ id: 7, videoId: 3, studentId: 11, durationSec: 100,
      lastPositionSec: 44, watchedSec: 10, startedAt: 's', completedAt: null })
  })

  it('저장은 RPC 로만 — 학생 번호를 보내지 않는다', async () => {
    rpc.mockResolvedValue({ data: DB, error: null })
    await saveVideoProgress(3, { durationSec: 100, positionSec: 44, buckets: [0, 1] })
    expect(rpc).toHaveBeenCalledWith('save_video_progress',
      { p_video_id: 3, p_duration_sec: 100, p_position_sec: 44, p_buckets: [0, 1] })
  })

  it('저장 실패는 던진다 — 추적기가 칸을 다시 보내게', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } })
    await expect(saveVideoProgress(3, { durationSec: 1, positionSec: 0, buckets: [] })).rejects.toBeTruthy()
  })

  it('영상이 없으면 묻지 않는다', async () => {
    expect(await fetchProgressForVideos([])).toEqual([])
    expect(range).not.toHaveBeenCalled()
  })

  it('여러 영상의 기록을 받아 화면 모양으로', async () => {
    range.mockResolvedValue({ data: [DB], error: null })
    expect(await fetchProgressForVideos([3])).toEqual([toProgress(DB)])
  })
})
