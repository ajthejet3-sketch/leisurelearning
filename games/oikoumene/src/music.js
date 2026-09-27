'use strict';
// ============================================================================
// Music: a small generative composer built on the Web Audio API. Nothing is
// sampled; the kithara is a plucked-string (Karplus-Strong) model, the aulos a
// pair of filtered reeds, the tympanon a pitched thump with a slap.
// Each culture family has its own mode, metre, instruments and tempo, so the
// music changes when you open a Punic port or a Gaulish oppidum. Seasons and
// war change the mood.
// ============================================================================
const MUSIC_STYLES = {
  // Dorian harmonia (E-mode), dactylic metre: long-short-short
  hellenic: { name: 'Dorian mode · kithara and aulos', root: 146.83, scale: [0, 1, 3, 5, 7, 8, 10], metre: [2, 1, 1], tempo: 84, lead: ['kithara', 'aulos'], drone: 'aulos', drum: 'krotala', dronePitch: [0, 7] },
  // Phrygian with a raised third (the augmented second heard across the Levant); an aksak 3+3+2
  semitic: { name: 'Phrygian mode · harp, aulos and frame drum', root: 164.81, scale: [0, 1, 4, 5, 7, 8, 10], metre: [3, 3, 2], tempo: 96, lead: ['aulos', 'harp'], drone: 'aulos', drum: 'tympanon', dronePitch: [0] },
  // Nile: Lydian-leaning harp music with sistrum
  nilotic: { name: 'Lydian mode · harp and sistrum', root: 130.81, scale: [0, 2, 4, 6, 7, 9, 11], metre: [2, 2, 1, 1], tempo: 72, lead: ['harp', 'harp', 'aulos'], drone: 'none', drum: 'sistrum', dronePitch: [0] },
  // Northern and western peoples: pentatonic tunes over a pipe drone, with a carnyx call now and then
  celtic: { name: 'Pentatonic · pipes, lyre and carnyx', root: 146.83, scale: [0, 3, 5, 7, 10], metre: [3, 3], tempo: 108, lead: ['pipes', 'kithara'], drone: 'pipes', drum: 'bodhran', dronePitch: [0, 7], horn: true },
  // Steppe: long drones, bowed fiddle and a galloping drum
  steppe: { name: 'Steppe drone · fiddle and horse drum', root: 110, scale: [0, 2, 3, 5, 7, 8, 10], metre: [1, 1, 2], tempo: 120, lead: ['fiddle', 'fiddle', 'kithara'], drone: 'throat', drum: 'gallop', dronePitch: [0, 7] },
};
const FAMILY_STYLE = { italic: 'hellenic', hellenic: 'hellenic', anatolian: 'hellenic', semitic: 'semitic', berber: 'semitic', nilotic: 'nilotic', iranian: 'semitic', caucasian: 'semitic',
  celtic: 'celtic', iberian: 'celtic', northern: 'celtic', balkan: 'steppe', steppe: 'steppe' };
const CULTURE_STYLE = { roman: 'hellenic', greek: 'hellenic', eastern: 'semitic', punic: 'semitic', numidian: 'semitic', egyptian: 'nilotic', celtic: 'celtic', iberian: 'celtic', germanic: 'celtic', thracian: 'steppe', scythian: 'steppe' };

