<template>
  <!-- <div class="version-warp hidden lg:block">
    <VersionVue />
  </div> -->
  <!-- <a
    @click="toMetaName"
    class="outsideMore flex flex-align-center flex-pack-center user-warp-item"
    v-if="!userStore.isAuthorized"
  >
    <img class="metanameLogo" :src="MetaNameLogo" alt="" />
  </a> -->

    <template  v-if="!connectionStore.connected">
    <a
      class="main-border primary connect-wallet"
      @click="openConnectionModal"
      >{{ $t('Login.connectWallet') }}</a
    >
  </template>


   <template v-else-if="!credentialsStore.get">
    <a
      class="main-border primary connect-wallet"
      @click="credentialsStore.login()"
      >{{ $t('Login.authorize') }}</a
    >
  </template>

  <template v-else>
    <div class="user-warp flex flex-align-center">
      <template v-if="!isMobile">
        <!-- MetaName -->
        <!-- <a
          @click="toMetaName"
          class="outsideMore flex flex-align-center flex-pack-center user-warp-item"
        >
          <img class="metanameLogo" :src="MetaNameLogo" alt="" />
        </a> -->

          <!-- MintCollect -->
          <!-- <el-tooltip
        class="box-item"
        effect="dark"
        content="Mint Collection"
        placement="bottom"
        v-if="isNftPage"
      >
          <a
          @click="toMintNft"
          class="outsideMore flex flex-align-center flex-pack-center user-warp-item"
        >
          <span class="new-tag">New</span>
          <img class="MintLogo" :src="MintLogo" alt="" />
        </a>
      </el-tooltip> -->
        <!-- 🔍 搜索 -->
        <!-- <a
          class="flex flex-align-center flex-pack-center user-warp-item"
          @click="layout.$patch({ isShowSearchModal: true })"
          v-if="userStore.isAuthorized"
        >
          <Icon name="search" />
        </a> -->
      </template>

      <!-- 💰 钱包 -->
      <!-- <a
        class="flex flex-align-center flex-pack-center user-warp-item"
        @click="layout.$patch({ isShowWallet: true })"
      >
        <Icon name="wallet_fill" />
      </a> -->

      <!-- 👤 头像 -->
         <UserAvatar
            :image="userStore.last!.avatar"
            :meta-id="userStore.last!.metaid"
            :name="userStore.last.name"
            class="user-warp-item overflow-hidden"
            :meta-name="''"
            :disabled="true"
          />
      <!-- <el-popover placement="bottom" :width="'auto'" trigger="hover">
        <template #reference>
          <UserAvatar
            :image="userStore.user!.avatarImage"
            :meta-id="userStore.user!.metaId"
            :name="userStore.user!.name"
            class="user-warp-item overflow-hidden"
            :meta-name="userStore.user!.metaName"
            :disabled="true"
          />
        </template>
        <UserCardVue
          :name="userStore.user!.name"
          :meta-id="userStore.user!.metaId"
          :meta-name="userStore.user!.metaName"
          :model-value="true"
        /> 
    
      </el-popover> -->
    </div>
  </template>

  



  <!-- 更多操作 -->
  <ElDropdown trigger="click" @visible-change="val => (isShowUserMenu = val)">
    <a
      class="more flex flex-align-center flex-pack-center user-warp-item"
      :class="{ active: isShowUserMenu }"
    >
      <Icon :name="isShowUserMenu ? 'x_mark' : 'more'" />
    </a>
    <template #dropdown>
      <ElDropdownMenu>
        <!-- <template v-if="isMobile">
          <ElDropdownItem @click="layout.$patch({ isShowSearchModal: true })">
            <div class="flex flex-align-center user-operate-item">
              <Icon name="search" />
              <span class="name">{{ $t('UserOperate.search') }}</span>
            </div>
          </ElDropdownItem>
        </template> -->

        <ElDropdownItem v-for="(item, index) in userOperates" :key="index" @click="item.func()">
          <div class="flex flex-align-center user-operate-item">
            <Icon :name="item.icon" />
            <span class="name">{{ item.name }}</span>
            <!-- <span class="isnew" v-if="item.isNew">New</span> -->
          </div>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>

  <Teleport to="body">
    <SettingsModalVue v-model="layout.isShowSettingsModal" />
  </Teleport>

  <!-- wallet -->
  <MyWalletVue v-model="layout.isShowWallet" />
