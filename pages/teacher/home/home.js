//pages\teacher\home\home.js
Page({
  data: {
    currentTab: 0,
    list: [], 
    selected: 0 ,
    currentTab: 0, 
    teacherTabItems: [
      { url: '/pages/teacher/home/home', text: '首页', iconPath: '/pages/images/7.png', selectedIconPath: '/pages/images/8.png' },
      { url: '/pages/teacher/courses/courses', text: '课程', iconPath: '/pages/images/9.png', selectedIconPath: '/pages/images/10.png' },
      { url: '/pages/teacher/profile/profile', text: '我的', iconPath: '/pages/images/11.png', selectedIconPath: '/pages/images/12.png' },
    ]
  },


  
  onLoad() {
    this.checkUserSession(); 
  },
  onShow() {
    const token = wx.getStorageSync('token');
    console.log('Token:', token);
    if (!token) {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },
  checkUserSession() {
    const token = wx.getStorageSync('token'); 
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      wx.redirectTo({
        url: '/pages/index/index' 
      });
      return;
    }

  
    wx.request({
      url: 'http://192.168.101.119:3006/api/getStudents', 
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
       
        console.log('请求成功:', res.data);
      },
      fail: (error) => {
        console.error('请求失败:', error);
        if (error.statusCode === 401) {
          wx.showToast({
            title: '需要重新登录',
            icon: 'none'
          });
          wx.redirectTo({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  onNavigate: function (event) {
    const url = event.currentTarget.dataset.url; 
    if (!url) {
      console.error("URL 未定义");
      return;
    }

    wx.navigateTo({
      url: url,
      success: () => {
        console.log(`成功跳转到: ${url}`);
      },
      fail: (err) => {
        console.error(`跳转失败: ${url}`, err);
      }
    });
  },

 
  onTapButton: function () {
    const url = '/pages/grades/grades'; 
    wx.navigateTo({
      url: url,
      success: () => {
        console.log(`成功跳转到: ${url}`);
        wx.showToast({
          title: '成绩录入中',
          icon: 'none'
        });
      },
      fail: (err) => {
        console.error(`跳转失败: ${url}`, err);
      }
    });
  },

 
  onTabChange: function (e) {
    const index = e.detail.index;
    console.log(`Selected Tab Index: ${index}`);

    this.setData({
      currentTab: index
    });

    const selectedTab = this.data.teacherTabItems[index];
    if (selectedTab) {
      wx.navigateTo({
        url: selectedTab.url,
        success: (res) => {
          console.log('Tab 切换成功:', res);
        },
        fail: (err) => {
          console.error('Tab 切换失败:', err);
        }
      });
    }
  }
});
