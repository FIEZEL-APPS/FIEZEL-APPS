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
    if (data.type === 'clear') {
      this.cancelQueued();
      this.cancelCurrent(Math.max(1, Math.floor(Number(data.fadeOutFrames) || 1)));
      return;
    }
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
      fadeOutFrames: Math.max(0, Math.floor(Number(data.fadeOutFrames) || 0)),
      cancelled: false,
      cancelStartOffset: 0,
      cancelFadeFrames: 0
    });
  }

  finishEntry(entry, cancelled) {
    if (entry) this.port.postMessage({ type: 'done', id: entry.id, cancelled: cancelled === true });
  }

  cancelQueued() {
    for (const entry of this.queue) this.finishEntry(entry, true);
    this.queue.length = 0;
  }

  cancelCurrent(fadeFrames) {
    if (!this.current) return;
    if (this.gapFrames > 0 || this.offset <= 0) {
      this.finishEntry(this.current, true);
      this.current = null;
      this.offset = 0;
      this.gapFrames = 0;
      return;
    }
    this.current.cancelled = true;
    this.current.cancelStartOffset = this.offset;
    this.current.cancelFadeFrames = fadeFrames;
  }

  beginNext() {
    if (!this.queue.length) return false;
    this.current = this.queue.shift();
    this.offset = 0;
    this.gapFrames = this.current.gapFrames;
    return true;
  }

  sampleGain(entry, index) {
    let gain = 1;
    if (entry.fadeInFrames > 0 && index < entry.fadeInFrames) {
      gain = Math.min(gain, (index + 1) / entry.fadeInFrames);
    }
    const remaining = entry.samples.length - index;
    if (entry.fadeOutFrames > 0 && remaining <= entry.fadeOutFrames) {
      gain = Math.min(gain, Math.max(0, remaining - 1) / entry.fadeOutFrames);
    }
    if (entry.cancelled && entry.cancelFadeFrames > 0) {
      const progress = index - entry.cancelStartOffset;
      gain = Math.min(gain, Math.max(0, 1 - progress / entry.cancelFadeFrames));
    }
    return gain;
  }

  currentCancelledDone() {
    if (!this.current || !this.current.cancelled) return false;
    return this.offset >= this.current.cancelStartOffset + this.current.cancelFadeFrames;
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
        this.gapFrames -= silence;
        frame += silence;
        if (frame >= output.length) break;
      }

      const entry = this.current;
      if (!entry) continue;
      if (this.currentCancelledDone()) {
        this.finishEntry(entry, true);
        this.current = null;
        this.offset = 0;
        continue;
      }

      const remaining = entry.samples.length - this.offset;
      if (remaining <= 0) {
        this.finishEntry(entry, entry.cancelled);
        this.current = null;
        this.offset = 0;
        continue;
      }

      let count = Math.min(remaining, output.length - frame);
      if (entry.cancelled) {
        const cancelRemaining = entry.cancelStartOffset + entry.cancelFadeFrames - this.offset;
        count = Math.min(count, Math.max(0, cancelRemaining));
        if (count <= 0) {
          this.finishEntry(entry, true);
          this.current = null;
          this.offset = 0;
          continue;
        }
      }

      for (let i = 0; i < count; i += 1) {
        const index = this.offset + i;
        output[frame + i] = entry.samples[index] * this.sampleGain(entry, index);
      }
      this.offset += count;
      frame += count;

      if (entry.cancelled && this.currentCancelledDone()) {
        this.finishEntry(entry, true);
        this.current = null;
        this.offset = 0;
      } else if (this.offset >= entry.samples.length) {
        this.finishEntry(entry, false);
        this.current = null;
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('fiezel-pcm-renderer', FiezelPcmRendererProcessor);
