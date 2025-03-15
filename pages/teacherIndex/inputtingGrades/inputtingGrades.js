//pages\teacherIndex\inputtingGrades\inputtingGrades.js
const BASE_URL = 'http://192.168.101.119:3006'; 

Page({
  data: {
    studentId: '',
    studentName: '', 
    grade: '', 
    subjectsList: [], 
    selectedSubjectIndex: null, 
    score: '', 
    comment: '' 
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ studentId: id });
      this.fetchStudentInfo(id);
      this.fetchSubjects();
    } else {
      wx.showToast({
        title: '学生 ID 无效',
        icon: 'none',
        duration: 2000
      });
      wx.navigateBack();
    }
  },

  // 获取学生信息
  fetchStudentInfo(id) {
    wx.showLoading({ title: '加载中...' });
    console.log(`Fetching student info for ID: ${id}`); 
    wx.request({
      url: `${BASE_URL}/getStudent/${id}`,
      method: 'GET',
      success: (res) => {
        console.log('获取学生信息响应:', res.data); 
        if (res.data.success) {
          const { studentName, grade } = res.data.data;
          this.setData({ studentName, grade });
        } else {
          wx.showToast({
            title: res.data.message || '无法获取学生信息',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('获取学生信息失败:', err);
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


  // 获取科目列表
  fetchSubjects() {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: `${BASE_URL}/getSubjects`,
      method: 'GET',
      success: (res) => {
        if (res.data.success) {
          console.log('科目数据:', res.data.data);
          this.setData({ subjectsList: res.data.data });
        } else {
          wx.showToast({
            title: res.data.message || '获取科目失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('获取科目失败:', err);
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

  // 选择科目
  onSubjectChange(e) {
    console.log('选择的科目索引:', e.detail.value);
    this.setData({
      selectedSubjectIndex: e.detail.value
    });
  },

  // 输入评语
  onCommentInput(e) {
    console.log('输入的评语:', e.detail.value);
    this.setData({
      comment: e.detail.value
    });
  },

  // 输入成绩
  onScoreInput(e) {
    let score = parseFloat(e.detail.value);
    if (score < 0 || score > 100 || isNaN(score)) {
      wx.showToast({ title: '成绩必须在 0 到 100 之间', icon: 'none' });
      this.setData({ score: '' });
      return;
    }
    this.setData({ score });
  },

  // 提交成绩
  onSubmit() {
    let { studentId, subjectsList, selectedSubjectIndex, score, comment } = this.data;

    if (selectedSubjectIndex === null) {
        wx.showToast({
            title: '请选择科目',
            icon: 'none',
            duration: 2000
        });
        return;
    }

    if (!score || score < 0 || score > 100) {
        wx.showToast({
            title: '请输入有效的成绩（0-100）',
            icon: 'none',
            duration: 2000
        });
        return;
    }

    const stringStudentId = studentId.toString();
    const subjectId = parseInt(subjectsList[selectedSubjectIndex].id, 10);

   
    console.log(`Submitting with studentId: ${stringStudentId}, subjectId: ${subjectId}, score: ${score}, comment: ${comment}`);

    wx.request({
      url: `${BASE_URL}/validate/fetchData`,
      method: 'GET',
      data: {
          studentId: stringStudentId,
          subjectId: subjectId
      },
      success: (res) => {
          
          console.log(`请求 URL: ${BASE_URL}/validate/fetchData`);
          console.log(`请求参数: studentId = ${stringStudentId}, subjectId = ${subjectId}`);
          
          // 输出验证返回
          console.log('验证返回:', res.data); 
          if (res.data.studentExists && res.data.subjectExists) {
             
              wx.showLoading({ title: '提交中...' });
              wx.request({
                  url: `${BASE_URL}/addScore`,
                  method: 'POST',
                  data: {
                      studentId: stringStudentId,
                      subjectId: subjectId,
                      score: score,
                      comment: comment
                  },
                  header: {
                      'Content-Type': 'application/json'
                  },
                  success: (res) => {
                      console.log('接口响应:', res);
                      if (res.data.success) {
                          wx.showToast({
                              title: '成绩录入成功',
                              icon: 'success',
                              duration: 2000,
                              success: () => {
                                  wx.navigateBack();
                              }
                          });
                      } else {
                          wx.showToast({
                              title: res.data.message || '录入失败',
                              icon: 'none',
                              duration: 2000
                          });
                      }
                  },
                  fail: (err) => {
                      console.error('提交成绩失败:', err);
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
          } else if (!res.data.studentExists) {
              wx.showToast({
                  title: '学生不存在，请检查学号',
                  icon: 'none',
                  duration: 2000
              });
          } else if (!res.data.subjectExists) {
              wx.showToast({
                  title: '科目不存在，请检查科目ID',
                  icon: 'none',
                  duration: 2000
              });
          }
      },
      fail: (err) => {
          console.error('验证请求失败:', err);
      }
  });
  
}


});
