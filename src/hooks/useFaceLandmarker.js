import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

/**
 * MediaPipe FaceLandmarker AI 모델을 초기화하고, 사용자 전면 카메라를 켜서
 * 매 프레임마다 얼굴(입술) 랜드마크 478개 좌표를 찾아내는 커스텀 훅입니다.
 * 
 * @returns { videoRef, landmarksRef, status, errorMsg } 
 * - videoRef: HTML <video> 태그에 연결할 레퍼런스
 * - landmarksRef: 현재 인식된 최신 얼굴 좌표 데이터 (렌더링 최적화를 위해 State 대신 Ref 사용)
 * - status: 'loading' | 'ready' | 'error' (로딩 화면 제어용)
 */
export function useFaceLandmarker() {
  const videoRef = useRef(null);
  const landmarksRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. MediaPipe WASM 런타임 엔진 및 AI 모델 다운로드 & 초기화
        // CDN에서 직접 불러와서 별도의 로컬 설치가 필요 없습니다.
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false, // 입술 모양 변화(Blendshapes) 계산은 끄고 순수 좌표만 가져와서 속도 최적화
          runningMode: 'VIDEO',         // 비디오 스트림용 실시간 모드
          numFaces: 1,                  // 1명의 얼굴만 인식해서 불필요한 연산 방지
        });
        if (cancelled) { landmarker.close(); return; }
        faceLandmarkerRef.current = landmarker;

        // 2. 브라우저 카메라 접근 권한 요청 (전면 셀카 모드, 720p 해상도)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        if (cancelled) return;
        setStatus('ready');
        startLoop();
      } catch (err) {
        if (cancelled) return;
        console.error('[FaceLandmarker]', err);
        if (err.name === 'NotAllowedError') {
          setErrorMsg('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라를 허용해주세요.');
        } else {
          setErrorMsg('초기화 중 오류가 발생했습니다: ' + err.message);
        }
        setStatus('error');
      }
    }

    // 3. 브라우저 화면이 새로 그려질 때마다(requestAnimationFrame) 얼굴 인식 함수를 반복 실행합니다.
    function startLoop() {
      function detect() {
        if (cancelled) return;
        const video = videoRef.current;
        const landmarker = faceLandmarkerRef.current;
        if (!video || !landmarker || video.paused || video.ended) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        // 최적화 핵심: 비디오의 재생 시간(currentTime)이 이전 프레임과 다를 때만(새 프레임이 들어왔을 때만) 연산을 수행합니다.
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          // 비디오 화면을 AI 모델에 넘겨서 좌표를 추론함
          const result = landmarker.detectForVideo(video, performance.now());
          // 478개의 얼굴 좌표 배열을 저장함. 첫 번째 얼굴([0])만 가져옴.
          landmarksRef.current = result.faceLandmarks[0] ?? null;
        }
        animFrameRef.current = requestAnimationFrame(detect);
      }
      detect();
    }

    init();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      faceLandmarkerRef.current?.close();
    };
  }, []);

  return { videoRef, landmarksRef, status, errorMsg };
}
