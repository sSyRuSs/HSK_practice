"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProgress } from "@/hooks/use-progress";
import {
  getWordsByLevel,
  getWordById,
  LEVEL_NAMES,
} from "@/data/hsk-vocabulary";
import type { SRSRating } from "@/lib/srs";

type Mode = "hanzi-to-pinyin" | "meaning-to-pinyin" | "hanzi-to-meaning";

// Strip tone diacritics for lenient pinyin comparison
function normalizePinyin(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/v/g, "u"); // v as ü substitute
}

function checkAnswer(input: string, correct: string, mode: Mode): boolean {
  if (mode === "hanzi-to-pinyin" || mode === "meaning-to-pinyin") {
    return normalizePinyin(input) === normalizePinyin(correct);
  }
  // hanzi-to-meaning: accept partial match on any comma-separated meaning
  const inp = input.toLowerCase().trim();
  const meanings = correct
    .toLowerCase()
    .split(/[,;/]/)
    .map((m) => m.trim());
  return meanings.some(
    (m) => inp === m || m.startsWith(inp) || inp.startsWith(m),
  );
}

function WritingInner() {
  const searchParams = useSearchParams();
  const initialLevel = searchParams.get("level")
    ? Number(searchParams.get("level"))
    : 0;

  const { getDueWords, rateWord, hydrated } = useProgress();

  const [selectedLevel, setSelectedLevel] = useState(initialLevel);
  const [mode, setMode] = useState<Mode>("hanzi-to-pinyin");
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initSession = useCallback(() => {
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
    setInput("");
    setSubmitted(false);
    setSessionDone(false);
    setScore({ correct: 0, total: 0 });
  }, [hydrated, selectedLevel, getDueWords]);

  useEffect(() => {
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedLevel]);

  // Auto-focus input after each card
  useEffect(() => {
    if (!submitted) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [submitted, cardIndex]);

  const currentWordId = sessionWords[cardIndex];
  const currentWord = currentWordId ? getWordById(currentWordId) : null;

  const handleSubmit = useCallback(() => {
    if (!currentWord || !input.trim()) return;
    const correctAnswer =
      mode === "hanzi-to-meaning" ? currentWord.meaning : currentWord.pinyin;
    const ok = checkAnswer(input, correctAnswer, mode);
    setIsCorrect(ok);
    setSubmitted(true);
    setScore((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      total: s.total + 1,
    }));
    const rating: SRSRating = ok ? 2 : 0;
    rateWord(currentWord.id, rating);
  }, [currentWord, input, mode, rateWord]);

  const handleNext = useCallback(() => {
    if (cardIndex + 1 >= sessionWords.length) {
      setSessionDone(true);
    } else {
      setCardIndex((i) => i + 1);
      setInput("");
      setSubmitted(false);
    }
  }, [cardIndex, sessionWords.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!submitted) handleSubmit();
        else handleNext();
      }
    },
    [submitted, handleSubmit, handleNext],
  );

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

  if (sessionDone) {
    const pct =
      score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="text-7xl">
            {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hoàn thành!</h2>
            <p className="text-muted-foreground mt-1">
              Đúng {score.correct}/{score.total} từ ({pct}%)
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {score.correct}
              </p>
              <p className="text-muted-foreground text-xs mt-1">Đúng</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-red-500">
                {score.total - score.correct}
              </p>
              <p className="text-muted-foreground text-xs mt-1">Sai</p>
            </div>
          </div>
          <Button onClick={initSession} size="lg" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Luyện lại
          </Button>
        </div>
      </div>
    );
  }

  if (sessionWords.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-semibold">Không có từ cần luyện!</h2>
          <p className="text-muted-foreground text-sm">Thử chọn cấp độ khác</p>
        </div>
      </div>
    );
  }

  const progressPct =
    sessionWords.length > 0
      ? Math.round((cardIndex / sessionWords.length) * 100)
      : 0;
  const correctAnswer = currentWord
    ? mode === "hanzi-to-meaning"
      ? currentWord.meaning
      : currentWord.pinyin
    : "";

  const PLACEHOLDER: Record<Mode, string> = {
    "hanzi-to-pinyin": "Nhập pinyin (vd: nǐ hǎo hoặc ni hao)...",
    "meaning-to-pinyin": "Nhập pinyin...",
    "hanzi-to-meaning": "Nhập nghĩa tiếng Việt...",
  };

  return (
    <div className="container mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <SelectTrigger className="h-8 text-xs w-44 border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hanzi-to-pinyin">Hán → Pinyin</SelectItem>
            <SelectItem value="meaning-to-pinyin">Nghĩa → Pinyin</SelectItem>
            <SelectItem value="hanzi-to-meaning">Hán → Nghĩa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Từ {cardIndex + 1} / {sessionWords.length}
          </span>
          <span className="text-green-600 font-medium">
            ✓ {score.correct} đúng
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Card */}
      {currentWord && (
        <div className="rounded-2xl border bg-card shadow-sm p-8 space-y-6">
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs">
              HSK {currentWord.level}
            </Badge>
          </div>

          {/* Prompt */}
          <div className="text-center min-h-[90px] flex flex-col items-center justify-center gap-2">
            {mode === "meaning-to-pinyin" ? (
              <p className="text-2xl font-semibold leading-snug">
                {currentWord.meaning}
              </p>
            ) : (
              <>
                <p className="hanzi-xl font-bold">{currentWord.simplified}</p>
                {mode === "hanzi-to-meaning" && (
                  <p className="text-base text-muted-foreground">
                    {currentWord.pinyin}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Input & feedback */}
          <div className="space-y-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER[mode]}
              disabled={submitted}
              className={
                submitted
                  ? isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                    : "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                  : ""
              }
            />

            {submitted && (
              <div
                className={`rounded-xl p-4 flex items-start gap-3 ${
                  isCorrect
                    ? "bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    : "bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800"
                }`}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-sm">
                  <p
                    className={`font-semibold ${
                      isCorrect
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {isCorrect ? "Chính xác! 🎉" : "Chưa đúng"}
                  </p>
                  {!isCorrect && (
                    <p className="text-muted-foreground">
                      Đáp án:{" "}
                      <span className="font-semibold text-foreground">
                        {correctAnswer}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {currentWord.simplified} — {currentWord.pinyin} —{" "}
                    {currentWord.meaning}
                  </p>
                </div>
              </div>
            )}

            {!submitted ? (
              <Button
                className="w-full h-11"
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                Kiểm tra
                <kbd className="ml-2 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-xs font-mono">
                  Enter
                </kbd>
              </Button>
            ) : (
              <Button className="w-full h-11" onClick={handleNext}>
                {cardIndex + 1 >= sessionWords.length
                  ? "Xem kết quả"
                  : "Tiếp theo"}
                <kbd className="ml-2 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-xs font-mono">
                  Enter
                </kbd>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Live score */}
      {score.total > 0 && (
        <div className="flex justify-center gap-8 text-sm">
          <span className="text-green-600 font-medium">
            ✓ {score.correct} đúng
          </span>
          <span className="text-red-500 font-medium">
            ✗ {score.total - score.correct} sai
          </span>
        </div>
      )}
    </div>
  );
}

export default function WritingPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Luyện viết ✍️
        </h1>
        <p className="text-muted-foreground">
          Gõ pinyin hoặc nghĩa để luyện nhớ từ vựng
        </p>
      </div>
      <Suspense>
        <WritingInner />
      </Suspense>
    </div>
  );
}
