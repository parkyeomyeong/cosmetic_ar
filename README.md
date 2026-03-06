# WebAR 화장품 립 컬러 미리보기 — 개발 문서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 목적 | 설치 없는 Web 브라우저에서 실시간 립 컬러 가상 착용 |
| 접근 | QR 코드 또는 URL 직접 접속 (모바일/PC 공통) |
| 1순위 기능 | 입술 영역 실시간 컬러 오버레이 (Lipstick) |
| 2순위 기능 | 피부 분석 기반 제품 추천 (미구현, 확장 예정) |
| 핵심 원칙 | 무료/오픈소스, 저지연 실시간 렌더링, 설치 불필요 |

---

## 2. 기술 스택

| 분류 | 라이브러리/도구 | 버전 | 선택 이유 |
|------|----------------|------|-----------|
| 번들러 | Vite | 7.x | HMR 속도, ES Module 네이티브 지원 |
| UI 프레임워크 | React | 19.x | 컴포넌트 상태 관리 |
| 스타일링 | Tailwind CSS | 4.x | 빠른 프로토타이핑, 유틸리티 클래스 |
| 얼굴 인식 | @mediapipe/tasks-vision | 0.10.x | 무료, WASM 기반, GPU 가속, 478점 랜드마크 |
| 렌더링 | HTML5 Canvas 2D | (브라우저 내장) | 실시간 비디오 + 오버레이 합성 |
| 배포 | Vercel | - | HTTPS 자동 제공 (카메라 API 필수 조건) |

> **Tailwind v4 주의**: `tailwind.config.js` 파일 없음. `@tailwindcss/vite` 플러그인 방식으로 동작.
> CSS에서 `@import "tailwindcss";` 한 줄로 활성화.

---

## 3. 프로젝트 구조

```
cosmetic-ar/
├── index.html                  # 앱 진입점 (viewport 핀치줌 방지 설정)
├── vite.config.js              # Vite + Tailwind 플러그인 설정
├── package.json
└── src/
    ├── main.jsx                # React 루트 마운트
    ├── App.jsx                 # 전역 상태 관리 + 레이아웃
    ├── index.css               # Tailwind import + 전역 reset
    │
    ├── components/
    │   ├── CameraAR.jsx        # 카메라 스트림 + Canvas 렌더 루프
    │   ├── ProductPanel.jsx    # 색상 스와치 + 강도/블렌딩 UI
    │   └── LoadingOverlay.jsx  # 모델 로딩 / 에러 화면
    │
    ├── hooks/
    │   └── useFaceLandmarker.js  # MediaPipe 초기화 + 감지 루프 커스텀 훅
    │
    ├── utils/
    │   ├── lipLandmarks.js     # 입술 랜드마크 인덱스 상수 정의
    │   └── drawLip.js          # Canvas 드로잉 유틸 (색상 오버레이)
    │
    └── data/
        └── products.js         # 립 컬러 상품 데이터 (12종)
```

---

## 4. 데이터 흐름 (Architecture)

```
[브라우저 카메라]
       │
       ▼
<video> (hidden, srcObject = MediaStream)
       │
       ├──── useFaceLandmarker 감지 루프 ────▶ landmarksRef (478점 좌표 배열)
       │                                              │
       ▼                                              ▼
<canvas> ◀──── CameraAR 렌더 루프 ────▶ drawLipColor(ctx, landmarks, color, ...)
       │
       ▼
CSS scaleX(-1) → 셀카 미러 효과
       │
       ▼
[사용자 화면]
```

**상태 흐름:**
```
App.jsx (selectedProduct, opacity, blendMode)
    │
    ├──▶ CameraAR.jsx  (color, opacity, blendMode props)
    │         └──▶ useFaceLandmarker (status 콜백 → App으로 전달)
    │
    └──▶ ProductPanel.jsx (선택 이벤트 → App 상태 업데이트)
```

---

## 5. 핵심 구현 설명

### 5-1. MediaPipe 초기화 (`useFaceLandmarker.js`)

WASM 런타임과 모델 파일을 **CDN에서 직접 로드**하는 방식을 선택.
로컬 `public/` 폴더에 넣는 방식 대비 빌드 설정이 단순하고 번들 크기에 영향 없음.

