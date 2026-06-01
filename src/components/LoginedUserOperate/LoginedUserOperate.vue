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

  <template v-if="!connectionStore.connected && !isAndroid && !isIOS && !rootStore.isWebView">
    <a class="main-border primary connect-wallet" @click="openConnectionModal">{{
      $t('Login.connectWallet')
    }}</a>
  </template>

  <template v-else-if="!credentialsStore.get && !isAndroid && !isIOS && !rootStore.isWebView">
    <a class="main-border primary connect-wallet" @click="credentialsStore.login()">{{
      $t('Login.authorize')
    }}</a>
  </template>

  <template v-else>
    <div class="user-warp flex flex-align-center" v-if="userStore.isAuthorized">
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
  <ElDropdown ref="dropdownRef" trigger="click" @visible-change="handleVisibleChange">
    <a
      class="more flex flex-align-center flex-pack-center user-warp-item"
      :class="{ active: isShowUserMenu }"
    >
      <Icon :name="isShowUserMenu ? 'x_mark' : 'more'" />
    </a>
    <template #dropdown>
      <ElDropdownMenu>
        <!-- Fee Settings Item -->

        <div
          class="fee-select flex align-center  rounded-full bg-[#f5f7fa] px-3 py-1 dark:bg-[#2d3748]"
          @click.stop="handleFeeClick"
        >
          <img
            v-if="chainStore.state.currentChain !== 'doge'"
            :src="currentChainIcon"
            :alt="chainStore.state.currentChain.toUpperCase()"
            class="chain-icon-menu w-[24px] h-[24px]"
          />
          <Icon v-else name="doge" class="chain-icon-menu w-[24px] h-[24px]" />
          <div class="fee-info">
            <span class="fee-rate-menu">{{ currentFeeRate }}</span>
            <span class="fee-unit-menu">{{ feeUnit }}</span>
          </div>
          <el-icon><CaretRight class="arrow-icon-menu"/></el-icon>
        </div>

        <template v-if="isMobile">
          <ElDropdownItem @click="layout.$patch({ isShowSearchModal: true })">
            <div class="flex flex-align-center user-operate-item">
              <Icon name="search" />
              <span class="name">{{ $t('UserOperate.search') }}</span>
            </div>
          </ElDropdownItem>
        </template>

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

  <Teleport v-if="layout.isShowSettingsModal" to="body">
    <SettingsModalVue v-model="layout.isShowSettingsModal" />
  </Teleport>

  <!-- Fee Modal -->
  <Teleport v-if="showFeeModal" to="body">
    <FeeModal v-model="showFeeModal" @confirm="handleFeeConfirm" />
  </Teleport>

  <!-- wallet -->
  <MyWalletVue v-if="layout.isShowWallet" v-model="layout.isShowWallet" />

  <!-- Profile Edit Modal -->
  <Teleport v-if="layout.isShowProfileEditModal" to="body">
    <ProfileEditModal v-model="layout.isShowProfileEditModal" />
  </Teleport>
</template>

<script setup lang="ts">
import { isMobile, useRootStore } from '@/stores/root'
import { useUserStore } from '@/stores/user'
import { useChainStore } from '@/stores/chain'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { ElDropdown, ElMessageBox, ElMessage } from 'element-plus'
import { computed, defineAsyncComponent, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLayoutStore } from '@/stores/layout'
import { useRouter } from 'vue-router'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useConnectionStore } from '@/stores/connection'
import { useCredentialsStore } from '@/stores/credentials'

import btcIcon from '@/assets/images/btc.png'
import mvcIcon from '@/assets/images/mvc.png'
import { CaretRight } from '@element-plus/icons-vue'
import { isAndroid, isIOS } from '@/stores/root'

const SettingsModalVue = defineAsyncComponent(() => import('@/components/Settings/SettingsModal.vue'))
const FeeModal = defineAsyncComponent(() => import('@/components/FeeModal/FeeModal.vue'))
const MyWalletVue = defineAsyncComponent(() => import('./MyWallet.vue'))
const ProfileEditModal = defineAsyncComponent(() => import('@/components/ProfileEditModal/ProfileEditModal.vue'))

