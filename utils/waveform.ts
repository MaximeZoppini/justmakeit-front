import * as Tone from 'tone';

export const drawWaveform = (
  canvas: HTMLCanvasElement | null,
  buffer: Tone.ToneAudioBuffer | null,
  playhead = -1
) => {
  if (!canvas || !buffer) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = buffer.getChannelData(0);

  clearCanvas(context, width, height);
  drawWaveformData(context, data, width, height);
  drawPlayheadIndicator(context, playhead, width, height);
};

const clearCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#a855f7'; // Purple-500
};

const drawWaveformData = (
  context: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number
) => {
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  for (let index_ = 0; index_ < width; index_++) {
    let min = 1;
    let max = -1;

    for (let index__ = 0; index__ < step; index__++) {
      const index = index_ * step + index__;
      if (index < data.length) {
        const datum = data[index];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
    }

    const y = (1 + min) * amp;
    const h = Math.max(1, (max - min) * amp);
    context.fillRect(index_, y, 1, h);
  }
};

const drawPlayheadIndicator = (
  context: CanvasRenderingContext2D,
  playhead: number,
  width: number,
  height: number
) => {
  if (playhead >= 0 && playhead <= 1) {
    const x = playhead * width;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(x, 0, 2, height);
  }
};
