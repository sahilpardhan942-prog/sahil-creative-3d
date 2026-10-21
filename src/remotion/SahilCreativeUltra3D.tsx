import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Montserrat';

// Font is loaded through Remotion (it waits for the font before rendering a frame).
const {fontFamily: MONT} = loadFont('normal', {weights: ['500', '900'], subsets: ['latin']});
const FONT = `${MONT}, "Arial Black", Impact, Arial, sans-serif`;
const UI_FONT = `${MONT}, "Segoe UI", Arial, sans-serif`;

export const ULTRA_WIDTH = 1080;
export const ULTRA_HEIGHT = 1920;
export const ULTRA_FPS = 30;
export const ULTRA_DURATION = 450; // 15 seconds @ 30 FPS

const HERO_START = 265;
const ICE = '#bfe6ff';
const clampOpts = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Deterministic pseudo-random (no Math.random -> identical on every render)
const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

const sweepGradient = (p: number) =>
  `linear-gradient(105deg, rgba(255,255,255,0) ${p - 14}%, rgba(255,255,255,1) ${p}%, rgba(255,255,255,0) ${p + 14}%)`;

// ---------- Glitch timing (global frames) ----------
const GLITCH_BURSTS: Array<[number, number, number]> = [
  [143, 148, 0.45],
  [193, 197, 0.4],
  [243, 275, 1],
  [275, 293, 0.55],
];
const glitchStrength = (frame: number): number => {
  for (const [a, b, s] of GLITCH_BURSTS) {
    if (frame >= a && frame < b) {
      return rand(frame * 1.7) > 0.3 ? s * (0.5 + rand(frame * 3.3) * 0.5) : 0;
    }
  }
  return 0;
};

