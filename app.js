const sdk = require('/vendor/wafer2-client-sdk/index')
const config = require('./config')

App({
  onLaunch: function () {
    sdk.setLoginUrl(config.service.loginUrl);

    sdk.loginWithCode({
      method: "POST",
      success: res => {
        this.globalData.userInfo = res;

        if (this.userInfoReadyCallback) {
          this.userInfoReadyCallback(this.globalData)
        }
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
