// PROMPT_INJECTION CTA 는 광고주가 만든 텍스트를 시청자의 터미널에 prefill 한다.
// docs/abusing.md 가 요구하는 다단계 방어(등록 시 정규식 1차 필터, LLM 2차
// 분류, 주입 직전 사용자 확인 모달, 감사 로그)가 갖춰지기 전까지 기본 OFF.
// 켜려면 env 에 ENABLE_PROMPT_INJECTION_CTA=true 를 명시한다.
export function promptInjectionEnabled(): boolean {
  return process.env.ENABLE_PROMPT_INJECTION_CTA === "true";
}

// 광고 생성 폼에서 PROMPT_INJECTION 옵션을 노출할지 여부. 클라이언트 번들에
// 인라인돼야 하므로 NEXT_PUBLIC_ 접두사를 쓴다. 서버 게이트와 별개 값이므로
// .env 의 ENABLE_PROMPT_INJECTION_CTA 와 같은 값으로 유지할 것.
export const PROMPT_INJECTION_UI_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PROMPT_INJECTION_CTA === "true";
