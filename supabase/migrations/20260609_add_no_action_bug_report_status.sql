-- 버그리포트 '처리 불필요' 상태 신설 (버그리포트 #12 분류용)
-- 처리할 필요가 없는(이미 다른 방식으로 충족되었거나 대응 불요) 리포트를 분류하기 위한 상태.
-- 알림은 'resolved'일 때만 발송되므로 no_action 전환 시 신고자 알림은 나가지 않음.
ALTER TYPE bug_report_status ADD VALUE IF NOT EXISTS 'no_action';
