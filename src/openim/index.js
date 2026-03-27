import { getSDK, CbEvents } from '@openim/wasm-client-sdk'

// 全局 IMSDK 实例
let IMSDK = null

// 初始化 SDK
export function initSDK() {
  if (IMSDK) return IMSDK

  IMSDK = getSDK({
    coreWasmPath: '/openIM.wasm',
    sqlWasmPath: '/sql-wasm.wasm',
    debug: true
  })

  return IMSDK
}

// 获取 SDK 实例
export function getIMSDK() {
  if (!IMSDK) {
    throw new Error('SDK 未初始化，请先调用 initSDK()')
  }
  return IMSDK
}

// 导出事件枚举
export { CbEvents }

// 登录方法
export function login(params) {
  const sdk = getIMSDK()
  return sdk.login({
    platformID: 5, // Web 端固定为 5
    ...params
  })
}

// 登出方法
export function logout() {
  const sdk = getIMSDK()
  return sdk.logout()
}

// 获取登录状态
export function getLoginStatus() {
  const sdk = getIMSDK()
  return sdk.getLoginStatus()
}

// 创建文本消息
export function createTextMessage(text) {
  const sdk = getIMSDK()
  return sdk.createTextMessage(text)
}

// 创建自定义消息
export function createCustomMessage(data, extension, description) {
  const sdk = getIMSDK()
  return sdk.createCustomMessage(data, extension, description)
}

// 发送消息
export function sendMessage(params) {
  const sdk = getIMSDK()
  return sdk.sendMessage(params)
}

// 获取所有会话列表
export function getAllConversationList() {
  const sdk = getIMSDK()
  return sdk.getAllConversationList()
}

// 获取会话列表（分页方式）
export function getConversationListSplit(params) {
  const sdk = getIMSDK()
  return sdk.getConversationListSplit(params)
}

// 获取消息列表
export function getAdvancedHistoryMessageList(params) {
  const sdk = getIMSDK()
  return sdk.getAdvancedHistoryMessageList(params)
}

// 获取好友列表
export function getFriendList(filterBlack = false) {
  const sdk = getIMSDK()
  return sdk.getFriendList(filterBlack)
}

// 获取用户信息
export function getUsersInfo(userIDList) {
  const sdk = getIMSDK()
  return sdk.getUsersInfo(userIDList)
}

// 获取自己的信息
export function getSelfUserInfo() {
  const sdk = getIMSDK()
  return sdk.getSelfUserInfo()
}

// 获取加入的群组列表
export function getJoinedGroupList() {
  const sdk = getIMSDK()
  return sdk.getJoinedGroupList()
}

// 获取好友申请列表（作为接收者）
export function getFriendApplicationListAsRecipient() {
  const sdk = getIMSDK()
  return sdk.getFriendApplicationListAsRecipient()
}

// 获取群申请列表（作为接收者）
export function getGroupApplicationListAsRecipient() {
  const sdk = getIMSDK()
  return sdk.getGroupApplicationListAsRecipient()
}

// 监听事件
export function onEvent(event, callback) {
  const sdk = getIMSDK()
  sdk.on(event, callback)
}

// 取消监听
export function offEvent(event, callback) {
  const sdk = getIMSDK()
  sdk.off(event, callback)
}
