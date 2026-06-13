/**
 * PostgREST의 .or() ilike 항목 문법을 깨뜨리는 문자를 공백으로 치환한다.
 * 콤마/괄호/콜론/마침표는 or() 파서를 깨고, *와 %, _는 의도치 않은 와일드카드가 된다.
 */
export function sanitizeSearch(q: string): string {
  return q
    .replace(/[,()*:.%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
