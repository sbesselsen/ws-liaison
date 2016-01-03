var sha1 = require("sha1")

module.exports = {
  generateToken: function () {
    return sha1('liaison-token-' + Math.random())
  },
  generateCode: function () {
    return sha1('liaison-code-' + Math.random()).substring(0, 8)
  }
}