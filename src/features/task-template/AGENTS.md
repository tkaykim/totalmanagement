# src/features/task-template — 할일 템플릿(SOP 묶음)

## 맡는 것
- 사업부별 할일 템플릿 목록·상세·작성(`TaskTemplateView`, `TaskTemplateDetailModal`, `TaskTemplateFormModal`)
- 프로젝트에 템플릿을 적용해 할일을 한 번에 만드는 선택기(`TaskTemplateSelector`)
- 서버 쪽: `src/app/api/task-templates`, `task-templates/[id]`, `task-templates/generate`

## 맡지 않는 것
- 매뉴얼 본문(SOP 문서). `manuals` 기능이 맡는다. 템플릿의 각 할일은 `manual_id`로 매뉴얼을 가리키기만 한다.
- 만들어진 할일의 이후 수정. 할일 기능이 맡는다.

## 지켜야 할 것
- **기한 계산**
  - 템플릿의 각 할일은 `days_before`(기준일로부터 며칠 전)를 가진다. 기한 = 기준일 − `days_before`일이다.
  - 0은 당일, 음수는 기준일 이후다.
  - 이 계산은 화면(`TaskTemplateSelector`)에서 한다. 서버 `generate`는 화면이 보낸 `due_date`를 그대로 넣는다. 계산 규칙을 바꾸면 화면만 고치면 되지만, 서버는 검증하지 않는다는 점을 기억한다.
- **생성 권한**
  - `generate`는 재직 가드 뒤 대상 프로젝트를 볼 수 있어야 하고(아니면 404), `canCreateTask` 판정을 통과해야 한다(admin, 자기 사업부 프로젝트의 leader, PM·참여자인 manager·member). 리더는 다른 사업부 프로젝트에 만들 수 없다(403).
  - 할일은 배치 INSERT 한 번으로 만들고, 활동 기록도 배치로 남긴다. 건별 INSERT 반복으로 되돌리지 않는다(느려서 바꾼 것이다).
  - 생성된 할일의 `bu_code`는 대상 프로젝트 사업부다.
- **템플릿 관리 권한**
  - 조회는 전원이 전 사업부 템플릿을 본다.
  - 생성·수정·삭제는 admin 전체, leader·manager는 자기 사업부 템플릿만 한다.
- **사업부 확인**: 사업부가 없는 사용자는 템플릿을 만들 수 없다(400).

## 테스트할 것
- 기준일 9/30, `days_before` 3·0·−2 → 기한 9/27·9/30·10/2.
- 권한 없는 사용자의 `generate` → 403, 할일 0건 생성.
- 템플릿 20개 할일 적용이 한 번의 요청으로 끝나는지.
