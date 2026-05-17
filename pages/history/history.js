const app = getApp();

Page({
  data: {
    statusBarH: 0,
    navBarH: 44,
    history: [],
    totalWorkouts: 0,
    totalSetsAll: 0,
    totalMinutes: 0,
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync();
    const btn = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarH: statusBarHeight,
      navBarH: btn.bottom - statusBarHeight + 8,
    });
  },

  onShow() {
    this._loadHistory();
  },

  _loadHistory() {
    const raw = app.globalData.history || [];
    const history = raw.map(item => {
      const pct = item.totalSets > 0
        ? Math.round((item.completedSets / item.totalSets) * 100)
        : 0;
      return {
        ...item,
        progressPct: Math.min(pct, 100),
        durationDisplay: this._formatDuration(item.duration || 0),
      };
    });

    const totalSetsAll = history.reduce((s, i) => s + (i.completedSets || 0), 0);
    const totalMinutes = history.reduce((s, i) => s + Math.round((i.duration || 0) / 60), 0);

    this.setData({
      history,
      totalWorkouts: history.length,
      totalSetsAll,
      totalMinutes,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  clearHistory() {
    wx.showModal({
      title: '清空记录',
      content: '确定要清空所有训练记录吗？',
      confirmColor: '#e94560',
      success: (res) => {
        if (res.confirm) {
          app.globalData.history = [];
          wx.removeStorageSync('workoutHistory');
          this._loadHistory();
        }
      },
    });
  },

  _formatDuration(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
  },
});
