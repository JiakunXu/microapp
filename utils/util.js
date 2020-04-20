const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const formatAmount = amount => {
  if (!amount && amount != 0) return "";
  amount = amount.toString().replace(/\,/g, "");
  if (isNaN(amount) || amount == "") return "";
  amount = Math.round(amount * 100) / 100;
  if (amount < 0)
    return '-' + a(Math.floor(Math.abs(amount) - 0) + '') + b(Math.abs(amount) - 0);
  else
    return a(Math.floor(amount - 0) + '') + b(amount - 0);
}

const a = amount => {
  if (amount.length <= 3)
    return (amount == '' ? '0' : amount);
  else {
    let mod = amount.length % 3;
    let output = (mod == 0 ? '' : (amount.substring(0, mod)));
    for (let i = 0; i < Math.floor(amount.length / 3); i++) {
      if ((mod == 0) && (i == 0))
        output += amount.substring(mod + 3 * i, mod + 3 * i + 3);
      else
        output += ',' + amount.substring(mod + 3 * i, mod + 3 * i + 3);
    }
    return (output);
  }
}

const b = amount => {
  amount = Math.round(((amount) - Math.floor(amount)) * 100);
  return (amount < 10 ? '.0' + amount : '.' + amount);
}

// 显示繁忙提示
var showBusy = text => wx.showToast({
  title: text,
  icon: 'loading',
  duration: 10000
})

// 显示成功提示
var showSuccess = text => wx.showToast({
  title: text,
  icon: 'success'
})

// 显示失败提示
var showModel = (title, content) => {
  wx.hideToast();

  wx.showModal({
    title,
    content,
    showCancel: false
  });
}

const dcmAdd = function(arg1, arg2) {
  var r1, r2, m;
  try {
    r1 = arg1.toString().split(".")[1].length
  } catch (e) {
    r1 = 0
  }
  try {
    r2 = arg2.toString().split(".")[1].length
  } catch (e) {
    r2 = 0
  }
  m = Math.pow(10, Math.max(r1, r2));
  return (dcmMul(arg1, m) + dcmMul(arg2, m)) / m;
}

const dcmSub = function(arg1, arg2) {
  return dcmAdd(arg1, -arg2);
}

const dcmMul = function(arg1, arg2) {
  var m = 0,
    s1 = arg1.toString(),
    s2 = arg2.toString();
  try {
    m += s1.split(".")[1].length
  } catch (e) {}
  try {
    m += s2.split(".")[1].length
  } catch (e) {}
  return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) /
    Math.pow(10, m);
}

const dcmDiv = function(arg1, arg2) {
  return dcmMul(arg1, 1 / arg2);
}

const round = function(a, b) {
  return dcmDiv(Math.round(dcmMul(a, Math.pow(10, b))), Math.pow(10, b));
}

module.exports = {
  formatTime,
  formatAmount,
  showBusy,
  showSuccess,
  showModel,
  dcmAdd,
  dcmSub,
  dcmMul,
  dcmDiv,
  round
}