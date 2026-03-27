<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useIMStore } from '@/stores/im'

const imStore = useIMStore()

// 登录表单
const loginForm = ref({
  userID: '6465432554',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySUQiOiI2NDY1NDMyNTU0IiwiUGxhdGZvcm1JRCI6NSwiZXhwIjoxNzgyMjk0MDA5LCJpYXQiOjE3NzQ1MTgwMDR9.6sR4s2xXjn245qcitueaSSS5qD9cM3U4qRHUAXKTERk',
  apiAddr: 'http://localhost:10002',
  wsAddr: 'ws://127.0.0.1:10001',
  platformID: 5, // Web 端为 5
})

// 消息输入
const messageInput = ref('')
const messageListRef = ref(null)

// 连接状态文本
const connectionStatusText = computed(() => {
  const statusMap = {
    disconnected: '未连接',
    connecting: '连接中...',
    connected: '已连接',
    failed: '连接失败',
  }
  return statusMap[imStore.connectionStatus] || '未知'
})

// 是否显示登录界面
const showLogin = computed(() => !imStore.isLoggedIn)

// 处理登录
async function handleLogin() {
  const result = await imStore.login({
    userID: loginForm.value.userID,
    token: loginForm.value.token,
    apiAddr: loginForm.value.apiAddr,
    wsAddr: loginForm.value.wsAddr,
  })

  if (!result.success) {
    alert(`登录失败: ${result.errMsg || '请检查配置'}`)
  }
}

// 处理登出
async function handleLogout() {
  await imStore.logout()
}

// 手动刷新列表
async function handleRefresh() {
  console.log('🔄 手动刷新列表...')
  await Promise.all([imStore.loadFriends(), imStore.loadConversations()])
  alert(`刷新完成！好友: ${imStore.friends.length} 个，会话: ${imStore.sortedConversations.length} 个`)
}

// 选择会话
function selectConversation(conversation) {
  imStore.selectConversation(conversation.conversationID)
}

// 选择好友
function selectFriend(friend) {
  imStore.selectFriend(friend)
}

// 选择群组
function selectGroup(group) {
  imStore.selectGroup(group)
}

// 切换主标签
function switchMainTab(tab) {
  imStore.switchMainTab(tab)
}

// 切换通讯录子标签
function switchContactSubTab(tab) {
  imStore.switchContactSubTab(tab)
}

// 接受好友申请
async function acceptFriend(req) {
  await imStore.acceptFriendApplication(req)
}

// 拒绝好友申请
async function rejectFriend(req) {
  await imStore.rejectFriendApplication(req)
}

// 获取当前聊天对象
const currentChatTarget = computed(() => {
  // 优先返回会话
  if (imStore.currentConversation) {
    return {
      type: 'conversation',
      id: imStore.currentConversation.userID || imStore.currentConversation.groupID,
      name: imStore.currentConversation.showName || imStore.currentConversation.userID || '未知',
      isGroup: imStore.currentConversation.conversationType === 2
    }
  }
  // 返回选中的好友
  if (imStore.currentFriendID) {
    const friend = imStore.friends.find(f => f.friendUser?.userID === imStore.currentFriendID)
    if (friend) {
      return {
        type: 'friend',
        id: friend.friendUser.userID,
        name: friend.friendUser.nickname || friend.friendUser.userID,
        isGroup: false
      }
    }
  }
  return null
})

// 是否可以发送消息
const canSendMessage = computed(() => {
  return !!currentChatTarget.value && !!messageInput.value.trim()
})

// 发送消息
async function handleSendMessage() {
  if (!messageInput.value.trim()) return

  const target = currentChatTarget.value
  if (!target) {
    alert('请先选择一个会话或好友')
    return
  }

  const recvID = target.isGroup ? '' : target.id
  const groupID = target.isGroup ? target.id : ''

  const result = await imStore.sendTextMessage(messageInput.value, recvID, groupID)

  if (result.success) {
    messageInput.value = ''
    scrollToBottom()
  } else {
    alert(`发送失败: ${result.errMsg}`)
  }
}

// 回车发送
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 获取头像显示文字（最多5个字，优先昵称）
function getAvatarText() {
  const user = imStore.currentUser
  if (!user) return '?'
  // 优先使用昵称，其次用户ID
  const text = user.nickname || user.userID || '?'
  // 取前5个字符
  return text.slice(0, 5)
}

