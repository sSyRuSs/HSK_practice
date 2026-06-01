"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, RotateCcw, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProgress } from "@/hooks/use-progress";
import {
  hskVocabulary,
  type VocabWord,
  LEVEL_NAMES,
} from "@/data/hsk-vocabulary";
import type { WordProgress } from "@/lib/srs";

const LEVEL_BADGE: Record<number, string> = {
  1: "bg-green-100 text-green-800 border-green-300",
  2: "bg-blue-100 text-blue-800 border-blue-300",
  3: "bg-yellow-100 text-yellow-800 border-yellow-300",
  4: "bg-orange-100 text-orange-800 border-orange-300",
  5: "bg-red-100 text-red-800 border-red-300",
  6: "bg-purple-100 text-purple-800 border-purple-300",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: "Chưa học", color: "text-muted-foreground" },
  learning: { label: "Đang học", color: "text-yellow-600" },
  review: { label: "Ôn tập", color: "text-blue-600" },
  known: { label: "Đã thuộc", color: "text-green-600" },
};

export default function VocabularyPage() {
  const {
    getWordProgress,
    markKnown,
    resetWord,
    hydrated,
    toggleBookmark,
    isBookmarked,
  } = useProgress();
  const [query, setQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  const filteredByQuery = useMemo(() => {
    if (!query.trim()) return hskVocabulary;
    const q = query.toLowerCase();
    return hskVocabulary.filter(
      (w) =>
        w.simplified.includes(q) ||
        w.pinyin.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q),
    );
  }, [query]);

  const wordsByLevel = useMemo(() => {
    const map: Record<number, VocabWord[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    filteredByQuery.forEach((w) => map[w.level].push(w));
    return map;
  }, [filteredByQuery]);

  const bookmarkedWords = useMemo(
    () => filteredByQuery.filter((w) => isBookmarked(w.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredByQuery, isBookmarked, hydrated],
  );

  const totalResults = filteredByQuery.length;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Từ vựng HSK 📖
        </h1>
        <p className="text-muted-foreground">
          Tra cứu và học từ vựng từ HSK 1 đến HSK 6
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm theo chữ Hán, pinyin, hoặc nghĩa..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {totalResults} kết quả
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            Tất cả ({filteredByQuery.length})
          </TabsTrigger>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <TabsTrigger key={lvl} value={String(lvl)}>
              {LEVEL_NAMES[lvl]} ({wordsByLevel[lvl].length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="bookmarks">
            ❤️ Yêu thích {hydrated ? `(${bookmarkedWords.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* All */}
        <TabsContent value="all">
          <WordGrid
            words={filteredByQuery}
            getWordProgress={getWordProgress}
            onSelect={setSelectedWord}
            hydrated={hydrated}
            toggleBookmark={toggleBookmark}
            isBookmarked={isBookmarked}
          />
        </TabsContent>

        {/* Per level */}
        {[1, 2, 3, 4, 5, 6].map((lvl) => (
          <TabsContent key={lvl} value={String(lvl)}>
            <WordGrid
              words={wordsByLevel[lvl]}
              getWordProgress={getWordProgress}
              onSelect={setSelectedWord}
              hydrated={hydrated}
              toggleBookmark={toggleBookmark}
              isBookmarked={isBookmarked}
            />
          </TabsContent>
        ))}

        {/* Bookmarks */}
        <TabsContent value="bookmarks">
          {!hydrated ? (
            <p className="text-center text-muted-foreground py-12">
              Đang tải...
            </p>
          ) : bookmarkedWords.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-5xl">❤️</p>
              <p className="text-lg font-medium">Chưa có từ yêu thích</p>
              <p className="text-muted-foreground text-sm">
                Nhấn ❤️ trên thẻ từ để thêm vào đây
              </p>
            </div>
          ) : (
            <WordGrid
              words={bookmarkedWords}
              getWordProgress={getWordProgress}
              onSelect={setSelectedWord}
              hydrated={hydrated}
              toggleBookmark={toggleBookmark}
              isBookmarked={isBookmarked}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedWord && (
        <WordDetailDialog
          word={selectedWord}
          progress={hydrated ? getWordProgress(selectedWord.id) : null}
          isBookmarked={isBookmarked(selectedWord.id)}
          onClose={() => setSelectedWord(null)}
          onMarkKnown={() => {
            markKnown(selectedWord.id);
            setSelectedWord(null);
          }}
          onReset={() => {
            resetWord(selectedWord.id);
            setSelectedWord(null);
          }}
          onToggleBookmark={() => toggleBookmark(selectedWord.id)}
        />
      )}
    </div>
  );
}

function WordGrid({
  words,
  getWordProgress,
  onSelect,
  hydrated,
  toggleBookmark,
  isBookmarked,
}: {
  words: VocabWord[];
  getWordProgress: (id: string) => WordProgress;
  onSelect: (w: VocabWord) => void;
  hydrated: boolean;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
}) {
  if (words.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Không tìm thấy từ nào.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {words.map((word) => {
        const prog = hydrated ? getWordProgress(word.id) : null;
        const status = prog?.status ?? "new";
        const statusInfo = STATUS_LABEL[status];
        const bookmarked = hydrated && isBookmarked(word.id);

        return (
          <Card
            key={word.id}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onSelect(word)}
          >
            <CardContent className="p-3 space-y-1">
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_BADGE[word.level]}`}
                >
                  HSK{word.level}
                </span>
                <div className="flex items-center gap-1">
                  {status === "known" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  )}
                  {hydrated && (
                    <button
                      className="shrink-0 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(word.id);
                      }}
                      aria-label={
                        bookmarked ? "Bỏ yêu thích" : "Thêm yêu thích"
                      }
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-colors ${bookmarked ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400"}`}
                      />
                    </button>
                  )}
                </div>
              </div>
              <p className="hanzi-md font-bold text-center py-1">
                {word.simplified}
              </p>
              <p className="text-xs text-center text-muted-foreground truncate">
                {word.pinyin}
              </p>
              <p className="text-xs text-center truncate">{word.meaning}</p>
              {hydrated && (
                <p className={`text-[10px] text-center ${statusInfo.color}`}>
                  {statusInfo.label}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WordDetailDialog({
  word,
  progress,
  isBookmarked,
  onClose,
  onMarkKnown,
  onReset,
  onToggleBookmark,
}: {
  word: VocabWord;
  progress: WordProgress | null;
  isBookmarked: boolean;
  onClose: () => void;
  onMarkKnown: () => void;
  onReset: () => void;
  onToggleBookmark: () => void;
}) {
  const status = progress?.status ?? "new";
  const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL.new;
  const interval = progress?.interval ?? 0;
  const repetitions = progress?.repetitions ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mb-2 ${LEVEL_BADGE[word.level]}`}
            >
              {LEVEL_NAMES[word.level]}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3">
          <p className="text-7xl font-bold" style={{ fontFamily: "serif" }}>
            {word.simplified}
          </p>
          <p className="text-xl text-muted-foreground">{word.pinyin}</p>
          <p className="text-lg font-medium">{word.meaning}</p>
          <Badge variant="outline" className="text-xs">
            {word.partOfSpeech}
          </Badge>
        </div>

        <div className="border rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trạng thái</span>
            <span className={statusInfo.color}>{statusInfo.label}</span>
          </div>
          {interval > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ôn tiếp sau</span>
              <span>{interval} ngày</span>
            </div>
          )}
          {repetitions > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lần ôn tập</span>
              <span>{repetitions} lần</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isBookmarked ? "default" : "outline"}
            className={
              isBookmarked ? "bg-red-500 hover:bg-red-600 text-white" : ""
            }
            onClick={onToggleBookmark}
          >
            <Heart
              className={`h-4 w-4 mr-1 ${isBookmarked ? "fill-white" : ""}`}
            />
            {isBookmarked ? "Đã yêu thích" : "Yêu thích"}
          </Button>
          {status !== "known" && (
            <Button size="sm" className="flex-1" onClick={onMarkKnown}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Đánh dấu thuộc
            </Button>
          )}
          {status !== "new" && (
            <Button size="sm" variant="outline" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
