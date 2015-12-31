var ws = require("nodejs-websocket"),
  EventEmitter = require('events')

function WebsocketClient(url, success) {
  this.wsClient = ws.connect(url, success)
  
  var _this = this
  this.wsClient.on("text", function (str) {
    _this.emit("text", str)
  })
  this.wsClient.on("error", function (err) {
    _this.emit("error", err)
  })
  this.wsClient.on("close", function () {
    _this.emit("close")
  })
  
  EventEmitter.call(this)
}
WebsocketClient.prototype = new EventEmitter()
WebsocketClient.prototype.close = function () {
  this.wsClient.close()
}
WebsocketClient.prototype.sendText = function (str) {
  this.wsClient.sendText(str)
}

module.exports = {
  connect: function (url, success) {
    return new WebsocketClient(url, success)
  }
}
