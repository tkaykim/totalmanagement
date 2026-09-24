import { redirect } from 'next/navigation';

/**
 * 아티스트 포털은 R27로 누구에게나 막는다. 메인으로 돌려보낸다.
 * 포털 화면 코드와 테이블은 남긴다.
 */
export default function ArtistPage() {
  redirect('/');
}
