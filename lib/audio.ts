/**
 * Audio utilities for text-to-speech pronunciation
 */

/**
 * Speak Chinese text using Web Speech API
 * @param text - The Chinese text to pronounce
 * @param lang - The language code (default: zh-CN for Mandarin Chinese)
 * @returns Promise that resolves when speech starts or rejects on error
 */
export function speakChinese(text: string, lang: string = "zh-CN"): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if browser supports Web Speech API
    if (!("speechSynthesis" in window)) {
      reject(new Error("Trình duyệt không hỗ trợ phát âm"));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8; // Slightly slower for learning
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      reject(new Error(`Lỗi phát âm: ${event.error}`));
    };

    // Try to find a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(
      (voice) =>
        voice.lang.startsWith("zh") ||
        voice.lang.startsWith("cmn") ||
        voice.name.includes("Chinese")
    );

    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if speech synthesis is supported
 */
export function isSpeechSupported(): boolean {
  return "speechSynthesis" in window;
}

/**
 * Get available Chinese voices
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  const voices = window.speechSynthesis.getVoices();
  return voices.filter(
    (voice) =>
      voice.lang.startsWith("zh") ||
      voice.lang.startsWith("cmn") ||
      voice.name.includes("Chinese")
  );
}
