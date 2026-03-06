import { products } from '../data/products.js';

const FINISH_LABELS = { matte: '매트', satin: '새틴', gloss: '글로스' };

/**
 * 하단에 뜨는 하얀색 리모컨 패널입니다.
 * 립 컬러 목록(스와치), 발색 강도 슬라이더, 혼합 모드 버튼을 렌더링하고
 * 사용자가 조작할 때마다 부모(App.jsx)에게 새로운 값을 올려보냅니다.
 */
export default function ProductPanel({
  selectedProduct,
  onSelect,
  opacity,
  onOpacityChange,
  blendMode,
  onBlendModeChange,
}) {
  const minOpacity = 0.0;
  const maxOpacity = 1.0;

  // 0.00 ~ 0.85 사이의 값을 0 ~ 100% 로 변환 (게이지 길이/툴팁용)
  const pct = (((opacity - minOpacity) / (maxOpacity - minOpacity)) * 100);

  // 30% 기본값(0.30)의 실제 퍼센트 위치 계산 ((0.30 - 0.0) / 0.85 = 35.294%)
  const defaultPos = ((0.30 - minOpacity) / (maxOpacity - minOpacity)) * 100;

  return (
    <div className="product-panel">

      {/* 헤더 */}
      <div className="panel-header">
        <span className="panel-title">립 컬러</span>
        {selectedProduct && (
          <div className="selected-product-badge">
            <div
              className="product-color-dot"
              style={{ backgroundColor: selectedProduct.color }}
            />
            <span className="product-name">{selectedProduct.name}</span>
            <span className="product-finish">
              {FINISH_LABELS[selectedProduct.finish]}
            </span>
          </div>
        )}
      </div>

      {/* 1. 색상 스와치 가로 스크롤 영역 (다이소 6종 립 틴트) */}
      <div className="color-carousel">
        {products.map((p) => {
          const isSelected = selectedProduct?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              title={p.name}
              className={`color-swatch-btn ${isSelected ? 'selected' : ''}`}
            >
              <div
                className="swatch-circle-wrap"
              >
                <div
                  className="swatch-circle"
                  style={{ backgroundColor: p.color }}
                />
              </div>
              <span className="swatch-label">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 컨트롤 패널 그룹 */}
      <div className="control-group">

        {/* 발색 강도 슬라이더 */}
        <div className="slider-section">
          <div className="slider-header">
            <span className="slider-title">발색 강도</span>
          </div>

          <div className="slider-track-wrap">
            {/* 기본값 (30%) 마커 - z-index를 낮춰서 동그란 버튼 아래로 가도록 */}
            <div
              className="slider-marker"
              style={{ left: `calc(14px + (100% - 28px) * (${defaultPos} / 100))` }}
            />

            {/* 툴팁 (동그란 버튼의 정중앙을 완벽하게 따라다니도록 수식 변경) */}
            <div
              className="slider-tooltip"
              style={{ left: `calc(14px + (100% - 28px) * (${pct} / 100))` }}
            >
              {Math.round(opacity * 100)}%
            </div>

            <input
              type="range"
              min={minOpacity}
              max={maxOpacity}
              step="0.01"
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="opacity-slider"
              style={{
                background: `linear-gradient(to right, #f43f5e ${pct}%, #E5E5EA ${pct}%)`
              }}
            />
          </div>
        </div>

        <div className="divider" />

        {/* 3. 블렌딩 모드 피커 (Canvas 합성 방식 변경) */}
        <div className="blend-section">
          <span className="blend-title">혼합 모드</span>
          <div className="segmented-control">
            {[
              // multiply: 원래 입술 명암을 유지하면서 색을 입힘 (자연스러움)
              { value: 'multiply', label: '자연스럽게' },
              // source-over: 원래 입술색을 무시하고 불투명하게 덮어버림 (선명함)
              { value: 'source-over', label: '선명하게' },
            ].map(({ value, label }) => {
              const isActive = blendMode === value;
              return (
                <button
                  key={value}
                  onClick={() => onBlendModeChange(value)}
                  className={`segment-btn ${isActive ? 'active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
