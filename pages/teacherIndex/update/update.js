// pages/teacherIndex/update/update.js


const BASE_URL = 'http://192.168.101.119:3006'; 

Page({
  data: {
    grades: ['一年级', '二年级', '三年级'],
    selectedGrade: '',
    student: {
      studentName: '',
      studentId: '',
      grade: '',
      id: null
    },
    isEdit: false
  },

  onLoad: function (options) {
    const { id } = options;
    if (id) {
      this.setData({ isEdit: true });
      this.fetchStudentDetail(id);
    } else {
      wx.showToast({
        title: '学生 ID 无效',
        icon: 'none',
        duration: 2000
      });
      wx.navigateBack();
    }
  },

  fetchStudentDetail: function (id) {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: `${BASE_URL}/getStudent/${id}`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          this.setData({
            student: res.data.data,
            selectedGrade: res.data.data.grade
          });
        } else {
          wx.showToast({
            title: res.data.message || '无法获取学生信息',
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
  },

  onInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`student.${field}`]: e.detail.value
    });
  },

  onGradeChange: function (e) {
    const index = e.detail.value;
    this.setData({
      selectedGrade: this.data.grades[index],
      'student.grade': this.data.grades[index]
    });
  },

  onSubmit: function () {
    const { student, selectedGrade, isEdit } = this.data;

    if (!student.studentName || !student.studentId || !selectedGrade) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (isEdit && !student.id) {
      wx.showToast({
        title: '学生 ID 无效，无法修改',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: isEdit ? '修改中...' : '提交中...' });

    const url = isEdit
      ? `${BASE_URL}/updateStudent/${student.id}`
      : `${BASE_URL}/addStudent`;
    const method = isEdit ? 'PUT' : 'POST';

    wx.request({
      url,
      method,
      data: student,
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: isEdit ? '修改成功' : '添加成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '操作失败',
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
