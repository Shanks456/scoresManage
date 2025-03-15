Component({
  properties: {
    selected: {
      type: Number,
      value: 0
    },
    color: {
      type: String,
      value: '#000000'
    },
    selectedColor: {
      type: String,
      value: '#3CC51F'
    },
    list: {
      type: Array,
      value: []
    }
  },
  
  methods: {
    tabClick(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('change', { index });
    }
  }
});
