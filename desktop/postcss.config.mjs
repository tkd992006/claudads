// 데스크탑 렌더러는 Tailwind 를 쓰지 않는다(인라인 스타일 + xterm.css 뿐).
// 이 빈 설정이 없으면 Vite 의 PostCSS 탐색이 상위 디렉터리의 설정을 주워
// "Tailwind content option is missing" 경고를 띄운다. 명시적으로 비워 침묵.
export default {};
