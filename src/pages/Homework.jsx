// src/pages/Homework.jsx
// 과제 — 상단 내신/정시 탭. 학생: 제출/결과, 교사: 목록/출제/현황.
import { useState } from 'react'
import { useViewMode } from '../hooks/useViewMode'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Layout from '../components/Layout'
import StudentHomeworkView from '../components/homework/StudentHomeworkView'
import TeacherHomeworkCreate from '../components/homework/TeacherHomeworkCreate'
import TeacherHomeworkStatus from '../components/homework/TeacherHomeworkStatus'
import PendingHomeworkList from '../components/homework/PendingHomeworkList'
import HomeworkReport from '../components/homework/HomeworkReport'
import PageTitle from '../components/ui/PageTitle'
import PushToggle from '../components/PushToggle'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { HW_CATEGORY, CATEGORY_LABELS } from '../constants/homework'
import { visibleClasses } from '../utils/classAccess'
import { setTargetLabel } from '../utils/homeworkGroup'
import { visibleSets } from '../utils/homeworkList'
import { groupBy } from '../utils/groupList'
import CollapsibleSection from '../components/ui/CollapsibleSection'
import Pagination from '../components/ui/Pagination'
import { pageCount, pageSlice } from '../utils/paginate'

export default function Homework() {
  const { user } = useAuth()
  const { homeworkSets, deleteHomeworkSet, classes = [] } = useData()
  // 내신 과제는 반 단위라 담당 반 것만 다룬다 (정시는 레벨 단위라 학원 공용)
  const myClasses = visibleClasses(classes, user)
  const isStaff = user.role === 'teacher' || user.role === 'admin'

  const [category, setCategory] = useState(HW_CATEGORY.NAESIN)
  // 화면 상태를 주소에 남긴다 — 뒤로가기가 화면 단위로 동작하고, 새로고침해도
  // 보던 화면이 유지된다. 대시보드의 "과제 미제출"도 ?view=pending 으로 들어온다.
  const { mode, id: editSetId, go } = useViewMode('list') // list | form | status | report | pending
  // 수정할 세트는 주소에 담는다(?view=form&id=12). 화면 상태로만 들고 있으면
  // 새로고침했을 때 "수정"이 조용히 "새로 출제"로 바뀌어, 교사가 같은 과제를
  // 하나 더 만들게 된다. id가 없으면 새로 출제다.
  const editSet = homeworkSets.find((s) => s.id === editSetId) ?? null
  // 복제할 원본. 문항·정답·해설을 그대로 가져와 다른 반에 새로 내는 데 쓴다.
  const [copySet, setCopySet] = useState(null)
  // 같은 주에 이미 과제가 있어 기존 세트로 옮겨 갈 때, 그때까지 입력하던 요일.
  // 이게 없으면 교사가 15문항 정답을 다시 찍어야 한다.
  const [pendingDays, setPendingDays] = useState(null)

  // 목록으로 돌아갈 때는 기록을 남기지 않는다(replace).
  // 남기면 방금 저장하고 나온 작성 화면을 뒤로가기가 다시 연다.
  function openList() {
    setCopySet(null); setPendingDays(null)
    go('list', null, { replace: true })
  }

  function openPending() {
    setCopySet(null); setPendingDays(null)
    go('pending')
  }

  return (
    <Layout>
      <div className="flex justify-between items-center gap-3 mb-4">
        <PageTitle title="과제" />
        {isStaff && mode === 'list' && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="ghost" onClick={openPending}>미제출</Button>
            <Button variant="ghost" onClick={() => go('report')}>리포트</Button>
            <Button variant="ghost" onClick={() => go('status')}>제출 현황</Button>
            <Button variant="primary" onClick={() => { setCopySet(null); setPendingDays(null); go('form') }}>+ 주간 과제</Button>
          </div>
        )}
      </div>

      {/* 내신/정시 탭 — 미제출 보기는 두 종류를 한 목록으로 보여주므로 탭을 감춘다.
          탭이 보이는 채로 두면 눌러도 목록이 안 바뀌어 고장처럼 보인다. */}
      <div className={`flex gap-2 mb-6 ${mode === 'pending' ? 'hidden' : ''}`}>
        {Object.values(HW_CATEGORY).map((c) => (
          <button key={c} onClick={() => { setCategory(c); openList() }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              category === c ? 'bg-navy text-white' : 'bg-surface-alt text-ink-soft'
            }`}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>

      {/* 알림 스위치 — 학생은 새 과제를, 교사는 학생 제출을 받는다.
          구독은 기기 하나당 하나라 Q&A 화면의 스위치와 같은 스위치다. */}
      {mode === 'list' && <PushToggle label="과제 알림" />}

      {/* 학생 */}
      {!isStaff && <StudentHomeworkView category={category} />}

      {/* 교사 */}
      {isStaff && mode === 'form' && (
        <TeacherHomeworkCreate
          key={editSet?.id ?? (copySet ? `copy-${copySet.id}` : 'new')}
          category={category} editSet={editSet} copySet={copySet}
          pendingDays={pendingDays}
          // 같은 주에 이미 과제가 있을 때, 입력하던 요일을 그 과제로 옮겨 붙인다
          onContinueInto={(set, days) => { setCopySet(null); setPendingDays(days); go('form', set.id, { replace: true }) }}
          onDone={openList}
        />
      )}
      {isStaff && mode === 'status' && (
        <>
          <button onClick={openList} className="text-sm text-ink-mute mb-4">← 목록</button>
          <TeacherHomeworkStatus category={category} />
        </>
      )}
      {isStaff && mode === 'pending' && (
        <>
          <button onClick={openList} className="text-sm text-ink-mute mb-4">← 목록</button>
          <PendingHomeworkList />
        </>
      )}
      {isStaff && mode === 'report' && (
        <>
          <button onClick={openList} className="text-sm text-ink-mute mb-4">← 목록</button>
          <HomeworkReport category={category} />
        </>
      )}
      {isStaff && mode === 'list' && (
        <TeacherSetList
          // 탭을 바꾸면 주차 수가 달라진다. 새로 만들어 쪽 번호를 1로 되돌린다 —
          // 3쪽에 있다가 넘어가면 있지도 않은 쪽을 보게 된다.
          key={category}
          category={category} sets={homeworkSets} classes={myClasses}
          onEdit={(s) => { setCopySet(null); setPendingDays(null); go('form', s.id) }}
          onCopy={(s) => { setPendingDays(null); setCopySet(s); go('form') }}
          onDelete={deleteHomeworkSet}
          userRole={user.role} userId={user.id}
        />
      )}
    </Layout>
  )
}

// 교사 목록: 이 종류의 세트들 (주차 최신순) + 수정/삭제
// 한 쪽에 보여줄 주차 수. 10주면 두 달 반이라 한 학기의 절반쯤 된다.
const WEEKS_PER_PAGE = 10

function TeacherSetList({ category, sets, classes = [], onEdit, onCopy, onDelete, userRole, userId }) {
  const [page, setPage] = useState(1)

  // 무엇이 어떤 순서로 보이는지는 utils/homeworkList에 모아뒀다
  const mine = visibleSets(sets, category, classes, userRole)
  if (mine.length === 0) return <p className="text-center text-ink-faint py-12">등록된 {CATEGORY_LABELS[category]}가 없습니다.</p>

  // 주차별로 묶고 가장 최근 주차만 펼쳐 둔다.
  // 교사는 "이번 주 과제"로 생각하지 전체 목록을 훑지 않는다.
  const weeks = groupBy(mine, (s) => s.weekStart)
  const totalPages = pageCount(weeks.length, WEEKS_PER_PAGE)
  const shown = pageSlice(weeks, page, WEEKS_PER_PAGE)

  return (
    <div>
      {shown.map((week, wi) => (
        <CollapsibleSection
          key={week.key}
          title={`${week.key} 주`}
          meta={`${week.items.length}개`}
          defaultOpen={page === 1 && wi === 0}
        >
          <div className="flex flex-col gap-3">
      {week.items.map((s) => {
        // 수정과 삭제 권한은 같다 — 관리자이거나 직접 출제한 교사
        const canManage = userRole === 'admin' || s.teacherId === userId
        return (
          <Card key={s.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-ink">{s.title}</p>
              <p className="text-xs text-ink-faint mt-1">{s.weekStart} 주 · {setTargetLabel(s, classes)}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* 복제는 원본을 건드리지 않는다 — 다른 선생님이 낸 과제도 내 반에 가져올 수 있다 */}
              <button onClick={() => onCopy(s)}
                className="text-xs text-ink-mute hover:text-navy">복제</button>
              {canManage && (
                <>
                  <button onClick={() => onEdit(s)}
                    className="text-xs text-ink-mute hover:text-navy">수정</button>
                  <button onClick={() => { if (confirm(`"${s.title}" 세트를 삭제하시겠습니까?`)) onDelete(s.id) }}
                    className="text-xs text-ink-faint hover:text-danger">삭제</button>
                </>
              )}
            </div>
          </Card>
        )
      })}
          </div>
        </CollapsibleSection>
      ))}

      <Pagination page={page} total={totalPages} onChange={setPage} />
    </div>
  )
}
