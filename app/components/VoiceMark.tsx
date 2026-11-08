import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import { knownVoice, type VoiceId } from "@/lib/api/prayers";

// A small, still Light (components/Light.tsx) in each voice's own color, so the voices are easy to tell apart.
// Pastel-bright in both themes, like the Light itself.

type Tint = { glow: string; light: string; mid: string; deep: string };

const TINTS: Record<VoiceId, Tint> = {
  grace: { glow: "#FFD98C", light: "#FFE4A3", mid: "#FBC676", deep: "#E8935A" }, // warm gold, the Light's own
  ruth: { glow: "#F9B8C8", light: "#FFD3DD", mid: "#F49AB0", deep: "#D9667F" }, // rose
  matthew: { glow: "#A9CBF2", light: "#CFE3FA", mid: "#8DB7EA", deep: "#4F82C4" }, // sky
  john: { glow: "#B5DDA8", light: "#D6EDCB", mid: "#9ACB88", deep: "#5E9A4C" }, // sage
};

export function VoiceMark({ voice, size = 44 }: { voice: VoiceId; size?: number }) {
  const id = useId().replace(/:/g, "");
  const t = TINTS[knownVoice(voice)];
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`aura${id}`} gradientUnits="userSpaceOnUse" cx={50} cy={60} r={44}>
            <Stop offset="0.45" stopColor={t.glow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={t.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`body${id}`} gradientUnits="userSpaceOnUse" cx={50} cy={60} r={30} fx={42} fy={49}>
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.35" stopColor={t.light} />
            <Stop offset="0.8" stopColor={t.mid} />
            <Stop offset="1" stopColor={t.deep} />
          </RadialGradient>
          <LinearGradient id={`halo${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.deep} />
            <Stop offset="0.5" stopColor={t.light} />
            <Stop offset="1" stopColor={t.deep} />
          </LinearGradient>
        </Defs>
        <Circle cx={50} cy={60} r={44} fill={`url(#aura${id})`} />
        <Circle cx={50} cy={60} r={28} fill={`url(#body${id})`} />
        <Ellipse cx={41} cy={49} rx={8} ry={5} fill="#FFFFFF" opacity={0.45} transform="rotate(-30 41 49)" />
        <Ellipse cx={50} cy={19} rx={18} ry={5} fill="none" stroke={`url(#halo${id})`} strokeWidth={4} />
      </Svg>
    </View>
  );
}
