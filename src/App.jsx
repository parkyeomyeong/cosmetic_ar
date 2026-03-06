import { useState } from 'react';
import CameraAR from './components/CameraAR.jsx';
import ProductPanel from './components/ProductPanel.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import { products } from './data/products.js';

const DEFAULT_PRODUCT = products[0];

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
      {/* AR Viewport */}
      <div className="ar-viewport">
        <CameraAR
          color={selectedProduct.color}
          opacity={isComparing ? 0 : opacity}
          blendMode={blendMode}
          onStatusChange={handleStatusChange}
        />
        <LoadingOverlay status={arStatus} errorMsg={errorMsg} />

        {/* Top HUD */}
        {arStatus === 'ready' && (
          <>
            <div className="hud-container">
              <div className="hud-badge">
                💄 립 컬러 미리보기
              </div>
            </div>

            {/* 원본 비교 버튼 */}
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
          </>
        )}
      </div>

      {/* Bottom Control Panel */}
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
