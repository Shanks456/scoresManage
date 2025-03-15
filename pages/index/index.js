// pages/index/index.js

Page({
  data: {
      account: '',
      password: '',
      role: 'student', 
      roles: [
          { name: 'student', value: '学生' },
          { name: 'teacher', value: '教师' },
          { name: 'admin', value: '管理员' }
      ],
      roleLabels: ['学生', '教师', '管理员'],
      roleIndex: 0
  },

  onAccountInput(e) {
    
  const rawValue = String(e.detail.value);
  const cleanedValue = rawValue.replace(/[^a-zA-Z0-9_]/g, ''); 
  this.setData({ account: cleanedValue.trim() });
  },

  onPasswordInput(e) {
      this.setData({
        password: String(e.detail.value).trim() 
      });
  },

  onRoleChange(e) {
    const index = e.detail.value;
    this.setData({
      role: this.data.roles[index].name,
      roleIndex: index
    });
  },


  // 获取登录 URL 的方法
  getLoginUrl(role) {
    
       const baseUrl = 'http://192.168.101.119:3006/api'; 
      switch (role) {
          case 'student':
              return `${baseUrl}/student/login`;
          case 'admin':
              return `${baseUrl}/admin/login`;
          case 'teacher':
              return `${baseUrl}/teacher/login`;
          default:
              throw new Error('未知角色');
      }
      
  },

  // 登录函数
  async login() {
   
    const { account, password, role } = this.data;

    if (!account || !password) {
        wx.showToast({
            title: '账号和密码不能为空',
            icon: 'none'
        });
        return;
    }
  

 if (role === 'teacher' || role === 'admin') {
  const isValid = (role === 'teacher' && account === 'teacher' && password === '123') ||
                  (role === 'admin' && account === 'admin' && password === '123');
  
  if (isValid) {
    wx.setStorageSync('token', `${role}_token`);
    wx.reLaunch({ url: `/pages/${role}/home/home` });
    return;
  }
  wx.showToast({ title: '账号或密码错误', icon: 'none' });
  return;
}


    try {
        const url = this.getLoginUrl(role);
        const response = await new Promise((resolve, reject) => {
            wx.request({
                url: url,
                method: 'POST',
                data: role === 'student' ? { account, password } : { username: account, password },
                header: { 'Content-Type': 'application/json' },
                success: (res) => resolve(res),
                fail: (err) => reject(err)
            });
        });

        if (response.statusCode === 200) {
            const data = response.data;

  if (data.success && data.data?.token) {
    console.log('完整响应结构验证:', {
      tokenExists: !!data.data.token,
      tokenType: typeof data.data.token,
      tokenLength: data.data.token.length
    });
    
    wx.setStorageSync('token', data.data.token);
    wx.setStorageSync('studentInfo', data.data);
    
    
    console.log('存储后验证:', {
      storedToken: wx.getStorageSync('token'),
      storedStudent: wx.getStorageSync('studentInfo')
    });
    
    wx.reLaunch({ url: '/pages/student/home/home' });
  } else {
    console.error('响应结构异常:', data);
    wx.showToast({ title: '登录凭证格式错误' });
  }
}
    } catch (error) {
      let errorMessage = '网络错误，请重试';
      if (error.data) {
        switch (error.data.errorCode) {
          case 'AUTH_FAILED':
            errorMessage = '账号或密码错误';
            break;
          case 'INVALID_ACCOUNT':
            errorMessage = '账号包含非法字符';
            break;
        }
      }
      wx.showToast({ title: errorMessage, icon: 'none' });
    }
},


handleLoginSuccess: function(role) {
  const studentInfo = wx.getStorageSync('studentInfo');
  
  if (studentInfo) {
    wx.reLaunch({
      url: '/pages/student/home/home',
      success: () => {
        console.log('跳转到学生主页成功');
      }
    });
  } else {
    console.error('登录信息缺失');
    this.fallbackToIndex();
  }
},


fallbackToIndex() {
  wx.showModal({
    title: '提示',
    content: '页面加载超时，将返回首页',
    success: (res) => {
      if (res.confirm) {
        wx.reLaunch({
          url: '/pages/index/index', 
          success: () => console.log('页面重新加载成功'),
          fail: err => {
              console.error('页面重新加载失败:', err);
          }
        });
      }
    }
  });
},


getTargetUrl(role) {
  const pagesMap = {
    admin: '/pages/admin/home/home',
    teacher: '/pages/teacher/home/home',
    student: '/pages/student/home/home'
  };
  return pagesMap[role] || '/pages/index/index';
},




  onRegister() {
    console.log('注册按钮被点击');
    wx.navigateTo({
      url: '/pages/Rogister/Rogister'
    });
  },

  
  onSubmit() {
    this.login(); 
  },

onTestNavigate() {
  wx.navigateTo({
    url: '/pages/Rogister/Rogister' 
  });
},


onSubmit() {
  this.login();
}
});
