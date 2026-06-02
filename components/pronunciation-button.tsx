"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakChinese } from "@/lib/audio";
import { useState } from "react";
import { toast } from "sonner";

interface PronunciationButtonProps {
  text: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  showLabel?: boolean;
}

export function PronunciationButton({
  text,
  size = "default",
  variant = "outline",
  className = "",
  showLabel = false,
}: PronunciationButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      await speakChinese(text);
    } catch (error) {
      console.error("Speech error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể phát âm");
    } finally {
      // Reset after a short delay to prevent rapid clicks
      setTimeout(() => setIsPlaying(false), 500);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleSpeak}
      disabled={isPlaying}
      className={className}
      title="Phát âm"
    >
      <Volume2 className={showLabel ? "h-4 w-4 mr-2" : "h-4 w-4"} />
      {showLabel && "Phát âm"}
    </Button>
  );
}
