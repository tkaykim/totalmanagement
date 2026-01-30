'use client';

/**
 * Root layout 에러 시 대체 UI. Next.js 빌드 시 500.html 생성에 필요.
 * 반드시 자체 <html>, <body>를 가져야 함.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>문제가 발생했습니다</h2>
          <p>일시적인 오류일 수 있습니다. 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
