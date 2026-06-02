"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PronunciationButton } from "@/components/pronunciation-button";
import { useProgress } from "@/hooks/use-progress";
import { hskVocabulary, getWordsByLevel, LEVEL_NAMES } from "@/data/hsk-vocabulary";
import type { VocabWord } from "@/data/hsk-vocabulary";

type QuizMode = "hanzi-meaning" | "meaning-hanzi" | "pinyin-hanzi";
type QuizQuestion = {
  word: VocabWord;
  choices: VocabWord[];
  correctIndex: number;
  mode: QuizMode;
};

const QUIZ_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(word: VocabWord, pool: VocabWord[], mode: QuizMode): QuizQuestion {
  const distractors = shuffle(pool.filter((w) => w.id !== word.id)).slice(0, 3);
  const choices = shuffle([word, ...distractors]);
  return { word, choices, correctIndex: choices.indexOf(word), mode };
}

function buildQuiz(level: number, mode: QuizMode): QuizQuestion[] {
  const pool = level === 0 ? hskVocabulary : getWordsByLevel(level);
  const words = shuffle(pool).slice(0, QUIZ_SIZE);
  return words.map((w) => buildQuestion(w, pool, mode));
}

function getPrompt(q: QuizQuestion): string {
  switch (q.mode) {
    case "hanzi-meaning": return q.word.simplified;
    case "meaning-hanzi": return q.word.meaning;
    case "pinyin-hanzi":  return q.word.pinyin;
  }
}

function getChoiceLabel(w: VocabWord, mode: QuizMode): string {
  switch (mode) {
    case "hanzi-meaning": return w.meaning;
    case "meaning-hanzi": return w.simplified;
    case "pinyin-hanzi":  return w.simplified;
  }
}

function getPromptLabel(mode: QuizMode): string {
  switch (mode) {
    case "hanzi-meaning": return "Nghĩa của từ này là gì?";
    case "meaning-hanzi": return "Chọn chữ Hán đúng";
    case "pinyin-hanzi":  return "Chọn chữ Hán đúng cho pinyin này";
  }
}

