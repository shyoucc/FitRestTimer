App({
  globalData: {
    history: []
  },

  onLaunch() {
    const history = wx.getStorageSync('workoutHistory') || [];
    this.globalData.history = history;
  },

  saveHistory(record) {
    this.globalData.history.unshift(record);
    if (this.globalData.history.length > 100) {
      this.globalData.history = this.globalData.history.slice(0, 100);
    }
    wx.setStorageSync('workoutHistory', this.globalData.history);
  }
});