// ---------- Background ----------
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 75, 250, 450], [0.15, 0.5, 0.9, 1], clampOpts);
  return (
    <AbsoluteFill style={{background: '#01030a'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 50% at 50% 50%, rgba(20,80,200,${0.35 * glow}) 0%, rgba(3,10,40,${0.6 * glow}) 45%, rgba(0,0,0,0) 80%)`,
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)'}}
      />
    </AbsoluteFill>
  );
};

// ---------- Particles (pseudo-depth, flying toward camera) ----------
const Particles: React.FC<{speed?: number}> = ({speed = 1}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill>
      {Array.from({length: 110}).map((_, i) => {
        const x0 = (rand(i + 1) - 0.5) * 2;
        const y0 = (rand(i + 101) - 0.5) * 2;
        const v = 0.0016 + rand(i + 201) * 0.0035;
        const d = (rand(i + 301) + frame * v * speed) % 1;
        const s = 0.15 + d * 1.6;
        const px = width / 2 + x0 * width * 0.55 * s;
        const py = height / 2 + y0 * height * 0.5 * s;
        const size = 2 + d * 6;
        const op =
          Math.min(1, d * 3) * (1 - Math.max(0, (d - 0.85) / 0.15)) * (0.35 + rand(i + 401) * 0.65);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              width: size,
              height: size,
              borderRadius: '50%',
              background: '#8fd0ff',
              boxShadow: '0 0 10px 3px rgba(47,140,255,0.8)',
              opacity: op,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Volumetric-style beams ----------
const EnergyBeams: React.FC<{intro?: boolean}> = ({intro = true}) => {
  const frame = useCurrentFrame();
  const grow = intro
    ? interpolate(frame, [0, 83], [0, 1], {...clampOpts, easing: Easing.out(Easing.cubic)})
    : 1;
  const pulse = 0.85 + Math.sin(frame / 9) * 0.15;
  const master = intro ? interpolate(frame, [208, 265], [1, 0.45], clampOpts) : 0.55;
  const shafts = [
    {x: -260, rot: -12, o: 0.25},
    {x: 0, rot: 0, o: 0.4},
    {x: 260, rot: 12, o: 0.25},
  ];
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', opacity: master}}>
      {shafts.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: -100,
            left: `calc(50% + ${s.x - 210}px)`,
            width: 420,
            height: 2300,
            transformOrigin: '50% 0',
            transform: `rotate(${s.rot}deg)`,
            background: 'linear-gradient(90deg, transparent, rgba(80,160,255,0.55), transparent)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 85%)',
            maskImage: 'linear-gradient(180deg, #000 0%, transparent 85%)',
            opacity: s.o * grow * pulse,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1500 * grow,
          height: 6,
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(90deg, transparent, #9fd8ff 50%, transparent)',
          boxShadow: '0 0 40px 12px rgba(47,140,255,0.8)',
          opacity: pulse,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- Simulated-3D extruded text (stacked layers, CSS only) ----------
const lerpColor = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

type ExtrudedProps = {
  text: string;
  fontSize: number;
  depth: number;
  layers?: number;
  chroma?: number;
  sweep?: number;
  letterSpacing?: number;
};

const ExtrudedText: React.FC<ExtrudedProps> = ({
  text,
  fontSize,
  depth,
  layers = 24,
  chroma = 0,
  sweep = -50,
  letterSpacing = 4,
}) => {
  const font: React.CSSProperties = {
    fontFamily: FONT,
    fontWeight: 900,
    fontSize,
    letterSpacing,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
  const abs: React.CSSProperties = {position: 'absolute', left: 0, top: 0, ...font};
  const step = depth / layers;
  const clipText: React.CSSProperties = {
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };

  return (
    <div style={{position: 'relative', transformStyle: 'preserve-3d', ...font}}>
      <span style={{visibility: 'hidden'}}>{text}</span>

      {/* Side walls: bright blue near the face, dark blue far back */}
      {Array.from({length: layers}).map((_, k) => {
        const i = layers - k;
        const t = i / layers;
        return (
          <div
            key={i}
            style={{
              ...abs,
              color: lerpColor([90, 170, 255], [4, 14, 50], Math.pow(t, 0.7)),
              transform: `translateZ(${-i * step}px)`,
            }}
          >
            {text}
          </div>
        );
      })}

      {/* Rim light: bright outline just behind the face */}
      <div
        style={{
          ...abs,
          color: '#8fd0ff',
          WebkitTextStroke: '5px #8fd0ff',
          transform: `translateZ(${-step * 0.5}px)`,
        }}
      >
        {text}
      </div>

      {/* Chromatic fringe (glitch) */}
      {chroma > 0 && (
        <>
          <div style={{...abs, color: 'rgba(255,40,90,0.75)', transform: `translateX(${-chroma}px) translateZ(-1px)`}}>
            {text}
          </div>
          <div style={{...abs, color: 'rgba(0,230,255,0.75)', transform: `translateX(${chroma}px) translateZ(-1px)`}}>
            {text}
          </div>
        </>
      )}

      {/* Chrome front face */}
      <div
        style={{
          ...abs,
          ...clipText,
          backgroundImage:
            'linear-gradient(180deg, #ffffff 0%, #d6efff 22%, #6db6ff 44%, #0b3a9e 50%, #1c6dff 62%, #8fd0ff 82%, #ffffff 100%)',
          transform: 'translateZ(0px)',
        }}
      >
        {text}
      </div>

      {/* Light sweep over the face */}
      <div
        style={{
          ...abs,
          ...clipText,
          backgroundImage: sweepGradient(sweep),
          transform: 'translateZ(1px)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const LogoLockup: React.FC<{chroma: number; sweep: number}> = ({chroma, sweep}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      transform: 'translate(-50%, -55%)',
      transformStyle: 'preserve-3d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <div style={{transformStyle: 'preserve-3d', transform: 'translateZ(30px)'}}>
      <ExtrudedText text="SAHIL" fontSize={220} depth={90} chroma={chroma} sweep={sweep} />
    </div>
    <div style={{transformStyle: 'preserve-3d', transform: 'translateZ(-30px)'}}>
      <ExtrudedText text="CREATIVE" fontSize={130} depth={80} chroma={chroma} sweep={sweep} />
    </div>
  </div>
);

const Tagline: React.FC<{progress: number; sweep: number}> = ({progress, sweep}) => {
  const ls = interpolate(progress, [0, 1], [18, 8]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], clampOpts);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 250,
        transform: 'translate(-50%, 0) translateZ(50px)',
        whiteSpace: 'nowrap',
        fontFamily: UI_FONT,
        fontWeight: 500,
        fontSize: 34,
        letterSpacing: ls,
        paddingLeft: ls,
        opacity,
        backgroundImage: `${sweepGradient(sweep)}, linear-gradient(180deg, #e8f6ff, #8fcbff)`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      }}
    >
      THINK. CREATE. INSPIRE.
    </div>
  );
};

// ---------- Camera ----------
const CameraRig: React.FC<{
  z: number;
  rx: number;
  ry: number;
  shakeX?: number;
  shakeY?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({z, rx, ry, shakeX = 0, shakeY = 0, opacity = 1, children}) => (
  <AbsoluteFill style={{filter: 'drop-shadow(0 0 26px rgba(47,140,255,0.65))', opacity}}>
    <AbsoluteFill style={{perspective: 1400, perspectiveOrigin: '50% 50%'}}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform: `translate3d(${shakeX}px, ${shakeY}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ---------- Energy effects ----------
const ShockRings: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      {[0, 9, 18].map((delay, i) => {
        const t = frame - start - delay;
        if (t < 0 || t > 55) return null;
        const s = interpolate(t, [0, 55], [0.15, 3.4], {...clampOpts, easing: Easing.out(Easing.cubic)});
        const o = interpolate(t, [0, 6, 55], [0, 0.9, 0], clampOpts);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 700,
              height: 700,
              marginLeft: -350,
              marginTop: -350,
              borderRadius: '50%',
              border: `${8 - i * 2}px solid ${ICE}`,
              boxShadow: '0 0 40px 10px rgba(47,140,255,0.7), inset 0 0 40px 8px rgba(47,140,255,0.5)',
              transform: `scale(${s})`,
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Sparks: React.FC<{start: number; count?: number}> = ({start, count = 40}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame - start;
  if (t < 0 || t > 80) return null;
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      {Array.from({length: count}).map((_, i) => {
        const a = rand(i + 1) * Math.PI * 2;
        const sp = 6 + rand(i + 51) * 20;
        const life = 30 + rand(i + 101) * 50;
        if (t > life) return null;
        const dist = sp * 22 * (1 - Math.exp(-t / 22));
        const x = width / 2 + Math.cos(a) * dist;
        const y = height / 2 + Math.sin(a) * dist * 0.8 + 0.04 * t * t;
        const size = 3 + rand(i + 151) * 4;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: '#dff2ff',
              boxShadow: '0 0 12px 4px rgba(80,170,255,0.9)',
              opacity: 1 - t / life,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LightStreaks: React.FC<{count?: number; seed?: number}> = ({count = 9, seed = 0}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen'}}>
      {Array.from({length: count}).map((_, i) => {
        const period = 70 + Math.floor(rand(i + seed + 1) * 60);
        const offset = Math.floor(rand(i + seed + 21) * period);
        const t = (frame + offset) % period;
        const dur = 16 + rand(i + seed + 41) * 8;
        if (t > dur) return null;
        const len = 500 + rand(i + seed + 61) * 600;
        const dir = i % 2 === 0 ? 1 : -1;
        const p = t / dur;
        const x = dir === 1 ? -len + p * (width + len) : width - p * (width + len);
        const y = 150 + rand(i + seed + 81) * (height - 300);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: len,
              height: 2 + rand(i + seed + 101) * 3,
              background:
                dir === 1
                  ? 'linear-gradient(90deg, transparent, #9fd8ff)'
                  : 'linear-gradient(270deg, transparent, #9fd8ff)',
              boxShadow: '0 0 14px 2px rgba(47,140,255,0.7)',
              opacity: Math.sin(p * Math.PI) * 0.8,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const EnergyRing: React.FC<{
  size: number;
  z: number;
  tilt: number;
  spin: number;
  thickness: number;
  opacity?: number;
}> = ({size, z, tilt, spin, thickness, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      marginLeft: -size / 2,
      marginTop: -size / 2,
      borderRadius: '50%',
      border: `${thickness}px solid rgba(47,140,255,0.22)`,
      borderTopColor: ICE,
      borderRightColor: 'rgba(120,190,255,0.6)',
      boxShadow: '0 0 30px 6px rgba(47,140,255,0.5), inset 0 0 30px 4px rgba(47,140,255,0.35)',
      transform: `translateZ(${z}px) rotateX(${tilt}deg) rotateZ(${spin}deg)`,
      opacity,
    }}
  />
);

// ---------- Scene 1: opening + logo reveal (frames 0-264) ----------
const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const reveal = spring({frame: frame - 71, fps, config: {damping: 16, stiffness: 55, mass: 1.3}});
  const appear = interpolate(frame, [71, 88], [0, 1], clampOpts);
  const z =
    interpolate(frame, [33, 265], [-650, 150], {...clampOpts, easing: Easing.inOut(Easing.quad)}) -
    (1 - reveal) * 900;
  const ry =
    (1 - reveal) * -60 +
    interpolate(frame, [83, 265], [-16, 14], {...clampOpts, easing: Easing.inOut(Easing.sin)});
  const rx = (1 - reveal) * 16 + Math.sin(frame / 50) * 4;

  const g = glitchStrength(frame);
  const shakeX = g > 0 ? (rand(frame * 5) - 0.5) * 60 * g : 0;
  const shakeY = g > 0 ? (rand(frame * 9) - 0.5) * 24 * g : 0;

  const logoSweep = interpolate(frame, [117, 167], [-20, 130], clampOpts);
  const tagProgress = interpolate(frame, [171, 213], [0, 1], {...clampOpts, easing: Easing.out(Easing.cubic)});
  const tagSweep = interpolate(frame, [200, 242], [-20, 130], clampOpts);

  return (
    <AbsoluteFill>
      <Particles />
      <EnergyBeams intro />
      <CameraRig z={z} rx={rx} ry={ry} shakeX={shakeX} shakeY={shakeY} opacity={appear}>
        <LogoLockup chroma={g * 16} sweep={logoSweep} />
        <Tagline progress={tagProgress} sweep={tagSweep} />
      </CameraRig>
      <ShockRings start={79} />
      <Sparks start={83} />
      <LightStreaks seed={0} count={9} />
    </AbsoluteFill>
  );
};

// ---------- Scene 2: hero shot (frames 265-449) ----------
const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const settle = spring({frame, fps, config: {damping: 14, stiffness: 70}});
  const appear = interpolate(frame, [0, 10], [0, 1], clampOpts);
  const z = interpolate(frame, [0, 50, 185], [200, 110, 70], {...clampOpts, easing: Easing.out(Easing.cubic)});
  const ry = (1 - settle) * 28 + Math.sin(frame / 55) * 9;
  const rx = (1 - settle) * -10 + 3 + Math.sin(frame / 70) * 2;

  const g = glitchStrength(frame + HERO_START);
  const shakeX = g > 0 ? (rand(frame * 5 + 3) - 0.5) * 50 * g : 0;

  const pulse = 0.5 + 0.5 * Math.sin(frame / 18);
  const logoSweep = -20 + ((frame % 100) / 100) * 160;
  const tagSweep = -20 + (((frame + 35) % 100) / 100) * 160;
  const tagProgress = interpolate(frame, [8, 60], [0, 1], {...clampOpts, easing: Easing.out(Easing.cubic)});

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 30% at 50% 50%, rgba(47,140,255,${0.3 + 0.12 * pulse}) 0%, transparent 70%)`,
        }}
      />
      <Particles speed={0.6} />
      <EnergyBeams intro={false} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1700,
          height: 4,
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(90deg, transparent, rgba(160,215,255,0.9), transparent)',
          boxShadow: '0 0 30px 8px rgba(47,140,255,0.6)',
          opacity: 0.35 + 0.25 * pulse,
          mixBlendMode: 'screen',
        }}
      />
      <CameraRig z={z} rx={rx} ry={ry} shakeX={shakeX} opacity={appear}>
        <EnergyRing size={900} z={-130} tilt={74} spin={frame * 1.6} thickness={5} opacity={0.9} />
        <LogoLockup chroma={g * 14} sweep={logoSweep} />
        <Tagline progress={tagProgress} sweep={tagSweep} />
        <EnergyRing size={760} z={70} tilt={-68} spin={-frame * 2.2} thickness={3} opacity={0.7} />
      </CameraRig>
      <Sparks start={6} count={28} />
      <LightStreaks seed={50} count={7} />
    </AbsoluteFill>
  );
};

