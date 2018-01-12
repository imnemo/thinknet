const {Events} = require('esoop')

class Protocol extends Events {
  constructor(opt = {}) {
    super(opt)
    this.eol = opt.eol || '\r\n'
    this.init()
  }
  init() {}
  parse(buf) {}
  build(data) {}
}

module.exports = Protocol