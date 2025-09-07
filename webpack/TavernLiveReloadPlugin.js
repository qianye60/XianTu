import { Server } from 'socket.io'
import yaml from 'yaml'
import fs from 'fs'
import http from 'http'

class TavernLiveReloadPlugin {
  constructor(options = {}) {
    this.port = options.port || null
    this.io = null
    this.server = null
  }

  apply(compiler) {
    // This hook is only triggered in watch mode.
    compiler.hooks.watchRun.tap('TavernLiveReloadPlugin', () => {
      if (this.server) return

      try {
        if (!this.port) {
          const configFile = fs.readFileSync('config.yaml', 'utf8')
          const config = yaml.parse(configFile)
          this.port = config.port || 6620
        }
      } catch (e) {
        console.warn(
          '[Tavern-Reload] Could not read config.yaml, using default port 6620.',
          e.message,
        )
        this.port = 6620
      }

      const httpServer = http.createServer()
      this.io = new Server(httpServer, { cors: { origin: '*' } })

      this.io.on('connection', (socket) => {
        console.log(`[Tavern-Reload] 酒馆客户端 ${socket.id} 已连接至传音法台。`)
      })

      this.server = httpServer.listen(this.port, () => {
        console.log(`[Tavern-Reload] 传音法台已在端口 ${this.port} 启动，等待酒馆连接...`)
      })

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(
            `[Tavern-Reload] 错误：端口 ${this.port} 已被占用。请检查 config.yaml 或关闭占用该端口的其他程序。`,
          )
          // Stop webpack watch process
          process.exit(1)
        }
      })
    })

    compiler.hooks.done.tap('TavernLiveReloadPlugin', (stats) => {
      if (this.io && !stats.hasErrors()) {
        console.log('[Tavern-Reload] 检测到法术变更，发送重载敕令...')
        this.io.emit('iframe_updated')
      }
    })
  }
}

export default TavernLiveReloadPlugin
