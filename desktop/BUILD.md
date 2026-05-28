# Desktop 빌드 / 배포 가이드

macOS 외부 배포용 `.dmg` 만들기. 서명 + Apple 노타리제이션 포함.

## 사전 준비 (한 번만)

1. **Developer ID Application 인증서가 키체인에 설치되어 있어야 함.**
   ```
   Developer ID Application: On The Market Co., Ltd. (722CL38AM4)
   ```
   확인: 키체인 접근 → "내 인증서" 에 위 항목이 보이고, ▶ 펼쳤을 때
   개인 키가 같이 있어야 정상.

2. **App-specific password** (appleid.apple.com → 로그인 및 보안 → 앱 암호).
   노타리제이션 업로드 인증용. 16자리 형식 (`abcd-efgh-ijkl-mnop`).

3. **`desktop/.env.build` 파일 생성** (이 파일은 `.gitignore` 에 잡혀있음, 절대 커밋 X):
   ```bash
   export APPLE_ID="tkd99200622@gmail.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="722CL38AM4"
   ```

## 빌드

```bash
# 환경변수 로드 + 빌드
source desktop/.env.build
npm -w desktop run dist

# 산출물 위치
ls desktop/release/
# → Claude-Ad-Terminal-0.1.0-mac-x64.dmg
# → Claude-Ad-Terminal-0.1.0-mac-x64.dmg.blockmap
# → latest-mac.yml  (자동 업데이트용, 지금은 안 씀)
```

첫 빌드는 노타리제이션 큐 때문에 **5–15분** 걸립니다. Apple 서버에 업로드 →
검사 → ticket 회신 → DMG 에 stapling 까지가 한 사이클.

## 빌드 결과 검증

```bash
# 서명 정상 여부
codesign --verify --deep --strict --verbose=2 \
  desktop/release/mac/Claude\ Ad\ Terminal.app

# 노타리제이션 stapling 확인 (DMG 와 .app 둘 다)
spctl --assess --type execute --verbose \
  desktop/release/mac/Claude\ Ad\ Terminal.app
# → accepted, source=Notarized Developer ID  ← 이거 떠야 정상
```

## GitHub Release 업로드 (수동)

```bash
gh release create v0.1.0 \
  desktop/release/Claude-Ad-Terminal-*.dmg \
  --title "v0.1.0" \
  --notes "첫 공개 빌드"

# 이후 안정 URL:
# https://github.com/<owner>/<repo>/releases/latest/download/Claude-Ad-Terminal-<ver>-mac-x64.dmg
```

(파일명에 버전이 박혀 있어서 매 릴리즈마다 마케팅 페이지의 다운로드 링크도
업데이트해야 함. 버전 무관 안정 URL 이 필요해지면 artifactName 을
`${productName}-mac.${ext}` 같은 고정 패턴으로 바꾸면 됨.)

## 자주 막히는 곳

- **`Error: No identity found`** : 키체인에 인증서가 없거나 이름이 미세하게 다름.
  `security find-identity -v -p codesigning` 로 정확한 이름 확인.
- **`HTTP 401` (notarization)** : APPLE_APP_SPECIFIC_PASSWORD 가 틀렸거나
  계정 비번을 잘못 넣음. 일반 비번은 안 됨 — app-specific 만.
- **`Invalid Team ID`** : APPLE_TEAM_ID 가 인증서의 괄호 안 값과 달라야 함.
  같아야 함. (오타.)
- **노타리제이션이 reject** : Apple 회신 로그에 entitlement / 미서명 바이너리가
  찍힘. `xcrun notarytool log <submission-id>` 로 확인.

## Apple Silicon (arm64) 도 함께 뿌리려면

`electron-builder.yml` 의 `mac.target.arch` 에 `arm64` 추가. 그 전에
node-pty 의 arm64 prebuilt 가 받아져 있는지 확인:
```bash
ls desktop/node_modules/node-pty/build/Release/
# pty.node 파일이 arm64 / x64 둘 다 있거나, prebuilds/ 폴더에 분리 보관.
```
없으면 `npm rebuild node-pty --arch=arm64` 후 재빌드.
