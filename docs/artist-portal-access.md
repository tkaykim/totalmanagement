# 아티스트 페이지(/artist) 접근 권한

## 누가 접속할 수 있는지

`/artist` 페이지는 **두 가지 경우**에만 접속할 수 있습니다.

### 1. 아티스트 역할 사용자

- **조건**: `app_users` 테이블에서 해당 사용자의 **role**이 `'artist'`인 경우
- **구분**: 로그인한 사용자가 **아티스트(artist)** 로 등록되어 있으면 아티스트 전용 페이지 접근 가능
- **데이터**: `app_users.role = 'artist'` 이고, 동일 사용자에 `partner_id`가 있으면 해당 파트너(전속 아티스트) 기준으로 프로젝트·정산·프로필 조회

### 2. HEAD 본부 관리자

- **조건**: **role**이 `'leader'` 또는 `'admin'` 이면서 **bu_code**가 `'HEAD'`인 경우
- **구분**: HEAD 사업부 소속 리더/관리자가 아티스트 포털을 **대신 보거나 점검**할 때 사용
- **동작**: 같은 대시보드 UI를 보며, 본인 계정 기준 데이터(본인이 PM/참여자/할당된 프로젝트 등)가 노출됨

## 판단 위치

- **코드**: `src/lib/permissions.ts` 의 `canAccessArtistPage(user)`
- **페이지**: `src/app/artist/page.tsx` 에서 로그인 후 `app_users` 조회 → `canAccessArtistPage({ id, role, bu_code })` 호출 → `true`일 때만 대시보드 렌더, 아니면 "접근 불가" 메시지

```ts
// permissions.ts (요약)
export function canAccessArtistPage(user: AppUser): boolean {
  if (user.role === 'artist') return true;
  if ((user.role === 'leader' || user.role === 'admin') && user.bu_code === 'HEAD') {
    return true;
  }
  return false;
}
```

## 정리

| 구분         | 역할(role) | 사업부(bu_code) | /artist 접속 |
|--------------|------------|------------------|---------------|
| 아티스트     | artist     | (무관)           | 가능          |
| HEAD 리더    | leader     | HEAD             | 가능          |
| HEAD 관리자 | admin      | HEAD             | 가능          |
| 그 외        | 기타       | 기타             | 불가          |

즉, **아티스트는 `app_users.role = 'artist'` 로 구별**되며, 이 값이 있으면 로그인 후 `/artist` 접속이 허용됩니다.
