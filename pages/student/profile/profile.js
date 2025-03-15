// pages/student/profile/profile.js
Page({
  anounce: function () {
    wx.navigateTo({
      url: '/pages/announce/announce',
    });
  },
  
  about: function () {
    wx.navigateTo({
      url: '/pages/about/about',
    });
  },
  suggest: function () {
    wx.navigateTo({
      url: '/pages/suggest/suggest',
    });
  },
  onImageTap() {
    console.log('图片被点击了');
    wx.showToast({
      title: '图片点击成功',
      icon: 'success'
    });
 
  },
  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  showLogoutOptions: function() {
    wx.showActionSheet({
      itemList: ['清除缓存', '重新登录', '退出登录', '取消'],
      success: (res) => {
        const actions = [
          this.clearCache,
          this.reLogin,
          this.logout,
          () => {} // 取消操作
        ];
        actions[res.tapIndex]?.call(this);
      }
    })
  },

  clearCache: function() {
    // 空实现，仅用于演示
    console.log('清除缓存点击');
  },

  reLogin: function() {
    console.log('重新登录点击');
  },

  logout: function() {
    console.log('退出登录点击');
  }
})