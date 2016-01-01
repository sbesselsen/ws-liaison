var EventEmitter = require('events').EventEmitter,
  util = require('util')

var Message = require("./message.js")

var Client = function (websocketClient, url) {
  EventEmitter.call(this)
  
  this.url = url
  this.advertisingCode = null
  this.persistent = false
  this.reconnecting = false
  this.connected = false
  this.token = null
  this.websocketClient = websocketClient
  
  var _this = this
  this.on('rawMessage', function (msg) {
    if (msg.part(0) == 'receive') {
      _this.emit('receive', msg.part(1))
    }
  })
}
util.inherits(Client, EventEmitter)

Client.prototype.connect = function (success) {
  var _this = this
  
  this.wsClient = this.websocketClient.connect(this.url, function () {
    _this.connected = true
    
    console.log("Connected to server", _this.url)
    
    if (_this.token) {
      // Reconnect with the same token
      _this.join(_this.token)
    }
    
    _this.wsClient.on("text", function (str) {
      var msg = Message.parse(str)
      if (!msg) {
        return
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
    
    if (success) {
      success()
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
  this.connect()
}

Client.prototype._sendRawMessage = function (msg) {
  this.wsClient.sendText(msg.toString())
}

Client.prototype.advertise = function (codeReceived) {
  if (this.advertisingCode) {
    this.unadvertise()
    this.advertisingCode = null
  }
  
  this._sendRawMessage(Message.build('advertise'))
  
  var _this = this
  var listener = function (msg) {
    if (msg.part(0) == 'advertised') {
      _this.advertisingCode = msg.part(1)
      _this.emit('advertisingCodeChanged', _this.advertisingCode)
      codeReceived(_this.advertisingCode)
      this.removeListener('rawMessage', listener)
    }
  }
  this.on('rawMessage', listener)
}

Client.prototype.unadvertise = function (success, error) {
  var code = this.advertisingCode
  if (!code) {
    if (error) {
      error()
    }
    return
  }
  
  this.advertisingCode = null
  this.emit('advertisingCodeChanged', this.advertisingCode)
  
  this._sendRawMessage(Message.build('unadvertise', code))
  var listener = function (msg) {
    if (msg.part(0) == 'unadvertised') {
      if (success) {
        success()
      }
      this.removeListener('rawMessage', listener)
    }
    if (msg.part(0) == 'not_found' && msg.part(1) == code) {
      if (error) {
        error()
      }
      this.removeListener('rawMessage', listener)
    }
  }
  this.on('rawMessage', listener)
}

Client.prototype.send = function (data) {
  this._sendRawMessage(Message.build('send', data))
}

Client.prototype.find = function (code, success, error) {
  this._sendRawMessage(Message.build('find', code))
  
  var _this = this
  var listener = function (msg) {
    if (msg.part(0) == 'found' && msg.part(1) == code) {
      success(msg.part(2))
      this.removeListener('rawMessage', listener)
    }
    if (msg.part(0) == 'not_found' && msg.part(1) == code) {
      success(null)
      this.removeListener('rawMessage', listener)
    }
  }
  this.on('rawMessage', listener)
}

Client.prototype.join = function (token, success, error) {
  this._sendRawMessage(Message.build('join', token))
  
  var _this = this
  var listener = function (msg) {
    if (msg.part(0) == 'token' && msg.part(1) == token) {
      this.token = token
      if (success) {
        success()
      }
      this.removeListener('rawMessage', listener)
    }
  }
  this.on('rawMessage', listener)
}

Client.prototype.joinWithCode = function (code, success, error) {
  var _this = this
  this.find(code, function (token) {
    if (token) {
      _this.join(token, success, error)
    } else {
      if (error) {
        error()
      }
    }
  }, function () {
    if (error) {
      error()
    }
  })
}

Client.prototype.close = function () {
  this.persistent = false
  this.wsClient.close()
}

module.exports = Client