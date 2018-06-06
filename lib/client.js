const debug = require('debug')('thinknet')
const net = require('net')
const {Server, Socket} = net
const { Events } = require('esoop')
// const Protocol = require('./protocol')
// const Router = require('./router')

class THNClient extends Events {
  constructor(opt = {}) {
    super(opt)
    this.name = 'thn-client'
    /** 
     * server: Server端的
     * client: Client端的
     **/
    this.side = opt.side || 'client'
    //是否是Server端的socket
    this.isServerSide = !!(this.side === 'server')
    this.debugTitle = 'client side socket: '
    if(this.isServerSide)
      this.debugTitle = 'server side socket: '
    //serverside
    this.id = -1

    this.socket = null
    this.server = null
    this.setSocket(opt)
    
    //Client连上Server后（onConnect）要做的事情（如定时发心跳）
    this.sendHandler = []

    opt.protocol && this.setProtocol(opt.protocol)
    opt.routerIns && this.setRouterIns(opt.routerIns)

    this.init()
  }
  setSocket(opt = {}) {
    //server side可以重复设置
    if(this.isServerSide){
      if(!(opt.socket instanceof Socket)){
        throw new TypeError(`${this.name}.setSocket's socket must be a net.Socket instance!`)
      }
      this.socket = opt.socket
      this.server = opt.server
    }
    //client side只设置一次
    if(this.socket === null){
      opt.newNetSocket = opt.newNetSocket || []
      this.socket = new Socket(...opt.newNetSocket)
    }
  }
  // checkProperty() {
  //   return this.protocol instanceof Protocol
  //       && this.routerIns instanceof Router 
  // }
  setProtocol(protocol) {
    this.protocol = protocol
    // if(protocol instanceof Protocol){
    //   this.protocol = protocol
    // }
  }
  setRouterIns(routerIns) {
    this.routerIns = routerIns
    // if(routerIns instanceof Router){
    //   this.routerIns = routerIns
    // }
  }
  init() {
    let events = ["data", "error", "end", "close", "drain", "timeout", "lookup"]
    if(!this.isServerSide){
      events.unshift("connect")
    }
    events.forEach((eventName) => {
        this.socket.on(eventName, (...args) => {
          let method = 'on' + eventName.substr(0, 1).toUpperCase() + eventName.substr(1)
          if(this[method] && typeof this[method] === 'function'){
            this[method](...args)
          }
          // this.emit(eventName, this, ...args)
        })
      })
      this.afterInit()
  }
  //可以在这里做些针对全局的定时任务等
  afterInit() {
    this.emit('init', this)
  }
  setId(id) {
    this.id = id
  }
  getId() {
    return this.id
  }
  bindSocketEvents() {

  }
  onConnect() {
    //主动推送也可以做到外层，变量client数组，来主动推送消息
    this.send()
  }
  useSend(handler) {
    if(typeof handler === 'function'){
      this.sendHandler.push(handler)
    }
  }
  send() {
    let ctx = {socket: this.socket, client: this, server: this.server}
    this.sendHandler.forEach(send => send(ctx))
  }
  async onData(buf) {
    let dataObjArry = await this.protocol.parse(buf)
    dataObjArry.forEach(dataObj => {
      let ctx = {
        socket: this.socket, data: dataObj, _rawData: buf, 
        client: this, server: this.server,
        netSocket: this.socket, netServer: this.server ? this.server.server : null
      }
      this.routerIns.handle(ctx)
    })
  }
  onError(e) {
    debug(e)
  }
  onEnd() {
    debug(`the other side socket wana close!`)
  }
  onClose(hadError) {
    debug(`${this.name} closed! had error? ` + hadError)
  }
  connect(...args) {
    if(this.isServerSide){
      return
    }
    // if(!this.checkProperty()){
    //   throw new Error(`${this.name}的协议或者路由实例尚未设置!`)
    // }
    this.socket.connect(...args)
  }
}

module.exports = THNClient