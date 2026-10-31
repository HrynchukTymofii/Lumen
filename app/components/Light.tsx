import { useEffect } from "react";
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
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

// The Light (SPEC §3): a flat sun with a dashed orbit and a soft halo. Same drawing as lightSvg() in
// website/lib/kit/art.ts; the CSS animations there become Reanimated loops here.
//   idle: breathes (4.4s), orbit turns once per 40s · listening: 1.3s pulse, orbit 6s
//   thinking: orbit spins fast (2.6s) · speaking: three rings ripple outward, 0.7s apart

export type LightState = "idle" | "listening" | "thinking" | "speaking";

const TIMING: Record<LightState, { pulse: number; orbit: number }> = {
  idle: { pulse: 4400, orbit: 40000 },
  listening: { pulse: 1300, orbit: 6000 },
  thinking: { pulse: 2200, orbit: 2600 },
  speaking: { pulse: 2200, orbit: 12000 },
};

const ease = Easing.inOut(Easing.sin);

function Ripple({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - progress.value),
    transform: [{ scale: 0.72 + progress.value * 0.55 }],
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: "#F5AE6C" }, style]}
    />
  );
}

export function Light({ size = 150, state = "idle" }: { size?: number; state?: LightState }) {
  const pulse = useSharedValue(1);
  const spin = useSharedValue(0);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);

  useEffect(() => {
    const { pulse: p, orbit } = TIMING[state];
    pulse.value = 1;
    pulse.value = withRepeat(withTiming(1.07, { duration: p / 2, easing: ease }), -1, true);
    spin.value = 0;
    spin.value = withRepeat(withTiming(360, { duration: orbit, easing: Easing.linear }), -1, false);

    const ripples = [r1, r2, r3];
    ripples.forEach((r, i) => {
      r.value = 0;
      if (state === "speaking") r.value = withDelay(i * 700, withRepeat(withTiming(1, { duration: 2100, easing: Easing.out(Easing.quad) }), -1, false));
    });
    return () => [pulse, spin, ...ripples].forEach(cancelAnimation);
  }, [state, pulse, spin, r1, r2, r3]);

  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const layer = { position: "absolute" as const, width: size, height: size };

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[layer, breathe]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={47} fill="#FFD98C" opacity={0.22} />
        </Svg>
      </Animated.View>
      <Ripple progress={r1} size={size * 0.72} />
      <Ripple progress={r2} size={size * 0.72} />
      <Ripple progress={r3} size={size * 0.72} />
      <Animated.View style={[layer, turn]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={39.5} fill="none" stroke="#A9B98A" strokeWidth={2.2} strokeDasharray="15 9" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer, breathe]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="lightCore" cx="40%" cy="36%" r="72%">
              <Stop offset="0" stopColor="#FFE9B0" />
              <Stop offset="0.7" stopColor="#FFD58A" />
              <Stop offset="1" stopColor="#F8BC74" />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={29} fill="url(#lightCore)" />
          <Circle cx={50} cy={50} r={19} fill="#FFF1C9" opacity={0.55} />
        </Svg>
      </Animated.View>
    </View>
  );
}
