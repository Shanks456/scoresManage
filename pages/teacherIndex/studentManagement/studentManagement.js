//pages/teacherIndex/studentManagement/studentManagement.js
const BASE_URL = 'http://192.168.101.119:3006'; 

Page({
  data: {
    studentsList: [] 
  },

  onLoad: function () {
    this.fetchStudents();
  },

  onShow: function () {
    this.fetchStudents(); 
  },

  fetchStudents: function () {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: `${BASE_URL}/getStudents`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          this.setData({ studentsList: res.data.data });
        } else {
          wx.showToast({
            title: res.data.message || '获取失败',
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

  // 查看学生成绩详情
  viewStudentScores: function (e) {
    const id = e.currentTarget.dataset.id; 
    if (!id) {
      wx.showToast({ title: '学生 ID 无效', icon: 'none', duration: 2000 });
      return;
    }
    wx.navigateTo({ url: `/pages/teacherIndex/viewScores/viewScores?studentId=${id}` }); 
  },


  inputScore: function (e) {
    const id = e.currentTarget.dataset.id; 
    if (!id) {
      wx.showToast({ title: '学生 ID 无效', icon: 'none', duration: 2000 });
      return;
    }
    wx.navigateTo({ url: `/pages/teacherIndex/inputtingGrades/inputtingGrades?id=${id}` }); 
  },

  // 添加学生,跳转到添加学生页面
  onAddStudent: function () {
    wx.navigateTo({ url: '/pages/teacherIndex/addStudent/addStudent' });
  },

  // 修改学生信息,跳转到修改页面
  modifyStudent: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '学生 ID 无效', icon: 'none', duration: 2000 });
      return;
    }
    wx.navigateTo({ url: `/pages/teacherIndex/update/update?id=${id}` });
  },

  // 删除学生
  deleteStudent: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除此学生吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          wx.request({
            url: `${BASE_URL}/deleteStudent/${id}`,
            method: 'DELETE',
            success: (res) => {
              if (res.data.success) {
                this.fetchStudents(); 
                wx.showToast({ title: '删除成功', icon: 'success', duration: 2000 });
              } else {
                wx.showToast({ title: res.data.message || '删除失败', icon: 'none', duration: 2000 });
              }
            },
            fail: (err) => {
              console.error('请求失败:', err);
              wx.showToast({ title: '网络错误，请检查网络连接', icon: 'none', duration: 2000 });
            },
            complete: () => {
              wx.hideLoading();
            }
          });
        }
      }
    });
  }
});
