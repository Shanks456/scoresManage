Page({
  data: {
    currentTab: 0, 
    adminTabItems: [
      { url: '/pages/admin/home/home', text: '首页', iconPath: '/pages/images/13.png', selectedIconPath: '/pages/images/14.png' },
      { url: '/pages/announce/announce', text: '公告', iconPath: '/pages/images/15.png', selectedIconPath: '/pages/images/16.png' },
      { url: '/pages/admin/settings/settings', text: '我的', iconPath: '/pages/images/17.png', selectedIconPath: '/pages/images/18.png' },
    ]
  },

  // 处理 Tab 切换的事件
  onTabChange(e) {
    const index = e.detail.index;
    console.log(`Selected Tab Index: ${index}`);

    // 更新当前选中的 Tab
    this.setData({
      currentTab: index
    });

    const selectedTab = this.data.adminTabItems[index];
    if (selectedTab) {
      console.log(`Navigating to: ${selectedTab.url}`);

      // 使用 navigateTo 进行跳转, 如果没有在 tabBar 中注册
      wx.navigateTo({
        url: selectedTab.url,
        success: (res) => {
          console.log('Navigation success:', res);
        },
        fail: (err) => {
          console.error('Navigation failed:', err);
        }
      });
    }
  }
});
