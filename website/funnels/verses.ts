// Hand-picked World English Bible verses (public domain) per struggle. The sample prayer may only cite these,
// so no reference is ever invented. Replaced by the Bible tables + topic map (SPEC §2.4) once they're imported.

export type Citation = { ref: string; text: string };

export const VERSES: Record<string, Citation[]> = {
  anxiety: [
    { ref: "Philippians 4:6–7", text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus." },
    { ref: "1 Peter 5:7", text: "casting all your worries on him, because he cares for you." },
    { ref: "Matthew 6:34", text: "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself. Each day’s own evil is sufficient." },
  ],
  grief: [
    { ref: "Psalm 34:18", text: "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit." },
    { ref: "Matthew 5:4", text: "Blessed are those who mourn, for they shall be comforted." },
    { ref: "Psalm 147:3", text: "He heals the broken in heart, and binds up their wounds." },
  ],
  family: [
    { ref: "Colossians 3:13", text: "bearing with one another, and forgiving each other, if any man has a complaint against any; even as Christ forgave you, so you also do." },
    { ref: "Psalm 68:6", text: "God sets the lonely in families. He brings out the prisoners with singing, but the rebellious dwell in a sun-scorched land." },
  ],
  work: [
    { ref: "Proverbs 3:5–6", text: "Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight." },
    { ref: "Philippians 4:19", text: "My God will supply every need of yours according to his riches in glory in Christ Jesus." },
    { ref: "Colossians 3:23", text: "And whatever you do, work heartily, as for the Lord, and not for men," },
  ],
  health: [
    { ref: "Jeremiah 17:14", text: "Heal me, O Yahweh, and I will be healed. Save me, and I will be saved; for you are my praise." },
    { ref: "Isaiah 41:10", text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness." },
  ],
  loneliness: [
    { ref: "Deuteronomy 31:6", text: "Be strong and courageous. Don’t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you." },
    { ref: "Psalm 68:6", text: "God sets the lonely in families. He brings out the prisoners with singing, but the rebellious dwell in a sun-scorched land." },
  ],
  doubt: [
    { ref: "Mark 9:24", text: "Immediately the father of the child cried out with tears, “I believe. Help my unbelief!”" },
    { ref: "Isaiah 41:10", text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness." },
  ],
  guilt: [
    { ref: "1 John 1:9", text: "If we confess our sins, he is faithful and righteous to forgive us the sins, and to cleanse us from all unrighteousness." },
    { ref: "Psalm 147:3", text: "He heals the broken in heart, and binds up their wounds." },
  ],
  gratitude: [
    { ref: "1 Thessalonians 5:18", text: "In everything give thanks, for this is the will of God in Christ Jesus toward you." },
    { ref: "Psalm 118:24", text: "This is the day that Yahweh has made. We will rejoice and be glad in it!" },
  ],
};

export const DEFAULT_VERSES = [VERSES.anxiety[1], VERSES.grief[0], { ref: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest." }];

// Verses the prayer may cite for these struggles, without duplicates
export function versesFor(struggles: string[] = []) {
  const list = struggles.flatMap((s) => VERSES[s] ?? []);
  const unique = [...new Map((list.length ? list : DEFAULT_VERSES).map((v) => [v.ref, v])).values()];
  return unique.slice(0, 6);
}
