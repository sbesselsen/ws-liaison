var liaison = require("../index.js")

var client = null
var args = process.argv.slice(2)
var token = args[0]
var data = args[1]

var msg = JSON.parse(data)

client = new liaison.Client(liaison.websocketClient, "ws://localhost:8001")
client.connect(function () {
  client.join(token, function () {
    client.send(msg)
    client.close()
  }, function () {
    console.error("Can't join with token")
    client.close()
  })
})
