var liaison = require("../index.js")

var client = null
var args = process.argv.slice(2)
var code = args[0]

client = new liaison.Client(liaison.websocketClient, "ws://localhost:8001")
client.connect(function () {
  client.joinWithCode(code, function (token) {
    console.log(token)
    client.close()
  }, function (error) {
    console.log("Code not found")
    client.close()
  })
})
