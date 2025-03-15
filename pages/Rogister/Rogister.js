Page({
  data: {
    roleIndex: 0,
    roleLabels: ['学生', '教师'],
    studentName: '',
    teacherName: '',
    teacherId: '',
    account: '',
    password: '',
    phone: ''
  },

  onRoleChange(e) {
    this.setData({ roleIndex: e.detail.value });
  },


onNameInput(e) {
  const value = e.detail.value;
  if (this.data.roleIndex === 0) {
    
    if (value.length > 30) {
      wx.showToast({
        title: '姓名不能超过30个字符',
        icon: 'none'
      });
      return;
    }
    
    if (!/^[\u4e00-\u9fa5a-zA-Z\s\-']{0,30}$/.test(value)) {
      wx.showToast({
        title: '含非法字符（只允许中英文/空格/-/’）',
        icon: 'none'
      });
      return;
    }

 
    if (e.type === 'blur' && value.length < 2) {
      wx.showToast({
        title: '姓名至少需要2个字符',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ studentName: value });
  } else {
 
    this.setData({ teacherName: value });
  }
},

  onTeacherIdInput(e) {
    this.setData({ teacherId: e.detail.value });
  },


onAccountInput(e) {
  const value = e.detail.value;
  if (/^\d{6,20}$/.test(value)) { 
    this.setData({ account: value });
  } else {
    wx.showToast({
      title: '账号需6-20位纯数字',
      icon: 'none'
    });
    this.setData({ account: '' });
  }
},

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

handleNetworkError(error) {
  const errorMap = {
    'request:fail timeout': '请求超时',
    'request:fail disconnected': '网络未连接'
  };
  
  wx.showToast({
    title: errorMap[error.errMsg] || '网络异常',
    icon: 'none'
  });
},

  
async onRegister() {
  if (!(await this.checkNetwork())) return;
  
  wx.showLoading({ title: '注册中...' });
  
  try {
   
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: 'http://192.168.101.119:3006/api/student/register',
        method: 'POST',
        data: {
          studentName: this.data.studentName.trim(),
          account: this.data.account.trim(),
          password: this.data.password.trim(),
          phone: this.data.phone || null
        },
        success: (res) => resolve(res), 
        fail: (err) => reject(err),     
        timeout: 5000
      });
    });


    if (res.statusCode === 200 && res.data?.code === 200) {
      wx.showToast({
        title: res.data.message || '注册成功',
        icon: 'success'
      });
      this.resetForm();
      wx.redirectTo({ url: '/pages/index/index' });  
    } else {
      this.handleError(res); 
    }
  } catch (error) {
    this.handleNetworkError(error);
  } finally {
    wx.hideLoading();
  }
},


validatePassword() {
  const { password } = this.data;
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
  
  if (!regex.test(password)) {
    wx.showToast({
      title: '密码需6-20位字母+数字组合',
      icon: 'none'
    });
    return false;
  }
  return true;
},


async checkNetwork() {
  try {
    const { networkType } = await wx.getNetworkType();
    if (networkType === 'none') {
      wx.showToast({ title: '网络未连接', icon: 'none' });
      return false;
    }
    return true;
  } catch (error) {
    wx.showToast({ title: '网络检测失败', icon: 'none' });
    return false;
  }
},

handleResponse(res) {
  
  if (res.statusCode === 200 && res.data?.status === 200) {
    wx.showToast({
      title: res.data.msg || '注册成功',
      icon: 'success'
    });
    this.resetForm();
    return;
  }
  

  if ([200, 201].includes(res.statusCode)) {
    wx.showToast({
      title: '注册状态未知，请重新登录验证',
      icon: 'none'
    });
    return;
  }
  

  const errorMessage = res.data?.msg || `服务器响应异常: ${res.statusCode}`;
  wx.showToast({ title: errorMessage, icon: 'none' });
},


handleError(res) {
  const errorData = res.data || {};
  const message = errorData.message || `服务器响应异常: ${res.statusCode}`;
  
  wx.showModal({
    title: '注册失败',
    content: message,
    showCancel: false
  });
},


getCustomError(code) {
  const errorMap = {
    'DUPLICATE_ACCOUNT': '账号已被注册',
    'INVALID_PASSWORD': '密码不符合要求',
    'DB_UNAVAILABLE': '系统繁忙，请稍后再试'
  };
  return errorMap[code] || '未知错误';
},

resetForm() {
  this.setData({
    studentName: '',
    account: '',
    password: '',
    phone: ''
  });
}
});
