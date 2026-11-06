import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { movementFor, PATTERNS, PHASE_LABELS } from '@muscu/motion';
import { createMannequinScene, VIEW_AZIMUTH, type MannequinScene, type ViewName } from '../three/scene';
import { colors } from '../theme';
import { T } from './Text';

interface Props {
  exerciseId: string;
  muscles: string[];
  playing?: boolean;
  /** 1 vitesse normale, 0,5 ralenti. */
  slow?: number;
  view?: ViewName;
  style?: ViewStyle;
  onPhase?(label: string, rep: number): void;
}

/** Mannequin 3D qui exécute le mouvement en boucle ; glisser pour tourner autour. */
export function Mannequin3D({ exerciseId, muscles, playing = true, slow = 1, view = 'three', style, onPhase }: Props) {
  const st = useRef({
    m: null as MannequinScene | null, r: null as THREE.WebGLRenderer | null, raf: 0,
    t: 0, last: 0, az: VIEW_AZIMUTH[view], playing, slow, label: '', rep: -1, onPhase,
  });
  const [failed, setFailed] = useState(false);
  st.current.playing = playing;
  st.current.slow = slow;
  st.current.onPhase = onPhase;

  useEffect(() => {
    const s = st.current;
    s.t = 0;
    s.m?.setExercise(exerciseId, muscles);
  }, [exerciseId, muscles.join(',')]);

  useEffect(() => {
    st.current.az = VIEW_AZIMUTH[view];
    st.current.m?.setAzimuth(st.current.az);
  }, [view]);

  useEffect(() => () => {
    cancelAnimationFrame(st.current.raf);
    st.current.m?.dispose();
    st.current.r?.dispose();
  }, []);

  const pan = useMemo(() => {
    let start = 0;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { start = st.current.az; },
      onPanResponderMove: (_e, g) => { st.current.az = start - g.dx * 0.012; st.current.m?.setAzimuth(st.current.az); },
    });
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const s = st.current;
    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const canvas = {
        width: w, height: h, style: {}, clientWidth: w, clientHeight: h,
        addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      const r = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true });
      r.setPixelRatio(1);
      r.setSize(w, h, false);
      const m = createMannequinScene();
      m.resize(w, h);
      m.setExercise(exerciseId, muscles);
      m.setAzimuth(s.az);
      s.m = m;
      s.r = r;
      s.last = Date.now();
      const pattern = PATTERNS[movementFor(exerciseId).pattern];
      const frame = () => {
        const now = Date.now();
        if (s.playing) s.t += Math.min(0.1, (now - s.last) / 1000);
        s.last = now;
        const sample = m.update(s.t, s.slow);
        const label = PHASE_LABELS[pattern.style][sample.phase];
        if (s.onPhase && (label !== s.label || sample.rep !== s.rep)) {
          s.label = label;
          s.rep = sample.rep;
          s.onPhase(label, sample.rep);
        }
        r.render(m.scene, m.camera);
        (gl as unknown as { endFrameEXP?: () => void }).endFrameEXP?.();
        s.raf = requestAnimationFrame(frame);
      };
      frame();
    } catch {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <View style={[{ backgroundColor: colors.slate, alignItems: 'center', justifyContent: 'center', padding: 20 }, style]}>
        <T v="detail" color={colors.soft} style={{ textAlign: 'center' }}>La 3D n’est pas disponible sur cet appareil. Suis les points clés ci-dessous.</T>
      </View>
    );
  }
  return (
    <View {...pan.panHandlers} style={[{ backgroundColor: colors.slate }, style]}
      accessible accessibilityRole="image" accessibilityLabel="Mannequin 3D qui montre le mouvement. Glisse pour tourner autour.">
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}
