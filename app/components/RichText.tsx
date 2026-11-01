import { Text, View } from "react-native";

// Draws the markup the note drawer writes: **bold**, "• " bullets and "> " quotes. Everything else is plain text.

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <Text key={i} className="font-sans-bold">
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function RichText({ text, lines, className = "font-sans text-[15px] leading-6 text-ink" }: { text: string; lines?: number; className?: string }) {
  // A preview with a line limit is one flowing paragraph
  if (lines) {
    return (
      <Text className={className} numberOfLines={lines}>
        <Inline text={text.replace(/^(• |> )/gm, "").replace(/\n+/g, " ")} />
      </Text>
    );
  }
  return (
    <View className="gap-1">
      {text.split("\n").map((line, i) =>
        line.startsWith("• ") ? (
          <View key={i} className="flex-row gap-2 pl-1">
            <Text className={className}>•</Text>
            <Text className={`flex-1 ${className}`}>
              <Inline text={line.slice(2)} />
            </Text>
          </View>
        ) : line.startsWith("> ") ? (
          <View key={i} className="border-l-[3px] border-olive pl-3">
            <Text className={`${className} italic`}>
              <Inline text={line.slice(2)} />
            </Text>
          </View>
        ) : (
          <Text key={i} className={className}>
            <Inline text={line || " "} />
          </Text>
        ),
      )}
    </View>
  );
}
