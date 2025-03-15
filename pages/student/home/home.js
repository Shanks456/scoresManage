// pages/student/home/home.js
Page({
  data: {
      studentInfo: null,
      currentTab: 0,
      studentTabItems: [
          {
              pagePath: "/pages/student/home/home",
              text: "首页",
              iconPath: "/pages/images/1.png",
              selectedIconPath: "/pages/images/2.png"
          },
          {
              pagePath: "/pages/student/courses/courses",
              text: "科目",
              iconPath: "/pages/images/3.png",
              selectedIconPath: "/pages/images/4.png"
          },
          {
              pagePath: "/pages/student/profile/profile",
              text: "我的",
              iconPath: "/pages/images/5.png",
              selectedIconPath: "/pages/images/6.png"
          }
      ]
  },


onLoad: function() {
 
  const token = wx.getStorageSync('token');
  const studentInfo = wx.getStorageSync('studentInfo');
  
  console.log('存储验证详情:', {
    tokenValidity: token && token.length >= 32, 
    studentInfoKeys: studentInfo ? Object.keys(studentInfo) : null
  });

  if (!token || token.length < 32 || !studentInfo?.account) {
    console.error('凭证验证失败，执行退出');
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/index/index' });
    return;
  }


  this.setData({ studentInfo });
  this.checkUserSession();
},

  initStudentInfo: function() {
    const studentInfo = wx.getStorageSync('studentInfo');
    console.log('学生信息:', studentInfo); 
    console.log('studentInfo:', studentInfo); 
    if (!studentInfo) {
        console.warn('studentInfo 不存在，触发跳转');
        wx.redirectTo({ url: '/pages/index/index' });
        return;
    }
    this.setData({ studentInfo });
},





onTabChange(e) {
  const index = e.detail.index;
  const targetPath = this.data.studentTabItems[index].pagePath;
  
 
  this.setData({ currentTab: index }, () => {
    
    wx.redirectTo({
      url: targetPath,
      success: () => {
      
        getApp().globalData.lastActiveTab = index;
      },
      fail: (err) => {
        console.error('[跳转失败]', err);
     
        wx.showToast({ title: '页面加载失败', icon: 'none' });
      }
    });
  });
},


checkUserSession() {
  const token = wx.getStorageSync('token');
  wx.request({
    url: 'http://192.168.101.119:3006/api/getStudents',
    method: 'GET',
    header: { 'Authorization': `Bearer ${token}` },
    success: (res) => {
     
      if (res.statusCode === 401) {
        wx.removeStorageSync('token');
        wx.redirectTo({ url: '/pages/index/index' });
      }
    },
    fail: (error) => {
      console.error('会话验证请求失败:', error);
    }
  });
},



onNavigate: function(e) {
  const url = e.currentTarget.dataset.url;
  console.log('[跳转调试] 目标路径:', url);
  
  wx.navigateTo({
    url,
    success: () => console.log('[跳转成功]'),
    fail: (err) => console.error('[跳转失败]', err)
  });
},

onTapButton: function () {

  console.log("按钮被点击了");
}
});