export default function QuizPage() {
  const { markKnown, hydrated } = useProgress();

  const [level, setLevel] = useState<number>(0);
  const [mode, setMode] = useState<QuizMode>("hanzi-meaning");
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<{ correct: boolean; word: VocabWord }[]>([]);

  const startQuiz = useCallback(() => {
    setQuiz(buildQuiz(level, mode));
    setQIndex(0);
    setSelected(null);
    setResults([]);
  }, [level, mode]);

  const currentQ = quiz ? quiz[qIndex] : null;
  const isAnswered = selected !== null;
  const quizDone = quiz !== null && qIndex >= quiz.length;

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelected(idx);
    const correct = idx === currentQ!.correctIndex;
    setResults((r) => [...r, { correct, word: currentQ!.word }]);
    if (correct && hydrated) markKnown(currentQ!.word.id);
  };

  const handleNext = () => {
    setQIndex((i) => i + 1);
    setSelected(null);
  };

  const score = results.filter((r) => r.correct).length;
  const pct = quiz ? Math.round((qIndex / quiz.length) * 100) : 0;

  // Setup screen
  if (!quiz) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Quiz 🧠</h1>
          <p className="text-muted-foreground">Kiểm tra kiến thức từ vựng HSK của bạn</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Tùy chỉnh bài kiểm tra</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cấp độ HSK</label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
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
              <label className="text-sm font-medium mb-2 block">Kiểu câu hỏi</label>
              <Select value={mode} onValueChange={(v) => setMode(v as QuizMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hanzi-meaning">Chữ Hán → Nghĩa</SelectItem>
                  <SelectItem value="meaning-hanzi">Nghĩa → Chữ Hán</SelectItem>
                  <SelectItem value="pinyin-hanzi">Pinyin → Chữ Hán</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
              <p>📝 {QUIZ_SIZE} câu hỏi mỗi bài</p>
              <p>✅ Trả lời đúng sẽ tự động đánh dấu từ đã thuộc</p>
            </div>
            <Button className="w-full" size="lg" onClick={startQuiz}>
              Bắt đầu Quiz →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz done
  if (quizDone) {
    const grade = score >= 9 ? "🏆 Xuất sắc!" : score >= 7 ? "🎉 Giỏi lắm!" : score >= 5 ? "👍 Khá ổn!" : "💪 Cố lên!";
    return (
      <div className="container mx-auto max-w-lg px-4 py-8 space-y-6">
        <Card className="text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <p className="text-5xl">{grade.split(" ")[0]}</p>
            <p className="text-2xl font-bold">{grade.split(" ").slice(1).join(" ")}</p>
            <p className="text-4xl font-bold text-primary">
              {score} / {quiz.length}
            </p>
            <p className="text-muted-foreground">
              {Math.round((score / quiz.length) * 100)}% chính xác
            </p>
          </CardContent>
        </Card>

        {/* Wrong answers review */}
        {results.filter((r) => !r.correct).length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-red-600">Các từ cần ôn lại:</h2>
            <div className="grid gap-2">
              {results
                .filter((r) => !r.correct)
                .map(({ word }) => (
                  <div key={word.id} className="flex items-center gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <span className="hanzi-md font-bold">{word.simplified}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{word.pinyin}</p>
                      <p className="text-xs text-muted-foreground">{word.meaning}</p>
                    </div>
                    <PronunciationButton
                      text={word.simplified}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={startQuiz}>
            <RotateCcw className="h-4 w-4 mr-2" /> Làm lại
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setQuiz(null)}>
            Thay đổi cài đặt
          </Button>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="container mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Quiz 🧠</h1>
          <p className="text-sm text-muted-foreground">Câu {qIndex + 1} / {quiz.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">{score}</span>
        </div>
      </div>

      <Progress value={pct} className="h-2" />

      {/* Question card */}
      <Card>
        <CardContent className="pt-6 pb-6 text-center space-y-3">
          <Badge variant="outline">{getPromptLabel(currentQ!.mode)}</Badge>
          {currentQ!.mode === "hanzi-meaning" ? (
            <>
              <p className="hanzi-xl font-bold">{getPrompt(currentQ!)}</p>
              <div className="flex justify-center pt-2">
                <PronunciationButton
                  text={currentQ!.word.simplified}
                  size="sm"
                  variant="ghost"
                />
              </div>
            </>
          ) : currentQ!.mode === "pinyin-hanzi" ? (
            <p className="text-3xl font-semibold">{getPrompt(currentQ!)}</p>
          ) : (
            <p className="text-2xl font-semibold leading-snug">{getPrompt(currentQ!)}</p>
          )}
        </CardContent>
      </Card>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3">
        {currentQ!.choices.map((choice, idx) => {
          const isCorrect = idx === currentQ!.correctIndex;
          const isSelected = selected === idx;
          let extraClass = "";
          if (isAnswered) {
            if (isCorrect) extraClass = "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400";
            else if (isSelected) extraClass = "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400";
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleSelect(idx)}
              className={`p-4 rounded-lg border-2 text-center transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary
                ${isAnswered && isSelected ? "" : "hover:bg-accent"}
                ${extraClass}
                ${!isAnswered ? "cursor-pointer" : "cursor-default"}
              `}
            >
              {currentQ!.mode === "meaning-hanzi" || currentQ!.mode === "pinyin-hanzi" ? (
                <span className="hanzi-lg font-bold block">{getChoiceLabel(choice, currentQ!.mode)}</span>
              ) : (
                <span className="text-sm leading-snug">{getChoiceLabel(choice, currentQ!.mode)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback + next */}
      {isAnswered && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-lg ${selected === currentQ!.correctIndex ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
            {selected === currentQ!.correctIndex ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <div className="text-sm flex-1">
              <p className="font-medium">
                {selected === currentQ!.correctIndex ? "Chính xác!" : "Sai rồi!"}
              </p>
              <p className="text-muted-foreground">
                {currentQ!.word.simplified} — {currentQ!.word.pinyin} — {currentQ!.word.meaning}
              </p>
            </div>
            <PronunciationButton
              text={currentQ!.word.simplified}
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
            />
          </div>
          <Button className="w-full" onClick={handleNext}>
            {qIndex + 1 < quiz.length ? "Câu tiếp theo →" : "Xem kết quả 🏆"}
          </Button>
        </div>
      )}
    </div>
  );
}
