/**
 * FitMon 8-Bit 街機音效合成器 (Zero-Asset Web Audio Chiptune Synthesizer)
 * 免除外部音檔載入延遲或破圖，100% 原生 Web Audio API 即時合成復古像素音效！
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'square',
    delaySec: number = 0,
    volume: number = 0.08
  ) {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;

      const startTime = this.ctx.currentTime + delaySec;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + durationSec);
    } catch {
      // Ignore audio errors when autoplay is blocked
    }
  }

  /** 像素按鈕點擊聲 */
  public playBlip() {
    this.playTone(587.33, 0.05, 'square', 0, 0.05); // D5
  }

  /** 金幣入袋經典雙音 (B5 -> E6) */
  public playCoin() {
    this.playTone(987.77, 0.07, 'square', 0, 0.08);   // B5
    this.playTone(1318.51, 0.22, 'square', 0.07, 0.08); // E6
  }

  /** 完成單組訓練音效 */
  public playSetComplete() {
    this.playTone(523.25, 0.08, 'triangle', 0, 0.1);    // C5
    this.playTone(659.25, 0.08, 'triangle', 0.08, 0.1); // E5
    this.playTone(783.99, 0.16, 'square', 0.16, 0.09);  // G5
  }

  /** 突破歷史 PR 號角 */
  public playPRFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.12, 'sawtooth', idx * 0.09, 0.09);
    });
  }

  /** 街機 VICTORY 勝利號角 */
  public playVictory() {
    this.playTone(523.25, 0.12, 'square', 0.0, 0.09);  // C5
    this.playTone(523.25, 0.12, 'square', 0.13, 0.09); // C5
    this.playTone(523.25, 0.12, 'square', 0.26, 0.09); // C5
    this.playTone(659.25, 0.25, 'square', 0.39, 0.1);  // E5
    this.playTone(783.99, 0.25, 'square', 0.65, 0.1);  // G5
    this.playTone(1046.5, 0.45, 'square', 0.91, 0.11); // C6
  }

  /** 與寵物互動愛心音效 */
  public playPetHeart() {
    this.playTone(659.25, 0.08, 'sine', 0, 0.09);
    this.playTone(880.0, 0.15, 'sine', 0.08, 0.09);
  }
}

export const soundFX = new SoundManager();
