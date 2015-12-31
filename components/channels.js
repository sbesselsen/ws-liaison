var EventEmitter = require('events')

function Channels() {
  EventEmitter.call(this)
  this._registryByToken = {}
}
Channels.prototype = new EventEmitter()
Channels.prototype.add = function (channel) {
  this._registryByToken[channel.token] = channel
}
Channels.prototype.get = function (token) {
  return this._registryByToken[token] || null
}
Channels.prototype.remove = function (token) {
  if (!this._registryByToken[token]) {
    return
  }
  this.emit('removeChannel', this._registryByToken[token])
  delete this._registryByToken[token]
}
Channels.prototype.removeConnection = function (connection) {
  var token = connection.token
  if (!this._registryByToken[token]) {
    return
  }
  var channel = this._registryByToken[token]
  channel.removeConnection(connection)
      
  if (channel.connections.length == 0) {
    // Last in the channel; remove the channel
    this.remove(channel.token)
  }
}

module.exports = Channels