// 获取会话头像显示文字
function getConversationAvatarText(conv) {
  // 优先使用showName（通常是昵称），其次userID
  const text = conv.showName || conv.userID || '?'
  // 取前5个字符
  return text.slice(0, 5)
}

// 获取好友头像显示文字
function getFriendAvatarText(friend) {
  // 优先使用昵称，其次用户ID
  const text = friend.friendUser?.nickname || friend.friendUser?.userID || '?'
  // 取前5个字符
  return text.slice(0, 5)
}

// 获取消息头像显示文字
function getMessageAvatarText(msg) {
  // 优先使用发送者昵称，其次发送者ID
  const text = msg.senderNickname || msg.sendID || '?'
  // 取前5个字符
  return text.slice(0, 5)
}

onMounted(() => {
  // 自动填充演示账号（可选）
  loginForm.value.userID = '6465432554'
})
</script>

<template>
  <div class="im-app">
    <!-- 登录界面 -->
    <div v-if="showLogin" class="login-container">
      <div class="login-box">
        <h2>OpenIM 登录</h2>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>用户 ID</label>
            <input v-model="loginForm.userID" type="text" placeholder="请输入用户ID" required />
          </div>
          <div class="form-group">
            <label>Token</label>
            <input v-model="loginForm.token" type="text" placeholder="请输入 Token" required />
          </div>
          <div class="form-group">
            <label>API 地址</label>
            <input
              v-model="loginForm.apiAddr"
              type="text"
              placeholder="http://server:10002"
              required
            />
          </div>
          <div class="form-group">
            <label>WebSocket 地址</label>
            <input
              v-model="loginForm.wsAddr"
              type="text"
              placeholder="ws://server:10001"
              required
            />
          </div>
          <button type="submit" class="login-btn">登录</button>
        </form>
        <div class="tips">
          <p>提示：需要先部署 OpenIM Server</p>
          <p>文档：https://docs.openim.io</p>
        </div>
      </div>
    </div>

    <!-- 主界面 -->
    <div v-else class="main-container">
      <!-- 左侧布局 -->
      <div class="left-layout">
        <!-- 窄边栏 -->
        <div class="narrow-sidebar">
          <div class="user-avatar" :title="imStore.currentUser?.nickname || imStore.currentUser?.userID">
            {{ getAvatarText() }}
          </div>
          <div class="nav-buttons">
            <div
              class="nav-btn"
              :class="{ active: imStore.mainTab === 'message' }"
              @click="switchMainTab('message')"
              title="消息"
            >
              <span class="nav-icon">💬</span>
              <span class="nav-text">消息</span>
            </div>
            <div
              class="nav-btn"
              :class="{ active: imStore.mainTab === 'contacts' }"
              @click="switchMainTab('contacts')"
              title="通讯录"
            >
              <span class="nav-icon">👥</span>
              <span class="nav-text">通讯录</span>
            </div>
          </div>
          <button class="logout-btn-small" @click="handleLogout" title="退出">⏻</button>
        </div>

        <!-- 主内容区 -->
        <div class="sidebar-content">
          <!-- 消息列表 -->
          <div v-if="imStore.mainTab === 'message'" class="message-panel">
            <div class="panel-header">
              <span class="panel-title">消息</span>
              <button class="refresh-btn-small" @click="handleRefresh" title="刷新">🔄</button>
            </div>
            <div class="conversation-list">
              <div
                v-for="conv in imStore.sortedConversations"
                :key="conv.conversationID"
                class="conversation-item"
                :class="{ active: conv.conversationID === imStore.currentConversationID }"
                @click="selectConversation(conv)"
              >
              <div class="conv-avatar">
                {{ getConversationAvatarText(conv) }}
              </div>
                <div class="conv-info">
                  <div class="conv-name">{{ conv.showName || conv.userID || '未知用户' }}</div>
                  <div class="conv-last-msg">
                    {{
                      conv.latestMsg
                        ? JSON.parse(conv.latestMsg).textElem?.content || '[其他消息]'
                        : '暂无消息'
                    }}
                  </div>
                </div>
                <div v-if="conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</div>
              </div>
              <div v-if="imStore.sortedConversations.length === 0" class="empty-list">
                暂无会话
              </div>
            </div>
          </div>

          <!-- 通讯录 -->
          <div v-else class="contacts-panel">
            <div class="panel-header">
              <span class="panel-title">通讯录</span>
            </div>
            <div class="contacts-menu">
              <div
                class="contact-category"
                :class="{ active: imStore.contactSubTab === 'new' }"
                @click="switchContactSubTab('new')"
              >
                <div class="category-icon orange">👤</div>
                <span>新的好友</span>
              </div>
              <div
                class="contact-category"
                :class="{ active: imStore.contactSubTab === 'group_notice' }"
                @click="switchContactSubTab('group_notice')"
              >
                <div class="category-icon orange">📢</div>
                <span>群通知</span>
              </div>
              <div
                class="contact-category"
                :class="{ active: imStore.contactSubTab === 'friends' }"
                @click="switchContactSubTab('friends')"
              >
                <div class="category-icon blue">👤</div>
                <span>我的好友</span>
              </div>
              <div
                class="contact-category"
                :class="{ active: imStore.contactSubTab === 'groups' }"
                @click="switchContactSubTab('groups')"
              >
                <div class="category-icon blue">👥</div>
                <span>我的群组</span>
              </div>
            </div>

            <!-- 好友列表 -->
            <div v-if="imStore.contactSubTab === 'friends'" class="friend-list">
              <div
                v-for="friend in imStore.friends"
                :key="friend.friendUser?.userID"
                class="friend-item"
                :class="{ active: friend.friendUser?.userID === imStore.currentFriendID }"
                @click="selectFriend(friend)"
              >
              <div class="friend-avatar">
                {{ getFriendAvatarText(friend) }}
              </div>
                <div class="friend-info">
                  <div class="friend-name">{{ friend.friendUser?.nickname || friend.friendUser?.userID || '未知用户' }}</div>
                </div>
              </div>
              <div v-if="imStore.friends.length === 0" class="empty-list">
                暂无好友
              </div>
            </div>

            <!-- 群组列表 -->
            <div v-else-if="imStore.contactSubTab === 'groups'" class="group-list">
              <div
                v-for="group in imStore.groups"
                :key="group.groupID"
                class="group-item"
                @click="selectGroup(group)"
              >
                <div class="group-avatar">👥</div>
                <div class="group-name">{{ group.groupName || group.groupID }}</div>
              </div>
              <div v-if="imStore.groups.length === 0" class="empty-list">
                暂无群组
              </div>
            </div>

            <!-- 新的好友 -->
            <div v-else-if="imStore.contactSubTab === 'new'" class="friend-request-list">
              <div v-for="req in imStore.friendRequests" :key="req.userID" class="friend-request-item">
                <div class="request-avatar">{{ (req.nickname || req.userID || '?').slice(0, 5) }}</div>
                <div class="request-info">
                  <div class="request-name">{{ req.nickname || req.userID }}</div>
                  <div class="request-msg">{{ req.reqMsg || '请求添加好友' }}</div>
                </div>
                <div class="request-actions">
                  <button class="accept-btn" @click="acceptFriend(req)">接受</button>
                  <button class="reject-btn" @click="rejectFriend(req)">拒绝</button>
                </div>
              </div>
              <div v-if="imStore.friendRequests.length === 0" class="empty-list">
                暂无好友申请
              </div>
            </div>

            <!-- 群通知 -->
            <div v-else-if="imStore.contactSubTab === 'group_notice'" class="group-notice-list">
              <div v-for="notice in imStore.groupNotices" :key="notice.groupID" class="group-notice-item">
                <div class="notice-avatar">📢</div>
                <div class="notice-info">
                  <div class="notice-title">{{ notice.groupName }}</div>
                  <div class="notice-msg">{{ notice.reqMsg || '申请加入群组' }}</div>
                </div>
              </div>
              <div v-if="imStore.groupNotices.length === 0" class="empty-list">
                暂无群通知
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧聊天区域 -->
      <div class="chat-area">
        <div v-if="currentChatTarget" class="chat-header">
          <span class="chat-title">{{ currentChatTarget.name }}</span>
          <span v-if="currentChatTarget.type === 'friend'" class="chat-subtitle">(好友)</span>
        </div>
        <div v-else class="chat-header">
          <span class="chat-title">请选择一个好友或会话</span>
        </div>

        <div ref="messageListRef" class="message-list">
          <div
            v-for="msg in imStore.messages"
            :key="msg.clientMsgID"
            class="message-item"
            :class="{ self: msg.sendID === imStore.currentUser?.userID }"
          >
            <div class="msg-avatar">
              {{ getMessageAvatarText(msg) }}
            </div>
            <div class="msg-content">
              <div class="msg-sender">{{ msg.senderNickname || msg.sendID }}</div>
              <div class="msg-bubble">{{ msg.textElem?.content || '[不支持的消息类型]' }}</div>
              <div class="msg-time">{{ formatTime(msg.createTime) }}</div>
            </div>
          </div>
          <div v-if="imStore.messages.length === 0 && currentChatTarget" class="empty-messages">
            暂无消息，开始聊天吧！
          </div>
        </div>

        <div class="input-area">
          <textarea
            v-model="messageInput"
            :placeholder="currentChatTarget ? '输入消息，按 Enter 发送...' : '请先选择好友或会话'"
            @keydown="handleKeydown"
            :disabled="!currentChatTarget"
          ></textarea>
          <button
            class="send-btn"
            @click="handleSendMessage"
            :disabled="!canSendMessage"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
}
</style>

