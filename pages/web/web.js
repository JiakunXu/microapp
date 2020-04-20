// pages/web/web.js
Page({
  data: {
    src: ""
  },
  onLoad: function (options) {
    this.setData({
      src: decodeURIComponent(options.src)
    })
  }
})