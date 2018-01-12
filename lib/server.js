const debug = require('debug')('thinknet')
const net = require('net')
const {Server, Socket} = net
const { Events } = require('esoop')
const THNClient = require('./client')
const Protocol = require('./protocol')
const Router = require('./router')

class THNServer extends Events {
  constructor(opt = {}) {
    super(opt)
    this.name = 'thn-server'
    opt.newNetServer = opt.newNetServer || []
    this.server = new Server(...opt.newNetServer)

    this.clientNum = 0
    this.clientIdCounter = 0
    this.clients = []

    //Server主动推送Client的中间件
    this.pushHandler = []

    opt.protocol && this.setProtocol(opt.protocol)
    opt.routerIns && this.setRouterIns(opt.routerIns)
    this.init()
  }
  checkProperty() {
    return this.protocol instanceof Protocol
        && this.routerIns instanceof Router 
  }
  setProtocol(protocol) {
    if(protocol instanceof Protocol){
      this.protocol = protocol
    }
  }
  setRouterIns(routerIns) {
    if(routerIns instanceof Router){
      this.routerIns = routerIns
    }
  }
  init() {
    ["listening", "connection", "error", "close"]
      .forEach((eventName) => {
        this.server.on(eventName, (...args) => {
          let method = 'on' + eventName.substr(0, 1).toUpperCase() + eventName.substr(1)
          if(this[method] && typeof this[method] === 'function'){
            this[method](...args)
          }
          this.emit(eventName, ...args)
        })
      })
      this.afterInit()
  }
  /** 
   * 可以在这里做些针对全局的定时任务等
  */
  afterInit() {
    this.emit('init', this)
  }
  onListening() {
    debug(`${this.name} listening on `, this.server.address())
  }
  onConnection(socket) {
    //主动推送也可以做到外层，变量client数组，来主动推送消息
    this.push(socket)
    let clientOpt = {
      socket: socket, server: this, side: 'server'
      , protocol: this.protocol, routerIns: this.routerIns
    }
    let client = new THNClient(clientOpt)
    client.on('end', (client, ...args) => this.onClientEnd(client, ...args))
    client.on('close', (client, ...args) => this.onClientClose(client, ...args))
    this.addClient(client)
  }
  addClient(client) {
    let id = ++this.clientIdCounter
    client.setId(id)
    this.clients['_' + id] = client
    this.clientNum++
    this.emit('client-added')
  }
  removeClient(client) {
    let clientId = client.getId()
    //delete操作是否合理？
    delete this.clients['_' + clientId]
    this.clientNum--
    this.emit('client-removed')
  }
  getClientNum() {
    return this.clientNum
  }
  onClientEnd(client) {
    debug(`client ${client.getId()} ended!`)
  }
  onClientClose(client, hadError) {
    debug(`closed, had error? ` + hadError)
    this.removeClient(client)
  }
  usePush(handler) {
    if(typeof handler === 'function'){
      this.pushHandler.push(handler)
    }
  }
  push(socket) {
    let ctx = {
      socket: socket, server: this
    }
    this.pushHandler.forEach((push) => {
      push(ctx)
    })
  }
  onError(e) {
    console.error(e)
  }
  onClose() {
    debug(`${this.name} closed!`)
  }
  listen(...args) {
    if(!this.checkProperty()){
      throw new Error(`${this.name}的协议或者路由实例尚未设置!`)
    }
    this.server.listen(...args)
  }
}

module.exports = THNServer