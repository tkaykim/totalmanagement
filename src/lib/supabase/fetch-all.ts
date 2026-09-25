/**
 * PostgREST 1,000행 절단 없이 끝까지 읽는 공통 도우미.
 *
 * PostgREST는 `range` 없이 조회하면 1,000행에서 조용히 자른다(docs/engineering-notes.md).
 * 목록·합계·권한 판정용 전체 조회는 이 함수 하나로 페이지를 넘겨 읽는다.
 */

/** PostgREST 한 번 조회 상한 */
export const PAGE_SIZE = 1000;

type RangeQuery = PromiseLike<{ data: unknown; error: unknown }>;

/**
 * 1,000행 절단 없이 끝까지 읽는다.
 * @param build 매 페이지마다 새 쿼리를 만들어 `.range(from, to)`를 붙여 돌려준다(정렬은 호출자가 고정).
 */
export async function fetchAllRows<T>(build: (from: number, to: number) => RangeQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (Array.isArray(data) ? data : []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}
