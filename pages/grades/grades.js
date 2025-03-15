// pages/grades/grades.js
Page({
  data: {
    studentName: '',
    grade: '',
    term: '',
    year: '',
    subject: '',
    score: ''
  },


  onNameInput: function (e) {
    this.setData({ studentName: e.detail.value });
  },
  onGradeInput: function (e) {
    this.setData({ grade: e.detail.value });
  },
  onTermInput: function (e) {
    this.setData({ term: e.detail.value });
  },
  onYearInput: function (e) {
    this.setData({ year: e.detail.value });
  },
  onSubjectInput: function (e) {
    this.setData({ subject: e.detail.value });
  },
  onScoreInput: function (e) {
    this.setData({ score: e.detail.value });
  },


  onSubmit: function () {
    const { studentName, grade, term, year, subject, score } = this.data;

   
    if (!studentName || !grade || !term || !year || !subject || !score) {
      wx.showToast({
        title: '请填写所有必填项',
        icon: 'none'
      });
      return;
    }

    
    const data = {
      studentName,
      grade,
      term,
      year,
      subject,
      score
    };

    
    wx.request({
      url: 'http://localhost:3006/updateGrades', 
      method: 'POST',
      data: data,
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: '提交成功',
            icon: 'success',
            duration: 2000
          });
          setTimeout(() => {
            wx.navigateBack(); 
          }, 2000);
        } else {
          wx.showToast({
            title: '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  }
});
