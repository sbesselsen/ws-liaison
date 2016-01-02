function PublishCodes() {
  this._codeByToken = {}
  this._tokenByCode = {}
}
PublishCodes.prototype.link = function (code, token) {
  this.removeForCode(code)
  this.removeForToken(token)
  
  this._codeByToken[token] = code
  this._tokenByCode[code] = token
}
PublishCodes.prototype.code = function (token) {
  return this._codeByToken[token] || null
}
PublishCodes.prototype.token = function (code) {
  return this._tokenByCode[code] || null
}
PublishCodes.prototype.removeForCode = function (code) {
  if (!this._tokenByCode[code]) {
    return
  }
  var token = this._tokenByCode[code]
  delete this._codeByToken[token]
  delete this._tokenByCode[code]
}
PublishCodes.prototype.removeForToken = function (token) {
  if (!this._codeByToken[token]) {
    return
  }
  var code = this._tokenByCode[code]
  delete this._tokenByCode[code]
  delete this._codeByToken[token]
}

module.exports = PublishCodes
