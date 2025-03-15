//pages/teacherIndex/addStudent/addStudent.js

const BASE_URL = 'http://192.168.101.119:3006'; 

Page({
  data: {
    grades: ['一年级', '二年级', '三年级'],
    selectedGrade: '',
    studentName: '',
    studentId: ''
  },

  onGradeChange: function (e) {
    const index = e.detail.value;
    this.setData({
      selectedGrade: this.data.grades[index]
    });
  },

  onInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  onSubmit: function () {
    const { studentName, studentId, selectedGrade } = this.data;

    if (!studentName || !studentId || !selectedGrade) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    wx.request({
      url: `${BASE_URL}/addStudent`,
      method: 'POST',
      data: {
        studentName,
        studentId,
        grade: selectedGrade
      },
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: '添加成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '添加失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});
