// Voices a personal prayer can be read in (ElevenLabs). The app shows only the name; ids are ours, so a voice can
// change on ElevenLabs without touching the app. Keep in step with VOICES in app/lib/api/prayers.ts.

export const VOICES = {
  grace: { name: "Grace", gender: "female", elevenLabsId: "zA6D7RyKdc2EClouEMkP" },
  ruth: { name: "Ruth", gender: "female", elevenLabsId: "Atp5cNFg1Wj5gyKD7HWV" },
  matthew: { name: "Matthew", gender: "male", elevenLabsId: "8rR7lSanqYt6DVpJHArb" },
  john: { name: "John", gender: "male", elevenLabsId: "FYZl5JbWOAm6O1fPKAOu" },
} as const;

export type VoiceId = keyof typeof VOICES;
export const VOICE_IDS = Object.keys(VOICES) as [VoiceId, ...VoiceId[]];
export const DEFAULT_VOICE: VoiceId = "john";
