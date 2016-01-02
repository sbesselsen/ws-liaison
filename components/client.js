var EventEmitter = require('events').EventEmitter,
  util = require('util')

var Message = require("./message.js")

var Client = function (websocketClient, url) {
  EventEmitter.call(this)
  
  this.url = url
  this.publishing = true
  this.publishCode = null
  this.persistent = false
  this.reconnecting = false
  this.connected = false
  this.token = null
  this.lastToken = null
  this.websocketClient = websocketClient
  this.connectionCallback = null
}
util.inherits(Client, EventEmitter)

Client.prototype.connectPersistent = function (connectionCallback) {
  this.persistent = true
  this.connectionCallback = connectionCallback
  this._connect()
}

Client.prototype.connect = function (connectionCallback) {
  this.persistent = false
  this.connectionCallback = connectionCallback
  this._connect()
}

Client.prototype._connect = function () {
  var _this = this
  
  this._updatePublishCode(null)
  this._updateToken(null)
  
  this.wsClient = this.websocketClient.connect(this.url, function () {
    _this.connected = true
    
    console.log("Connected to server", _this.url)
    
    _this.wsClient.on("text", function (str) {
      var msg = Message.parse(str)
      if (!msg) {
        return
      }
      
      var msgType = msg.part(0)
      switch (msgType) {
        case 'receive':
          _this.emit('receive', msg.part(1))
          break
          
        case 'publish_code':
          _this._updatePublishCode(msg.part(1))
          break
          
        case 'token':
          _this._updateToken(msg.part(1))
          break
      }
      
      _this.emit('rawMessage', msg)
    })
    
    _this.wsClient.on("close", function () {
      _this.connected = false
      _this.wsClient = null
      _this.emit('connectionInterrupt')
      if (_this.persistent) {
        if (!_this.reconnecting) {
          _this.reconnecting = true
          // Try reconnecting every 500 ms
          _this._reconnect(500)
        }
      } else {
        _this.emit('close')
      }
    })
    
    if (_this.connectionCallback) {
      _this.connectionCallback()
      if (!_this.persistent) {
        _this.connectionCallback = null
      }
    }
  })
  
  this.wsClient.on('error', function (err) {
    // console.error('Websocket error', err)
  })
}

Client.prototype._reconnect = function (interval) {
  if (this.connected) {
    this.reconnecting = false
    return
  }
  console.log("Trying to reconnect")
  var _this = this
  setTimeout(function () {
      _this._reconnect(interval)
  }, interval)
  this._connect()
}

Client.prototype._sendRawMessage = function (msg) {
  this.wsClient.sendText(msg.toString())
}

Client.prototype._receiveRawMessage = function (f) {
  var _this = this
  var listener = function (msg) {
    if (f(msg) === true) {
      _this.removeListener('rawMessage', listener)
    }
  }
  this.on('rawMessage', listener)
}

Client.prototype._updatePublishCode = function (code) {
  this.publishCode = code
  this.emit('publishCodeChange', this.publishCode)
}

Client.prototype._updateToken = function (token) {
  this.token = token
  if (token) {
    this.lastToken = token
  }
  this.emit('tokenChange', this.token)
}

Client.prototype.publish = function () {
  this._sendRawMessage(Message.build('publish'))
}

Client.prototype.unpublish = function () {
  this._sendRawMessage(Message.build('unpublish'))
}

Client.prototype.send = function (data) {
  this._sendRawMessage(Message.build('send', data))
}

Client.prototype.join = function (token, success, error) {
  var _this = this
  this._sendRawMessage(Message.build('join', token))
  this._receiveRawMessage(function (msg) {
    var msgType = msg.part(0)
    if (msgType == 'token' && msg.part(1) == token) {
      if (success) {
        success(token)
      }
      return true
    }
  })
}

Client.prototype.joinWithCode = function (code, success, error) {
  var _this = this
  
  this._sendRawMessage(Message.build('join_code', code))
  this._receiveRawMessage(function (msg) {
    var msgType = msg.part(0)
    if (msgType == 'token') {
      if (success) {
        success(msg.part(1))
      }
      return true
    }
    if (msgType == 'not_found' && msg.part(1) == code) {
      if (error) {
        error('Code not found')
      }
      return true
    }
  })
}

Client.prototype.close = function () {
  this.persistent = false
  this.wsClient.close()
}

module.exports = Client