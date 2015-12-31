function Message(parts) {
  this.length = parts.length
  this.parts = parts
}
Message.prototype.part = function (i) {
  return i >= 0 && i < this.length ? (this.parts[i] || null) : null
}
Message.prototype.toString = function () {
  return JSON.stringify(this.parts)
}
Message.build = function () {
  var parts = []
  for (var i = 0; i < arguments.length; i++) {
    parts.push(arguments[i])
  }
  return new Message(parts)
}
Message.parse = function (msg) {
    try {
      var parsed = JSON.parse(msg)
      if (Array.isArray(parsed) && typeof parsed[0] == 'string') {
        return new Message(parsed)
      }
    } catch (e) {
    }
    return null
}

module.exports = Message
