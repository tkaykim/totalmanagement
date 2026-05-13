-- Migration: Extend REACT video SOP template with business workflow + staff/P&L tasks
-- Created: 2026-04-26
-- Affects: task_templates id=3 ("촬영 의뢰건")
-- Adds 8 new tasks (quote, contract, deposit, external staff x2, pre-meeting, balance, P&L)
-- Extends options_schema with needs_external_staff, needs_pre_meeting
-- Idempotent: re-runs replace tasks/options_schema with the same canonical content

UPDATE public.task_templates
SET
  description = '외부 촬영 의뢰 프로젝트 수행에 필요한 표준 SOP. 견적/계약/입금 등 비즈니스 플로우 + 기획/촬영/편집/납품 + 정산/P&L 회고까지 전체 워크플로우 포함.',
  options_schema = jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array('client_name', 'shooting_type'),
    'properties', jsonb_build_object(
      'client_name', jsonb_build_object(
        'type', 'string',
        'title', '의뢰 클라이언트'
      ),
      'shooting_type', jsonb_build_object(
        'type', 'string',
        'title', '촬영 유형',
        'enum', jsonb_build_array('뮤직비디오', '퍼포먼스 영상', '프로필 촬영', '행사 촬영', '광고/CF', '다큐멘터리', '기타')
      ),
      'location', jsonb_build_object(
        'type', 'string',
        'title', '촬영 장소'
      ),
      'needs_rental', jsonb_build_object(
        'type', 'boolean',
        'title', '장비 렌탈 필요 여부'
      ),
      'needs_external_staff', jsonb_build_object(
        'type', 'boolean',
        'title', '외부 스태프 구인 필요'
      ),
      'needs_pre_meeting', jsonb_build_object(
        'type', 'boolean',
        'title', '스태프 사전 미팅 필요'
      )
    )
  ),
  tasks = '[
    {"title":"클라이언트 미팅 및 요구사항 확인","priority":"high","days_before":30,"assignee_role":"manager"},
    {"title":"견적서 작성 및 발송","priority":"high","days_before":29,"assignee_role":"manager","manual_id":28},
    {"title":"계약서 작성 및 발송","priority":"high","days_before":28,"assignee_role":"manager","manual_id":29},
    {"title":"계약금 입금 완료 확인","priority":"high","days_before":27,"assignee_role":"manager"},
    {"title":"촬영 일정 확정 및 캘린더 공유","priority":"high","days_before":25,"assignee_role":"manager"},
    {"title":"촬영 컨셉 기획안 작성","priority":"high","days_before":22,"assignee_role":"manager"},
    {"title":"촬영 장소 헌팅 및 답사","priority":"high","days_before":20,"assignee_role":"staff","manual_id":12},
    {"title":"촬영 장소 대관/섭외 확정","priority":"high","days_before":18,"assignee_role":"manager","manual_id":12},
    {"title":"촬영 스태프 구성 (감독, 촬영, 조명, 오디오)","priority":"high","days_before":15,"assignee_role":"manager"},
    {"title":"[외부 스태프 구인 시] 스태프 구인 공고 / 섭외","priority":"medium","days_before":15,"assignee_role":"manager","condition_key":"needs_external_staff"},
    {"title":"[외부 스태프 구인 시] 스태프별 개별 계약서 작성·발송","priority":"high","days_before":13,"assignee_role":"manager","manual_id":29,"condition_key":"needs_external_staff"},
    {"title":"보유 장비 점검 (카메라, 렌즈, 조명, 짐벌 등)","priority":"high","days_before":12,"assignee_role":"staff","manual_id":11},
    {"title":"[렌탈필요시] 렌탈 장비 목록 작성","priority":"medium","days_before":10,"assignee_role":"staff","manual_id":11,"condition_key":"needs_rental"},
    {"title":"[렌탈필요시] 장비 렌탈 예약 및 수령 일정 확인","priority":"medium","days_before":8,"assignee_role":"staff","manual_id":11,"condition_key":"needs_rental"},
    {"title":"메모리카드/배터리 등 소모품 점검","priority":"medium","days_before":7,"assignee_role":"staff"},
    {"title":"촬영 콘티/샷리스트 작성","priority":"high","days_before":7,"assignee_role":"manager"},
    {"title":"출연자/모델 최종 컨펌 및 안내","priority":"high","days_before":5,"assignee_role":"manager"},
    {"title":"스타일링/의상/소품 준비 (해당 시)","priority":"medium","days_before":5,"assignee_role":"staff"},
    {"title":"촬영 타임테이블 확정 및 스태프 공유","priority":"high","days_before":3,"assignee_role":"manager"},
    {"title":"[필요 시] 스태프 사전 미팅","priority":"medium","days_before":2,"assignee_role":"manager","condition_key":"needs_pre_meeting"},
    {"title":"장비 최종 테스트 및 세팅 준비","priority":"high","days_before":1,"assignee_role":"staff","manual_id":11},
    {"title":"촬영 진행","priority":"high","days_before":0,"assignee_role":"manager"},
    {"title":"[렌탈필요시] 렌탈 장비 반납","priority":"medium","days_before":-1,"assignee_role":"staff","manual_id":11,"condition_key":"needs_rental"},
    {"title":"촬영 원본 데이터 백업 및 정리","priority":"high","days_before":-1,"assignee_role":"staff","manual_id":13},
    {"title":"편집 작업 착수","priority":"high","days_before":-3,"assignee_role":"staff"},
    {"title":"1차 편집본 클라이언트 전달 및 피드백 수렴","priority":"high","days_before":-7,"assignee_role":"manager"},
    {"title":"수정 편집 및 최종본 완성","priority":"high","days_before":-10,"assignee_role":"staff"},
    {"title":"잔금 입금 완료 확인","priority":"high","days_before":-10,"assignee_role":"manager"},
    {"title":"최종 납품 (파일 전달/업로드)","priority":"high","days_before":-14,"assignee_role":"manager"},
    {"title":"정산 처리 및 세금계산서 발행","priority":"medium","days_before":-14,"assignee_role":"manager","manual_id":14},
    {"title":"종료 후 P&L 보고 및 자체 피드백 작성 (매출/지출/순이익/좋았던 점/개선점)","priority":"high","days_before":-14,"assignee_role":"manager"}
  ]'::jsonb,
  updated_at = now()
WHERE id = 3
  AND bu_code = 'REACT';
