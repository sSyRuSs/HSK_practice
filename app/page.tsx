"use client";

import Link from "next/link";
import { Flame, Star, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/hooks/use-progress";
import { LEVEL_NAMES } from "@/data/hsk-vocabulary";

const LEVEL_COLORS = ["bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-red-500", "bg-purple-500"];

export default function DashboardPage() {
  const { getStats, getLevelStats, streak, hydrated } = useProgress();

  const totalStats = getStats();
  const levelStats = getLevelStats();

  if (!hydrated) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  const learnedPct = totalStats.total > 0
    ? Math.round(((totalStats.known + totalStats.review) / totalStats.total) * 100)
    : 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan học tập 📊</h1>
        <p className="text-muted-foreground mt-1">
          Chào mừng bạn quay lại! Hãy tiếp tục luyện tập hôm nay.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Chuỗi ngày học"
          value={`${streak.currentStreak} ngày`}
          sub={`Kỷ lục: ${streak.longestStreak} ngày`}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          label="Đã thuộc"
          value={`${totalStats.known}`}
          sub={`/ ${totalStats.total} từ`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          label="Cần ôn tập"
          value={`${totalStats.dueNow}`}
          sub="từ đến hạn hôm nay"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-purple-500" />}
          label="Đang học"
          value={`${totalStats.learning + totalStats.review}`}
          sub="từ đang tiến hành"
        />
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tiến trình tổng thể</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{totalStats.known + totalStats.review} / {totalStats.total} từ đã học</span>
            <span className="font-medium text-foreground">{learnedPct}%</span>
          </div>
          <Progress value={learnedPct} className="h-3" />
          <div className="flex flex-wrap gap-3 text-xs">
            <LegendDot color="bg-muted" label={`Chưa học: ${totalStats.new}`} />
            <LegendDot color="bg-yellow-400" label={`Đang học: ${totalStats.learning}`} />
            <LegendDot color="bg-blue-400" label={`Ôn tập: ${totalStats.review}`} />
            <LegendDot color="bg-green-500" label={`Đã thuộc: ${totalStats.known}`} />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bắt đầu nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickCard href="/flashcards" icon="🃏" title="Flashcard" desc={`${totalStats.dueNow} từ cần ôn`} color="from-blue-500 to-blue-600" />
          <QuickCard href="/quiz" icon="🧠" title="Làm bài Quiz" desc="Kiểm tra từ vựng" color="from-purple-500 to-purple-600" />
          <QuickCard href="/vocabulary" icon="📖" title="Tra từ vựng" desc={`${totalStats.total} từ HSK 1–6`} color="from-green-500 to-green-600" />
        </div>
      </div>

      {/* Level progress */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tiến trình từng cấp độ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {levelStats.map((ls, i) => {
            const learned = ls.known + ls.review;
            const pct = ls.total > 0 ? Math.round((learned / ls.total) * 100) : 0;
            return (
              <Card key={ls.level} className="overflow-hidden">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[i]}`} />
                      <span className="font-semibold">{LEVEL_NAMES[ls.level]}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {learned}/{ls.total}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pct}% hoàn thành</span>
                    <Link href={`/flashcards?level=${ls.level}`} className="text-primary hover:underline">
                      Học ngay →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickCard({ href, icon, title, desc, color }: { href: string; icon: string; title: string; desc: string; color: string }) {
  return (
    <Link href={href}>
      <Card className="overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
        <div className={`h-2 bg-gradient-to-r ${color}`} />
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <span className="text-4xl">{icon}</span>
          <div>
            <p className="font-semibold group-hover:text-primary transition-colors">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
