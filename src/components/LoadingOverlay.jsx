/**
 * AI 모델을 다운로드 받는 동안(약 10~20초) 화면 전체를 덮는 까만 로딩 화면입니다.
 * 에러 발생 시 카메라 권한 거부 등의 메시지와 새로고침 버튼도 띄웁니다.
 * @param status: 'loading' | 'ready' | 'error'
 */
export default function LoadingOverlay({ status, errorMsg }) {
  // 전부 준비가 완료되었다면 이 컴포넌트는 아무것도 그리지 않고 사라집니다(투명).
  if (status === 'ready') return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      {status === 'loading' && (
        <>
          <div
            className="w-14 h-14 rounded-full mb-5"
            style={{
              border: '4px solid rgba(255,255,255,0.15)',
              borderTopColor: '#f43f5e',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p className="text-white text-base font-semibold">AI 모델 로딩 중</p>
          <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            처음 실행 시 10~20초 소요됩니다
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-white text-base font-semibold mb-2">초기화 실패</p>
          <p
            className="text-sm text-center px-8 max-w-xs"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {errorMsg}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none"
            style={{ background: '#f43f5e' }}
          >
            다시 시도
          </button>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