```js
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/...';
```

초기화 순서:
1. `FilesetResolver.forVisionTasks(WASM_CDN)` → WASM 런타임 로드
2. `FaceLandmarker.createFromOptions(...)` → float16 모델 로드 (약 5~15MB)
3. `getUserMedia({ facingMode: 'user' })` → 전면 카메라 스트림 획득
4. `video.play()` 후 감지 루프(`requestAnimationFrame`) 시작

**감지 루프 최적화**: `video.currentTime`이 바뀐 경우에만 `detectForVideo()` 호출 → 동일 프레임 중복 처리 방지.

```js
if (video.currentTime !== lastVideoTimeRef.current) {
  lastVideoTimeRef.current = video.currentTime;
  const result = landmarker.detectForVideo(video, performance.now());
  landmarksRef.current = result.faceLandmarks[0] ?? null;
}
```

컴포넌트 언마운트 시 카메라 트랙 stop + FaceLandmarker.close() 로 리소스 정리.

---

### 5-2. 입술 랜드마크 인덱스 (`lipLandmarks.js`)

MediaPipe FaceLandmarker는 **478개 포인트**를 반환. 이 중 입술 영역은 두 개의 폐곡선으로 구성:

| 컨투어 | 역할 | 포인트 수 |
|--------|------|-----------|
| `OUTER_LIP` | 입술 전체 외곽 (상순 + 하순) | 20점 |
| `INNER_LIP` | 입술 안쪽 경계 (입 벌림 영역) | 20점 |

```
  61──185──40──39──37──0──267──269──270──409──291   ← 외곽 상순
  |                                            |
 146──91──181──84──17──314──405──321──375      |   ← 외곽 하순
  └────────────────────────────────────────────┘
        ↑ OUTER_LIP (전체 입술 채울 영역)

  78──191──80──81──82──13──312──311──310──415──308  ← 내측 상순
  |                                              |
  95──88──178──87──14──317──402──318──324        |  ← 내측 하순
  └──────────────────────────────────────────────┘
        ↑ INNER_LIP (입 벌릴 때 구멍이 될 영역)
```

---

### 5-3. 립 컬러 드로잉 (`drawLip.js`)

**핵심 기법: even-odd fill rule + Path2D 조합**

입을 벌렸을 때 이빨/잇몸이 색으로 덮이지 않도록 내부를 "구멍"으로 처리.

```js
const combined = new Path2D();
combined.addPath(outerPath);  // 외곽 → 채워짐
combined.addPath(innerPath);  // 내부 → even-odd 규칙으로 구멍이 됨

ctx.fill(combined, 'evenodd');
```

**블렌딩 모드 비교:**

| 모드 | 효과 | 적합한 경우 |
|------|------|-------------|
| `multiply` | 피부톤과 곱하기 → 자연스러운 발색 | 어두운~중간 색상 |
| `source-over` | 단색 덮어쓰기 → 선명한 발색 | 밝은 누드, 글로스 |

```js
ctx.globalAlpha = opacity;           // 발색 강도 (0.05 ~ 0.85)
ctx.globalCompositeOperation = blendMode;
ctx.fillStyle = color;               // HEX 색상
ctx.fill(combined, 'evenodd');
```

---

### 5-4. 미러링 처리 (`CameraAR.jsx`)

카메라 피드는 기본적으로 미러되지 않음. Canvas에 CSS `transform: scaleX(-1)` 적용으로 해결.

```jsx
<canvas style={{ transform: 'scaleX(-1)' }} />
```

랜드마크 좌표를 직접 반전하는 방식(`x = 1 - x`) 대비 장점:
- 드로잉 코드에서 좌표 변환 불필요
- 비디오와 오버레이가 같은 좌표계를 공유 → 정렬 오류 없음

Canvas 해상도는 매 렌더에서 비디오 실제 해상도와 동기화:
```js
if (canvas.width !== video.videoWidth) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}
```

---

## 6. 컴포넌트별 역할 요약

### `App.jsx`
- 전역 상태 보관: `selectedProduct`, `opacity`, `blendMode`, `arStatus`
- `CameraAR`와 `ProductPanel`을 수직 레이아웃으로 배치
- `onStatusChange` 콜백으로 AR 상태 수신 → `LoadingOverlay` 표시 여부 결정

