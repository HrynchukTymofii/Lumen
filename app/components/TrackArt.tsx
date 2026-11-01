import { useState } from "react";
import { Image, View } from "react-native";
import { Scene } from "./Scene";
import type { SceneOptions } from "@website/lib/kit/art";

// A prayer's cover: the picture uploaded in the admin when there is one, otherwise its built-in scene.
// The scene also shows while the picture loads and if it fails, so there's never an empty box.
export function TrackArt({ imageUrl, scene, options }: { imageUrl?: string | null; scene: string; options?: SceneOptions }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;
  return (
    <View style={{ flex: 1, width: "100%", height: "100%" }}>
      {(!showImage || !loaded) && <Scene name={scene} options={options} />}
      {showImage && (
        <Image
          source={{ uri: imageUrl! }}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}
