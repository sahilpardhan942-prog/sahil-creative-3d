import React from 'react';
import {Composition} from 'remotion';
import {
  SahilCreativeUltra3D,
  ULTRA_DURATION,
  ULTRA_FPS,
  ULTRA_HEIGHT,
  ULTRA_WIDTH,
} from './SahilCreativeUltra3D';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SahilCreativeUltra3D"
        component={SahilCreativeUltra3D}
        durationInFrames={ULTRA_DURATION}
        fps={ULTRA_FPS}
        width={ULTRA_WIDTH}
        height={ULTRA_HEIGHT}
      />
    </>
  );
};
