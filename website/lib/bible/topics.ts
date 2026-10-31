// Hand-picked passages per topic, loaded into TopicVerse by scripts/import-bible.ts. They boost search for
// the companion when the classifier tags a message with a topic, and keep well-known answers well-known.
// The funnel's struggle topics (anxiety, grief…) come from funnels/verses.ts and are merged in by the import.
// References only: the text always comes from the Bible tables.

export const TOPICS: Record<string, string[]> = {
  forgiveness: ["Ephesians 4:32", "Colossians 3:13", "Matthew 6:14-15", "1 John 1:9", "Psalm 103:12"],
  fear: ["Isaiah 41:10", "Joshua 1:9", "Psalm 56:3", "2 Timothy 1:7", "Psalm 27:1"],
  hope: ["Romans 15:13", "Jeremiah 29:11", "Romans 8:28", "Lamentations 3:22-23", "Hebrews 11:1"],
  strength: ["Philippians 4:13", "Isaiah 40:31", "2 Corinthians 12:9", "Psalm 46:1"],
  peace: ["John 14:27", "Philippians 4:6-7", "Isaiah 26:3", "Matthew 11:28-30", "Psalm 4:8"],
  love: ["1 Corinthians 13:4-7", "1 John 4:7-8", "Romans 8:38-39", "John 15:12", "John 3:16"],
  patience: ["Psalm 27:14", "Romans 12:12", "James 1:2-4", "Galatians 6:9"],
  temptation: ["1 Corinthians 10:13", "James 1:12", "Matthew 26:41", "Hebrews 4:15-16"],
  purpose: ["Proverbs 16:9", "Ephesians 2:10", "Micah 6:8", "Proverbs 3:5-6"],
  sleep: ["Psalm 4:8", "Psalm 127:2", "Proverbs 3:24", "Matthew 11:28"],
  marriage: ["Ephesians 5:25", "Colossians 3:14", "Ecclesiastes 4:9-12", "1 Corinthians 13:4-7"],
  parenting: ["Proverbs 22:6", "Psalm 127:3", "Deuteronomy 6:6-7", "Ephesians 6:4"],
  anger: ["Ephesians 4:26-27", "James 1:19-20", "Proverbs 15:1", "Psalm 37:8"],
  money: ["Matthew 6:31-33", "Hebrews 13:5", "Philippians 4:19", "Proverbs 3:9-10"],
  prayer: ["Matthew 6:9-13", "1 Thessalonians 5:16-18", "Romans 8:26", "James 5:16"],
  grace: ["Ephesians 2:8-9", "Romans 10:9", "Titus 3:5", "2 Corinthians 5:17"],
  death: ["John 11:25-26", "Revelation 21:4", "Psalm 23:4", "1 Thessalonians 4:13-14"],
};
