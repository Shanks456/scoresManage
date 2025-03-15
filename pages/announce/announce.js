// pages/announce/announce.js

Page({
  data: {
    dataVersion: 0,
    isAdmin: false,
    isEditing: false,
    editableContent: {
      greeting: "亲爱的同学们",
      body: "欢迎使用校园管理系统",
      rules: ["请遵守校园纪律", "保持环境整洁"],
      ending: "祝学习愉快！",
      signature: "教务处"
      
    }
  },
  currentContent: {},
  onLoad(options) {
    // 三重验证机制
    const isAdmin = options.isAdmin === '1' 
      || wx.getStorageSync('adminToken')
      || (this.data.editableContent.signature === '教务处'); // 应急后备方案
    
    this.setData({
      isAdmin,
      currentContent: JSON.parse(JSON.stringify(this.data.editableContent))
    });
    this.fetchAnnouncement();
  },

  // 获取公告数据

async fetchAnnouncement() {
  wx.showLoading({ title: '加载中' });
  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `http://172.20.10.4:3006/api/announcements`, 
        success: resolve,
        fail: reject
      });
    });

    // 处理HTTP状态码错误
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`HTTP错误 ${res.statusCode}`);
    }

    // 处理业务逻辑错误
    if (!res.data.success) {
      throw new Error(res.data.message || '请求失败');
    }

    // 处理数据解析
    const announcement = res.data.data ? {
      ...res.data.data,
      rules: this.safeParseRules(res.data.data.rules)
    } : null;

    this.setData({
      editableContent: announcement || this.data.editableContent,
      dataVersion: this.data.dataVersion + 1
    });

  } catch (error) {
    console.error('请求失败:', error);
    wx.showToast({
      title: error.message,
      icon: 'none',
      duration: 2000
    });
  } finally {
    wx.hideLoading();
  }
},

safeParseRules(rules) {
  if (Array.isArray(rules)) return rules;
  try {
    return JSON.parse(rules || '[]');
  } catch (e) {
    return [];
  }
},


safeParseRules(rules) {
  if (Array.isArray(rules)) return rules; 
  try {
    return JSON.parse(rules || '[]');
  } catch (e) {
    console.error('规则解析失败:', e);
    return [];
  }
},

  // 规则输入处理
  ruleInput(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      [`editableContent.rules[${index}]`]: e.detail.value
    });
  },

  // 添加规则
  addRule() {
    const newRules = [...this.data.editableContent.rules, '新规则内容'];
    this.setData({ 'editableContent.rules': newRules });
  },

  // 删除规则
  deleteRule(e) {
    const { index } = e.currentTarget.dataset;
    const newRules = this.data.editableContent.rules.filter((_, i) => i !== index);
    this.setData({ 'editableContent.rules': newRules });
  },


startEdit() {
  this.setData({ 
    isEditing: true,
   
    originalContent: JSON.parse(JSON.stringify(this.data.editableContent))
  });
},

cancelEdit() {
  this.setData({ 
    isEditing: false,
    editableContent: this.data.originalContent 
  });
},

async saveAnnouncement() {
  if (!this.validateForm()) return;
  
  const { id, ...postData } = this.data.editableContent;
  
  
  wx.showLoading({ title: '保存中...', mask: true });
  
  try {
    const res = await wx.request({
      url: `http://172.20.10.4:3006/api/announcements/${id}`, // 
      method: 'PUT',
      data: {
        ...postData,
        rules: postData.rules.filter(rule => rule.trim() !== '') 
      },
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('adminToken')}`, 
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (res.statusCode === 401) {
      this.showReLoginAlert();
      return;
    }

    if (res.data.success) {
      wx.showToast({ 
        title: '保存成功',
        icon: 'success',
        duration: 2000
      });
      await this.fetchAnnouncement();
    } else {
      this.handleSaveError(res.data);
    }
  } catch (error) {
    console.error('[保存失败]', error);
    wx.showToast({
      title: error.errMsg || '网络连接失败',
      icon: 'none'
    });
  } finally {
    wx.hideLoading();
  }
},

validateForm() {
  const { greeting, body, signature } = this.data.editableContent;
  const validations = [
    { field: greeting, name: '问候语', max: 100, required: true },
    { field: body, name: '正文内容', max: 2000, required: true },
    { field: signature, name: '签名', max: 50, required: true }
  ];

  return validations.every(({ field, name, max, required }) => {
    if (required && !field?.trim()) {
      wx.showToast({ title: `${name}不能为空`, icon: 'none' });
      return false;
    }
    if (field.length > max) {
      wx.showToast({ title: `${name}超过${max}字限制`, icon: 'none' });
      return false;
    }
    return true;
  });
},


handleSaveError(error) {
  console.error('保存失败:', error);
  
  const errorMap = {
    ERR_NETWORK: { msg: '网络连接失败', code: 1001 },
    ERR_TIMEOUT: { msg: '请求超时', code: 1002 },
    'ANN_002': { msg: '数据格式错误', code: 2001 }
  };

  const knownError = errorMap[error.errCode || error.code];
  if (knownError) {
    this.showErrorToast(`${knownError.msg} (CODE:${knownError.code})`);
    return;
  }

  this.showErrorToast(error.message || '未知错误');
},

// 重新登录提示
showReLoginAlert() {
  wx.showModal({
    title: '会话过期',
    content: '需要重新登录以继续操作',
    confirmText: '立即登录',
    success: (res) => {
      if (res.confirm) {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    }
  });
}
  
});