import { useEffect, useRef } from 'react';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker.js';
import { drawLipColor } from '../utils/drawLip.js';

/**
 * 카메라 영상을 화면에 띄우고, 그 위에 입술 오버레이 효과를 실시간으로 그리는(Canvas) 컴포넌트입니다.
 * FaceLandmarker.js가 찾아낸 입술 좌표를 넘겨받아 '실제 그림을 그리는' 역할입니다.
 */
export default function CameraAR({ color, opacity, blendMode, onStatusChange }) {
  const canvasRef = useRef(null);
  const renderAnimRef = useRef(null);
  const { videoRef, landmarksRef, status, errorMsg } = useFaceLandmarker();

  useEffect(() => {
    onStatusChange?.(status, errorMsg);
  }, [status, errorMsg]);

  useEffect(() => {
    if (status !== 'ready') return;

    // 실시간으로 60FPS로 캔버스를 계속 다시 그리는 렌더링 루프 함수
    function render() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2 || !video.videoWidth) {
        renderAnimRef.current = requestAnimationFrame(render);
        return;
      }

      // 캔버스 사이즈를 실제 CSS 화면 크기와 강제로 동기화시켜서 화질 저하 방지
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW || canvas.height !== cssH) {
        canvas.width = cssW;
        canvas.height = cssH;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cover-Fit 방식: 비디오 비율이 화면 비율과 다를 때 
      // 찌그러지지 않게 화면에 꽉 차도록(크롭) 사이즈와 오프셋 여백을 계산합니다.
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const videoAspect = videoW / videoH;
      const canvasAspect = canvas.width / canvas.height;

      let scale, offsetX = 0, offsetY = 0;
      if (videoAspect > canvasAspect) {
        // 비디오가 화면보다 더 납작함(가로가 더 넓음) → 세로 크기에 맞추고 가로 양옆을 잘라냄(Crop)
        scale = canvas.height / videoH;
        offsetX = (canvas.width - videoW * scale) / 2;
      } else {
        // 비디오가 화면보다 더 홀쭉함(세로가 더 김) → 가로 크기에 맞추고 세로 위아래를 잘라냄(Crop)
        scale = canvas.width / videoW;
        offsetY = (canvas.height - videoH * scale) / 2;
      }

      // 1. 계산된 크기와 위치에 맞게 <video> 원본 화면을 <canvas>에 옮겨 그림 (배경)
      ctx.drawImage(video, offsetX, offsetY, videoW * scale, videoH * scale);

      // 2. 만약 얼굴(입술) 좌표가 인식되었다면, 그 위에 립스틱 색상을 덧칠함!
      if (landmarksRef.current) {
        drawLipColor(ctx, landmarksRef.current, color, opacity, blendMode, {
          scale, offsetX, offsetY, videoW, videoH,
        });
      }

      renderAnimRef.current = requestAnimationFrame(render);
    }

    renderAnimRef.current = requestAnimationFrame(render);
    return () => {
      if (renderAnimRef.current) cancelAnimationFrame(renderAnimRef.current);
    };
  }, [status, color, opacity, blendMode]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* 
        실제 눈에 보이는 화면(Canvas)입니다. 
        transform: 'scaleX(-1)' 속성으로 거울처럼 좌우 반전(셀카 미러링) 효과를 줍니다. 
      */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          transform: 'scaleX(-1)',
        }}
      />
    </div>
  );
}
