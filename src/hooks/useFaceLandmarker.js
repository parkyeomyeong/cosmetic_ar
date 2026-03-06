import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

/**
 * Initializes MediaPipe FaceLandmarker, starts camera, runs detection loop.
 * Returns videoRef (attach to <video>), landmarksRef (current frame landmarks), status.
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
        // 1. Load WASM runtime + model
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        if (cancelled) { landmarker.close(); return; }
        faceLandmarkerRef.current = landmarker;

        // 2. Request camera
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

    function startLoop() {
      function detect() {
        if (cancelled) return;
        const video = videoRef.current;
        const landmarker = faceLandmarkerRef.current;
        if (!video || !landmarker || video.paused || video.ended) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
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
