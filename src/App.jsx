import { useState } from 'react';
import CameraAR from './components/CameraAR.jsx';
import ProductPanel from './components/ProductPanel.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import { products } from './data/products.js';

const DEFAULT_PRODUCT = products[0];

/**
 * 전체 앱의 뼈대이자 모든 상태(데이터)의 중앙 관리소입니다.
 * 선택된 화장품 색, 발색 농도 등의 데이터를 자식 컴포넌트들에게 뿌려줍니다.
 */
export default function App() {
  const [selectedProduct, setSelectedProduct] = useState(DEFAULT_PRODUCT);
  const [opacity, setOpacity] = useState(0.30);
  const [blendMode, setBlendMode] = useState('multiply');
  const [arStatus, setArStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  function handleStatusChange(status, msg) {
    setArStatus(status);
    setErrorMsg(msg || '');
  }

  return (
    <div className="app-container">
      {/* 1. 상단 카메라 미리보기 영역 (AR Viewport) */}
      <div className="ar-viewport">
        <CameraAR
          color={selectedProduct.color}
          opacity={isComparing ? 0 : opacity}
          blendMode={blendMode}
          onStatusChange={handleStatusChange}
        />
        <LoadingOverlay status={arStatus} errorMsg={errorMsg} />

        {/* 상단 통합 HUD (Heads-up Display: 앱 이름 뱃지) */}
        {arStatus === 'ready' && (
          <>
            <div className="hud-container">
              <div className="hud-badge">
                💄 딘토 립 컬러 미리보기
              </div>
            </div>

            {/* 원본 비교 버튼 (버튼을 누르고 있는 동안 발색 강도를 0으로 만들어 원본을 보여줌) */}
            <button
              className={`compare-btn ${isComparing ? 'active' : ''}`}
              onPointerDown={() => setIsComparing(true)}
              onPointerUp={() => setIsComparing(false)}
              onPointerLeave={() => setIsComparing(false)}
              onTouchStart={(e) => { e.preventDefault(); setIsComparing(true); }}
              onTouchEnd={(e) => { e.preventDefault(); setIsComparing(false); }}
              onTouchCancel={(e) => { e.preventDefault(); setIsComparing(false); }}
            >
              원본
            </button>

            {/* 제품 링크 버튼 */}
            {selectedProduct?.url && (
              <a
                href={selectedProduct.url}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-btn"
              >
                제품 보러가기
              </a>
            )}
          </>
        )}
      </div>

      {/* 2. 하단 리모컨 영역 (제품 선택, 강도 조절 패널) */}
      <div className="bottom-panel">
        <ProductPanel
          selectedProduct={selectedProduct}
          onSelect={setSelectedProduct}
          opacity={opacity}
          onOpacityChange={setOpacity}
          blendMode={blendMode}
          onBlendModeChange={setBlendMode}
        />
      </div>
    </div>
  );
}
