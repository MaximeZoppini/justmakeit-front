import * as Tone from 'tone';

export const drawWaveform = (
  canvas: HTMLCanvasElement | null,
  buffer: Tone.ToneAudioBuffer | null,
  playhead = -1
) => {
  if (!canvas || !buffer) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = buffer.getChannelData(0);
  
  clearCanvas(ctx, width, height);
  drawWaveformData(ctx, data, width, height);
  drawPlayheadIndicator(ctx, playhead, width, height);
};

const clearCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#a855f7'; // Purple-500
};

const drawWaveformData = (
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number
) => {
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const index = i * step + j;
      if (index < data.length) {
        const datum = data[index];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
    }

    const y = (1 + min) * amp;
    const h = Math.max(1, (max - min) * amp);
    ctx.fillRect(i, y, 1, h);
  }
};

const drawPlayheadIndicator = (
  ctx: CanvasRenderingContext2D,
  playhead: number,
  width: number,
  height: number
) => {
  if (playhead >= 0 && playhead <= 1) {
    const x = playhead * width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x, 0, 2, height);
  }
};
