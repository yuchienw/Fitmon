/**
 * FitMon 8-Bit 街機音效與 Chiptune BGM 合成器 (V2-10: 含輕快背景音樂循環編曲器)
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public sfxEnabled: boolean = true;
  public bgmEnabled: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

  // 輕快楓之谷/街機風格大調五聲音階旋律 (C5, D5, E5, G5, A5, C6)
  private readonly melodyNotes = [
    523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
    523.25, 587.33, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25,
  ];
  private readonly bassNotes = [
    261.63, 261.63, 329.63, 329.63, 349.23, 349.23, 392.0, 392.0,
    261.63, 261.63, 329.63, 329.63, 349.23, 392.0, 261.63, 261.63,
  ];

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    volume: number = 0.06,
    ignoreSfxMute: boolean = false
  ) {
    if (!ignoreSfxMute && !this.sfxEnabled) return;
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
      // Ignore autoplay errors
    }
  }

  /** 啟動或停止 8-Bit 輕快背景音樂循環 (V2-10) */
  public setBgmPlaying(play: boolean) {
    this.bgmEnabled = play;
    if (!play) {
      if (this.bgmTimer !== null) {
        window.clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      return;
    }

    this.initContext();
    if (this.bgmTimer !== null) return;

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled) return;
      const idx = this.bgmStep % this.melodyNotes.length;
      const leadFreq = this.melodyNotes[idx];
      const bassFreq = this.bassNotes[idx];

      // Lead chiptune melody (soft triangle wave)
      this.playTone(leadFreq, 0.16, 'triangle', 0, 0.035, true);
      // Warm 8-bit bassline every even step
      if (idx % 2 === 0) {
        this.playTone(bassFreq, 0.28, 'sine', 0, 0.04, true);
      }
      this.bgmStep += 1;
    }, 240);
  }

  public playBlip() {
    this.playTone(587.33, 0.045, 'square', 0, 0.045);
  }

  public playCoin() {
    this.playTone(987.77, 0.07, 'square', 0, 0.07);
    this.playTone(1318.51, 0.22, 'square', 0.07, 0.07);
  }

  public playSetComplete() {
    this.playTone(523.25, 0.08, 'triangle', 0, 0.09);
    this.playTone(659.25, 0.08, 'triangle', 0.08, 0.09);
    this.playTone(783.99, 0.16, 'square', 0.16, 0.08);
  }

  public playPRFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.12, 'sawtooth', idx * 0.09, 0.08);
    });
  }

  public playVictory() {
    this.playTone(523.25, 0.12, 'square', 0.0, 0.08);
    this.playTone(523.25, 0.12, 'square', 0.13, 0.08);
    this.playTone(523.25, 0.12, 'square', 0.26, 0.08);
    this.playTone(659.25, 0.25, 'square', 0.39, 0.09);
    this.playTone(783.99, 0.25, 'square', 0.65, 0.09);
    this.playTone(1046.5, 0.45, 'square', 0.91, 0.1);
  }

  public playPetHeart() {
    this.playTone(659.25, 0.08, 'sine', 0, 0.08);
    this.playTone(880.0, 0.15, 'sine', 0.08, 0.08);
  }
}

export const soundFX = new SoundManager();
