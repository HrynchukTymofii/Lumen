import { getLocales } from "expo-localization";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { reportError } from "@/lib/errorReporting";

type SpeechModule = typeof import("expo-speech-recognition");

// The native module exists only in development and store builds made after it was added (not Expo Go, not
// web), so voice input is optional: without it the mic button is hidden.
function loadSpeech(): SpeechModule | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition");
  } catch {
    return null;
  }
}

const speech = loadSpeech();

// Dictation with the phone's own speech recognition (Apple Speech / Google). The words arrive while the person
// speaks; onText gets everything said since start. On iOS it stays on the phone when the language allows,
// because what people say here is personal.
export function useVoiceInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Speech events go to every screen using this hook (the chat can stay open under a note): only the one
  // that started listening takes them
  const mine = useRef(false);
  const handler = useRef(onText);
  useEffect(() => {
    handler.current = onText;
  });

  useEffect(() => {
    if (!speech) return;
    const { ExpoSpeechRecognitionModule: rec } = speech;
    const subs = [
      rec.addListener("result", (e) => {
        const text = e.results[0]?.transcript;
        if (mine.current && text) handler.current(text);
      }),
      rec.addListener("end", () => {
        mine.current = false;
        setListening(false);
      }),
      rec.addListener("error", (e) => {
        if (!mine.current) return;
        mine.current = false;
        setListening(false);
        if (e.error === "aborted" || e.error === "no-speech" || e.error === "speech-timeout") return;
        if (e.error === "not-allowed") setError("Allow the microphone and speech recognition in Settings to speak your message.");
        else {
          reportError(new Error(`Speech recognition: ${e.error} ${e.message}`));
          setError("Couldn’t hear that. Please try again or type your message.");
        }
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (mine.current) rec.abort();
    };
  }, []);

  const start = async () => {
    if (!speech || listening) return;
    const { ExpoSpeechRecognitionModule: rec } = speech;
    setError(null);
    const permission = await rec.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Allow the microphone and speech recognition in Settings to speak your message.");
      return;
    }
    mine.current = true;
    setListening(true);
    rec.start({
      lang: getLocales()[0]?.languageTag ?? "en-US",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: Platform.OS === "ios" && rec.supportsOnDeviceRecognition(),
    });
  };

  // stop keeps the last words; cancel drops them (the message was sent meanwhile)
  const stop = () => {
    if (mine.current) speech?.ExpoSpeechRecognitionModule.stop();
  };
  const cancel = () => {
    if (!mine.current) return;
    mine.current = false;
    setListening(false);
    speech?.ExpoSpeechRecognitionModule.abort();
  };

  return { available: Boolean(speech), listening, error, start, stop, cancel };
}
