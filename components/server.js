var ws = require("nodejs-websocket")

var Message = require("./message.js"),
  generator = require("./generator.js"),
  Connection = require("./connection.js"),
  Channel = require("./channel.js"),
  Channels = require("./channels.js"),
  PublishCodes = require("./publish-codes.js")

var Server = function (port) {
  this.port = port
  
  this.publishCodes = new PublishCodes()
  this.channels = new Channels()

  var _this = this
  this.channels.on("removeChannel", function (channel) {
    console.log("Removing channel", channel.token)
    _this.publishCodes.removeForToken(channel.token)
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

// Publish a channel with a code
Server.prototype.handle_publish = function (context, msg) {
  var code = generator.generateCode()
  this.publishCodes.link(code, context.connection.token)
  
  console.log("Publish", code, context.connection.token)
  
  // Send the publish code to all listeners
  this.sendToChannel(context.channel, Message.build("publish_code", code))
}
  
// Unpublish the channel
Server.prototype.handle_unpublish = function (context, msg) {
  var token = context.connection.token
  this.publishCodes.removeForToken(token)
  
  console.log("Unpublish", token)
  
  // Send a message to all listeners that there is no publish code any more
  this.sendToChannel(context.channel, Message.build("publish_code", null))
}
  
// Join a channel
Server.prototype.handle_join = function (context, msg, joinedWithCode) {
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
  
  // If the client hasn't connected through a publish code, tell them the publish code
  var code = this.publishCodes.code(token)
  context.wsConnection.sendText(Message.build("publish_code", code).toString())
  
  console.log("Connection joined channel", token, context.connection.connectionID)
}
  
// Join a channel
Server.prototype.handle_join_code = function (context, msg) {
  var code = msg.part(1)
  var token = this.publishCodes.token(code)
  if (token) {
    // Handle this as a user joining with a token
    this.handle_join(context, Message.build('join', token), true)
  } else {
    // Notify the user that the code is incorrect
    context.wsConnection.sendText(Message.build("code_not_found", code).toString())
  }
}
  
// Send a message to other listeners the channel
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

// Send a message to each listener on the channel
Server.prototype.sendToChannel = function (channel, msg) {
  var msgData = msg.toString()
  channel.connections.forEach(function (connection) {
    connection.connection.sendText(msgData)
  })
}

module.exports = Server
