// MediaPipe FaceLandmarker의 478개 얼굴 메쉬 포인트 중, 입술에 해당하는 번호(Index) 모음

// 바깥쪽 입술 윤곽 (상순 + 하순을 이어 전체 립 모양을 뜻함)
export const OUTER_LIP_UPPER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
export const OUTER_LIP_LOWER = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];

// 안쪽 입술 윤곽 (입 벌릴 때 이빨/혀가 보이지 않게 구멍을 뚫어줄 내부 윤곽선)
export const INNER_LIP_UPPER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
export const INNER_LIP_LOWER = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];

// 실제 렌더링에 사용할 최종 폐곡선 점들의 배열 
// 위아래가 만나는 점(291, 308 등) 중복을 피하기 위해 slice(1)을 사용해 하나는 버리고 결합함.
export const OUTER_LIP = [...OUTER_LIP_UPPER, ...OUTER_LIP_LOWER.slice(1)];
export const INNER_LIP = [...INNER_LIP_UPPER, ...INNER_LIP_LOWER.slice(1)];
