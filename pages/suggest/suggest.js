
Page({
  data: {
    inputValue: ''
  },
  

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value 
    });
  },
  
 
  onSubmit: function() {
    const { inputValue } = this.data;
    
   
    if (inputValue.trim() === '') {
      wx.showToast({
        title: '请填写内容',
        icon: 'none'
      });
      return;
    }
    
   
    wx.showToast({
      title: '提交成功',
      icon: 'success'
    });


    this.setData({
      inputValue: ''
    });
  }
});
