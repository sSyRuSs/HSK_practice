"use client";

import { useRef } from "react";
import { Download, Upload, Trash2, Flame, Star, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useProgress } from "@/hooks/use-progress";
import { LEVEL_NAMES } from "@/data/hsk-vocabulary";
import { exportData, importData } from "@/lib/storage";
import { toast } from "sonner";

const LEVEL_COLORS = ["bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-red-500", "bg-purple-500"];

export default function ProgressPage() {
  const { getStats, getLevelStats, streak, resetAll, hydrated } = useProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  const stats = getStats();
  const levelStats = getLevelStats();

  const handleExport = () => {
    try {
      const json = exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hsk-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất dữ liệu thành công!");
    } catch {
      toast.error("Xuất dữ liệu thất bại!");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        importData(evt.target?.result as string);
        toast.success("Nhập dữ liệu thành công! Đang tải lại...");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("File không hợp lệ hoặc bị lỗi!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetAll = () => {
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ tiến trình học? Hành động này không thể hoàn tác!")) return;
    resetAll();
    toast.success("Đã xóa toàn bộ tiến trình.");
  };

  const totalLearned = stats.known + stats.review + stats.learning;
  const overallPct = stats.total > 0 ? Math.round((stats.known / stats.total) * 100) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Tiến trình học tập 📈</h1>
        <p className="text-muted-foreground">Theo dõi và quản lý tiến trình học HSK của bạn</p>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="col-span-1 sm:col-span-1">
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak.currentStreak}</p>
              <p className="text-sm text-muted-foreground">Ngày liên tiếp</p>
              <p className="text-xs text-muted-foreground">Kỷ lục: {streak.longestStreak} ngày</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.known}</p>
              <p className="text-sm text-muted-foreground">Từ đã thuộc</p>
              <p className="text-xs text-muted-foreground">{overallPct}% hoàn thành</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.dueNow}</p>
              <p className="text-sm text-muted-foreground">Đến hạn hôm nay</p>
              <p className="text-xs text-muted-foreground">{stats.learning} đang học</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" /> Tổng quan từ vựng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tiến trình tổng thể</span>
              <span className="font-medium">{stats.known} / {stats.total} đã thuộc ({overallPct}%)</span>
            </div>
            <Progress value={overallPct} className="h-3" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
            <StatBlock value={stats.new} label="Chưa học" color="text-muted-foreground" />
            <StatBlock value={stats.learning} label="Đang học" color="text-yellow-600" />
            <StatBlock value={stats.review} label="Ôn tập" color="text-blue-600" />
            <StatBlock value={stats.known} label="Đã thuộc" color="text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Per-level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi tiết theo cấp độ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {levelStats.map((ls, i) => {
            const learned = ls.known + ls.review;
            const pct = ls.total > 0 ? Math.round((learned / ls.total) * 100) : 0;
            const knownPct = ls.total > 0 ? Math.round((ls.known / ls.total) * 100) : 0;
            return (
              <div key={ls.level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[i]}`} />
                    <span className="font-medium">{LEVEL_NAMES[ls.level]}</span>
                    <Badge variant="outline" className="text-xs">{ls.total} từ</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ls.known}/{ls.total} thuộc ({knownPct}%)
                  </span>
                </div>
                <Progress value={knownPct} className="h-2" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Chưa học: {ls.new}</span>
                  <span className="text-yellow-600">Đang học: {ls.learning}</span>
                  <span className="text-blue-600">Ôn tập: {ls.review}</span>
                  <span className="text-green-600">Đã thuộc: {ls.known}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Data management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quản lý dữ liệu</CardTitle>
          <CardDescription>Xuất, nhập hoặc xóa dữ liệu học tập của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Xuất dữ liệu
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Nhập dữ liệu
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Xóa toàn bộ tiến trình học — hành động này không thể hoàn tác.
            </p>
            <Button variant="destructive" size="sm" onClick={handleResetAll}>
              <Trash2 className="h-4 w-4 mr-2" /> Xóa toàn bộ tiến trình
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
