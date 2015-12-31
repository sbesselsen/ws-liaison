var ws = require("nodejs-websocket")

var Message = require("./message.js"),
  generator = require("./generator.js"),
  Connection = require("./connection.js"),
  Channel = require("./channel.js"),
  Channels = require("./channels.js"),
  Advertisement = require("./advertisement.js"),
  Advertisements = require("./advertisements.js")

var Server = function (port) {
  this.port = port
  
  this.advertisements = new Advertisements()
  this.channels = new Channels()

  var _this = this
  this.channels.on("removeChannel", function (channel) {
    console.log("Removing channel", channel.token)
    _this.advertisements.removeAllForToken(channel.token)
  })
}

Server.prototype.respondWithError = function (context, error) {
  console.error.apply(console, error)
  context.wsConnection.sendText(Message.build("error", error).toString())
}

Server.prototype.listen = function () {
  var _this = this
  
  this.wsServer = ws.createServer(function (conn) {
    var context = {
      wsConnection: conn
    }
    
    // Open the connection
    var connection = new Connection(conn, generator.generateToken())
    console.log("Open connection", connection.token, connection.connectionID)
    context.connection = connection
    
    conn.sendText(Message.build("token", connection.token).toString())
    
    // Create a channel, just for this connection
    var channel = new Channel(connection.token)
    channel.addConnection(connection)
    _this.channels.add(channel)
    context.channel = channel
    
    // Handle messages on the connection
    conn.on("text", function (str) {
      var msg = Message.parse(str)
      if (!msg) {
        return
      }
      var msgType = msg.part(0)
      var handler = 'handle_' + msgType
      if (!_this[handler]) {
        console.error("Unknown message type", msgType)
        return
      }
      _this[handler].call(_this, context, msg)
    })
    
    // Handle closing the connection
    conn.on("close", function (connCode, reason) {
      console.log("Close connection", connection.token, connection.connectionID)
      _this.channels.removeConnection(connection)
    })
  }).listen(this.port)
}

// Advertise a channel with a code
Server.prototype.handle_advertise = function (context, msg) {
  var advertisement = new Advertisement(generator.generateCode(), context.connection.token)
  this.advertisements.add(advertisement)
  console.log("Advertise", advertisement)
  context.wsConnection.sendText(Message.build("advertised", advertisement.code).toString())
}
  
// Unadvertise the channel
Server.prototype.handle_unadvertise = function (context, msg) {
  var code = msg.part(1)
  var advertisement = this.advertisements.get(code)
  if (!advertisement) {
    context.wsConnection.sendText(Message.build("not_unadvertised", advertisement.code).toString())
    this.respondWithError(context, ["Unadvertise request for invalid code", code])
    return
  }
  this.advertisements.remove(advertisement.code)
  console.log("Unadvertise", advertisement)
  context.wsConnection.sendText(Message.build("unadvertised", advertisement.code).toString())
}
  
// Find a token for an advertisement
Server.prototype.handle_find = function (context, msg) {
  var code = msg.part(1)
  var advertisement = this.advertisements.get(code)
  if (advertisement) {
    context.wsConnection.sendText(Message.build("found", code, advertisement.token).toString())
  } else {
    context.wsConnection.sendText(Message.build("not_found", code).toString())
  }
}
  
// Join a channel
Server.prototype.handle_join = function (context, msg) {
  var token = msg.part(1)
  
  // Validate the token
  if (typeof token != 'string' || token.length < 10) {
    this.respondWithError(context, ["Join request for invalid token", token])
    return
  }
  
  // Remove the connection from its current channel
  this.channels.removeConnection(context.connection)
  
  // Set its token
  context.connection.token = token
  
  // Find the channel
  var channel = this.channels.get(token)
  if (!channel) {
    // Create the channel if it doesn't exist
    channel = new Channel(context.connection.token)
    this.channels.add(channel)
  }
  
  // Add the connection to its channel
  channel.addConnection(context.connection)
  context.channel = channel
  
  // Confirm joining
  context.wsConnection.sendText(Message.build("token", token).toString())
  
  console.log("Connection joined channel", context.connection)
}
  
// Send a message to the channel
Server.prototype.handle_send = function (context, msg) {
  msg.parts[0] = 'receive'
  
  // Now distribute it to peers
  if (!context.channel) {
    return
  }
  context.channel.connections.forEach(function (connection) {
    if (connection != context.connection) {
      connection.connection.sendText(msg.toString())
    }
  })
}

module.exports = Server
