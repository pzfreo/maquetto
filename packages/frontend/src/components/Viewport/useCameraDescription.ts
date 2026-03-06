import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store';

/**
 * Computes a human-readable camera description for AI context.
 * Updates the store's cameraDescription on each frame.
 */
export function useCameraDescription() {
  const camera = useThree((s) => s.camera);
  const setCameraDescription = useAppStore((s) => s.setCameraDescription);

  useEffect(() => {
    const interval = setInterval(() => {
      const pos = camera.position;

      // Determine horizontal direction
      const angle = Math.atan2(pos.x, pos.z) * (180 / Math.PI);
      let horizontal = '';
      if (angle >= -22.5 && angle < 22.5) horizontal = 'front';
      else if (angle >= 22.5 && angle < 67.5) horizontal = 'front-right';
      else if (angle >= 67.5 && angle < 112.5) horizontal = 'right';
      else if (angle >= 112.5 && angle < 157.5) horizontal = 'back-right';
      else if (angle >= 157.5 || angle < -157.5) horizontal = 'back';
      else if (angle >= -157.5 && angle < -112.5) horizontal = 'back-left';
      else if (angle >= -112.5 && angle < -67.5) horizontal = 'left';
      else horizontal = 'front-left';

      // Determine vertical
      const elevation = Math.atan2(pos.y, Math.sqrt(pos.x * pos.x + pos.z * pos.z)) * (180 / Math.PI);
      let vertical = '';
      if (elevation > 30) vertical = ', above';
      else if (elevation < -10) vertical = ', below';
      else vertical = '';

      setCameraDescription(`viewing from ${horizontal}${vertical}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [camera, setCameraDescription]);
}
