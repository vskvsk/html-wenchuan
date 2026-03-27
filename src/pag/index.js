import { PAGInit } from 'libpag'

// 全局 PAG 实例
let PAG = null
let isInitializing = false
let initPromise = null

// PAG WASM 文件路径
const PAG_WASM_URL = '/libpag.wasm'

// PAG 动效素材列表（本地资源）
export const pagEffects = [
  { id: 'like', name: '点赞', url: '/like.pag', thumbnail: '👍' },
]

// 初始化 PAG
export async function initPAG() {
  if (PAG) return PAG
  if (isInitializing) return initPromise

  isInitializing = true
  initPromise = PAGInit({
    locateFile: (file) => {
      if (file.endsWith('.wasm')) {
        return PAG_WASM_URL
      }
      return file
    }
  }).then((instance) => {
    PAG = instance
    console.log('✅ PAG 初始化成功')
    return PAG
  }).catch((error) => {
    console.error('❌ PAG 初始化失败:', error)
    throw error
  }).finally(() => {
    isInitializing = false
  })

  return initPromise
}

// 获取 PAG 实例
export function getPAG() {
  if (!PAG) {
    throw new Error('PAG 未初始化，请先调用 initPAG()')
  }
  return PAG
}

// 加载 PAG 文件
export async function loadPAGFile(url) {
  const pag = getPAG()
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const pagFile = await pag.PAGFile.load(buffer)
  return pagFile
}

// 在 Canvas 上播放 PAG 动效
export async function playPAGOnCanvas(pagFile, canvas, options = {}) {
  const pag = getPAG()
  
  // 设置 Canvas 尺寸
  canvas.width = pagFile.width()
  canvas.height = pagFile.height()
  
  // 创建 PAGView
  const pagView = await pag.PAGView.init(pagFile, canvas, options)
  
  // 播放
  await pagView.play()
  
  return pagView
}

// 创建 PAG 消息数据
export function createPAGMessageData(effectId, effectUrl) {
  return {
    type: 'pag',
    effectId,
    effectUrl,
    timestamp: Date.now()
  }
}
