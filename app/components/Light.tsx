import { useEffect, useId } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from "react-native-svg";

// The Light (SPEC §3): a glowing sphere of warm light with a thin halo floating above it.
// The sphere is lit from the upper left and its rim melts into a soft aura; the halo bobs on its own beat.
//   idle: breathes (4.4s), halo floats · listening: 1.3s pulse, halo brightens
//   thinking: halo turns (it narrows and widens like a ring seen spinning) · speaking: rings ripple out of the sphere
// The website still draws the older sun-and-orbit (lightSvg() in website/lib/kit/art.ts).

export type LightState = "idle" | "listening" | "thinking" | "speaking";

const TIMING: Record<LightState, { pulse: number; float: number; turn: number }> = {
  idle: { pulse: 4400, float: 3600, turn: 0 },
  listening: { pulse: 1300, float: 2400, turn: 0 },
  thinking: { pulse: 2200, float: 3000, turn: 1400 },
  speaking: { pulse: 2200, float: 3000, turn: 0 },
};

// Sphere centre and radius in the 100×100 drawing; the halo sits above it
const CY = 60;
const R = 27;

const ease = Easing.inOut(Easing.sin);

function Ripple({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const d = size * 0.56;
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 0.7 }],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", left: (size - d) / 2, top: (size * CY) / 100 - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: "#F5C77E" },
        style,
      ]}
    />
  );
}

export function Light({ size = 150, state = "idle" }: { size?: number; state?: LightState }) {
  const id = useId().replace(/:/g, "");
  const pulse = useSharedValue(1);
  const float = useSharedValue(0);
  const turn = useSharedValue(1);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);

  useEffect(() => {
    const t = TIMING[state];
    pulse.value = 1;
    pulse.value = withRepeat(withTiming(state === "listening" ? 1.08 : 1.05, { duration: t.pulse / 2, easing: ease }), -1, true);
    float.value = 0;
    float.value = withRepeat(withTiming(1, { duration: t.float / 2, easing: ease }), -1, true);
    turn.value = 1;
    if (t.turn) turn.value = withRepeat(withTiming(0.35, { duration: t.turn / 2, easing: ease }), -1, true);

    const ripples = [r1, r2, r3];
    ripples.forEach((r, i) => {
      r.value = 0;
      if (state === "speaking") r.value = withDelay(i * 700, withRepeat(withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }), -1, false));
    });
    return () => [pulse, float, turn, ...ripples].forEach(cancelAnimation);
  }, [state, pulse, float, turn, r1, r2, r3]);

  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const halo = useAnimatedStyle(() => ({
    transform: [{ translateY: (-1 + float.value * 2) * size * 0.025 }, { scaleX: turn.value }],
  }));
  const layer = { position: "absolute" as const, width: size, height: size };
  // Scale the sphere layers around the sphere's centre, not the box's
  const origin = { transformOrigin: ["50%", `${CY}%`, 0] as [string, string, number] };

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Aura */}
      <Animated.View style={[layer, origin, breathe]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`aura${id}`} gradientUnits="userSpaceOnUse" cx={50} cy={CY} r={40}>
              <Stop offset="0.5" stopColor="#FFD98C" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#FFD98C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={CY} r={40} fill={`url(#aura${id})`} />
        </Svg>
      </Animated.View>

      <Ripple progress={r1} size={size} />
      <Ripple progress={r2} size={size} />
      <Ripple progress={r3} size={size} />

      {/* Sphere: lit from the upper left, deeper gold underneath, the rim fading into the aura */}
      <Animated.View style={[layer, origin, breathe]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`body${id}`} gradientUnits="userSpaceOnUse" cx={50} cy={CY} r={R + 2} fx={42} fy={CY - 11}>
              <Stop offset="0" stopColor="#FFFBEC" />
              <Stop offset="0.35" stopColor="#FFE4A3" />
              <Stop offset="0.75" stopColor="#FBC676" />
              <Stop offset="0.92" stopColor="#F5AE6C" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#F5AE6C" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`under${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.55" stopColor="#E8935A" stopOpacity={0} />
              <Stop offset="1" stopColor="#E8935A" stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Circle cx={50} cy={CY} r={R + 2} fill={`url(#body${id})`} />
          <Circle cx={50} cy={CY} r={R - 1} fill={`url(#under${id})`} />
          <Ellipse cx={41} cy={CY - 11} rx={8} ry={5} fill="#FFFFFF" opacity={0.35} transform={`rotate(-30 41 ${CY - 11})`} />
        </Svg>
      </Animated.View>

      {/* Halo */}
      <Animated.View style={[layer, { transformOrigin: ["50%", "21%", 0] }, halo]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={`halo${id}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#F5AE6C" />
              <Stop offset="0.5" stopColor="#FFF1C9" />
              <Stop offset="1" stopColor="#F5AE6C" />
            </LinearGradient>
          </Defs>
          <Ellipse cx={50} cy={21} rx={17} ry={4.6} fill="none" stroke="#FFD98C" strokeWidth={6} opacity={state === "listening" ? 0.4 : 0.22} />
          <Ellipse cx={50} cy={21} rx={17} ry={4.6} fill="none" stroke={`url(#halo${id})`} strokeWidth={2.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}
