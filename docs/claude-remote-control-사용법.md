# Claude Remote Control 사용법

로컬에서 돌아가는 Claude Code 세션을 휴대폰, 태블릿, 다른 브라우저에서 이어서 제어하는 기능입니다.

## 요구 사항

| 항목 | 내용 |
|------|------|
| **구독** | **Max 플랜** 필요 (Pro 예정, API 키 불가) |
| **인증** | `claude` 실행 후 `/login`으로 claude.ai 로그인 |
| **작업 공간 신뢰** | 프로젝트 디렉터리에서 최소 한 번 `claude` 실행 후 신뢰 대화 수락 |

## 세션 시작 방법

### 1) 새 Remote Control 세션으로 시작

프로젝트 루트에서:

```bash
claude remote-control
```

- 터미널에 **세션 URL**이 출력됩니다.
- **스페이스바**로 QR 코드 표시/숨기기.
- 옵션:
  - `--verbose`: 연결/세션 로그 자세히 출력
  - `--sandbox` / `--no-sandbox`: 파일·네트워크 격리 (기본: `--no-sandbox`)

### 2) 이미 켜져 있는 Claude Code 세션에서 전환

세션 안에서:

```
/remote-control
```
또는
```
/rc
```

- 현재 대화가 그대로 이어지고, 세션 URL·QR이 표시됩니다.
- 세션 이름을 바꾸려면 먼저 `/rename 세션이름` 실행 후 `/remote-control` 하면 다른 기기에서 찾기 쉽습니다.

## 다른 기기에서 접속

1. **claude.ai/code 또는 Claude 앱**  
   세션 목록에서 해당 세션 선택 (온라인 세션은 녹색 점 + 컴퓨터 아이콘).
2. **QR 코드**  
   터미널에 나온 QR을 Claude 앱으로 스캔.
3. **세션 URL**  
   터미널에 출력된 URL을 브라우저에서 열기.

## 동작 방식 요약

- 세션은 **내 PC에서만** 실행되고, 코드·파일은 로컬에 유지됩니다.
- 휴대폰/태블릿/다른 브라우저는 그 로컬 세션을 **원격으로 보는 창** 역할만 합니다.
- 트래픽은 TLS로 Anthropic API를 통해만 오가며, **인바운드 포트를 열지 않습니다**.

## 제한 사항

- 터미널을 닫거나 `claude` 프로세스를 종료하면 세션 종료.
- 네트워크가 약 10분 이상 끊기면 세션 타임아웃 후 프로세스 종료 → 다시 `claude remote-control` 실행 필요.
- 한 Claude Code 인스턴스당 **원격 세션 1개**만 지원.

## 모든 세션에 자동 활성화 (선택)

Claude Code 안에서 `/config` 실행 후  
**Enable Remote Control for all sessions** 를 `true`로 설정하면, 새 세션마다 Remote Control이 자동으로 켜집니다.

---

참고: [공식 문서 (한국어)](https://code.claude.com/docs/ko/remote-control), [CLI 참조](https://code.claude.com/docs/en/cli-reference)
