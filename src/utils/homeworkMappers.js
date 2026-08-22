// Supabase(snake_case) 행 → 앱(camelCase) 객체 변환.

export function toHomeworkSet(r) {
  return {
    id: r.id, category: r.category, target: r.target ?? null,
    // 내신은 반, 정시는 target(레벨)로 대상을 정한다.
    // 반별 전환 이전의 내신 세트는 classId가 비어 있고 target에 학년이 들어 있다.
    classId: r.class_id ?? null,
    weekStart: r.week_start, title: r.title,
    teacherId: r.teacher_id, createdAt: r.created_at,
  }
}

export function toHomeworkDay(r) {
  return {
    id: r.id, setId: r.set_id, weekday: r.weekday, date: r.date,
    questionCount: r.question_count,
    daySolutionVideoUrl: r.day_solution_video_url ?? '',
    daySolutionFileUrl: r.day_solution_file_url ?? '',
  }
}

export function toHomeworkQuestion(r) {
  return {
    id: r.id, dayId: r.day_id, number: r.number, answer: r.answer,
    solutionVideoUrl: r.solution_video_url ?? '',
    solutionFileUrl: r.solution_file_url ?? '',
  }
}

export function toHomeworkSubmission(r) {
  return {
    id: r.id, dayId: r.day_id, studentId: r.student_id,
    answers: r.answers ?? [], submittedAt: r.submitted_at,
  }
}
