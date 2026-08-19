'use strict';
class FiezelPcmRendererProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.current = null;
    this.offset = 0;
    this.gapFrames = 0;
    this.port.onmessage = (event) => this.handleMessage(event && event.data || {});
  }
  handleMessage(data) {
    if (data.type === 'clear') { this.finishAll(true); return; }
    if (data.type !== 'enqueue') return;
    const samples = data.samples;
    if (!(samples instanceof Float32Array) || !samples.length) {
      this.port.postMessage({ type: 'error', id: data.id || '', reason: 'invalid_pcm' });
      return;
    }
    this.queue.push({
      id: String(data.id || ''), samples,
      gapFrames: Math.max(0, Math.floor(Number(data.gapFrames) || 0)),
      fadeInFrames: Math.max(0, Math.floor(Number(data.fadeInFrames) || 0)),
      fadeOutFrames: Math.max(0, Math.floor(Number(data.fadeOutFrames) || 0))
    });
  }
  finishEntry(entry, cancelled) {
    if (entry) this.port.postMessage({ type: 'done', id: entry.id, cancelled: cancelled === true });
  }
  finishAll(cancelled) {
    if (this.current) this.finishEntry(this.current, cancelled);
    for (const entry of this.queue) this.finishEntry(entry, cancelled);
    this.queue.length = 0; this.current = null; this.offset = 0; this.gapFrames = 0;
  }
  beginNext() {
    if (!this.queue.length) return false;
    this.current = this.queue.shift(); this.offset = 0; this.gapFrames = this.current.gapFrames;
    return true;
  }
  sampleGain(entry, index) {
    let gain = 1;
    if (entry.fadeInFrames > 0 && index < entry.fadeInFrames) gain = Math.min(gain, (index + 1) / entry.fadeInFrames);
    const remaining = entry.samples.length - index;
    if (entry.fadeOutFrames > 0 && remaining <= entry.fadeOutFrames) gain = Math.min(gain, Math.max(0, remaining - 1) / entry.fadeOutFrames);
    return gain;
  }
  process(inputs, outputs) {
    const channels = outputs && outputs[0];
    const output = channels && channels[0];
    if (!output) return true;
    output.fill(0);
    let frame = 0;
    while (frame < output.length) {
      if (!this.current && !this.beginNext()) break;
      if (this.gapFrames > 0) {
        const silence = Math.min(this.gapFrames, output.length - frame);
        this.gapFrames -= silence; frame += silence;
        if (frame >= output.length) break;
      }
      const entry = this.current;
      const remaining = entry.samples.length - this.offset;
      if (remaining <= 0) { this.finishEntry(entry, false); this.current = null; this.offset = 0; continue; }
      const count = Math.min(remaining, output.length - frame);
      for (let i = 0; i < count; i += 1) {
        const index = this.offset + i;
        output[frame + i] = entry.samples[index] * this.sampleGain(entry, index);
      }
      this.offset += count; frame += count;
      if (this.offset >= entry.samples.length) { this.finishEntry(entry, false); this.current = null; this.offset = 0; }
    }
    return true;
  }
}
registerProcessor('fiezel-pcm-renderer', FiezelPcmRendererProcessor);
