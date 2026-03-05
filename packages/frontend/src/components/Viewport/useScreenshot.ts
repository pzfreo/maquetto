import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Captures the current viewport as a data URL.
 * Call before each AI message to give the AI visual context.
 */
export function useScreenshot() {
  const gl = useThree((s) => s.gl);

  const captureScreenshot = useCallback((): string | null => {
    try {
      return gl.domElement.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [gl]);

  return { captureScreenshot };
}
