Page({
  data: {
    routeParams: {},
    subjects: [],
    scores: [],
    selectedStudentId: null,
    selectedSubjectId: null,
    scoreDetail: null,
    currentSubject: null,
    loading: false
  },

  onLoad: function(options) {
    console.log('[科目页] 加载参数:', options);
    this.initStudentInfo();
    this.fetchSubjects();
    this.setData({ routeParams: options || {} });
  },

  // 唯一的fetchSubjects方法
  fetchSubjects: function() {
    const that = this;
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: 'http://192.168.101.119:3006/api/subjects',
      method: 'GET',
      success: function(res) {
        console.log('科目数据:', res.data);
        if (res.statusCode === 200 && res.data.success) {
          const formattedSubjects = res.data.data.map(item => ({
            ...item,
            id: Number(item.id)
          }));
          that.setData({ subjects: formattedSubjects });
        }
      },
      complete: wx.hideLoading
    });
  },

  initStudentInfo: function() {
    const studentInfo = wx.getStorageSync('studentInfo');
    if (!studentInfo) {
      wx.redirectTo({ url: '/pages/index/index' });
      return;
    }
    this.setData({ studentInfo });
  },

  onSubjectClick: function(event) {
    const subjectId = event.currentTarget.dataset.subjectid;
    const currentSubject = this.data.subjects.find(item => item.id == subjectId);
    
    console.log('点击科目ID:', subjectId);
    console.log('当前科目对象:', currentSubject);

    this.setData({
      selectedSubjectId: subjectId,
      currentSubject: currentSubject
    }, () => {
      console.log('更新后的currentSubject:', this.data.currentSubject);
      this.fetchScores();
    });
  },

  fetchScores: function() {
    const { studentInfo, selectedSubjectId } = this.data;
    
    if (!studentInfo?.account || !selectedSubjectId) {
      console.error('缺失参数:', { 
        account: studentInfo?.account,
        subjectId: selectedSubjectId 
      });
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    this.setData({ 
      loading: true,
      scoreDetail: null 
    });

    wx.request({
      url: 'http://192.168.101.119:3006/api/scores',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        account: studentInfo.account,
        subjectId: selectedSubjectId
      },
      success: (res) => {
        console.log('成绩响应:', res.data);
        if (res.statusCode === 200) {
          const scoreData = res.data.data;
          const processedData = scoreData ? {
            score: parseFloat(scoreData.score).toFixed(1),
            comment: scoreData.comment || '暂无评语',
            updatedAt: this.formatDate(scoreData.updatedAt)
          } : null;

          this.setData({ scoreDetail: processedData });

          if (!scoreData) {
            wx.showToast({
              title: `${this.data.currentSubject.subjectName}暂无成绩`,
              icon: 'none'
            });
          }
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 日期格式化方法
  formatDate: function(dateString) {
    if (!dateString) return '未知时间';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      console.error('日期格式错误:', e);
      return '无效日期';
    }
  },
  

  navigateBack: function() {
    // 获取当前页面栈信息
    const pages = getCurrentPages();
    
    // 场景1：从其他页面跳转进入（非Tab页入口）
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
  
    // 场景2：从Tab页直接进入
    
    wx.reLaunch({
      url: '/pages/student/home/home',
      success: () => {
        // 通过全局变量保持Tab激活状态
        const app = getApp();
        
        // 记录需要激活的Tab索引
        app.globalData.activeTabIndex = 0; 
  
     
        setTimeout(() => {
          const homePage = getCurrentPages().find(p => p.route === 'pages/student/home/home');
          if (homePage) {
            homePage.setData({ currentTab: 0 });
          }
        }, 300);
      },
      fail: (err) => {
        console.error('[返回监控]', {
          timestamp: Date.now(),
          error: err
        });
        wx.showToast({ 
          title: '返回失败，请重试',
          icon: 'none',
          duration: 2000 
        });
      }
    });
  }
});