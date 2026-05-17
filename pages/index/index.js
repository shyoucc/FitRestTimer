const app = getApp();

const VOICE_OPTS = [
  { label: '5s',  value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
];

const REST_OPTS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
];

Page({
  data: {
    status: 'idle',          // idle | working | resting | paused | done
    totalSets: 4,
    currentSet: 0,
    completedSets: 0,
    dots: [],
    restOptions: REST_OPTS,
    restDuration: 60,
    // 休息倒计时
    restRemaining: 60,
    restDisplay: '01:00',
    restProgress: 1,
    warning: false,          // ≤10s 时变色提醒
    // 语音开关
    voiceOn: false,
    voiceCountdown: 10,
    voiceOptions: VOICE_OPTS,
    // 本组计时（正计时）
    setElapsed: 0,
    setDisplay: '00:00',
    // 汇总
    totalElapsed: 0,
    totalDisplay: '00:00',
  },

  _restTimer: null,
  _setTimer: null,
  _totalTimer: null,
  _startTime: null,
  _audio: null,

  onLoad() {
    this._rebuildDots();
    // 初始化音频实例（复用同一个，避免重复创建）
    this._audio = wx.createInnerAudioContext();
    this._audio.volume = 1;
  },

  onUnload() {
    this._stopAll();
    if (this._audio) { this._audio.destroy(); this._audio = null; }
  },

  toggleVoice() {
    const next = !this.data.voiceOn;
    this.setData({ voiceOn: next });
    if (next) this._speak('go');
  },

  pickVoiceCountdown(e) {
    this.setData({ voiceCountdown: e.currentTarget.dataset.v });
  },

  onReady() {
    const ratio = wx.getSystemInfoSync().windowWidth / 750;
    this._px = Math.round(500 * ratio);
    // 不在 idle 画 canvas，减少视觉噪音
  },

  // ── 设置 ──────────────────────────────────────────────────

  pickRest(e) {
    if (this.data.status !== 'idle') return;
    this.setData({ restDuration: e.currentTarget.dataset.v });
  },

  addSet() {
    if (this.data.status !== 'idle') return;
    this.setData({ totalSets: Math.min(this.data.totalSets + 1, 20) });
    this._rebuildDots();
  },

  subSet() {
    if (this.data.status !== 'idle') return;
    this.setData({ totalSets: Math.max(this.data.totalSets - 1, 1) });
    this._rebuildDots();
  },

  // ── 主流程 ────────────────────────────────────────────────

  start() {
    this._startTime = Date.now();
    this._startTotalTimer();
    this.setData({
      status: 'working',
      currentSet: 1,
      completedSets: 0,
      setElapsed: 0,
      setDisplay: '00:00',
    });
    this._rebuildDots();
    this._startSetTimer();
    wx.vibrateShort({ type: 'light' });
  },

  finishSet() {
    this._stopSetTimer();
    wx.vibrateShort({ type: 'light' });

    const { completedSets, totalSets, restDuration } = this.data;
    const done = completedSets + 1;

    if (done >= totalSets) {
      this._stopAll();
      this._save(done);
      this.setData({ status: 'done', completedSets: done, currentSet: totalSets });
      this._rebuildDots();
      this._buzz();
      return;
    }

    this.setData({
      status: 'resting',
      completedSets: done,
      currentSet: done + 1,
      restRemaining: restDuration,
      restDisplay: this._fmt(restDuration),
      restProgress: 1,
      warning: false,
    });
    this._rebuildDots();
    this._startRestTimer();
  },

  skipRest() {
    this._stopRestTimer();
    this._enterWorking();
  },

  pause() {
    this._stopRestTimer();
    this.setData({ status: 'paused', warning: false });
    this._rebuildDots();
    this._drawRing(this.data.restRemaining / this.data.restDuration, 'paused', false);
  },

  resume() {
    this.setData({ status: 'resting' });
    this._rebuildDots();
    this._startRestTimer();
  },

  end() {
    const { completedSets } = this.data;
    if (completedSets > 0) this._save(completedSets);
    this._stopAll();
    this.setData({
      status: 'idle',
      currentSet: 0,
      completedSets: 0,
      setElapsed: 0,
      setDisplay: '00:00',
      totalElapsed: 0,
      totalDisplay: '00:00',
    });
    this._rebuildDots();
  },

  again() {
    this._stopAll();
    this.setData({
      status: 'idle',
      currentSet: 0,
      completedSets: 0,
      setElapsed: 0,
      setDisplay: '00:00',
      totalElapsed: 0,
      totalDisplay: '00:00',
    });
    this._rebuildDots();
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  // ── 内部跳转 ──────────────────────────────────────────────

  _enterWorking() {
    this.setData({ status: 'working', setElapsed: 0, setDisplay: '00:00' });
    this._rebuildDots();
    this._startSetTimer();
    wx.vibrateShort({ type: 'light' });
  },

  // ── 倒计时：休息 ──────────────────────────────────────────

  _startRestTimer() {
    this._stopRestTimer();
    const total = this.data.restDuration;

    const tick = () => {
      const rem = this.data.restRemaining - 1;
      if (rem <= 0) {
        this.setData({ restRemaining: 0, restDisplay: '00:00', restProgress: 0, warning: false });
        this._drawRing(0, 'resting', false);
        this._buzz();
        if (this.data.voiceOn) this._speak('go');
        this._enterWorking();
        return;
      }
      const threshold = this.data.voiceCountdown;
      const warn = rem <= threshold;
      this.setData({
        restRemaining: rem,
        restDisplay: this._fmt(rem),
        restProgress: rem / total,
        warning: warn,
      });
      this._drawRing(rem / total, 'resting', warn);
      // 最后 N 秒逐秒播报
      if (this.data.voiceOn && rem <= threshold) this._speak(rem);
      this._restTimer = setTimeout(tick, 1000);
    };

    this._drawRing(this.data.restRemaining / total, 'resting', this.data.warning);
    this._restTimer = setTimeout(tick, 1000);
  },

  // ── 正计时：本组用时 ──────────────────────────────────────

  _startSetTimer() {
    this._stopSetTimer();
    const tick = () => {
      const s = this.data.setElapsed + 1;
      this.setData({ setElapsed: s, setDisplay: this._fmt(s) });
      this._setTimer = setTimeout(tick, 1000);
    };
    this._setTimer = setTimeout(tick, 1000);
  },

  // ── 总时长计时 ────────────────────────────────────────────

  _startTotalTimer() {
    this._stopTotalTimer();
    const tick = () => {
      const s = Math.round((Date.now() - this._startTime) / 1000);
      this.setData({ totalElapsed: s, totalDisplay: this._fmt(s) });
      this._totalTimer = setTimeout(tick, 1000);
    };
    this._totalTimer = setTimeout(tick, 1000);
  },

  // ── Canvas 圆环 ───────────────────────────────────────────

  _drawRing(progress, status, warning) {
    const size = this._px || 250;
    const ctx = wx.createCanvasContext('ring', this);
    const c = size / 2, r = size * 0.43, lw = size * 0.052;

    ctx.clearRect(0, 0, size, size);

    // 背景轨道
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.setStrokeStyle('#EEF0F5');
    ctx.setLineWidth(lw);
    ctx.stroke();

    if (progress > 0.005) {
      let color;
      if (status === 'paused') {
        color = '#DDE1EC';
      } else {
        // 绿(1.0) → 橙(0.5) → 红(0.0) 线性插值
        color = this._progressColor(progress);
      }

      const a0 = -Math.PI / 2;
      const a1 = a0 + progress * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(c, c, r, a0, a1);
      ctx.setStrokeStyle(color);
      ctx.setLineWidth(lw);
      ctx.setLineCap('round');
      ctx.stroke();

      // 端点圆点
      const ex = c + r * Math.cos(a1);
      const ey = c + r * Math.sin(a1);
      ctx.beginPath();
      ctx.arc(ex, ey, lw * 0.52, 0, Math.PI * 2);
      ctx.setFillStyle(color);
      ctx.fill();
    }

    ctx.draw();
  },

  // 绿(progress=1) → 橙(0.5) → 红(0)
  _progressColor(p) {
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    // green: #10B981 = [16,185,129]
    // amber: #F59E0B = [245,158,11]
    // red:   #F97066 = [249,112,102]
    let r, g, b;
    if (p >= 0.5) {
      const t = (1 - p) / 0.5;   // 0→1 as progress goes 1.0→0.5
      r = lerp(16,  245, t);
      g = lerp(185, 158, t);
      b = lerp(129,  11, t);
    } else {
      const t = (0.5 - p) / 0.5; // 0→1 as progress goes 0.5→0
      r = lerp(245, 249, t);
      g = lerp(158, 112, t);
      b = lerp(11,  102, t);
    }
    return `rgb(${r},${g},${b})`;
  },

  // ── 工具 ─────────────────────────────────────────────────

  _rebuildDots() {
    const { totalSets, currentSet, status } = this.data;
    const dots = Array.from({ length: totalSets }, (_, i) => {
      const idx = i + 1;
      let cls = 'dot';
      if (idx < currentSet || status === 'done') cls = 'dot dot-done';
      else if (idx === currentSet) {
        if (status === 'working')         cls = 'dot dot-work';
        else if (status === 'resting')    cls = 'dot dot-rest';
        else if (status === 'paused')     cls = 'dot dot-pause';
      }
      return { idx, cls };
    });
    this.setData({ dots });
  },

  _speak(n) {
    if (!this._audio) return;
    // 音频支持 1-30 及 go
    if (n !== 'go' && (n < 1 || n > 30)) return;
    this._audio.stop();
    this._audio.src = `/audio/${n}.mp3`;
    this._audio.play();
  },

  _stopRestTimer()  { clearTimeout(this._restTimer);  this._restTimer = null; },
  _stopSetTimer()   { clearTimeout(this._setTimer);   this._setTimer = null; },
  _stopTotalTimer() { clearTimeout(this._totalTimer); this._totalTimer = null; },

  _stopAll() {
    this._stopRestTimer();
    this._stopSetTimer();
    this._stopTotalTimer();
    this._startTime = null;
  },

  _buzz() {
    wx.vibrateShort({ type: 'heavy' });
    setTimeout(() => wx.vibrateShort({ type: 'heavy' }), 220);
  },

  _fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },

  _save(completedSets) {
    const { totalSets, restDuration, totalElapsed } = this.data;
    app.saveHistory({
      date: new Date().toLocaleDateString('zh-CN'),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      completedSets,
      totalSets,
      restDuration,
      duration: totalElapsed,
    });
  },
});
