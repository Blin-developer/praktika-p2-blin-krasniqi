/**
 * Shërbimi i Sintezës së Zërit me Web Audio API për KDS.
 * Funksionon 100% lokalisht pa asnjë skedar audio të jashtëm dhe respekton politikat e shfletuesit.
 */

class KdsAudioService {
  constructor() {
    this.audioCtx = null;
    this.isMuted = localStorage.getItem('tastio_kds_muted') === 'true';
    this.isUnlocked = false;
  }

  getAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  /**
   * Zhbllokon AudioContext në rast të bllokimit nga shfletuesi (Autoplay restriction).
   */
  async unlockAudio() {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        this.isUnlocked = true;
        return true;
      } catch (err) {
        console.warn('AudioContext nuk mund të zhbllokohej ende:', err);
        return false;
      }
    } else if (ctx.state === 'running') {
      this.isUnlocked = true;
      return true;
    }
    return false;
  }

  isSoundMuted() {
    return this.isMuted;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tastio_kds_muted', this.isMuted ? 'true' : 'false');
    return this.isMuted;
  }

  setMute(state) {
    this.isMuted = !!state;
    localStorage.setItem('tastio_kds_muted', this.isMuted ? 'true' : 'false');
  }

  /**
   * Tingull për Porosi të Re (Chime harmonik dhe miqësor).
   */
  playNewOrderSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Nota 1 (E5 - 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Nota 2 (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn('Gabim gjatë luajtjes së audios së porosisë:', e);
    }
  }

  /**
   * Tingull për Porosi Urgjente / Të Vonuar (Ton paralajmërues).
   */
  playUrgentSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(390, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Gabim gjatë luajtjes së audios urgjente:', e);
    }
  }

  /**
   * Tingull për Bump / Përfundim (Akord suksesi).
   */
  playBumpSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 chord

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.15, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.28);
      });
    } catch (e) {
      console.warn('Gabim gjatë luajtjes së audios bump:', e);
    }
  }
}

export const kdsAudio = new KdsAudioService();
export default kdsAudio;
