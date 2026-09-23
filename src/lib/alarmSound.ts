/**
 * Audible alarm (FR-SEC-04, UC-03: "a visual and audio alarm").
 *
 * Two short tones through the Web Audio API rather than an audio file, so the
 * dashboard has no asset to load and works on an offline gatehouse machine.
 * Browsers block audio until the guard has interacted with the page, which is
 * why the dashboard also carries a visible sound toggle.
 */
let context: AudioContext | null = null;

export function playAlarmTone(): void {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    context = context ?? new AudioCtor();
    if (context.state === 'suspended') void context.resume();

    [0, 0.28].forEach((offset) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, context!.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, context!.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context!.currentTime + offset + 0.2);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(context!.currentTime + offset);
      oscillator.stop(context!.currentTime + offset + 0.22);
    });
  } catch {
    // An unavailable audio device must never stop the visual alarm.
  }
}
