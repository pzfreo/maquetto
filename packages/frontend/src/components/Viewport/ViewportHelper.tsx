import { useCameraDescription } from './useCameraDescription';

/**
 * Helper component that lives inside the Canvas to run hooks
 * that need access to the Three.js context (useThree).
 */
export function ViewportHelper() {
  useCameraDescription();
  return null;
}