<style scoped>
.im-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 登录界面 */
.login-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 420px;
}

.login-box h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.tips {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.tips p {
  margin: 4px 0;
}

/* 主界面 */
.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧布局 */
.left-layout {
  display: flex;
  width: 320px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
}

/* 窄边栏 */
.narrow-sidebar {
  width: 60px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 20px;
}

.nav-buttons {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: #666;
}

.nav-btn:hover {
  background: #e0e0e0;
}

.nav-btn.active {
  color: #1976d2;
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.nav-text {
  font-size: 11px;
}

.logout-btn-small {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  border-radius: 8px;
}

.logout-btn-small:hover {
  background: #e0e0e0;
}

/* 侧边栏内容区 */
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.refresh-btn-small {
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.refresh-btn-small:hover {
  background: #f0f0f0;
}

/* 通讯录菜单 */
.contacts-menu {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.contact-category {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.contact-category:hover {
  background: #f5f5f5;
}

.contact-category.active {
  background: #e3f2fd;
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
}

.category-icon.orange {
  background: #ff9800;
  color: white;
}

.category-icon.blue {
  background: #2196f3;
  color: white;
}

/* 消息面板 */
.message-panel,
.contacts-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-list,
.friend-list,
.group-list,
.friend-request-list,
.group-notice-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.conversation-item:hover {
  background: #f5f5f5;
}

.conversation-item.active {
  background: #e3f2fd;
}

.conv-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-last-msg {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  background: #f44336;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  flex-shrink: 0;
}

.empty-list {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

/* 标签切换 */


/* 好友列表 */
.friend-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.friend-item:hover {
  background: #f5f5f5;
}

.friend-item.active {
  background: #e3f2fd;
}

.friend-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 群组列表 */
.group-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.group-item:hover {
  background: #f5f5f5;
}

.group-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.group-name {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 好友申请列表 */
.friend-request-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.request-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.request-info {
  flex: 1;
  min-width: 0;
}

.request-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.request-msg {
  font-size: 12px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.accept-btn,
.reject-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.accept-btn {
  background: #4caf50;
  color: white;
}

.accept-btn:hover {
  background: #43a047;
}

.reject-btn {
  background: #f5f5f5;
  color: #666;
}

.reject-btn:hover {
  background: #e0e0e0;
}

/* 群通知列表 */
.group-notice-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.notice-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.notice-info {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.notice-msg {
  font-size: 12px;
  color: #999;
}

.empty-list {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

/* 聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.chat-subtitle {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
}

.message-item.self {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin: 0 12px;
  flex-shrink: 0;
}

.msg-content {
  max-width: 60%;
}

.message-item.self .msg-content {
  text-align: right;
}

.msg-sender {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.msg-bubble {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  word-break: break-word;
  color: #333;
  line-height: 1.5;
}

.message-item.self .msg-bubble {
  background: #667eea;
  color: white;
}

.msg-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.message-item.self .msg-time {
  color: rgba(255, 255, 255, 0.7);
}

.empty-messages {
  text-align: center;
  color: #999;
  padding: 60px 20px;
}

/* 输入区域 */
.input-area {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
}

.input-area textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
  font-family: inherit;
  height: 60px;
}

.input-area textarea:focus {
  outline: none;
  border-color: #667eea;
}

.send-btn {
  padding: 0 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
