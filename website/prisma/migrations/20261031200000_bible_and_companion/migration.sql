-- CreateEnum
CREATE TYPE "Testament" AS ENUM ('OT', 'NT', 'DC');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "SafetyCategory" AS ENUM ('on_topic', 'off_topic', 'jailbreak', 'crisis', 'abuse');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memorySummary" TEXT;

-- CreateTable
CREATE TABLE "BibleBook" (
    "id" INTEGER NOT NULL,
    "osis" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "testament" "Testament" NOT NULL,

    CONSTRAINT "BibleBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleVerse" (
    "translation" "Translation" NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("translation","bookId","chapter","verse")
);

-- CreateTable
CREATE TABLE "TopicVerse" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "TopicVerse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerseOfDay" (
    "date" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,

    CONSTRAINT "VerseOfDay_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "category" "SafetyCategory",
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatQuota" (
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatQuota_pkey" PRIMARY KEY ("userId","date")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BibleBook_osis_key" ON "BibleBook"("osis");

-- CreateIndex
CREATE INDEX "TopicVerse_topic_idx" ON "TopicVerse"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "TopicVerse_topic_bookId_chapter_verseStart_key" ON "TopicVerse"("topic", "bookId", "chapter", "verseStart");

-- CreateIndex
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_flagged_idx" ON "Message"("flagged");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_userId_idx" ON "AiUsage"("userId");

-- AddForeignKey
ALTER TABLE "BibleVerse" ADD CONSTRAINT "BibleVerse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────── Hand-written: search indexes, outside Prisma ─────────
-- Prisma can't express a tsvector GIN or an HNSW index, and it only manages the "public" schema, so these
-- tables live in a "search" schema it never diffs. Filled by scripts/import-bible.ts and scripts/embed-bible.ts;
-- queried with raw SQL in lib/bible/search.ts.

-- pgvector (the pgvector/pgvector Postgres image has it; so do Neon and Supabase)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS search;

-- Keyword search: one row per verse
CREATE TABLE search.verse_text (
    translation TEXT NOT NULL,
    book_id     INTEGER NOT NULL,
    chapter     INTEGER NOT NULL,
    verse       INTEGER NOT NULL,
    tsv         TSVECTOR NOT NULL,
    PRIMARY KEY (translation, book_id, chapter, verse)
);
CREATE INDEX verse_text_tsv_idx ON search.verse_text USING GIN (tsv);

-- Meaning-based search: WEB windows of 1 and 3 verses (a hit is a reference, shown in any translation)
CREATE TABLE search.verse_embedding (
    book_id     INTEGER NOT NULL,
    chapter     INTEGER NOT NULL,
    verse_start INTEGER NOT NULL,
    verse_end   INTEGER NOT NULL,
    embedding   vector(1024) NOT NULL,
    PRIMARY KEY (book_id, chapter, verse_start, verse_end)
);
CREATE INDEX verse_embedding_hnsw_idx ON search.verse_embedding USING hnsw (embedding vector_cosine_ops);
