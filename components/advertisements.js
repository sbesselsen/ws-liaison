function Advertisements() {
  this._registryByCode = {}
}
Advertisements.prototype.add = function (advertisement) {
  this._registryByCode[advertisement.code] = advertisement
}
Advertisements.prototype.get = function (code) {
  return this._registryByCode[code] || null
}
Advertisements.prototype.remove = function (code) {
  delete this._registryByCode[code]
}
Advertisements.prototype.removeAllForToken = function (token) {
  var registry = this._registryByCode
  for (var code in registry) {
    if (registry[code].token == token) {
      delete registry[code]
    }
  }
}

module.exports = Advertisements
