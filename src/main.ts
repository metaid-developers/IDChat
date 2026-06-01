import { createApp } from 'vue'
import App from './App.vue'
import 'normalize.css/normalize.css'
import 'element-plus/lib/components/loading/style/index'
import 'element-plus/lib/components/message/style/index'
import 'element-plus/lib/components/message-box/style/index'
import 'element-plus/lib/components/overlay/style/index'
import 'element-plus/lib/components/drawer/style/index'
import 'element-plus/lib/components/switch/style/index'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './index.scss'

import { router } from '@/router'
import * as filters from '@/utils/filters'
import i18n from '@/utils/i18n'
import { ElLoading } from 'element-plus'
import UserAvatar from '@/components/UserAvatar/UserAvatar.vue'
import './utils/permission' // 路由控制
import Image from '@/components/Image/Image.vue'
import UserName from '@/components/UserName/UserName.vue'
import Icon from '@/components/Icon/Icon.vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query' // TanStack Query
import { createHead } from '@vueuse/head'
//import { StartSentry } from './utils/sentry'

import { loadRuntimeConfig } from './config/runtime-config'
import './utils/axios-perf'
// import VConsole from 'vconsole'
// if (import.meta.env.MODE !== 'prod') {
//   const vConsole = new VConsole()
// }

function mountApp() {
  const app = createApp(App)
  const head = createHead()
  const pinia = createPinia()

  // @ts-ignore
  app.config.globalProperties.$filters = {
    ...filters,
  }

  app.component('UserAvatar', UserAvatar)
  app.component('Image', Image)
  app.component('UserName', UserName)
  app.component('Icon', Icon)

  app
    .use(pinia)
    .use(router)
    .use(ElLoading)
    .use(i18n)
    .use(VueQueryPlugin)
    .use(head)
    .mount('#app')
}

async function bootstrap() {
  try {
    await loadRuntimeConfig()
    console.log('App config loaded successfully')
  } catch (error) {
    console.error('Failed to bootstrap app:', error)
  }

  mountApp()
}

bootstrap()
