import type { ColorValue } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// Line icons from the design kit (design/kit/kit.js). No emoji as icons (SPEC §3).

type IconProps = { size?: number; color: ColorValue };

const line = { fill: "none", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ArrowIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} {...line} />
    </Svg>
  );
}

export function BackIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" stroke={color} {...line} />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} {...line} strokeWidth={2.8} />
    </Svg>
  );
}

export function BookIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 20.5A2.5 2.5 0 006.5 23H20v-5" stroke={color} {...line} />
    </Svg>
  );
}

export function MailIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5zM3.5 6l8.5 7 8.5-7" stroke={color} {...line} />
    </Svg>
  );
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
      <Path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0012 23z" />
      <Path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1a11 11 0 000 9.9z" />
      <Path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 002.1 7l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
    </Svg>
  );
}

// Tab bar (same shapes as the web app's tab-nav.tsx)
export function SunIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} stroke={color} {...line} />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke={color} {...line} />
    </Svg>
  );
}

export function PrayersIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z" stroke={color} {...line} />
    </Svg>
  );
}

export function ChatIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" stroke={color} {...line} />
    </Svg>
  );
}

export function PersonIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} stroke={color} {...line} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} {...line} />
    </Svg>
  );
}

export function LockIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 017 0V11" stroke={color} {...line} />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...line} />
    </Svg>
  );
}

export function SendIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 19V5M6 11l6-6 6 6" stroke={color} {...line} />
    </Svg>
  );
}

// A path climbing a hill (Journey tab)
export function JourneyIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 20l5-8 4 5 3-4 6 7z" stroke={color} {...line} />
      <Circle cx={16} cy={6} r={2} stroke={color} {...line} />
    </Svg>
  );
}

export function PlayIcon({ size = 26, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4.5v15l12-7.5z" stroke={color} {...line} fill={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function PauseIcon({ size = 26, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 5h3v14H7zM14 5h3v14h-3z" stroke={color} {...line} fill={color} strokeWidth={1.5} />
    </Svg>
  );
}

// Back / forward 15 seconds
export function SkipIcon({ size = 24, color, forward }: IconProps & { forward?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={forward ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M4 12a8 8 0 108-8H8M8 1L5 4l3 3" stroke={color} {...line} />
    </Svg>
  );
}

export function GearIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3} stroke={color} {...line} />
      <Path
        d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
        stroke={color}
        {...line}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" stroke={color} {...line} />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} {...line} />
    </Svg>
  );
}
