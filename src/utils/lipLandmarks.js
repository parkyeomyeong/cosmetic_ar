// MediaPipe FaceLandmarker 478-point model lip landmark indices

// Outer lip contour (full boundary - upper + lower)
export const OUTER_LIP_UPPER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
export const OUTER_LIP_LOWER = [291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];

// Inner lip contour (mouth opening boundary)
export const INNER_LIP_UPPER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
export const INNER_LIP_LOWER = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];

// Combined for drawing
export const OUTER_LIP = [...OUTER_LIP_UPPER, ...OUTER_LIP_LOWER.slice(1)];
export const INNER_LIP = [...INNER_LIP_UPPER, ...INNER_LIP_LOWER.slice(1)];
