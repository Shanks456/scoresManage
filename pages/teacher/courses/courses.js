const BASE_URL = 'http://192.168.101.119:3006';

Page({
  data: {
    subjects: [],
    scores: [],
    selectedSubjectId: null 
  },

  onLoad() {
    this.fetchSubjects();
  },

  fetchSubjects() {
    wx.request({
      url: `${BASE_URL}/getSubjects`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          this.setData({ subjects: res.data.data });
        } else {
          console.error("获取学科失败:", res.data.message);
          wx.showToast({
            title: res.data.message || '获取学科失败',
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
  },

  chooseSubject(e) {
    const subjectId = e.currentTarget.dataset.id;
    console.log("选择的学科 ID:", subjectId);
  
    wx.navigateTo({
      url: `/pages/teacher/coursesIndex/coursesIndex?subjectId=${subjectId}`,
      success: (res) => {
        console.log("跳转成功");
        res.eventChannel.emit('sendScoresData', {
          scores: this.data.scores
        });
      },
      fail: (err) => {
        console.error("跳转失败:", err);
      }
    });
  },

  fetchScoresBySubject(subjectId) {
    wx.request({
      url: `${BASE_URL}/getScoresBySubject/${subjectId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          this.setData({ scores: res.data.data });
        } else {
          console.error("获取成绩失败:", res.data.message);
          wx.showToast({
            title: res.data.message || '获取成绩失败',
            icon: 'none'
          });
          this.setData({ scores: [] });
        }
      },
      fail: (err) => {
        console.error("请求失败:", err);
        wx.showToast({
          title: '网络请求失败，请检查服务器',
          icon: 'none'
        });
        this.setData({ scores: [] });
      }
    });
  },

  onPullDownRefresh() {
    const { selectedSubjectId } = this.data;
    if (selectedSubjectId) {
      this.fetchScoresBySubject(selectedSubjectId);
    } else {
      this.fetchSubjects();
    }
    wx.stopPullDownRefresh();
  }
});