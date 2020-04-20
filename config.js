/**
 * 小程序配置文件
 */

var host = 'https://..com';

var config = {

  service: {
    host,

    baseUrl: `${host}`,

    // 登录地址，用于建立会话
    loginUrl: `${host}/api/login`,

    // 测试的请求地址，用于测试会话
    requestUrl: `${host}/user`,

    // 测试的信道服务地址
    tunnelUrl: `${host}/tunnel`,

    // 上传图片接口
    uploadUrl: `${host}/upload`
  }
};

module.exports = config;
