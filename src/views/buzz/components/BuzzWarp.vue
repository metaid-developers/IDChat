<template>
  <header class="flex flex-align-center" v-if="!isHideHeader">
    <div class="flex1">
      <!-- <PhoneMenuBtnVue>
        <div class="buzz-menu flex flex-align-center">
          <router-link
            :to="item.path"
            class="buzz-menu-item flex flex-align-center"
            v-for="(item, index) in menus"
            :key="index"
          >
            <span
              class="icon-warp flex flex-align-center flex-pack-center main-border small still !rounded-lg"
            >
              <Icon :name="item.icon" />
            </span>
            <span class="name">{{ item.name }}</span>
          </router-link>
        </div>
      </PhoneMenuBtnVue> -->
    </div>
    <LoginedUserOperateVue />
  </header>
 
  

  <div class="buzz-warp" ref="BuuzWarpRef" id="buzz-warp">
    <div class="buzz-container" id="buzz-container" ref="BuzzContainerRef">
      <div class="mt-20 flex text-center  items-center justify-center flex-col">
        <div class="text-3xl break-all font-black">MetaSo Chat</div>
        <div class="text-lg text-zinc-500 mt-3 break-all">{{ $t('chat.home.tip1') }}</div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">{{$t('chat.home.tip2')}}</div>
      </div>
      <!-- <slot></slot> -->
    </div>

    <!--   -->
    <!-- <div class="fast-btn" ref="FastBtnRef">
      <a class="top" @click="scrollTop">
        <Icon name="buzz_icon_top" />
      </a>
      <a class="main-border primary" @click="toPublish">
        <Icon name="buzz_icon_post" />
      </a>
    </div> -->
    <!--   -->
  </div>

  <!-- publish -->
  <PublishVue
    v-model="isShowBuzzPublish"
    :topic="publishTopic"
    v-model:repost-tx-id="publishRepostTxId"
    @success="onPublishSuccess"
  />
</template>

<script setup lang="ts">
import {
  KeepAlive,
  onBeforeUnmount,
  onMounted,
  ref,
  Transition,
  watch,
  provide,
  onUnmounted,
  reactive,
} from 'vue'

import Header from './components/Header/Header.vue'
import Footer from './components/Footer/Footer.vue'
import CollapseItem from '@/components/Collapse/collapse-item.vue'
import sideLeftBottom from '@/components/Side/side-left-bottom.vue'
// const isDark = useDark()
import { useRootStore } from '@/stores/root'
import { useUserStore } from '@/stores/user'
import LoginedUserOperateVue from '@/components/LoginedUserOperate/LoginedUserOperate.vue'
import { useI18n } from 'vue-i18n'
import { useLayoutStore } from '@/stores/layout'
import PublishVue from '@/views/buzz/components/Publish.vue'
import PhoneMenuBtnVue from '@/components/PhoneMenuBtn/PhoneMenuBtn.vue'
import { useRouter } from 'vue-router'
import { checkUserLogin } from '@/utils/util'

interface Props {
  isHideHeader?: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const router = useRouter()
const rootStore = useRootStore()
const userStore = useUserStore()
const layout = useLayoutStore()
const i18n = useI18n()
const isShowBuzzPublish = ref(false)
const publishTopic = ref('')
const publishRepostTxId = ref('')
const publiseSuccessCallBack = ref(() => {
  router.push({
    name: 'buzz',
  })
})

const menus = [
  {
    name: i18n.t('Buzz.Timeline'),
    icon: 'feed',
    path: '/buzz/index',
  },
  {
    name: i18n.t('Buzz.Recommend'),
    icon: 'star',
    path: '/recommend',
  },
]

const BuzzContainerRef = ref()
const FastBtnRef = ref()
const BuuzWarpRef = ref()
let resizeObserver: ResizeObserver

function setPosition() {
  if (window.innerWidth > 1368) {
    FastBtnRef.value.style.left =
      BuzzContainerRef.value.getBoundingClientRect().left +
      BuzzContainerRef.value.clientWidth +
      12 +
      'px'
    FastBtnRef.value.style.marginRight = 0
  } else {
    FastBtnRef.value.style.right = '5%'
    FastBtnRef.value.style.marginRight = 0
  }
}

function scrollTop() {
  window.document.documentElement.scrollTop = 0
}

async function toPublish() {
  await checkUserLogin()
  isShowBuzzPublish.value = true
}

onMounted(() => {
  // setPosition()

  // resizeObserver = new ResizeObserver(entries => {
  //   setPosition()
  // })


  // resizeObserver.observe(document.getElementById('buzz-warp')!)
})

function onPublishSuccess() {
  publiseSuccessCallBack.value()
}

onBeforeUnmount(() => {
  //resizeObserver.unobserve(document.getElementById('buzz-warp')!)
})

provide('isShowBuzzPublish', isShowBuzzPublish)
provide('topic', publishTopic)
provide('repostTxId', publishRepostTxId)
provide('publiseSuccessCallBack', publiseSuccessCallBack)
defineExpose({
  publishTopic: publishTopic,
  publiseSuccessCallBack: publiseSuccessCallBack,
})
</script>

<style lang="scss" scoped src="./BuzzWarp.scss"></style>
