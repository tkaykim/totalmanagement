# 업무파악, 지시 AI

- **접근**: 사이드바 메뉴 "업무파악, 지시 AI" (tommy0621@naver.com 로그인 시에만 표시)
- **기능**: 오늘 업무 요약 보고 생성, 자연어 지시에 대한 AI 해석·제안

## API 키 설정 (Gemini)

1. [Google AI Studio](https://aistudio.google.com/) 접속 후 로그인
2. 왼쪽 메뉴에서 **Get API key** 또는 **API 키** 메뉴 선택
3. **Create API key**로 새 키 생성 (기존 프로젝트 선택 또는 새 프로젝트 생성)
4. 생성된 키를 복사한 뒤, 프로젝트 루트의 `.env.local`에 추가:

```env
GEMINI_API_KEY=여기에_복사한_키_붙여넣기
```

5. (선택) 404 등 모델 오류 시 `.env.local`에 사용할 모델 ID를 지정하세요. 기본값은 `gemini-2.0-flash`입니다.  
   Google AI 문서 기준 사용 가능한 모델 예: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`  
   (Gemini 1.5 계열은 단종되어 404가 날 수 있음.)

```env
GEMINI_MODEL=gemini-2.5-flash
```

6. 개발 서버 재시작 (`npm run dev`)

- API 키는 서버에서만 사용되며, 클라이언트에 노출되지 않습니다.
- 키가 없으면 "업무파악, 지시 AI" 메뉴에서 보고 생성/지시 보내기 시 503 안내가 표시됩니다.
