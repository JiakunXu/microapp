const sdk = require('../../vendor/wafer2-client-sdk/index')
const config = require('../../config')
const util = require('../../utils/util.js')

const app = getApp()

Page({
  data: {
    userInfo: {},

    loading: false,
    finished: false,
    pageNo: 1,
    pageSize: 10,
    list: []
  },
  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
      })
    } else {
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo
        })
      }
    }

    this.load();
    this.showFavoriteGuide();
    this.setTabBarBadge();
  },
  onPullDownRefresh: function () {
    this.setData({
      finished: false,
      pageNo: 1
    });

    this.load();
  },
  onReachBottom: function () {
    this.load();
  },
  onShareAppMessage: function (shareOption) {
    switch (shareOption.channel) {
      case 'video':
        return {
          extra: {
            // 注意，只有小程序使用button组件触发分享时，会有target属性
            videoPath: shareOption.target.dataset.path
          }
        };
      case 'qrcode':
        break;
      default:
        return {
          channel: "share",
          title: "标题123",
          imageUrl: "",
          path: ""
        };
    }
  },

  load: function () {
    this._list({});
  },
  _list: function (data) {
    if (this.data.finished) {
      return;
    }

    this.setData({
      loading: true
    });

    const that = this;
    sdk.request({
      url: config.service.baseUrl + '/api/list',
      data: {
        ...data,
        pageNo: this.data.pageNo,
        pageSize: this.data.pageSize
      },
      success(result) {
        result.data.code = "10000";
        result.data.list = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

        wx.stopPullDownRefresh();

        if (result.data.code == "10000") {
          that.setData({
            list: that.data.pageNo === 1 ? result.data.list : that.data.list.concat(result.data.list),
            pageNo: that.data.pageNo + 1,
          });
        }

        // 加载状态结束
        that.setData({
          loading: false
        });

        // 数据全部加载完成
        if (!result.data.list || result.data.list.length < that.data.pageSize) {
          that.setData({
            finished: true
          });
        }
      },
      fail(error) {
        util.showModel('请求失败', error)
      }
    });
  },
  onClick: function (event) {
    const {
      id
    } = event.currentTarget.dataset;

    tt.navigateTo({
      url: '/pages/web/web?src=' + encodeURIComponent("https://baidu.com/s?wd=" + id)
    })
  },
  showFavoriteGuide: function () {
    tt.showFavoriteGuide({
      type: "bar",
      content: "一键添加到我的小程序",
      position: "bottom",
      success(res) {
        console.log("引导组件展示成功");
      },
      fail(res) {
        console.log("引导组件展示失败");
      }
    });
  },
  setTabBarBadge: function () {
    tt.setTabBarBadge({
      index: 1,
      text: "13"
    });
  }
})
