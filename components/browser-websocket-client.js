var EventEmitter = require('events').EventEmitter,
  util = require('util')

function WebsocketClient(url, success) {
  EventEmitter.call(this)
  
  this.wsClient = new WebSocket(url)
  
  var _this = this
  this.wsClient.onopen = function () {
    if (success) {
      success()
    }
  }
  
  this.wsClient.onmessage = function (e) {
    _this.emit("text", e.data)
  }
  
  this.wsClient.onerror = function (e) {
    _this.emit("error", e)
  }
  
  this.wsClient.onclose = function () {
    _this.emit("close")
  }
}
util.inherits(WebsocketClient, EventEmitter)
WebsocketClient.prototype.close = function () {
  this.wsClient.close()
}
WebsocketClient.prototype.sendText = function (str) {
  this.wsClient.send(str)
}

module.exports = {
  connect: function (url, success) {
    return new WebsocketClient(url, success)
  }
}
