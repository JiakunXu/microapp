const sdk = require('../../vendor/wafer2-client-sdk/index')
const config = require('../../config')
const util = require('../../utils/util.js')

const app = getApp()

Page({
  data: {
    userInfo: {}
  },
  onLoad: function () {
    this.getUserInfo();
  },

  getUserInfo: function (e) {
    const that = this;
    sdk.login({
      method: "POST",
      success: res => {
        app.globalData.userInfo = res;

        that.setData({
          userInfo: res
        })
      },
      fail: err => {
        util.showModel('温馨提示', err.message)
      }
    })
  }
})
