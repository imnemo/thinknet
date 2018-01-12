const {Events} = require('esoop')

class Router extends Events {
  constructor(opt = {}) {
    super(opt)
    this.mid = []
  }
  /**
   * use可以像express和koa那样
   * 即支持一个通用router，也支持特定的
   * 即可以从上而下，上面的影响下面的
   * 又可以对同一router，use不同的handler或者middleware
   * 甚至这里的router，也可以是一种模式，如user/:id等，这也就实现了消息的namespace
   */
  use() {}
  /**
   * 处理数据的方式方法，与use方法对应配合起来
   */
  handle() {}
}

module.exports = Router