</template>

<script setup lang="ts">
import { useRootStore, isMobile } from '@/stores/root'
import { useUserStore } from '@/stores/user'
import { ElDropdown } from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsModalVue from '@/components/Settings/SettingsModal.vue'
import { useLayoutStore } from '@/stores/layout'
import { useRoute,useRouter } from 'vue-router'
import MyWalletVue from './MyWallet.vue'
import VersionVue from '../Version/Version.vue'
import UserPersonaVue from '../UserPersona/UserPersona.vue'
import UserCardVue from '../UserCard/UserCard.vue'

import MetaNameLogo from '@/assets/svg/meta_name.svg?url'
import MintLogo from '@/assets/svg/mint.svg?url'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useConnectionStore } from '@/stores/connection'
import { useCredentialsStore } from '@/stores/credentials'
const { openConnectionModal } =
  useConnectionModal()

const connectionStore = useConnectionStore()
const credentialsStore = useCredentialsStore()

const i18n = useI18n()
const rootStore = useRootStore()
const userStore = useUserStore()
const layout = useLayoutStore()
const route = useRoute()
const router = useRouter()
const isProduction = import.meta.env.MODE === 'mainnet'

const isShowUserMenu = ref(false)
const userOperates = computed(() => {
  const result = [
    {
      name: i18n.t('UserOperate.settings'),
      icon: 'setting',
      func: () => {
        layout.isShowSettingsModal = true
      },
    },
    // {
    //   name: i18n.t('UserOperate.aboutShow'),
    //   icon: 'show',
    //   func: () => {
    //     window.open('https://show3.gitbook.io/show3.0/v/english/', '_blank')
    //   },
    // },
    // {
    //   name: i18n.t('UserOperate.About MetaSo'),
    //   icon: 'meta_so',
    //   func: () => {
    //     window.open('https://www.metaso.network/', '_blank')
    //   },
    // },
    // {
    //   name: 'Mint Collection',
    //   icon: 'mint',
    //   func: toMintNft,
    //   isNew:true
    // },
    // {
    //   name: 'MetaName',
    //   icon: 'meta_name',
    //   func: toMetaName,
    // },
    // {
    //   name: i18n.t('UserOperate.help'),
    //   icon: 'question_circle',
    //   func: () => {
    //     router.push(
    //       `/talk/channels/74462f14a033849bf6067de63ad3d6c54edfa48ec1f2759e8ed8c6165b3f58b2/0dcdbc9d4eba293f8adce8a9b5d82370b66b80f0d53e2ed85a695fcda832c957`
    //     )
    //   },
    // },
  ]
  if (userStore.isAuthorized || connectionStore.connected) {
    result.push({
      name: i18n.t('UserOperate.logout'),
      icon: 'logout',
      func: async() => {
       await connectionStore.disconnect(router)
      },
    })
  }

  return result
})

const isNftPage=computed(()=>{
 return route.path.indexOf("/nft") > -1
})

const toMetaName = () => {
  const routerUrl = router.resolve({
    path: '/metaname',
  })
  window.open(routerUrl.href, '_blank')
}

// function toMintNft(){
//   if(userStore.metaletLogin){
//     return ElMessage.error(`${i18n.t('nosupportmetaletissue')}`)
//   }
//   router.push('/nft/issue')
// }
</script>

<style lang="scss" scoped src="./LoginedUserOperate.scss"></style>
