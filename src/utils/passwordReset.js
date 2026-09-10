// src/utils/passwordReset.js
// 비밀번호 초기화를 허용할지 판단한다.
//
// 이 기능에서 유일하게 위험한 부분이라 순수 함수로 빼서 테스트한다.
// 통과시키면 남의 계정 비밀번호를 바꿀 수 있게 되는 판단이다.

// 막아야 할 이유를 돌려준다. 통과면 null.
export function resetRefusal(callerProfile, targetProfile) {
  // 관리자만 — 계정 삭제와 같은 기준이다(화면에서도 관리자에게만 보인다)
  if (!callerProfile || callerProfile.role !== 'admin') {
    return '관리자만 비밀번호를 되돌릴 수 있습니다.'
  }
  // 이 통로로 교사·관리자 비밀번호를 바꾸지 못하게 막는다.
  // 막지 않으면 관리자 계정 하나가 다른 관리자를 잠글 수 있다.
  if (!targetProfile || targetProfile.role !== 'student') {
    return '학생 계정만 되돌릴 수 있습니다.'
  }
  return null
}
