// Miracle Heart — Audio System
// ============================================================

export let audioCtx, analyser, dataArray, audioEl;
export let beat = 0;

export function initAudio(updateStatus) {
  try {
    audioEl = new Audio();
    audioEl.crossOrigin = 'anonymous';
    audioEl.loop = true;

    const Actx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Actx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    const source = audioCtx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    if (updateStatus) updateStatus('🎵 浪漫背景音乐载入就绪', '#aaa');
  } catch (e) {
    console.log('Audio init error:', e);
  }
}

export function updateBeat(senseValue) {
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += dataArray[i];
  const sense = parseFloat(senseValue || 1);
  beat = (sum / 15 / 255) * sense;
}

export function cleanupAudio() {
  if (audioEl) {
    audioEl.pause();
    audioEl.src = '';
  }
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
}
