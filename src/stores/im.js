import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  initSDK,
  CbEvents,
  login as imLogin,
  logout as imLogout,
  getLoginStatus,
  createTextMessage,
  sendMessage as imSendMessage,
  getAllConversationList,
  getAdvancedHistoryMessageList,
  getFriendList,
  getJoinedGroupList,
  getFriendApplicationListAsRecipient,
  getGroupApplicationListAsRecipient,
  getIMSDK,
  onEvent,
  offEvent
} from '@/openim'

export const useIMStore = defineStore('im', () => {
  // State
  const isInitialized = ref(false)
  const isLoggedIn = ref(false)
  const connectionStatus = ref('disconnected') // disconnected, connecting, connected, failed
  const currentUser = ref(null)
  const conversations = ref([])
  const friends = ref([])
  const groups = ref([])
  const friendRequests = ref([])
  const groupNotices = ref([])
  const currentConversationID = ref('')
  const currentFriendID = ref('')
  const currentGroupID = ref('')
  const messages = ref([])
  const unreadCount = ref(0)
  
  // UI State
  const mainTab = ref('message') // 'message' | 'contacts'
  const contactSubTab = ref('friends') // 'new' | 'group_notice' | 'friends' | 'groups'

  // Getters
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.conversationID === currentConversationID.value) || null
  })

  const sortedConversations = computed(() => {
    return [...conversations.value].sort((a, b) => {
      return (b.latestMsgSendTime || 0) - (a.latestMsgSendTime || 0)
    })
  })

  // Actions
  function initialize() {
    if (isInitialized.value) return

    try {
      initSDK()
      isInitialized.value = true
      setupEventListeners()
    } catch (error) {
      console.error('SDK 初始化失败:', error)
    }
  }

  function setupEventListeners() {
    // 连接状态事件
    onEvent(CbEvents.OnConnecting, () => {
      connectionStatus.value = 'connecting'
      console.log('⏳ 连接中...')
    })

    onEvent(CbEvents.OnConnectSuccess, async () => {
      connectionStatus.value = 'connected'
      console.log('✅ 连接成功')
      
      // 连接成功后获取好友和会话列表
      if (isLoggedIn.value) {
        console.log('📋 正在获取好友和会话列表...')
        await Promise.all([loadFriends(), loadConversations()])
      }
    })

    onEvent(CbEvents.OnConnectFailed, (e) => {
      connectionStatus.value = 'failed'
      console.error('❌ 连接失败', e)
    })

    onEvent(CbEvents.OnUserTokenExpired, () => {
      isLoggedIn.value = false
      console.warn('⚠️ Token 已过期')
    })

    // 新消息事件
    onEvent(CbEvents.OnRecvNewMessages, ({ data }) => {
      console.log('📩 收到新消息', data)
      messages.value.push(...data)

      // 更新未读数
      data.forEach(msg => {
        if (!msg.isRead) {
          unreadCount.value++
        }
      })

      // 刷新会话列表
      loadConversations()
    })

    // 会话列表更新
    onEvent(CbEvents.OnConversationChanged, ({ data }) => {
      console.log('📋 会话列表更新', data)
      loadConversations()
    })
  }

  async function login(params) {
    try {
      console.log('🔑 开始登录:', { userID: params.userID, apiAddr: params.apiAddr, wsAddr: params.wsAddr })
      const result = await imLogin(params)
      console.log('🔑 登录成功:', result)
      isLoggedIn.value = true
      currentUser.value = { userID: params.userID }
      // 登录成功后等待连接成功事件触发，再获取列表
      return { success: true }
    } catch ({ errCode, errMsg }) {
      console.error('🚫 登录失败', errCode, errMsg)
      return { success: false, errCode, errMsg }
    }
  }

  async function logout() {
    try {
      await imLogout()
      isLoggedIn.value = false
      currentUser.value = null
      conversations.value = []
      messages.value = []
      currentConversationID.value = ''
      return { success: true }
    } catch (error) {
      console.error('登出失败:', error)
      return { success: false, error }
    }
  }

  async function loadConversations() {
    try {
      console.log('📋 正在获取会话列表...')
      const result = await getAllConversationList()
      console.log('📋 会话列表原始数据:', result)
      
      // 处理响应数据: { data: [...], errCode: 0, errMsg: '' }
      let conversationData = []
      if (result?.data && Array.isArray(result.data)) {
        conversationData = result.data
      }
      conversations.value = conversationData
      console.log('📋 会话列表加载成功:', conversations.value.length, '条')
    } catch (error) {
      console.error('❌ 获取会话列表失败:', error)
    }
  }

  async function loadFriends() {
    try {
      console.log('👥 正在获取好友列表...')
      const result = await getFriendList(false) // false = 不过滤黑名单
      console.log('👥 好友列表原始数据:', result)
      
      // 处理响应数据: { data: [...], errCode: 0, errMsg: '' }
      let friendsData = []
      if (result?.data && Array.isArray(result.data)) {
        friendsData = result.data
      }
      friends.value = friendsData
      console.log('👥 好友列表加载成功:', friends.value.length, '条', friends.value)
    } catch (error) {
      console.error('❌ 获取好友列表失败:', error)
      friends.value = []
    }
  }

  async function loadMessages(conversationID, options = {}) {
    try {
      const { data } = await getAdvancedHistoryMessageList({
        conversationID,
        count: 20,
        ...options
      })
      messages.value = data?.messageList || []
      return messages.value
    } catch (error) {
      console.error('获取消息列表失败:', error)
      return []
    }
  }

  async function sendTextMessage(text, recvID, groupID = '') {
    try {
      const { data: message } = await createTextMessage(text)
      const result = await imSendMessage({
        recvID,
        groupID,
        message
      })
      // 添加本地消息到列表
      if (result.data) {
        messages.value.push(result.data)
      }
      // 刷新会话列表
      await loadConversations()
      return { success: true, data: result.data }
    } catch ({ errCode, errMsg }) {
      console.error('🚫 发送失败', errCode, errMsg)
      return { success: false, errCode, errMsg }
    }
  }

  function selectFriend(friend) {
    currentFriendID.value = friend?.friendUser?.userID || ''
    currentGroupID.value = ''
    currentConversationID.value = ''
    messages.value = []
    // 自动切换到消息视图
    mainTab.value = 'message'
  }

  function selectGroup(group) {
    currentGroupID.value = group?.groupID || ''
    currentFriendID.value = ''
    currentConversationID.value = ''
    messages.value = []
    // 自动切换到消息视图
    mainTab.value = 'message'
  }

  function switchMainTab(tab) {
    mainTab.value = tab
  }

  function switchContactSubTab(tab) {
    contactSubTab.value = tab
    // 切换时加载对应数据
    if (tab === 'friends') {
      loadFriends()
    } else if (tab === 'groups') {
      loadGroups()
    } else if (tab === 'new') {
      loadFriendRequests()
    } else if (tab === 'group_notice') {
      loadGroupNotices()
    }
  }

  async function loadGroups() {
    try {
      console.log('👥 正在获取群组列表...')
      const result = await getJoinedGroupList()
      console.log('👥 群组列表原始数据:', result)
      
      let groupsData = []
      if (result?.data && Array.isArray(result.data)) {
        groupsData = result.data
      }
      groups.value = groupsData
      console.log('👥 群组列表加载成功:', groups.value.length, '条')
    } catch (error) {
      console.error('❌ 获取群组列表失败:', error)
      groups.value = []
    }
  }

  async function loadFriendRequests() {
    try {
      console.log('📨 正在获取好友申请...')
      const result = await getFriendApplicationListAsRecipient()
      console.log('📨 好友申请原始数据:', result)
      
      let requestsData = []
      if (result?.data && Array.isArray(result.data)) {
        requestsData = result.data
      }
      friendRequests.value = requestsData
      console.log('📨 好友申请加载成功:', friendRequests.value.length, '条')
    } catch (error) {
      console.error('❌ 获取好友申请失败:', error)
      friendRequests.value = []
    }
  }

  async function loadGroupNotices() {
    try {
      console.log('📢 正在获取群通知...')
      const result = await getGroupApplicationListAsRecipient()
      console.log('📢 群通知原始数据:', result)
      
      let noticesData = []
      if (result?.data && Array.isArray(result.data)) {
        noticesData = result.data
      }
      groupNotices.value = noticesData
      console.log('📢 群通知加载成功:', groupNotices.value.length, '条')
    } catch (error) {
      console.error('❌ 获取群通知失败:', error)
      groupNotices.value = []
    }
  }

  async function acceptFriendApplication(req) {
    try {
      const sdk = getIMSDK()
      await sdk.acceptFriendApplication({
        fromUserID: req.userID,
        handleMsg: '同意'
      })
      console.log('✅ 已接受好友申请:', req.userID)
      // 刷新列表
      await loadFriendRequests()
      await loadFriends()
    } catch (error) {
      console.error('❌ 接受好友申请失败:', error)
    }
  }

  async function rejectFriendApplication(req) {
    try {
      const sdk = getIMSDK()
      await sdk.refuseFriendApplication({
        fromUserID: req.userID,
        handleMsg: '拒绝'
      })
      console.log('❌ 已拒绝好友申请:', req.userID)
      // 刷新列表
      await loadFriendRequests()
    } catch (error) {
      console.error('❌ 拒绝好友申请失败:', error)
    }
  }

  function selectConversation(conversationID) {
    currentConversationID.value = conversationID
    if (conversationID) {
      loadMessages(conversationID)
    } else {
      messages.value = []
    }
  }

  return {
    // State
    isInitialized,
    isLoggedIn,
    connectionStatus,
    currentUser,
    conversations,
    friends,
    groups,
    friendRequests,
    groupNotices,
    currentConversationID,
    currentFriendID,
    currentGroupID,
    messages,
    unreadCount,
    mainTab,
    contactSubTab,
    // Getters
    currentConversation,
    sortedConversations,
    // Actions
    initialize,
    login,
    logout,
    loadConversations,
    loadFriends,
    loadGroups,
    loadFriendRequests,
    loadGroupNotices,
    loadMessages,
    sendTextMessage,
    selectConversation,
    selectFriend,
    selectGroup,
    switchMainTab,
    switchContactSubTab,
    acceptFriendApplication,
    rejectFriendApplication
  }
})
