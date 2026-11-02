import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// Whether the on-screen keyboard is up. iOS uses the "will" events so layout changes move with the keyboard;
// Android only has the "did" ones.
export function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const subs = [
      Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => setShown(true)),
      Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setShown(false)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return shown;
}
