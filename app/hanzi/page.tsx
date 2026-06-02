"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HanziWriter from "hanzi-writer";
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
import { useProgress } from "@/hooks/use-progress";
import {
  getWordsByLevel,
  getWordById,
  LEVEL_NAMES,
} from "@/data/hsk-vocabulary";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lightbulb,
} from "lucide-react";

function HanziPracticeInner() {
  const searchParams = useSearchParams();
  const initialLevel = searchParams.get("level")
    ? Number(searchParams.get("level"))
    : 1;

  const { getDueWords, rateWord, hydrated } = useProgress();
  const [selectedLevel, setSelectedLevel] = useState(initialLevel);
  const [sessionWords, setSessionWords] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [showStrokes, setShowStrokes] = useState(true);
  const [showOutline, setShowOutline] = useState(true);
  const [writerInstance, setWriterInstance] = useState<any>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  const writerRef = useRef<HTMLDivElement>(null);

  // Init session
  useEffect(() => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids =
      selectedLevel === 0
        ? due.map((w) => w.id)
        : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    const words =
      ids.length > 0
        ? ids.slice(0, 15)
        : getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1)
            .map((w) => w.id)
            .slice(0, 15);
    setSessionWords(words);
    setCardIndex(0);
    setQuizStarted(false);
    setQuizResult(null);
    setScore({ correct: 0, total: 0 });
    setSessionDone(false);
  }, [hydrated, selectedLevel, getDueWords]);

  const currentWordId = sessionWords[cardIndex];
  const currentWord = currentWordId ? getWordById(currentWordId) : null;

  // Init HanziWriter when character changes
  useEffect(() => {
    if (!currentWord || !writerRef.current) return;

    // Clear previous
    writerRef.current.innerHTML = "";

    const char = currentWord.simplified[0]; // First character only
    const writer = HanziWriter.create(writerRef.current, char, {
      width: 300,
      height: 300,
      padding: 5,
      showOutline: showOutline,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: "#464feb",
      radicalColor: "#168F16",
      outlineColor: "#DDD",
      drawingColor: "#333",
    });

    setWriterInstance(writer);

    return () => {
      if (writer) writer.cancelQuiz();
    };
  }, [currentWord, showOutline]);

  const handleAnimateChar = () => {
    if (writerInstance) {
      writerInstance.animateCharacter();
    }
  };

  const handleShowStroke = () => {
    setShowStrokes((s) => !s);
    if (writerInstance) {
      writerInstance.setCharacter(currentWord!.simplified[0]);
    }
  };

  const handleStartQuiz = () => {
    if (!writerInstance) return;
    setQuizStarted(true);
    setQuizResult(null);

    writerInstance.quiz({
      onComplete: (summaryData: any) => {
        const passed = summaryData.totalMistakes < 3;
        setQuizResult(passed ? "correct" : "wrong");
        setScore((s) => ({
          correct: s.correct + (passed ? 1 : 0),
          total: s.total + 1,
        }));
        rateWord(currentWord!.id, passed ? 2 : 0);
      },
      onMistake: (strokeData: any) => {
        console.log("Mistake on stroke:", strokeData);
      },
    });
  };

  const handleShowHint = () => {
    if (writerInstance && quizStarted) {
      writerInstance.showHint();
    }
  };

  const handleNext = () => {
    if (cardIndex + 1 >= sessionWords.length) {
      setSessionDone(true);
    } else {
      setCardIndex((i) => i + 1);
      setQuizStarted(false);
      setQuizResult(null);
    }
  };

  const handleRestart = () => {
    if (!hydrated) return;
    const due = getDueWords();
    const ids =
      selectedLevel === 0
        ? due.map((w) => w.id)
        : due.filter((w) => w.level === selectedLevel).map((w) => w.id);
    const words =
      ids.length > 0
        ? ids.slice(0, 15)
        : getWordsByLevel(selectedLevel > 0 ? selectedLevel : 1)
            .map((w) => w.id)
            .slice(0, 15);
    setSessionWords(words);
    setCardIndex(0);
    setQuizStarted(false);
    setQuizResult(null);
    setScore({ correct: 0, total: 0 });
    setSessionDone(false);
  };

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
            {pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : "💪"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hoàn thành!</h2>
            <p className="text-muted-foreground mt-1">
              Viết đúng {score.correct}/{score.total} chữ ({pct}%)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {score.correct}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Đúng</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-3xl font-bold text-red-500">
                {score.total - score.correct}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Sai</p>
            </div>
          </div>
          <Button onClick={handleRestart} size="lg" className="w-full">
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
          <p className="text-muted-foreground text-sm">
            Chọn cấp độ khác để học
          </p>
        </div>
      </div>
    );
  }

  const progressPct =
    sessionWords.length > 0
      ? Math.round((cardIndex / sessionWords.length) * 100)
      : 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowOutline((s) => !s)}
            className="text-xs"
          >
            {showOutline ? (
              <Eye className="h-3 w-3 mr-1" />
            ) : (
              <EyeOff className="h-3 w-3 mr-1" />
            )}
            Nét mờ
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Chữ {cardIndex + 1} / {sessionWords.length}
          </span>
          <span className="text-green-600 font-medium">
            ✓ {score.correct} đúng
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Card */}
      {currentWord && (
        <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                HSK {currentWord.level}
              </Badge>
              <p className="text-lg font-bold">{currentWord.simplified}</p>
              <p className="text-sm text-muted-foreground">
                {currentWord.pinyin}
              </p>
              <p className="text-sm">{currentWord.meaning}</p>
            </div>

            {quizResult && (
              <div className="flex items-center gap-2">
                {quizResult === "correct" ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Đúng!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-semibold">Chưa đúng</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Writer canvas */}
          <div className="flex justify-center bg-muted/30 rounded-xl p-4">
            <div ref={writerRef} className="mx-auto" />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={handleAnimateChar}>
              ▶️ Xem thứ tự nét
            </Button>
            {!quizStarted ? (
              <Button size="sm" onClick={handleStartQuiz}>
                ✍️ Bắt đầu viết
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleShowHint}>
                <Lightbulb className="h-4 w-4 mr-1" /> Gợi ý
              </Button>
            )}
          </div>

          {quizResult && (
            <Button className="w-full" onClick={handleNext}>
              {cardIndex + 1 >= sessionWords.length
                ? "Xem kết quả"
                : "Chữ tiếp theo →"}
            </Button>
          )}
        </div>
      )}

      {/* Live score */}
      {score.total > 0 && !quizResult && (
        <div className="flex justify-center gap-6 text-sm">
          <span className="text-green-600 font-medium">✓ {score.correct}</span>
          <span className="text-red-500 font-medium">
            ✗ {score.total - score.correct}
          </span>
        </div>
      )}
    </div>
  );
}

export default function HanziPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Học viết chữ Hán ✍️
        </h1>
        <p className="text-muted-foreground">
          Luyện viết theo thứ tự nét đúng với nhận diện chữ viết
        </p>
      </div>
      <Suspense>
        <HanziPracticeInner />
      </Suspense>
    </div>
  );
}
