import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { VoiceMark } from "@/components/VoiceMark";
import { VoiceSheet } from "@/components/VoiceSheet";
import { InkButton, LineButton } from "@/components/ui/Button";
import { BookIcon, CopyIcon, NoteIcon, PauseIcon, PlayIcon, ShareIcon, TrashIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { openPaywall } from "@/lib/account";
import {
  DEFAULT_VOICE,
  MAX_AUDIO_WORDS,
  VOICES,
  countWords,
  deletePrayer,
  editPrayer,
  getAllowance,
  getPrayer,
  prayerError,
  recordPrayer,
  tokensFor,
  type Allowance,
  type PersonalPrayer,
  type VoiceId,
  voiceName,
} from "@/lib/api/prayers";
import { reportError } from "@/lib/errorReporting";
import { localPrayerAudio, removePrayerAudio, savePrayerAudio } from "@/lib/personalPrayerAudio";

// One personal prayer: read it, edit it, copy or share it, and listen. Listening records it with a voice the first
// time (1 token per 200 words; Premium's first short one each month is free) and then plays it like any prayer,
// following along paragraph by paragraph. After an edit the old recording still plays, with an offer to record the
// new version.

// The voice picked last time is picked again
const VOICE_KEY = "prayer-voice";

const paragraphsOf = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PersonalPrayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [prayer, setPrayer] = useState<PersonalPrayer | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<{ title: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [current, setCurrent] = useState(-1); // paragraph being read
  const [voice, setVoice] = useState<VoiceId>(DEFAULT_VOICE);
  const [choosing, setChoosing] = useState(false); // the voice drawer is open

  useEffect(() => {
    AsyncStorage.getItem(VOICE_KEY)
      .then((v) => VOICES.some((o) => o.id === v) && setVoice(v as VoiceId))
      .catch(() => {});
  }, []);


  // Fresh on every visit: the audio link expires, and a token purchase changes the balance
  useFocusEffect(
    useCallback(() => {
      getPrayer(id).then(setPrayer, (err) => setLoadError(prayerError(err).message));
      getAllowance().then(setAllowance, reportError);
    }, [id]),
  );

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(t);
  }, [note]);

  const record = async (expected: number, voice: VoiceId) => {
    if (!prayer) return;
    setRecording(true);
    setError(null);
    try {
      const updated = await recordPrayer(prayer.id, expected, voice);
      setPrayer(updated);
      getAllowance().then(setAllowance, () => {});
      if (updated.audio) savePrayerAudio(updated.audio.url);
    } catch (err) {
      const e = prayerError(err);
      if (e.code === "price_changed" && e.data?.audioPrice) {
        setPrayer({ ...prayer, audioPrice: e.data.audioPrice as PersonalPrayer["audioPrice"] });
        setError(e.message);
      } else if (e.code === "no_tokens") {
        router.push({ pathname: "/personal-prayer/tokens", params: { needed: String(prayer.audioPrice.tokens) } });
      } else if (e.code === "paywall") {
        openPaywall("prayer");
      } else {
        if (e.status >= 500 || e.status === 0) reportError(err);
        setError(e.message);
      }
    } finally {
      setRecording(false);
    }
  };

  // "Listen": without the tokens for it go straight to Premium / tokens; otherwise open the voice drawer
  const listen = () => {
    if (!prayer || !allowance) return;
    const price = prayer.audioPrice;
    if (price.tooLong) return;
    if (!price.free && allowance.tokens < price.tokens) {
      // Audio and tokens come with Premium; tokens left from an earlier Premium still work
      if (!allowance.premium) return openPaywall("prayer");
      return router.push({ pathname: "/personal-prayer/tokens", params: { needed: String(price.tokens) } });
    }
    setChoosing(true);
  };

  // A voice was picked in the drawer: remember it, then record
  const listenWith = (v: VoiceId) => {
    setChoosing(false);
    setVoice(v);
    AsyncStorage.setItem(VOICE_KEY, v).catch(() => {});
    if (!prayer || !allowance) return;
    const price = prayer.audioPrice;
    if (price.free) return record(0, v);
    if (price.tokens >= 3) {
      return Alert.alert("Record this prayer?", `It’s ${prayer.words} words, so it uses ${price.tokens} tokens. You have ${allowance.tokens}.`, [
        { text: "Cancel", style: "cancel" },
        { text: `Use ${price.tokens} tokens`, onPress: () => record(price.tokens, v) },
      ]);
    }
    record(price.tokens, v);
  };

  const save = async () => {
    if (!prayer || !editing) return;
    setSaving(true);
    setError(null);
    try {
      setPrayer(await editPrayer(prayer.id, { title: editing.title.trim() || prayer.title, text: editing.text }));
      setEditing(null);
    } catch (err) {
      setError(prayerError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert("Delete this prayer?", "It will be removed from My prayers on all your devices, with its audio.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePrayer(id);
            removePrayerAudio(id);
            router.back();
          } catch (err) {
            setError(prayerError(err).message);
          }
        },
      },
    ]);

  const copy = async () => {
    if (!prayer) return;
    await Clipboard.setStringAsync(`${prayer.title}\n\n${prayer.text}`);
    setNote("Copied");
  };

  const paragraphs = useMemo(() => (prayer ? paragraphsOf(prayer.text) : []), [prayer]);
  const editWords = editing ? countWords(editing.text) : 0;
  const audio = prayer?.audio ?? null;
  const price = prayer?.audioPrice;
  const priceLabel = !price ? "" : price.free ? "free this month" : `${price.tokens} ${price.tokens === 1 ? "token" : "tokens"}`;
  const listenLabel = `${audio?.stale ? "Record the new version" : "Listen"} · ${priceLabel}`;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader
        title="My prayer"
        fallback="/personal-prayer"
        right={
          prayer && !editing ? (
            <Pressable onPress={remove} accessibilityRole="button" accessibilityLabel="Delete prayer" hitSlop={10}>
              <TrashIcon size={20} color={c.muted} />
            </Pressable>
          ) : undefined
        }
      />
      {!prayer ? (
        <View className="mt-16 items-center px-6">
          {loadError ? <Text className="text-center font-sans text-base text-muted">{loadError}</Text> : <Light size={64} state="thinking" />}
        </View>
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
            {editing ? (
              <>
                <TextInput
                  value={editing.title}
                  onChangeText={(title) => setEditing({ ...editing, title: title.slice(0, 80) })}
                  className="rounded-2xl bg-card px-4 py-3 font-display text-[22px] text-ink"
                  accessibilityLabel="Title"
                />
                <TextInput
                  value={editing.text}
                  onChangeText={(text) => setEditing({ ...editing, text })}
                  multiline
                  textAlignVertical="top"
                  className="mt-3 min-h-[320px] rounded-3xl bg-card px-4 py-4 font-serif text-[17px] leading-7 text-ink"
                  accessibilityLabel="Prayer"
                />
                <Text className="mt-2 font-sans text-sm text-muted">
                  {editWords} words · {editWords > MAX_AUDIO_WORDS ? `audio is up to ${MAX_AUDIO_WORDS.toLocaleString()} words` : `audio: ${tokensFor(editWords)} ${tokensFor(editWords) === 1 ? "token" : "tokens"}`}
                </Text>
                {error && <Text className="mt-3 font-sans text-[15px] text-danger">{error}</Text>}
                <View className="mt-5 gap-3">
                  <InkButton label="Save" onPress={save} loading={saving} disabled={!editing.text.trim()} />
                  <LineButton label="Cancel" onPress={() => setEditing(null)} />
                </View>
              </>
            ) : (
              <>
                <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">
                  {prayer.source === "companion" ? "From the companion" : prayer.source === "manual" ? "Your prayer" : "Written for you"}
                </Text>
                <Text className="mt-1.5 font-display text-[28px] leading-[34px] text-ink">{prayer.title}</Text>

                {audio && (
                  <AudioPanel
                    key={audio.url.split("?")[0]}
                    url={audio.url}
                    lines={audio.stale ? [] : audio.lines}
                    durationSec={audio.durationSec ?? 0}
                    onParagraph={setCurrent}
                  />
                )}

                <View className="mt-4 gap-4">
                  {paragraphs.map((p, i) => (
                    <Text
                      key={i}
                      className={`font-serif text-[17px] leading-7 ${current === -1 || current === i || audio?.stale ? "text-ink" : "text-muted"}`}
                    >
                      {p}
                    </Text>
                  ))}
                </View>

                {prayer.refs.map((v) => (
                  <View key={v.ref} className="mt-3 rounded-2xl border-[1.5px] border-olive-deep/40 px-4 py-3">
                    <View className="flex-row items-center gap-2">
                      <BookIcon size={15} color={c.oliveDeep} />
                      <Text className="font-sans-bold text-sm text-olive-deep">{v.ref}</Text>
                    </View>
                    <Text className="mt-1 font-serif text-[15px] leading-6 text-muted">{v.text}</Text>
                  </View>
                ))}

                <View className="mt-5 flex-row gap-2">
                  <Chip label="Edit" onPress={() => setEditing({ title: prayer.title, text: prayer.text })}>
                    <NoteIcon size={16} color={c.ink} />
                  </Chip>
                  <Chip label={note ?? "Copy"} onPress={copy}>
                    <CopyIcon size={16} color={c.ink} />
                  </Chip>
                  <Chip label="Share" onPress={() => Share.share({ message: `${prayer.title}\n\n${prayer.text}` }).catch(reportError)}>
                    <ShareIcon size={16} color={c.ink} />
                  </Chip>
                </View>

                {audio && !audio.stale && price && !price.tooLong && (
                  <View className="mt-6 gap-2">
                    <Pressable
                      onPress={listen}
                      disabled={recording || !allowance}
                      accessibilityRole="button"
                      className="flex-row items-center gap-3 rounded-[22px] bg-card px-3 py-2.5 active:opacity-80"
                    >
                      <VoiceMark voice={audio.voice} size={40} />
                      <View className="flex-1">
                        <Text className="font-sans text-xs text-muted">Read by</Text>
                        <Text className="font-sans-bold text-[15px] text-ink">{voiceName(audio.voice)}</Text>
                      </View>
                      {recording ? (
                        <ActivityIndicator color={c.muted} style={{ marginRight: 8 }} />
                      ) : (
                        <Text className="mr-2 font-sans-semibold text-[15px] text-olive-deep">Change voice</Text>
                      )}
                    </Pressable>
                    {recording && <Text className="text-center font-sans text-sm text-muted">Recording your prayer… this can take up to half a minute.</Text>}
                    {error && <Text className="text-center font-sans text-[15px] text-danger">{error}</Text>}
                  </View>
                )}

                {(!audio || audio.stale) && price && (
                  <View className="mt-6 gap-2">
                    {price.tooLong ? (
                      <Text className="font-sans text-[15px] leading-6 text-muted">
                        Audio prayers can be up to {MAX_AUDIO_WORDS.toLocaleString()} words. This one has {prayer.words}. Shorten it to listen.
                      </Text>
                    ) : (
                      <>
                        <InkButton label={listenLabel} onPress={listen} loading={recording} disabled={!allowance} icon={<PlayIcon size={16} color={c.bg} />} />
                        <Text className="text-center font-sans text-sm text-muted">
                          {recording
                            ? "Recording your prayer… this can take up to half a minute."
                            : audio?.stale
                              ? "You edited this prayer after it was recorded. The old recording still plays above."
                              : allowance?.premium || (allowance?.tokens ?? 0) > 0
                                ? `${prayer.words} words · 1 token per ${200} words · you have ${allowance?.tokens ?? 0}`
                                : "Hear it read aloud with Premium."}
                        </Text>
                      </>
                    )}
                    {error && <Text className="text-center font-sans text-[15px] text-danger">{error}</Text>}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {choosing && prayer && (
        <VoiceSheet
          initial={voice}
          // Already recorded as it reads now: that voice would buy the same recording again
          current={audio && !audio.stale ? audio.voice : undefined}
          price={priceLabel}
          onClose={() => setChoosing(false)}
          onConfirm={listenWith}
        />
      )}
    </View>
  );
}

function Chip({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center gap-1.5 rounded-full bg-card px-4 py-2.5 active:opacity-70">
      {children}
      <Text className="font-sans-bold text-sm text-ink">{label}</Text>
    </Pressable>
  );
}

// Play / pause, progress and time. Reports which paragraph is being read, from the recording's line timings.
function AudioPanel({
  url,
  lines,
  durationSec,
  onParagraph,
}: {
  url: string;
  lines: { text: string; t: number | null }[];
  durationSec: number;
  onParagraph: (i: number) => void;
}) {
  const c = useColors();
  // A downloaded copy when there is one (checked once, so a download mid-play doesn't restart the audio)
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    localPrayerAudio(url).then((local) => alive && setSource(local ?? url));
    return () => {
      alive = false;
    };
  }, [url]);
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
  }, []);

  const duration = status.duration || durationSec;
  const at = status.currentTime;
  useEffect(() => {
    if (!status.playing && at === 0) return onParagraph(-1);
    let i = -1;
    lines.forEach((l, n) => {
      if (l.t !== null && l.t <= at + 0.2) i = n;
    });
    onParagraph(i);
  }, [at, status.playing, lines, onParagraph]);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {});
      onParagraph(-1);
    }
  }, [status.didJustFinish, player, onParagraph]);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      player.play();
      savePrayerAudio(url);
    }
  };

  return (
    <View className="mt-4 flex-row items-center gap-4 rounded-3xl bg-card px-4 py-3">
      <Pressable
        onPress={toggle}
        disabled={!source}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pause" : "Play"}
        className="h-12 w-12 items-center justify-center rounded-full bg-ink active:opacity-80"
      >
        {!source || (status.isBuffering && !status.playing) ? (
          <ActivityIndicator color={c.bg} />
        ) : status.playing ? (
          <PauseIcon size={18} color={c.bg} />
        ) : (
          <PlayIcon size={18} color={c.bg} />
        )}
      </Pressable>
      <View className="flex-1">
        <View className="h-1.5 overflow-hidden rounded-full bg-line">
          <View className="h-full rounded-full bg-ink" style={{ width: `${duration ? Math.min(100, (at / duration) * 100) : 0}%` }} />
        </View>
        <Text className="mt-1.5 font-sans text-xs text-muted">
          {clock(at)} / {clock(duration)}
        </Text>
      </View>
    </View>
  );
}