### `CameraAR.jsx`
- `useFaceLandmarker` 훅을 사용해 `videoRef`, `landmarksRef`, `status` 획득
- 독립된 `requestAnimationFrame` 렌더 루프 운영 (감지 루프와 분리)
- `status`가 `'ready'`일 때만 렌더 루프 시작

### `ProductPanel.jsx`
- 12종 립 컬러 스와치 그리드 (6열)
- 선택된 제품 강조 표시 (ring + scale)
- 발색 강도 슬라이더 (5%~85%)
- 블렌딩 모드 토글 버튼 2종

### `LoadingOverlay.jsx`
- `status === 'loading'`: 스피너 + 안내 메시지
- `status === 'error'`: 에러 메시지 + 새로고침 버튼
- `status === 'ready'`: 렌더 없음 (`return null`)

### `useFaceLandmarker.js`
- MediaPipe 초기화, 카메라 획득, 감지 루프를 하나의 훅으로 캡슐화
- `videoRef`: `<video>` 엘리먼트에 attach
- `landmarksRef`: 최신 프레임의 랜드마크 (Ref → 렌더 트리거 없음)
- `status`: React state → 부모에게 상태 변경 알림

---

## 7. 상품 데이터 구조 (`products.js`)

```js
{
  id: Number,      // 고유 ID
  name: String,    // 한국어 상품명
  color: String,   // HEX 색상 코드
  finish: String,  // 'matte' | 'satin' | 'gloss'
}
```

현재 12종 하드코딩. 추후 JSON API 또는 CMS 연동으로 교체 가능.

---

## 8. 개발 환경 실행

```bash
# 의존성 설치
cd cosmetic-ar
npm install

# 개발 서버 (localhost + 네트워크 공개)
npm run dev -- --host

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview -- --host
```

> **HTTPS 필수**: 카메라 API는 HTTPS 또는 localhost에서만 동작.
> 모바일 기기 테스트 시 `npm run dev -- --host`로 실행 후 같은 Wi-Fi에서 IP 주소로 접속.
> (예: `http://172.16.x.x:5173` → 브라우저가 카메라 권한 요청)

---

## 9. 배포 (Vercel)

```bash
# Vercel CLI 사용 시
npm i -g vercel
vercel --prod
```

또는 GitHub 연동 후 자동 배포. Build Command: `npm run build`, Output: `dist/`.

배포 후 생성된 URL을 QR 코드로 변환하면 모바일 테스트 가능.
QR 코드 생성: [qr.io](https://qr.io) 또는 `qrcode.react` 패키지로 앱 내 삽입 가능.

---

## 10. 알려진 제약 및 주의사항

| 항목 | 내용 |
|------|------|
| 모델 첫 로딩 | CDN에서 약 5~15MB 다운로드, 10~20초 소요 |
| 조명 의존성 | 어두운 환경에서 랜드마크 인식 정확도 저하 |
| multiply 블렌딩 | 어두운 피부톤에서 색상이 너무 어두워질 수 있음 |
| GPU delegate | 일부 구형 기기/브라우저에서 CPU fallback 필요할 수 있음 |
| iOS Safari | `playsInline` + `muted` 속성 없으면 자동재생 차단 (현재 적용됨) |

---

## 11. 향후 확장 로드맵

### Phase 2 — 피부 분석 및 추천
- 특정 프레임에서 볼(Cheek) 영역 RGB 평균값 추출
- 유클리디안 거리로 퍼스널 컬러 매칭 (봄/여름/가을/겨울)
- 피부톤 기반 추천 제품 하이라이트

### Phase 3 — 제품 확장
- 아이섀도 (눈꺼풀 랜드마크: 33, 246, 161, 160, 159, 158, 157, 173 등)
- 블러셔 (볼 영역: 50, 101, 118, 117, 111번대 랜드마크)
- 제품 DB API 연동 (실제 브랜드 상품 연결)

### Phase 4 — UX 개선
- 특정 컬러로 사진 촬영 + 저장 기능
- 제품 페이지 바로가기 링크
- 색상 커스텀 피커 (HEX 직접 입력)
