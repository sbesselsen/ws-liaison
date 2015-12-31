var id = 0

function Connection(conn, token) {
  this.connection = conn
  this.connectionID = id++
  this.token = token
}

module.exports = Connection
