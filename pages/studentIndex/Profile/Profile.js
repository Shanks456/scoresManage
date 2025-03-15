// pages/studentIndex/Profile/Profile.js
Page({
  data: {
    studentDetail: null,
    loading: true,
    error: null
  },

  onLoad() {
    this.loadStudentDetail();
  },

  loadStudentDetail() {
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: 'http://192.168.101.119:3006/api/current-student',
      header: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            studentDetail: res.data.data,
            loading: false
          });
        } else {
          this.handleError(res.data?.errorCode || 'DATA_ERROR');
        }
      },
      fail: (err) => {
        this.handleError('NETWORK_ERROR');
      }
    });
  },

  handleError(errorCode) {
    const errorMessages = {
      'STUDENT_NOT_FOUND': '学生信息不存在',
      'DB_ERROR': '服务器数据错误',
      'NETWORK_ERROR': '网络连接失败',
      'DATA_ERROR': '数据解析失败'
    };

    this.setData({
      error: errorMessages[errorCode] || '未知错误',
      loading: false
    });
  },

  formatTime(timestamp) {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
  }
});