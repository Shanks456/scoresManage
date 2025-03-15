// pages/teacher/coursesIndex/coursesIndex.js
Page({

  data: {
    subjectId: null,
    scores: []
  },

  onLoad(options) {

    const { subjectId } = options;
    console.log(`接收到的 subjectId: ${subjectId}`);
    this.setData({ subjectId });

   
    this.fetchScoresBySubject(subjectId);
  },

  fetchScoresBySubject(subjectId) {
    const BASE_URL = 'http://192.168.101.119:3006'; 
    wx.request({
      url: `${BASE_URL}/getScoresBySubject/${subjectId}`,
      method: 'GET',
      success: (res) => {
        console.log("接口返回：", res.data);
        if (res.data.success) {
          this.setData({ scores: res.data.data });
        } else {
          console.error("获取成绩失败:", res.data.message);
          wx.showToast({
            title: res.data.message || '获取成绩失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error("请求失败:", err);
        wx.showToast({
          title: '网络请求失败，请检查服务器',
          icon: 'none'
        });
      }
    });
  }
});