const { openConnectionModal } = useConnectionModal()

const connectionStore = useConnectionStore()
const credentialsStore = useCredentialsStore()
const rootStore = useRootStore()
const i18n = useI18n()
const userStore = useUserStore()
const chainStore = useChainStore()
const simpleTalkStore = useSimpleTalkStore()
const layout = useLayoutStore()
const router = useRouter()

const isShowUserMenu = ref(false)
const showFeeModal = ref(false)
const dropdownRef = ref<InstanceType<typeof ElDropdown> | null>(null)

// Fee badge computed properties
const currentChainIcon = computed(() => {
  if (chainStore.state.currentChain === 'btc') return btcIcon
  return mvcIcon
})

const currentFeeRate = computed(() => {
  const currentChain = chainStore.state.currentChain
  const chainData = chainStore.state[currentChain]
  const selectedFeeType = chainData.selectedFeeType
  const rawFee = chainData[selectedFeeType]
  // DOGE: 将 sats/kB 转换为 DOGE/KB (1 DOGE = 100,000,000 sats)
  if (currentChain === 'doge') {
    return (rawFee / 100000000).toFixed(4)
  }
  return rawFee
})

const feeUnit = computed(() => {
  const chain = chainStore.state.currentChain
  if (chain === 'btc') return 'sat/vB'
  if (chain === 'doge') return 'DOGE/KB'
  return 'sats/b'
})

// Handle fee confirmation
const handleFeeConfirm = (data: {
  chain: 'btc' | 'mvc' | 'doge'
  feeType: string
  customFee?: number
}) => {
  console.log('Fee configuration updated:', data)
}

const handleVisibleChange = (val: boolean) => {
  isShowUserMenu.value = val
}

const handleFeeClick = (event?: Event) => {
  console.log('Fee item clicked!')
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  // 先关闭下拉菜单
  dropdownRef.value?.handleClose()
  console.log('Current showFeeModal:', showFeeModal.value)
  // 使用 nextTick 确保下拉菜单关闭后再显示模态框
  nextTick(() => {
    showFeeModal.value = true
    console.log('Updated showFeeModal:', showFeeModal.value)
  })
}
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
      name: i18n.t('UserOperate.editProfile'),
      icon: 'user_bars',
      func: async () => {
        layout.isShowProfileEditModal = true
      },
    })

    result.push({
      name: i18n.t('UserOperate.clearCache'),
      icon: 'trash',
      func: async () => {
        try {
          await ElMessageBox.confirm(
            i18n.t('UserOperate.clearCacheConfirm'),
            i18n.t('UserOperate.clearCache'),
            {
              confirmButtonText: i18n.t('Confirm'),
              cancelButtonText: i18n.t('Cancel'),
              type: 'warning',
              customClass: 'clear-cache-confirm-dialog',
            }
          )
          // 清除数据库数据
          if (simpleTalkStore.db) {
            await simpleTalkStore.db.clearAllData()
          }
          // 重置内存状态
          await simpleTalkStore.reset()
          // 重新初始化
          await simpleTalkStore.init()
          ElMessage.success(i18n.t('UserOperate.clearCacheSuccess'))
        } catch (error) {
          // 用户取消操作，不做任何处理
          if (error !== 'cancel') {
            console.error('清除缓存失败:', error)
          }
        }
      },
    })

    if (!rootStore.isWebView) {
      result.push({
        name: i18n.t('UserOperate.logout'),
        icon: 'logout',
        func: async () => {
          await connectionStore.disconnect(router)
        },
      })
    }
  }

  return result
})

// function toMintNft(){
//   if(userStore.metaletLogin){
//     return ElMessage.error(`${i18n.t('nosupportmetaletissue')}`)
//   }
//   router.push('/nft/issue')
// }
</script>

<style lang="scss" scoped src="./LoginedUserOperate.scss"></style>
