import { useEffect, useRef } from 'react';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker.js';
import { drawLipColor } from '../utils/drawLip.js';

export default function CameraAR({ color, opacity, blendMode, onStatusChange }) {
  const canvasRef = useRef(null);
  const renderAnimRef = useRef(null);
  const { videoRef, landmarksRef, status, errorMsg } = useFaceLandmarker();

  useEffect(() => {
    onStatusChange?.(status, errorMsg);
  }, [status, errorMsg]);

  useEffect(() => {
    if (status !== 'ready') return;

    function render() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2 || !video.videoWidth) {
        renderAnimRef.current = requestAnimationFrame(render);
        return;
      }

      // Match canvas attribute size to its CSS-rendered size (fills container)
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW || canvas.height !== cssH) {
        canvas.width = cssW;
        canvas.height = cssH;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cover-fit: scale video to fill canvas, centered
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const videoAspect = videoW / videoH;
      const canvasAspect = canvas.width / canvas.height;

      let scale, offsetX = 0, offsetY = 0;
      if (videoAspect > canvasAspect) {
        // Video is wider → fit by height, crop sides
        scale = canvas.height / videoH;
        offsetX = (canvas.width - videoW * scale) / 2;
      } else {
        // Video is taller → fit by width, crop top/bottom
        scale = canvas.width / videoW;
        offsetY = (canvas.height - videoH * scale) / 2;
      }

      ctx.drawImage(video, offsetX, offsetY, videoW * scale, videoH * scale);

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

      {/* Canvas fills container, mirrored for selfie view */}
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
