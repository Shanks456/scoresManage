// pages/studentIndex/personalStudyPlan/personalStudyPlan.js
Page({
  data: {
    edit: {
      goal: false,
      method: false
    },
    goals: {
      shortTerm: '',
      longTerm: ''
    },
    tasks: [],
    studyMethod: '',
    latestEvaluation: ''
  },

  onLoad() {
    this.loadSavedData()
  },

  
  loadSavedData() {
    const savedData = wx.getStorageSync('studyPlan') || {}
    this.setData({
      goals: savedData.goals || { shortTerm: '', longTerm: '' },
      tasks: savedData.tasks || [],
      studyMethod: savedData.studyMethod || '',
      latestEvaluation: savedData.latestEvaluation || ''
    })
  },


  toggleEdit(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      [`edit.${type}`]: !this.data.edit[type]
    })
  },

 
  updateGoals(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      [`goals.${type}`]: e.detail.value
    })
  },

 
  addNewTask() {
    const newTask = {
      name: '',
      deadline: '',
      requirements: '',
      completed: false
    }
    this.setData({
      tasks: [...this.data.tasks, newTask]
    })
  },

  
  updateTaskField(e) {
    const { index, field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`tasks[${index}].${field}`]: value
    })
  },


  removeTask(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      tasks: this.data.tasks.filter((_, i) => i !== index)
    })
  },


  updateMethod(e) {
    this.setData({
      studyMethod: e.detail.html
    })
  },

  
  updateEvaluation(e) {
    this.setData({
      latestEvaluation: e.detail.value
    })
  },

 
  saveAllData() {
    const fullData = {
      goals: this.data.goals,
      tasks: this.data.tasks,
      studyMethod: this.data.studyMethod,
      latestEvaluation: this.data.latestEvaluation
    }

    wx.setStorageSync('studyPlan', fullData)
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
    
    this.setData({
      edit: { goal: false, method: false }
    })
  }
})