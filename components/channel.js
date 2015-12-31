function Channel(token) {
  this.connections = []
  this.token = token
}
Channel.prototype.addConnection = function (connection) {
  this.connections.push(connection)
}
Channel.prototype.removeConnection = function (connection) {
  var index = this.connections.indexOf(connection)
  if (index == -1) {
    return
  }
  this.connections.splice(index, 1)
}

module.exports = Channel