const Music = {
  ctx: null, on: false, style: 'hellenic', next: 0, step: 0, phrase: null, phraseN: 0, timer: null, ks: new Map(), drone: null, pref: null,
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0.32;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.6); const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.bus = ctx.createGain(); this.bus.connect(comp); this.bus.connect(this.rev); this.rev.connect(wet); wet.connect(comp); comp.connect(this.master); this.master.connect(ctx.destination);
    return true;
  },
  impulse(sec) { const sr = this.ctx.sampleRate, n = Math.floor(sr * sec), b = this.ctx.createBuffer(2, n, sr); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; },
  loadPref() { try { this.pref = localStorage.getItem('oikoumene-music'); } catch (e) { this.pref = null; } return this.pref; },
  savePref(v) { try { localStorage.setItem('oikoumene-music', v); } catch (e) { /* storage blocked */ } },
  start() {
    if (!this.init()) return false; this.ctx.resume(); if (this.on) return true; this.on = true; this.savePref('on');
    this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.4);
    this.next = this.ctx.currentTime + 0.1; this.step = 0; this.phrase = null; this.startDrone();
    this.timer = setInterval(() => this.tick(), 90); return true;
  },
  stop() { if (!this.on) return; this.on = false; this.savePref('off'); clearInterval(this.timer); this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3); this.stopDrone(); },
  toggle() { return this.on ? (this.stop(), false) : this.start(); },
  // ---- mood -----------------------------------------------------------------
  pickStyle() {
    if (!G) return 'hellenic'; let cul = FAC[G.player].cul;
    if (UI.sel && UI.sel.type === 'city') { const c = C(UI.sel.id); if (c.ppl) { const top = topPeoples(c, 1)[0]; if (top) return FAMILY_STYLE[pfam(top[0])] || CULTURE_STYLE[c.culture]; } cul = c.culture; }
    return CULTURE_STYLE[cul] || 'hellenic';
  },
  mood() { const winter = G && G.season === 3, war = G && FIDS.some((f) => atWar(G.player, f)); return { tempo: (winter ? 0.85 : G && G.season === 1 ? 1.05 : 1) * (war ? 1.08 : 1), bright: winter ? -0.3 : 0.1, war }; },
  refresh() { const s = this.pickStyle(); if (s !== this.style) { this.style = s; this.phrase = null; if (this.on) { this.stopDrone(); this.startDrone(); } } },
  // ---- composition ------------------------------------------------------------
  compose() {
    const S = MUSIC_STYLES[this.style], n = S.scale.length, notes = [], len = 16; let deg = n + Math.floor(Math.random() * 3), pos = 0, mi = 0;
    while (pos < len) {
      const d = S.metre[mi++ % S.metre.length], last = pos + d >= len;
      if (last) deg = Math.random() < 0.6 ? n : n + this.fifth(); // cadence on the tonic or the fifth
      else { const r = Math.random(); deg += r < 0.35 ? -1 : r < 0.6 ? 1 : r < 0.72 ? -2 : r < 0.84 ? 2 : 0; deg = clamp(deg, 0, 2 * n - 1); }
      notes.push({ at: pos, dur: d, deg, rest: !last && Math.random() < 0.08 }); pos += d;
    }
    const ph = { notes, lead: S.lead[this.phraseN % S.lead.length], quiet: this.phraseN % 5 === 4 };
    this.phraseN++; return ph;
  },
  fifth() { const i = MUSIC_STYLES[this.style].scale.indexOf(7); return i < 0 ? 0 : i; },
  freq(deg, oct) { const S = MUSIC_STYLES[this.style], n = S.scale.length, o = Math.floor(deg / n), semi = S.scale[((deg % n) + n) % n] + 12 * (o + (oct || 0)); return S.root * Math.pow(2, semi / 12); },
  tick() {
    if (!this.on) return; const ctx = this.ctx, S = MUSIC_STYLES[this.style], m = this.mood(), beat = 60 / (S.tempo * m.tempo) / 2;
    while (this.next < ctx.currentTime + 0.6) {
      if (!this.phrase || this.step >= 16) { this.phrase = this.compose(); this.step = 0; this.refresh(); }
      const t = this.next, ph = this.phrase;
      if (!ph.quiet) for (const nt of ph.notes) if (nt.at === this.step && !nt.rest) this.play(ph.lead, this.freq(nt.deg, 0), t, nt.dur * beat * 1.9, 0.5 + Math.random() * 0.15);
      // accompaniment: plucked tonic and fifth on strong beats
      if (this.step % 8 === 0) this.play(this.style === 'nilotic' ? 'harp' : 'kithara', this.freq(0, -1), t, beat * 6, this.style === 'hellenic' ? 0.4 : 0.28);
      if (this.step % 8 === 4 && Math.random() < 0.7) this.play(this.style === 'nilotic' ? 'harp' : 'kithara', this.freq(this.fifth(), -1), t, beat * 4, 0.2);
      this.percussion(S.drum, this.step, t, m.war);
      if (S.horn && this.step === 0 && this.phraseN % 6 === 3) this.horn(this.freq(0, -1), t, beat * 10);
      this.next += beat; this.step++;
    }
  },
  // ---- instruments -------------------------------------------------------------
  env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur * 0.7), dur * 0.25 + 0.05); },
  pluckBuf(f, dur) {
    const key = Math.round(f) + ':' + Math.round(dur * 4); if (this.ks.has(key)) return this.ks.get(key);
    const sr = this.ctx.sampleRate, N = Math.floor(sr * Math.min(3, dur + 0.8)), p = Math.max(2, Math.round(sr / f)), b = this.ctx.createBuffer(1, N, sr), d = b.getChannelData(0), ring = new Float32Array(p);
    for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1; let idx = 0;
    for (let i = 0; i < N; i++) { const a = ring[idx], c = ring[(idx + 1) % p]; d[i] = a; ring[idx] = (a + c) * 0.5 * 0.9965; idx = (idx + 1) % p; }
    if (this.ks.size > 120) this.ks.clear(); this.ks.set(key, b); return b;
  },
  play(inst, f, t, dur, vel) {
    const ctx = this.ctx;
    if (inst === 'kithara' || inst === 'harp') {
      const s = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); s.buffer = this.pluckBuf(inst === 'harp' ? f * 2 : f * 2, dur);
      lp.type = 'lowpass'; lp.frequency.value = inst === 'harp' ? 2600 : 3400; g.gain.value = vel * 0.9; s.connect(lp); lp.connect(g); g.connect(this.bus); s.start(t); s.stop(t + Math.min(3, dur + 0.8));
      return;
    }
    // reeds and bowed strings: two detuned oscillators through a formant filter, with vibrato
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    const reed = inst === 'aulos' || inst === 'pipes';
    o1.type = reed ? 'sawtooth' : 'sawtooth'; o2.type = reed ? 'square' : 'triangle';
    const ff = inst === 'pipes' ? f : f * 2; o1.frequency.value = ff; o2.frequency.value = ff * 1.004;
    bp.type = 'bandpass'; bp.frequency.value = inst === 'aulos' ? 1300 : inst === 'pipes' ? 900 : 1600; bp.Q.value = inst === 'fiddle' ? 1.2 : 1.8;
    lp.type = 'lowpass'; lp.frequency.value = 3200;
    vib.frequency.value = inst === 'fiddle' ? 5.5 : 4.8; vg.gain.value = inst === 'pipes' ? 3 : 9; vib.connect(vg); vg.connect(o1.detune); vg.connect(o2.detune);
    o1.connect(bp); o2.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.bus);
    this.env(g, t, inst === 'fiddle' ? 0.12 : 0.04, vel * (reed ? 0.16 : 0.13), dur);
    for (const o of [o1, o2, vib]) { o.start(t); o.stop(t + dur + 1); }
  },
  horn(f, t, dur) { // carnyx: a bronze boar-headed war trumpet
    const ctx = this.ctx, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.linearRampToValueAtTime(f, t + 0.4);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(400, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.bus); this.env(g, t, 0.5, 0.12, dur); o.start(t); o.stop(t + dur + 1);
  },
  noise(t, dur, freq, q, vol, type) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t);
  },
  thump(t, f0, vol) { const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + 0.25); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.4); },
  percussion(kind, step, t, war) {
    const loud = war ? 1.5 : 1;
    if (kind === 'tympanon') { if (step % 8 === 0 || step % 8 === 3) this.thump(t, 110, 0.35 * loud); if (step % 8 === 6 || step % 4 === 2) this.noise(t, 0.06, 1800, 1.5, 0.18 * loud); }
    else if (kind === 'krotala') { if (step % 4 === 0) this.noise(t, 0.03, 3500, 3, 0.1); if (war && step % 8 === 0) this.thump(t, 90, 0.3); }
    else if (kind === 'sistrum') { if (step % 4 === 2) { for (let k = 0; k < 3; k++) this.noise(t + k * 0.03, 0.05, 6000, 4, 0.05); } if (step % 8 === 0) this.thump(t, 95, 0.18); }
    else if (kind === 'bodhran') { if (step % 3 === 0) this.thump(t, step % 6 === 0 ? 85 : 120, 0.3 * loud); if (step % 6 === 5) this.noise(t, 0.05, 1200, 1, 0.08); }
    else if (kind === 'gallop') { if (step % 4 !== 3) this.thump(t, step % 4 === 0 ? 80 : 110, (step % 4 === 0 ? 0.22 : 0.13) * loud); }
  },
  startDrone() {
    const S = MUSIC_STYLES[this.style]; if (S.drone === 'none' || !this.ctx) return; const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(), oscs = [];
    lp.type = 'lowpass'; lp.frequency.value = S.drone === 'throat' ? 700 : 900; lp.Q.value = S.drone === 'throat' ? 6 : 1;
    for (const semi of S.dronePitch) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = S.root * Math.pow(2, semi / 12) / (S.drone === 'throat' ? 2 : 1); o.connect(lp); o.start(); oscs.push(o); }
    if (S.drone === 'throat') { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.15; lg.gain.value = 500; l.connect(lg); lg.connect(lp.frequency); l.start(); oscs.push(l); }
    lp.connect(g); g.connect(this.bus); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.linearRampToValueAtTime(S.drone === 'throat' ? 0.025 : 0.045, ctx.currentTime + 2.5);
    this.drone = { g, oscs };
  },
  stopDrone() { if (!this.drone) return; const { g, oscs } = this.drone, t = this.ctx.currentTime; g.gain.setTargetAtTime(0.0001, t, 0.6); for (const o of oscs) o.stop(t + 3); this.drone = null; },
  // ---- sound effects -------------------------------------------------------------
  sfx(kind) {
    if (!this.on || !this.ctx) return; const t = this.ctx.currentTime + 0.02;
    if (kind === 'turn') { this.thump(t, 70, 0.5); this.play('kithara', this.freq(0, 0), t + 0.05, 1.5, 0.35); this.play('kithara', this.freq(2, 0), t + 0.13, 1.4, 0.3); this.play('kithara', this.freq(4, 0), t + 0.21, 1.6, 0.3); }
    else if (kind === 'build') { for (let k = 0; k < 3; k++) this.noise(t + k * 0.16, 0.05, 2400, 6, 0.25); }
    else if (kind === 'coin') { this.play('harp', 1318, t, 0.6, 0.3); this.play('harp', 1760, t + 0.08, 0.6, 0.25); }
    else if (kind === 'fanfare') { [0, 4, 7, 11].forEach((d, k) => this.play('aulos', this.freq(d, 0), t + k * 0.18, 0.5, 0.6)); }
    else if (kind === 'war') { this.horn(this.freq(0, -1), t, 1.8); this.thump(t, 60, 0.6); this.thump(t + 0.5, 60, 0.6); }
  },
  label() { return MUSIC_STYLES[this.style].name; },
};
