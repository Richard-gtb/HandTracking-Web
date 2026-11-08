/**
 * Conversão flexão (0-100%) -> ângulo de servo (0-180°), por dedo.
 *
 * A flexão vinda do HandTracker é ~100 com o dedo esticado (levantado)
 * e ~0 com o dedo fechado. Como a montagem mecânica de cada mão robótica
 * difere (às vezes o servo em 0° = aberto, às vezes = fechado), cada dedo
 * tem calibração própria: invert + faixa de saída [min, max].
 */

export type FingerKey = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export const FINGER_ORDER: FingerKey[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

export interface FingerCalibration {
  /** Inverte o sentido (dedo esticado vira 0° em vez de 180°). */
  invert: boolean;
  /** Ângulo mínimo que o servo pode assumir. */
  min: number;
  /** Ângulo máximo que o servo pode assumir. */
  max: number;
}

export type Calibration = Record<FingerKey, FingerCalibration>;

export const DEFAULT_CALIBRATION: Calibration = {
  thumb: { invert: false, min: 0, max: 180 },
  index: { invert: false, min: 0, max: 180 },
  middle: { invert: false, min: 0, max: 180 },
  ring: { invert: false, min: 0, max: 180 },
  pinky: { invert: false, min: 0, max: 180 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Converte a flexão (0-100) de um dedo em ângulo de servo (0-180), já calibrado. */
export function flexionToAngle(flexionPct: number, cal: FingerCalibration): number {
  const t = clamp(flexionPct, 0, 100) / 100; // 0 = fechado, 1 = esticado
  const span = cal.max - cal.min;
  const angle = cal.invert ? cal.max - t * span : cal.min + t * span;
  return Math.round(clamp(angle, 0, 180));
}

/** Aplica a conversão a todos os dedos, na ordem FINGER_ORDER. */
export function flexionsToAngles(
  flexion: Record<FingerKey, number>,
  calibration: Calibration,
): Record<FingerKey, number> {
  return {
    thumb: flexionToAngle(flexion.thumb, calibration.thumb),
    index: flexionToAngle(flexion.index, calibration.index),
    middle: flexionToAngle(flexion.middle, calibration.middle),
    ring: flexionToAngle(flexion.ring, calibration.ring),
    pinky: flexionToAngle(flexion.pinky, calibration.pinky),
  };
}

/** Suavização exponencial (EMA) para evitar tremor do servo. alpha 0..1 (maior = mais responsivo). */
export function smooth(prev: number, next: number, alpha: number): number {
  return prev + (next - prev) * alpha;
}

/** Serializa os 5 ângulos no formato CSV que o ESP32 lê: "t,i,m,r,p". */
export function anglesToPayload(a: Record<FingerKey, number>): string {
  return FINGER_ORDER.map((k) => a[k]).join(',');
}