// ---------- Global overlays (use global frame, outside Sequences) ----------
const GlitchOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const g = glitchStrength(frame);
  if (g === 0) return null;
  return (
    <AbsoluteFill>
      {Array.from({length: 7}).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: (rand(frame * 13 + i) - 0.5) * 120 * g,
            top: rand(frame * 7 + i) * height,
            width,
            height: 6 + rand(frame * 11 + i) * 70 * g,
            background: rand(frame * 17 + i) > 0.5 ? 'rgba(0,220,255,0.18)' : 'rgba(40,110,255,0.22)',
            mixBlendMode: 'screen',
          }}
        />
      ))}
      <AbsoluteFill
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0) 4px)',
          opacity: g,
        }}
      />
    </AbsoluteFill>
  );
};

const FlashOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [247, 260, 285], [0, 1, 0], clampOpts);
  if (o <= 0) return null;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #9fd8ff 40%, #1f6dff 100%)',
          opacity: o * 0.9,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1700,
          height: 10,
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          boxShadow: '0 0 60px 20px rgba(120,190,255,0.9)',
          opacity: o,
        }}
      />
    </AbsoluteFill>
  );
};

const FadeOut: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [417, 449], [0, 1], clampOpts);
  return <AbsoluteFill style={{background: '#000', opacity: o}} />;
};

// ---------- Main composition ----------
export const SahilCreativeUltra3D: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Backdrop />
    <Sequence from={0} durationInFrames={HERO_START}>
      <LogoScene />
    </Sequence>
    <Sequence from={HERO_START} durationInFrames={ULTRA_DURATION - HERO_START}>
      <HeroScene />
    </Sequence>
    <GlitchOverlay />
    <FlashOverlay />
    <FadeOut />
  </AbsoluteFill>
);
