// Supabase(snake_case) 행 → 앱(camelCase) 객체 변환.

export function toHomeworkSet(r) {
  return {
    id: r.id, category: r.category, target: r.target,
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
