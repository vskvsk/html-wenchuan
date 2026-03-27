import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useIMStore } from '@/stores/im'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 初始化 OpenIM SDK
const imStore = useIMStore()
imStore.initialize()

app.mount('#app')
