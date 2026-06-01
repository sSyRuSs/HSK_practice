"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useProgress } from "@/hooks/use-progress";
import { getWordsByLevel, getWordById, LEVEL_NAMES } from "@/data/hsk-vocabulary";
import type { SRSRating } from "@/lib/srs";

const RATING_BUTTONS: { rating: SRSRating; label: string; color: string; shortcut: string }[] = [
  { rating: 0, label: "Quên",  color: "bg-red-500 hover:bg-red-600 text-white",       shortcut: "1" },
  { rating: 1, label: "Khó",   color: "bg-orange-500 hover:bg-orange-600 text-white", shortcut: "2" },
  { rating: 2, label: "Ổn",    color: "bg-blue-500 hover:bg-blue-600 text-white",     shortcut: "3" },
  { rating: 3, label: "Dễ",    color: "bg-green-500 hover:bg-green-600 text-white",   shortcut: "4" },
];

function FlashcardsInner() {
  const searchParams = useSearchParams();
  const initialLevel = searchParams.get("level") ? Number(searchParams.get("level")) : 0;

  const { getDueWords, rateWord, getWordProgress, hydrated } = useProgress();

  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel);
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [showFront, setShowFront] = useState<"hanzi" | "meaning">("hanzi");

  const dueWordIds = useMemo(() => {
    if (!hydrated) return [];
    const due = getDueWords();
    const ids = due.map((w) => w.id);
    if (selectedLevel === 0) return ids;
    return due.filter((w) => w.level === selectedLevel).map((w) => w.id);
  }, [hydrated, selectedLevel, getDueWords]);

  // Init session words
  useEffect(() => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids = selectedLevel === 0
      ? due.map((w) => w.id)
      : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    // If no due words, fall back to first 20 words of that level for new study
    if (ids.length === 0) {
      const fallback = getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1).map((w) => w.id);
      setSessionWords(fallback.slice(0, 20));
    } else {
      setSessionWords(ids.slice(0, 20));
    }
    setCardIndex(0);
    setFlipped(false);
    setSessionDone(false);
  }, [hydrated, selectedLevel]);

  const currentWordId = sessionWords[cardIndex];
  const currentWord = currentWordId ? getWordById(currentWordId) : null;
  const progress = currentWordId ? getWordProgress(currentWordId) : null;

  const handleFlip = useCallback(() => setFlipped((f) => !f), []);

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!currentWordId) return;
      rateWord(currentWordId, rating);
      if (cardIndex + 1 >= sessionWords.length) {
        setSessionDone(true);
      } else {
        setCardIndex((i) => i + 1);
        setFlipped(false);
      }
    },
    [currentWordId, rateWord, cardIndex, sessionWords.length]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " " || e.key === "f") { handleFlip(); return; }
      if (flipped) {
        const btn = RATING_BUTTONS.find((b) => b.shortcut === e.key);
        if (btn) handleRate(btn.rating);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, handleFlip, handleRate]);

  const handleRestart = () => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids = selectedLevel === 0
      ? due.map((w) => w.id)
      : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    const toStudy = ids.length > 0
      ? ids.slice(0, 20)
      : getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1).map((w) => w.id).slice(0, 20);
    setSessionWords(toStudy);
    setCardIndex(0);
    setFlipped(false);
    setSessionDone(false);
  };

  if (!hydrated) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  const progressPct = sessionWords.length > 0 ? Math.round((cardIndex / sessionWords.length) * 100) : 0;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flashcard 🃏</h1>
          <p className="text-sm text-muted-foreground">
            {dueWordIds.length > 0 ? `${dueWordIds.length} từ cần ôn tập` : "Không có từ đến hạn"}
          </p>
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Settings className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Cài đặt</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Cấp độ HSK</label>
                <Select
                  value={String(selectedLevel)}
                  onValueChange={(v) => setSelectedLevel(Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tất cả cấp độ</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map((l) => (
                      <SelectItem key={l} value={String(l)}>{LEVEL_NAMES[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mặt trước hiện</label>
                <Select
                  value={showFront}
                  onValueChange={(v) => setShowFront(v as "hanzi" | "meaning")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hanzi">Chữ Hán</SelectItem>
                    <SelectItem value="meaning">Nghĩa tiếng Việt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Phím tắt:</p>
                <p>Space / F — Lật thẻ</p>
                <p>1 — Quên  |  2 — Khó  |  3 — Ổn  |  4 — Dễ</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Progress bar */}
      {sessionWords.length > 0 && (
        <div className="space-y-1">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{cardIndex}/{sessionWords.length}</p>
        </div>
      )}

      {/* Session done */}
      {sessionDone ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <p className="text-5xl">🎉</p>
            <p className="text-xl font-semibold">Hoàn thành phiên học!</p>
            <p className="text-muted-foreground">Bạn đã ôn tập {sessionWords.length} từ</p>
            <Button onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" /> Học lại
            </Button>
          </CardContent>
        </Card>
      ) : sessionWords.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <p className="text-5xl">✅</p>
            <p className="text-xl font-semibold">Không có từ cần ôn!</p>
            <p className="text-muted-foreground">Thử chọn một cấp độ khác để học từ mới</p>
          </CardContent>
        </Card>
      ) : currentWord ? (
        <>
          {/* Card */}
          <div
            className="flashcard-scene cursor-pointer select-none"
            style={{ minHeight: 280 }}
            onClick={handleFlip}
          >
            <div className={`flashcard-card ${flipped ? "is-flipped" : ""}`}>
              {/* Front */}
              <div className="flashcard-face flashcard-front rounded-2xl border bg-card shadow-md flex flex-col items-center justify-center gap-3 p-8">
                {showFront === "hanzi" ? (
                  <>
                    <p className="hanzi-xl font-bold">{currentWord.simplified}</p>
                    <p className="text-muted-foreground text-sm">Chạm để lật</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-center">{currentWord.meaning}</p>
                    <p className="text-muted-foreground text-sm">Chạm để lật</p>
                  </>
                )}
                <Badge variant="outline" className="absolute top-3 right-3 text-xs">
                  HSK{currentWord.level}
                </Badge>
              </div>
              {/* Back */}
              <div className="flashcard-face flashcard-back rounded-2xl border bg-card shadow-md flex flex-col items-center justify-center gap-3 p-8">
                {showFront === "hanzi" ? (
                  <>
                    <p className="text-4xl font-bold">{currentWord.pinyin}</p>
                    <p className="text-xl font-medium text-center">{currentWord.meaning}</p>
                    <Badge variant="secondary">{currentWord.partOfSpeech}</Badge>
                  </>
                ) : (
                  <>
                    <p className="hanzi-xl font-bold">{currentWord.simplified}</p>
                    <p className="text-xl text-muted-foreground">{currentWord.pinyin}</p>
                    <Badge variant="secondary">{currentWord.partOfSpeech}</Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Rating buttons */}
          {flipped ? (
            <div className="grid grid-cols-4 gap-2">
              {RATING_BUTTONS.map((b) => (
                <Button
                  key={b.rating}
                  className={`${b.color} flex flex-col h-auto py-2 gap-0.5`}
                  onClick={() => handleRate(b.rating)}
                >
                  <span className="font-semibold text-sm">{b.label}</span>
                  <span className="text-[10px] opacity-75">[{b.shortcut}]</span>
                </Button>
              ))}
            </div>
          ) : (
            <Button className="w-full" variant="outline" onClick={handleFlip}>
              Lật thẻ (Space)
            </Button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              disabled={cardIndex === 0}
              onClick={() => { setCardIndex((i) => i - 1); setFlipped(false); }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Trước
            </Button>
            <span>{currentWord.simplified} — {LEVEL_NAMES[currentWord.level]}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={cardIndex + 1 >= sessionWords.length}
              onClick={() => { setCardIndex((i) => i + 1); setFlipped(false); }}
            >
              Sau <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      ) : null}
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
