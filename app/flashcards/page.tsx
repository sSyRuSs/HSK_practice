"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  RotateCcw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PronunciationButton } from "@/components/pronunciation-button";
import { useProgress } from "@/hooks/use-progress";
import {
  getWordsByLevel,
  getWordById,
  LEVEL_NAMES,
} from "@/data/hsk-vocabulary";
import type { SRSRating } from "@/lib/srs";

const RATINGS: {
  rating: SRSRating;
  label: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
}[] = [
  {
    rating: 0,
    label: "Quên",
    emoji: "😞",
    bg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-700 dark:text-red-300",
  },
  {
    rating: 1,
    label: "Khó",
    emoji: "😕",
    bg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
  },
  {
    rating: 2,
    label: "Ổn",
    emoji: "🙂",
    bg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
  },
  {
    rating: 3,
    label: "Dễ",
    emoji: "😄",
    bg: "bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
  },
];

function FlashcardsInner() {
  const searchParams = useSearchParams();
  const initialLevel = searchParams.get("level")
    ? Number(searchParams.get("level"))
    : 0;

  const { getDueWords, rateWord, hydrated, toggleBookmark, isBookmarked } = useProgress();

  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel);
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [showFront, setShowFront] = useState<"hanzi" | "meaning">("hanzi");
  const [showSettings, setShowSettings] = useState(false);
  const [flipKey, setFlipKey] = useState(0); // triggers re-animation

  // Init/reset session when level changes
  useEffect(() => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids =
      selectedLevel === 0
        ? due.map((w) => w.id)
        : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    const words =
      ids.length > 0
        ? ids.slice(0, 20)
        : getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1)
            .map((w) => w.id)
            .slice(0, 20);
    setSessionWords(words);
    setCardIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setFlipKey((k) => k + 1);
  }, [hydrated, selectedLevel]);

  const currentWordId = sessionWords[cardIndex];
  const currentWord = currentWordId ? getWordById(currentWordId) : null;

  const handleFlip = useCallback(() => {
    setFlipped((f) => !f);
    setFlipKey((k) => k + 1);
  }, []);

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!currentWordId) return;
      rateWord(currentWordId, rating);
      if (cardIndex + 1 >= sessionWords.length) {
        setSessionDone(true);
      } else {
        setCardIndex((i) => i + 1);
        setFlipped(false);
        setFlipKey((k) => k + 1);
      }
    },
    [currentWordId, rateWord, cardIndex, sessionWords.length],
  );

  const handleNav = useCallback((dir: -1 | 1) => {
    setCardIndex((i) => i + dir);
    setFlipped(false);
    setFlipKey((k) => k + 1);
  }, []);

  const handleRestart = useCallback(() => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids =
      selectedLevel === 0
        ? due.map((w) => w.id)
        : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    const words =
      ids.length > 0
        ? ids.slice(0, 20)
        : getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1)
            .map((w) => w.id)
            .slice(0, 20);
    setSessionWords(words);
    setCardIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setFlipKey((k) => k + 1);
  }, [hydrated, selectedLevel, getDueWords]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === " " || e.key === "f") {
        e.preventDefault();
        handleFlip();
        return;
      }
      if (flipped) {
        const r = RATINGS.find((b) => b.rating === Number(e.key) - 1);
        if (r) handleRate(r.rating);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, handleFlip, handleRate]);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  const dueCount = getDueWords().filter(
    (w) => selectedLevel === 0 || w.level === selectedLevel,
  ).length;
  const progressPct =
    sessionWords.length > 0
      ? Math.round((cardIndex / sessionWords.length) * 100)
      : 0;

  // ── Session done screen ──
  if (sessionDone) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="text-7xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold">Hoàn thành!</h2>
            <p className="text-muted-foreground mt-1">
              Bạn đã ôn tập {sessionWords.length} từ trong phiên này
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRestart} size="lg">
              <RotateCcw className="h-4 w-4 mr-2" /> Học lại
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setSelectedLevel(selectedLevel === 6 ? 0 : selectedLevel + 1)
              }
            >
              Cấp tiếp →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── No words screen ──
  if (sessionWords.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-semibold">Không có từ cần ôn!</h2>
          <p className="text-muted-foreground text-sm">
            Thử chọn cấp độ khác để học từ mới
          </p>
          <Select
            value={String(selectedLevel)}
            onValueChange={(v) => setSelectedLevel(Number(v))}
          >
            <SelectTrigger className="w-48 mx-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả cấp độ</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {LEVEL_NAMES[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // ── Main flashcard ──
  return (
    <div className="container mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedLevel)}
            onValueChange={(v) => setSelectedLevel(Number(v))}
          >
            <SelectTrigger className="h-8 text-xs w-36 border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả cấp độ</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {LEVEL_NAMES[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {dueCount} từ cần ôn
          </span>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cài đặt"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Mặt trước hiện</span>
            <Select
              value={showFront}
              onValueChange={(v) => setShowFront(v as "hanzi" | "meaning")}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hanzi">Chữ Hán</SelectItem>
                <SelectItem value="meaning">Nghĩa tiếng Việt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground pt-1 border-t">
            <span className="font-medium text-foreground">Phím tắt: </span>
            Space/F lật thẻ · 1 Quên · 2 Khó · 3 Ổn · 4 Dễ
          </div>
        </div>
      )}

      {/* ── Progress ── */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Thẻ {cardIndex + 1} / {sessionWords.length}
          </span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* ── Card ── */}
      {currentWord && (
        <div
          key={flipKey}
          className="flashcard-flip rounded-2xl border bg-card shadow-sm cursor-pointer select-none min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 relative transition-shadow hover:shadow-md active:scale-[0.99]"
          onClick={handleFlip}
        >
          {/* HSK badge top-left */}
          <div className="absolute top-4 left-4">
            <Badge variant="outline" className="text-xs font-medium">
              HSK {currentWord.level}
            </Badge>
          </div>

          {/* Side indicator top-right */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <PronunciationButton
              text={currentWord.simplified}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            />
            <button
              className="text-muted-foreground hover:text-red-500 transition-colors focus:outline-none"
              onClick={(e) => { e.stopPropagation(); toggleBookmark(currentWord.id); }}
              aria-label={isBookmarked(currentWord.id) ? "Bỏ yêu thích" : "Yêu thích"}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${isBookmarked(currentWord.id) ? "fill-red-500 text-red-500" : ""}`}
              />
            </button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {flipped ? "Mặt sau" : "Mặt trước"}
            </span>
          </div>

          {/* Content */}
          {!flipped ? (
            /* ── Front ── */
            <div className="text-center space-y-3">
              {showFront === "hanzi" ? (
                <>
                  <p className="hanzi-xl font-bold tracking-wide">
                    {currentWord.simplified}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-semibold leading-snug">
                  {currentWord.meaning}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Chạm hoặc nhấn Space để lật
              </p>
            </div>
          ) : (
            /* ── Back ── */
            <div className="text-center space-y-3 w-full">
              {showFront === "hanzi" ? (
                <>
                  <p className="text-3xl font-bold text-primary">
                    {currentWord.pinyin}
                  </p>
                  <p className="text-xl font-medium leading-snug">
                    {currentWord.meaning}
                  </p>
                </>
              ) : (
                <>
                  <p className="hanzi-xl font-bold tracking-wide">
                    {currentWord.simplified}
                  </p>
                  <p className="text-xl text-muted-foreground">
                    {currentWord.pinyin}
                  </p>
                </>
              )}
              <Badge variant="secondary" className="text-xs mt-1">
                {currentWord.partOfSpeech}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* ── Rating buttons ── */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r, idx) => (
            <button
              key={r.rating}
              onClick={() => handleRate(r.rating)}
              className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all active:scale-95 ${r.bg} ${r.border}`}
            >
              <span className="text-xl">{r.emoji}</span>
              <span className={`text-xs font-semibold ${r.text}`}>
                {r.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                [{idx + 1}]
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-11 text-sm font-medium"
          onClick={handleFlip}
        >
          Lật thẻ{" "}
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            Space
          </kbd>
        </Button>
      )}

      {/* ── Card nav ── */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={cardIndex === 0}
          onClick={() => handleNav(-1)}
          className="text-xs text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Trước
        </Button>
        <div className="flex gap-1">
          {sessionWords
            .slice(Math.max(0, cardIndex - 2), cardIndex + 5)
            .map((_, i) => {
              const realIdx = Math.max(0, cardIndex - 2) + i;
              return (
                <div
                  key={realIdx}
                  className={`h-1.5 rounded-full transition-all ${
                    realIdx === cardIndex
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              );
            })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={cardIndex + 1 >= sessionWords.length}
          onClick={() => handleNav(1)}
          className="text-xs text-muted-foreground"
        >
          Sau <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense>
      <FlashcardsInner />
    </Suspense>
  );
}

