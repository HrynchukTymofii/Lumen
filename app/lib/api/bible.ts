import api from "./client";
import type { BibleBook, BibleChapter, Translation } from "./types";

// Bible reader (website/app/api/bible/*). The server caches these for a year, and so does this module for the session.
const books = new Map<Translation, BibleBook[]>();

export async function getBooks(translation: Translation) {
  const cached = books.get(translation);
  if (cached) return cached;
  const { data } = await api.get<{ books: BibleBook[] }>("/bible/books", { params: { t: translation } });
  books.set(translation, data.books);
  return data.books;
}

export async function getChapter(translation: Translation, osis: string, chapter: number) {
  const { data } = await api.get<BibleChapter>(`/bible/${translation}/${osis}/${chapter}`);
  return data;
}
