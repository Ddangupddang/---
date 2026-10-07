// src/utils/videoProgressApi.js
// 영상 시청 기록을 DB와 주고받는다.
// 전역 데이터(DataContext)에 넣지 않고 영상 화면이 필요할 때만 부른다 —
// 앱을 열 때마다 모든 표를 다 읽는 문제를 더 키우지 않기 위해서다.
import { supabase } from '../lib/supabase'
import { fetchAllRows } from './fetchAll'

export function toProgress(r) {
  return {
    id:              r.id,
    videoId:         r.video_id,
    studentId:       r.student_id,
    durationSec:     r.duration_sec ?? 0,
    lastPositionSec: r.last_position_sec ?? 0,
    watchedSec:      r.watched_sec ?? 0,
    startedAt:       r.started_at ?? null,
    completedAt:     r.completed_at ?? null,
  }
}

// 학생 번호는 보내지 않는다 — DB가 로그인 정보로 찾는다 (남의 이름으로 저장할 수 없게)
export async function saveVideoProgress(videoId, { durationSec, positionSec, buckets }) {
  const { data, error } = await supabase.rpc('save_video_progress', {
    p_video_id: videoId,
    p_duration_sec: durationSec,
    p_position_sec: positionSec,
    p_buckets: buckets,
  })
  if (error) throw error
  return toProgress(data)
}

// 학생은 행 수준 보안 때문에 자기 기록만, 교사·관리자는 전부 받는다.
// 52명 × 영상 20개면 1,000행을 넘는다 — 나눠 받는다 (조용히 잘리던 사고, 2026-09-09)
export async function fetchProgressForVideos(videoIds) {
  if (!videoIds.length) return []
  const { data, error } = await fetchAllRows(() =>
    supabase.from('video_progress').select('*').in('video_id', videoIds).order('id'))
  if (error) throw error
  return (data ?? []).map(toProgress)
}
