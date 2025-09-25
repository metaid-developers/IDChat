<template>
  <!-- 连接钱包 -->
  <ElDialog
    :model-value="isConnectionModalOpen"
    :close-on-click-modal="false"
    :show-close="!loading"
    class="none-header"
    :width="400"
    @close="closeConnectionModal"
  >
    <div class="login-warp flex">
      <a class="close flex flex-align-center flex-pack-center" @click="closeConnectionModal">
        <Icon name="x_mark" />
      </a>

      <!-- <div class="flex1 login-cover">
        <img src="@/assets/images/login_img.png" />
      </div> -->
      <div class="flex1">
        <!-- 选择钱包 -->
        <!--v-if="status === ConnectWalletStatus.Watting"-->
        <div class="connect-wallet flex  flex-v">
          <div
            class="connect-wallet-section  justify-center "
            v-for="(item, index) in wallets"
            :key="index"
          >
            <div class="title ">{{ item.title() }}</div>
            <div class="btn-list  flex  flex-v">
              <div
                class="main-border flex flex-align-center"
                @click="wallet.fun()"
                v-for="(wallet, walletIndex) in item.list"
                :key="walletIndex"
              >
                <img class="icon" :src="wallet.icon" />
                {{ wallet.name() }}
                <span class="desc">{{ wallet.desc() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 使用MetaId钱包 -->
        <!-- <MetaIdWalletVue
          ref="MetaidWalletRef"
          v-model:type="type"
          v-model:loading="loading"
          v-else-if="status === ConnectWalletStatus.UseMetaId"
          @back="status = ConnectWalletStatus.Watting"
          @success="OnMetaIdSuccess"
        /> -->

        <!--使用助记词登录-->
        <!-- <MnemonicVue
          ref="MnemonicRef"
          v-model:type="type"
          v-model:loading="loading"
          v-else-if="status === ConnectWalletStatus.Mnemonic"
          @back="status = ConnectWalletStatus.Watting"
          @success="OnMetaIdSuccess"
        ></MnemonicVue> -->
      </div>
    </div>
  </ElDialog>

  <!-- MetaMask -->
  <!-- <MetaMask
    v-model="rootStore.isShowMetaMak"
    ref="MetaMaskRef"
    id="metamask"
    @success="onThreePartLinkSuccess"
  /> -->

  <!-- setBaseInfo -->
  <SetBaseInfoVue
    v-model="isShowSetBaseInfo"
    :loading="loading"
    @success="onSetBaseInfoSuccessType"
    ref="setBaseInfoRef"
  />

  <!-- send buzz -->
  <!-- <ElDialog v-model="isShowSendBuzz" :show-close="false" :close-on-click-modal="false">
    <div
      class="send-first-buzz"
      v-loading="isSendBuzzLoading"
      :element-loading-svg="LoadingTEXT"
      :element-loading-text="$t('Loading')"
    >
      <div class="title">{{ $t('sendFirstBuzz1') }}</div>
      <div class="drsc">{{ $t('sendFirstBuzz2') }}</div>
      <div class="image">
        <img :src="FirstBuzzImg" />
      </div>
      <div class="input">
        <input type="text" v-model="buzz" :placeholder="$t('firstBuzzText')" />
        <div class="tips">
          {{ $t('sendFirstBuzz3') }}
        </div>
      </div>
      <div class="operate">
        <ElButton type="primary" @click="sendBuzz">{{ $t('Send') }}</ElButton>
      </div>
    </div>
  </ElDialog> -->

  <!-- <ElDialog v-model="isShowSendBuzzSuccess" class="reactive" :show-close="false">
    <div class="send-buzz-success">
      <img class="top-image" src="@/assets/images/buzz_success.png" />
      <div class="title">{{ $t('sendBuzzSuccessTitle') }}</div>
      <div class="cont">
        <div class="cont-warp">
          <div class="cont-item flex flex-align-center">
            <span class="key">TXID:</span>
            <span class="value"
              ><a @click="toMvcScan(buzzResult.txId)"
                >{{ buzzResult.txId.slice(0, 6) }}...{{ buzzResult.txId.slice(-6) }}</a
              ></span
            >
          </div>
          <div class="cont-item flex flex-align-center">
            <span class="key">{{ $t('Time') }}:</span>
            <span class="value">{{ $filters.dateTimeFormat(buzzResult.time) }}</span>
          </div>
        </div>
      </div>

      <div class="operate">
        <ElButton type="primary" size="large" @click="toBuzz">{{ $t('To Showbuzz') }}</ElButton>
      </div>
    </div>
  </ElDialog> -->

  <!-- 助记词备份 -->
  <!-- <BackupMnemonicVue v-model="isSHowBackupMnemonic" @finish="onModalClose" /> -->

  <!-- 绑定metaId -->
  <!-- <BindMetaIdVue
    :thirdPartyWallet="thirdPartyWallet"
    ref="BindMetaIdRef"
    v-model="isShowBindModal"
    @register="isShowSetBaseInfo = true"
    @finish="onModalClose"
  /> -->
</template>

<script setup lang="ts">
// import IconMetaMask from '@/assets/images/login_logo_matamask.png'
// import IconWallteConnect from '@/assets/images/login_logo_wallteconnect.png'
// import IconAdd from '@/assets/images/wallte_icon_add.png'
// import IconLine from '@/assets/images/wallte_icon_line.png'
// import Iconmnemonic from '@/assets/images/mnemonic.svg?url'
// import MetaMask, { MetaMaskLoginRes } from '@/plugins/MetaMak.vue'
import { useRootStore } from '@/stores/root'
import { useUserStore } from '@/stores/user'
// import { SDK } from '@/utils/sdk'
import { MetaletSDK } from '@/utils/metalet-sdk'
import FirstBuzzImg from '@/assets/images/first_buzz.svg?url'
import { sleep } from '@/utils/util'
import MetaIdWalletVue, { MetaIdWalletRegisterBaseInfo } from './MetaIdWallet.vue'
// import MnemonicVue from './MnemonicLogin.vue'
import SetBaseInfoVue from './SetBaseInfo.vue'
// import BackupMnemonicVue from './BackupMnemonic.vue'
// import BindMetaIdVue from './BindMetaId.vue'
import { reactive, Ref, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BindStatus, NodeName, WalletOrigin } from '@/enum'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'

import { router } from '@/router'
import { useRoute } from 'vue-router'
import { GetUserAllInfo, GetUserFollow } from '@/api/aggregation'
import { debug } from 'console'
import { LoginByEthAddress, SetUserInfo } from '@/api/core'
import { decode, encode } from 'js-base64'
import WalletConnect from '@walletconnect/client'
import QRCodeModal from '@walletconnect/qrcode-modal'
import { ethers } from 'ethers'
import { RegisterSource } from '@/enum'
import { MD5 } from 'crypto-js'
import { LoadingTEXT } from '@/utils/LoadingSVGText'
import mvc from 'mvc-lib'
import { currentSupportChain } from '@/config'
import AllNodeName from '@/utils/AllNodeName'
import { computeStyles } from '@popperjs/core'
import { setUser } from '@sentry/vue'
import SPACEIcon from '@/assets/images/metalet-logo-v3.svg?url'
import { encodingType, MetaletWallet, TransactionInfo } from '@/utils/wallet/Metalet-wallet'
import { isAndroid, isIOS, isIosApp, isWechat } from '@/stores/root'
import { type Network, useNetworkStore } from '@/stores/network'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useCredentialsStore } from '@/stores/credentials'
import { useConnectionStore } from '@/stores/connection'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import {
  getChannels,
  getAllChannels
} from '@/api/talk'
import { useApprovedStore } from '@/stores/approved'
import { useLayoutStore } from '@/stores/layout'
import { useSimpleTalkStore } from '@/stores/simple-talk'


const rootStore = useRootStore()

const networkStore = useNetworkStore()
const credentialsStore = useCredentialsStore()
const connectionStore = useConnectionStore()
const approvedStore=useApprovedStore()
const { isConnectionModalOpen, closeConnectionModal, setMissingWallet } =
  useConnectionModal()
const layout=useLayoutStore()

const userStore = useUserStore()
const route = useRoute()
const i18n = useI18n()
const emit = defineEmits(['metamask'])
const MetaMaskRef = ref()
const loading = ref(false)
const isShowLoginAndRegister = ref(false)
const type: Ref<'login' | 'register'> = ref('login')
const isShowSendBuzz = ref(false)
const buzz = ref('')
const isSendBuzzLoading = ref(false)
const isShowSendBuzzSuccess = ref(false)
const buzzResult = reactive({
  time: '',
  txId: '',
})
const setBaseInfoRef = ref()
const MetaidWalletRef = ref()
const MnemonicRef = ref()
const simpleChatStore=useSimpleTalkStore()
const enum ConnectWalletStatus {
  Watting,
  WallteConnect,
  UseMetaId,
  Mnemonic,
}

const status: Ref<ConnectWalletStatus> = ref(ConnectWalletStatus.Watting)

// useQuery({
//   queryKey: ['address', { network: networkStore.network }],
//   queryFn: async () =>
//     credentialsStore
//       .login()
//       .then((credential) => (credential ? credential.address : null)),
//   retry: 0,
//   enabled: computed(() => connectionStore.connected),
// })


const BindMetaIdRef = ref()
const thirdPartyWallet = reactive({
  signAddressHash: '',
  address: '',
  chainId: '',
})
const isShowBindModal = ref(false)
const metaIdWalletRegisterBaseInfo: { val: undefined | MetaIdWalletRegisterBaseInfo } = reactive({
  val: undefined,
})
const isSHowBackupMnemonic = ref(false)
const isMobile = computed(() => {
  return isAndroid || isIOS || isWechat
})
const wallets = [
  {
    title: () => {
      return i18n.t('Login.connectWallet')
    },
    list: [
      {
        name: () => {
          return 'Metalet'
        },
        desc: () => {
          return ``
        },
        icon: SPACEIcon,
        fun: connectMetalet,
      },
      // {
      //   name: () => {
      //     return 'MetaMask'
      //   },
      //   desc: () => {
      //     return ``
      //   },
      //   icon: IconMetaMask,
      //   fun: () => {
      //     rootStore.$patch({ isShowLogin: false, isShowMetaMak: true })
      //   },
      // },
      // {
      //   name: () => {
      //     return 'WalletConnect'
      //   },
      //   desc: () => {
      //     return ``
      //   },
      //   icon: IconWallteConnect,
      //   fun: connectWalletConnect,
      // },
    ],
  },
  // {
  //   title: () => {
  //     return i18n.t('Login.connectMetaIdWallet')
  //   },
  //   list: [
  //     {
  //       name: () => {
  //         return i18n.t('Login.connectMetaIdWallet')
  //       },
  //       desc: () => {
  //         return ''
  //       },
  //       icon: IconLine,
  //       fun: () => {
  //         type.value = 'login'
  //         // rootStore.$patch({ isShowLogin: false })
  //         // isShowLoginAndRegister.value = true
  //         status.value = ConnectWalletStatus.UseMetaId
  //       },
  //     },
  //   ],
  // },
  // {
  //   title: () => {
  //     return `${i18n.t('Login.mnemonic')} (MVC)`
  //   },
  //   list: [
  //     {
  //       name: () => {
  //         return i18n.t('Login.Mnemonic')
  //       },
  //       desc: () => {
  //         return ''
  //       },
  //       icon: Iconmnemonic,
  //       fun: () => {
  //         type.value = 'login'
  //         status.value = ConnectWalletStatus.Mnemonic
  //       },
  //     },
  //   ],
  // },
  // {
  //   title: () => {
  //     return i18n.t('Login.No wallet')
  //   },
  //   list: [
  //     {
  //       name: () => {
  //         return i18n.t('Login.createWallet')
  //       },
  //       desc: () => {
  //         return ''
  //       },
  //       icon: IconAdd,
  //       fun: () => {
  //         type.value = 'register'
  //         status.value = ConnectWalletStatus.UseMetaId
  //       },
  //     },
  //   ],
  // },
]

// setbaseinfo
const isShowSetBaseInfo = ref(false)

// async function metaMaskLoginSuccess(res: MetaMaskLoginRes) {
//   const response = await GetUserAllInfo(res.userInfo.metaId).catch(error => {
//     ElMessage.error(error.message)
//   })
//   if (response?.code === 0) {
//     // @ts-ignore
//     await userStore.updateUserInfo({
//       ...response.data,
//       ...res.userInfo,
//       password: res.password,
//       userType: 'email',
//     })
//     userStore.$patch({ wallet: new SDK(import.meta.env.VITE_NET_WORK) })
//     userStore.showWallet.initWallet()
//     if (res.type === 'register') {
//       isShowSendBuzz.value = true
//     }
//   }
// }

function register() {
  rootStore.$patch({ isShowLogin: false })
  type.value = 'register'
  isShowLoginAndRegister.value = true
}

// async function sendBuzz() {
//   isSendBuzzLoading.value = true
//   const res = await userStore.showWallet
//     .createBrfcChildNode({
//       nodeName: NodeName.SimpleMicroblog,
//       data: JSON.stringify({
//         content: buzz.value || i18n.t('firstBuzzText'),
//         contentType: 'text/plain',
//         quoteTx: '',
//         attachments: [],
//         mention: [],
//       }),
//     })
//     .catch(error => {
//       ElMessage.error(error.message)
//       isSendBuzzLoading.value = false
//     })
//   if (res) {
//     buzzResult.time = new Date()
//     buzzResult.txId = res.txId
//     isShowSendBuzz.value = false
//     isShowSendBuzzSuccess.value = true
//   }
// }

// function toBuzz() {
//   isShowSendBuzzSuccess.value = false
//   router.push({ name: 'buzz' })
// }

function onLoginAndRegisterSuccess(type: 'register' | 'login') {
  if (type === 'register') {
    isShowSendBuzz.value = true
  }
}

// async function connectMetaLet() {
//   return ElMessage.info(i18n.t('Comming Soon'))
//   if (typeof (window as any).Metalet === 'undefined') {
//     return ElMessage.error(i18n.t('Not install MetaLet Wallet'))
//   }
//   // const result = await (window as any).metalet.getAccount()
//   // console.log(result)
//   // const metaId = result.userMetaIdInfo.metaId
//   // const res = await GetUserAllInfo(metaId)
//   // const hDPrivateKey = new mvc.HDPrivateKey(result.xprv)
//   // const phone = eciesDecryptData(
//   //   res.data.phone,
//   //   hDPrivateKey.deriveChild(0).deriveChild(4).privateKey
//   // )
// }

// async function onThreePartLinkSuccess(params: {
//   signAddressHash: string
//   address: string
//   walletOrigin?: string
// }) {
//   //检查hash是否已绑定

//   const getMnemonicRes = await LoginByEthAddress({
//     evmAddress: params.address,
//     chainId: window.ethereum?.chainId,
//   }).catch(error => {
//     if (error.code === -1) {
//       // 还没绑定
//       thirdPartyWallet.signAddressHash = params.signAddressHash
//       thirdPartyWallet.address = params.address
//       thirdPartyWallet.chainId = window.ethereum?.chainId
//       BindMetaIdRef.value.status = BindStatus.ChooseType
//       rootStore.$patch({ isShowMetaMak: false })
//       isShowBindModal.value = true
//     } else {
//       throw new Error(error.message)
//     }
//   })

//   let res: BindMetaIdRes
//   if (getMnemonicRes?.code === 0) {
//     //这里需要再判断一下用户注册来源，如果是metamask注册的用户要拿metaid来解

//     if (
//       getMnemonicRes?.data?.metaId &&
//       getMnemonicRes?.data?.registerSource === RegisterSource.metamask
//     ) {
//       //这里需要再判断一下用户注册来源，如果是metamask注册的用户要拿metaid来解

//       try {
//         let signHashForMnemonic
//         res = await BindMetaIdRef.value.loginByMnemonic(
//           getMnemonicRes.data.evmEnMnemonic,
//           MD5(params.signAddressHash).toString(),
//           false,
//           getMnemonicRes.data.path
//         )

//         if (res) {
//           await BindMetaIdRef.value.loginSuccess(res)
//           rootStore.$patch({ isShowMetaMak: false })
//           onModalClose()
//         }
//       } catch (error) {
//         if (getMnemonicRes?.data?.registerTime < +Date.now()) {
//           ElMessageBox.confirm(`${i18n.t('allowUpdate')}`, `${i18n.t('updateRemind')}`, {
//             customClass: 'primary',
//             confirmButtonText: `${i18n.t('confirmUpdate')}`,
//             cancelButtonText: i18n.t('Cancel'),
//           }).then(() => {
//             //把准备要升级的hash保存起来
//             rootStore.updateAccountPlan({
//               registerTime: getMnemonicRes?.data?.registerTime,
//               signHash: params.signAddressHash,
//             })
//             if (params.walletOrigin == WalletOrigin.WalletConnect) {
//               connectWalletConnect(true)
//             } else {
//               rootStore.updateShowLoginBindEvmAccount({
//                 isUpdatePlan: true,
//                 loginedButBind: false,
//                 bindEvmChain: '',
//               })
//               MetaMaskRef.value.startConnect()
//             }
//             rootStore.$patch({ isShowMetaMak: false })
//           })
//         } else {
//           rootStore.$patch({ isShowMetaMak: false })
//           return ElMessage.error(`${i18n.t('walletError')}`)
//         }
//       }

//       // return  emit('update:modelValue', false)
//     } else if (
//       getMnemonicRes.data.evmEnMnemonic &&
//       getMnemonicRes?.data?.registerSource == RegisterSource.showmoney
//     ) {
//       // 有密码直接登录， 没有密码就要用户输入
//       const password = localStorage.getItem(encode('password'))
//       if (password) {
//         res = await BindMetaIdRef.value.loginByMnemonic(
//           getMnemonicRes.data.menmonic,
//           decode(password),
//           false,
//           getMnemonicRes.data.path
//         )

//         if (res) {
//           await BindMetaIdRef.value.loginSuccess(res)
//           onModalClose()
//         }
//       } else {
//         try {
//           let signHashForMnemonic
//           res = await BindMetaIdRef.value.loginByMnemonic(
//             getMnemonicRes.data.evmEnMnemonic,
//             MD5(params.signAddressHash).toString(),
//             false,
//             getMnemonicRes.data.path
//           )
//           if (res) {
//             await BindMetaIdRef.value.loginSuccess(res)
//             rootStore.$patch({ isShowMetaMak: false })
//             onModalClose()
//           }
//         } catch (error) {
//           if (getMnemonicRes?.data?.registerTime < +Date.now()) {
//             ElMessageBox.confirm(`${i18n.t('allowUpdate')}`, `${i18n.t('updateRemind')}`, {
//               customClass: 'primary',
//               confirmButtonText: `${i18n.t('confirmUpdate')}`,
//               cancelButtonText: i18n.t('Cancel'),
//             }).then(() => {
//               //把准备要升级的hash保存起来
//               rootStore.updateAccountPlan({
//                 registerTime: getMnemonicRes?.data?.registerTime,
//                 signHash: params.signAddressHash,
//               })
//               if (params.walletOrigin == WalletOrigin.WalletConnect) {
//                 connectWalletConnect(true)
//               } else {
//                 MetaMaskRef.value.startConnect(true)
//               }

//               rootStore.$patch({ isShowMetaMak: false })
//             })
//           } else {
//             rootStore.$patch({ isShowMetaMak: false })
//             return ElMessage.error(`${i18n.t('walletError')}`)
//           }
//         }

//         // return  emit('update:modelValue', false)
//       }

//       // else if (
//       //   getMnemonicRes.data.evmEnMnemonic &&
//       //   getMnemonicRes?.data?.registerSource === RegisterSource.showmoney
//       // ) {
//       //   // 有密码直接登录， 没有密码就要用户输入
//       //   const password = localStorage.getItem(encode('password'))
//       //   if (password) {
//       //     res = await BindMetaIdRef.value.loginByMnemonic(
//       //       getMnemonicRes.data.menmonic,
//       //       decode(password),
//       //       false,
//       //       getMnemonicRes.data.path
//       //     )

//       //     if (res) {
//       //       await BindMetaIdRef.value.loginSuccess(res)
//       //       onModalClose()
//       //     }
//       //   } else {
//       //     try {
//       //       res = await BindMetaIdRef.value.loginByMnemonic(
//       //         getMnemonicRes.data.evmEnMnemonic,
//       //         MD5(params.signAddressHash).toString(),
//       //         false,
//       //         getMnemonicRes.data.path
//       //       )

//       //       if (res) {
//       //         await BindMetaIdRef.value.loginSuccess(res)
//       //         rootStore.$patch({ isShowMetaMak: false })
//       //         onModalClose()
//       //       }
//       //     } catch (error) {
//       //       thirdPartyWallet.signAddressHash = params.signAddressHash
//       //       thirdPartyWallet.address = params.address
//       //       BindMetaIdRef.value.status = BindStatus.InputPassword
//       //       rootStore.$patch({ isShowMetaMak: false })
//       //       isShowBindModal.value = true
//       //     }
//       //   }
//       // }
//     } else if (
//       !getMnemonicRes?.data.metaId &&
//       getMnemonicRes?.data?.registerSource === RegisterSource.metamask
//     ) {
//       rootStore.$patch({ isShowMetaMak: false })

//       // 修复有问题的账号 待完善
//       // await BindMetaIdRef.value
//       //   .createMetaidAccount(thirdPartyWallet.signAddressHash)
//       //   .catch(error => {
//       //     ElMessage.error(error.message)
//       //   })
//       return ElMessage.error(`${i18n.t('MetaidIsNull')}`)
//       // BindMetaIdRef.value.status = BindStatus.ChooseType
//       // rootStore.$patch({ isShowMetaMak: false })
//       // isShowBindModal.value = true
//     }
//   }
// }

async function OnMetaIdSuccess(type: 'register' | 'login') {
  status.value = ConnectWalletStatus.Watting
  rootStore.$patch({ isShowLogin: false })
  if (type === 'register') {
    isShowSetBaseInfo.value = true
  }
}

async function onSetBaseInfoSuccessType(params: { name: string; nft: NFTAvatarItem }) {
  if (userStore.metaletLogin) {
    await onSetBaseInfoSuccessForMetalet(params)
  } else {
    await onSetBaseInfoSuccess(params)
  }
}

async function onSetBaseInfoSuccessForMetalet(params: { name: string; nft: NFTAvatarItem }) {
  loading.value = true
  try {

    const wallet = userStore.showWallet!.wallet

    if (userStore.isAuthorized) {
      let utxos, infoAddress, protocolAddress
      utxos = await wallet?.provider.getAddressUtxos({
        address:wallet.infoAddress,
        xpub:wallet?.xpub,
        addressType:0,
        addressIndex:1,
      })
      if (utxos && !utxos.length) {
        utxos =await wallet?.provider.getAddressUtxos({
        address:wallet.infoAddress,
        xpub:wallet?.xpub,
        addressType:0,
        addressIndex:1,
      })
    }
      infoAddress = wallet!.infoAddress
      protocolAddress =  wallet!.protocolAddress

      const broadcasts: Array<{
        hex: string
        transation: mvc.Transaction
        path: string
        hasMetaId?: boolean
        dataDependsOn?: number
      }> = []

      // 把钱打到 info, protocol 节点
      // const payTo = [
      //   {
      //     amount: 1000,
      //     address: infoAddress,
      //   },
      // ]
      // if (params.nft.avatarImage !== userStore.user!.avatarImage) {
      //
      //   payTo.push({
      //     amount: 2000,
      //     address: protocolAddress,
      //   })
      // }
      // let transfer, utxo
      //  const { tx, path } = await wallet?.makeTx({
      //     utxos: utxos,
      //     opReturn: [],
      //     change: wallet.rootAddress,
      //     payTo,
      //   })
      //
      //   broadcasts.push({
      //     hex: tx.toString(),
      //     transation: tx,
      //     path: path,
      //   })
      //   utxo = await wallet?.utxoFromTx({
      //     tx: tx,
      //     addressInfo: {
      //       addressType: parseInt(wallet.keyPathMap.Info.keyPath.split('/')[0]),
      //       addressIndex: parseInt(wallet.keyPathMap.Info.keyPath.split('/')[1]),
      //     },
      //     outPutIndex: 0,
      //   })

      if (utxos.length) {
        //utxos = [utxo]
        const createNameNode = await wallet!.createNode({
          nodeName: 'name',
          parentTxId: userStore.user!.infoTxId,
          data: params.name ? params.name : `${import.meta.env.VITE_DefaultName}`,
          utxos: utxos,
          change: wallet!.rootAddress,
        })

        const transaction = {
          hex: createNameNode.transaction.toString(),
          transation: createNameNode.transaction,
          path: createNameNode.path,
          // hasMetaId: true,
          // dataDependsOn: 0,
        }
        broadcasts.push(transaction)
      } else {
        throw new Error('Get fee failed')
      }

      // if (params.nft.avatarImage !== userStore.user!.avatarImage) {
      //   // 创建 NFTAvatar brfc 节点
      //   utxo = await wallet?.utxoFromTx({
      //     tx: transfer,
      //     addressInfo: {
      //       addressType: parseInt(wallet.keyPathMap.Protocols.keyPath.split('/')[0]),
      //       addressIndex: parseInt(wallet.keyPathMap.Protocols.keyPath.split('/')[1]),
      //     },
      //     outPutIndex: 1,
      //   })
      //   if (utxo) utxos = [utxo]
      //   const NFTAvatarBrfcNodeBaseInfo = await wallet?.provider.getNewBrfcNodeBaseInfo(
      //     wallet.wallet.xpubkey.toString(),
      //     userStore.user!.infoTxId
      //   )
      //   const createNFTAvatarBrfcNode = await wallet!.createNode({
      //     nodeName: NodeName.NFTAvatar,
      //     parentTxId: userStore.user!.infoTxId,
      //     data: AllNodeName[NodeName.NFTAvatar].brfcId,
      //     utxos: utxos,
      //     change: wallet!.createAddress('0/0').address,
      //     node: NFTAvatarBrfcNodeBaseInfo,
      //   })
      //   broadcasts.push(createNFTAvatarBrfcNode!.hex!)

      //   // 创建 NFTAvatar 子节点
      //   utxo = await wallet?.utxoFromTx({
      //     tx: createNFTAvatarBrfcNode!.transaction!,
      //     addressInfo: {
      //       addressType: 0,
      //       addressIndex: 0,
      //     },
      //   })
      //   if (utxo) utxos = [utxo]
      //   const createNFTAvatarBrfcChildNode = await wallet!.createBrfcChildNode(
      //     {
      //       nodeName: NodeName.NFTAvatar,
      //       brfcTxId: createNFTAvatarBrfcNode!.txId,
      //       data: JSON.stringify({
      //         type: 'nft',
      //         tx: params.nft.txId,
      //         codehash: params.nft.codehash,
      //         genesis: params.nft.genesis,
      //         tokenIndex: params.nft.tokenIndex,
      //         updateTime: new Date().getTime(),
      //         memo: params.nft.desc,
      //         image: params.nft.avatarImage,
      //         chain: params.nft.avatarImage.split('://')[0],
      //       }),
      //       utxos: utxos,
      //     },
      //     { isBroadcast: false }
      //   )
      //   broadcasts.push(createNFTAvatarBrfcChildNode!.transaction.toString())
      // }
      //  广播
      let errorMsg: any

      // if () {
      //       const unSignTransations: TransactionInfo[] = []
      //     hexTxs.forEach(tx => {
      //       const { transation } = tx
      //       unSignTransations.push({
      //         txHex: transation.toString(),
      //         address: transation.inputs[0].output!.script.toAddress(this.network).toString(),
      //         inputIndex: 0,
      //         scriptHex: transation.inputs[0].output!.script.toHex(),
      //         satoshis: transation.inputs[0].output!.satoshis,
      //       })
      //     })

      //     const { signedTransactions } = await this.metaIDJsWallet.signTransactions({
      //       transactions: unSignTransations,
      //     })
      // }

      const unSignTransations: TransactionInfo[] = []
      broadcasts.forEach(tx => {
        const { transation } = tx
        console.log('tx', tx)

        if (tx.hasMetaId) {
          unSignTransations.push({
            txHex: transation.toString(),
            address: transation.inputs[0].output!.script.toAddress(wallet!.network).toString(),
            inputIndex: 0,
            scriptHex: transation.inputs[0].output!.script.toHex(),
            satoshis: transation.inputs[0].output!.satoshis,
            path: tx.path,
            hasMetaId: tx.hasMetaId,
            dataDependsOn: tx.dataDependsOn,
          })
        } else {
          unSignTransations.push({
            txHex: transation.toString(),
            address: transation.inputs[0].output!.script.toAddress(wallet!.network).toString(),
            inputIndex: 0,
            scriptHex: transation.inputs[0].output!.script.toHex(),
            satoshis: transation.inputs[0].output!.satoshis,
            path: tx.path,
          })
        }
      })
      const { signedTransactions } = await wallet!.metaIDJsWallet.signTransactions({
        transactions: unSignTransations,
      })

      for (let i = 0; i < signedTransactions.length; i++) {
        try {
          const tx = signedTransactions[i]
          const { txid } = await wallet?.provider.broadcast(tx.txHex)
          console.log('tx', tx.txid, txid)
        } catch (error) {
          errorMsg = error
          break
        }
      }
      if (errorMsg) throw new Error(errorMsg.message)

      const userInfo = {
        ...userStore.user!,
        name: params.name ? params.name : userStore.user!.name,
      }

      // @ts-ignore
      userInfo.userType = '' //userInfo.userType ? userInfo.userType : userInfo?.registerType

      // 上报修改的用户信息
      // await SetUserInfo({
      //   metaid: userStore.user!.metaId,
      //   accessKey: '', //userStore.user!.token,
      //   ...userInfo,
      //   userName: params.name ? params.name : userStore.user!.name,
      // })
      //
      // 更新本地用户信息
      userStore.updateUserInfo({
        ...userStore.user!,
        name: params.name ? params.name : userStore.user!.name,
      })
    }

    if (params.name) {
      setBaseInfoRef.value.FormRef.resetFields()
    }
    loading.value = false
    isShowSetBaseInfo.value = false
    isSHowBackupMnemonic.value = true
  } catch (error) {
    loading.value = false
    // ElMessage.error((error as any).message)
    throw new Error(error as any)
  }
}

async function onSetBaseInfoSuccess(params: { name: string; nft: NFTAvatarItem }) {
  loading.value = true
  try {
    const wallet = userStore.showWallet!.wallet

    if (userStore.isAuthorized) {
      let utxos, infoAddress, protocolAddress
      utxos = await wallet?.provider.getUtxos(wallet.wallet.xpubkey.toString())
      infoAddress = wallet
        ?.getPathPrivateKey(wallet.keyPathMap.Info.keyPath)
        .publicKey.toAddress(wallet.network)
        .toString()
      protocolAddress = wallet
        ?.getPathPrivateKey(wallet.keyPathMap.Protocols.keyPath)
        .publicKey.toAddress(wallet.network)
        .toString()

      const broadcasts: string[] | mvc.Transaction[] = []

      // 把钱打到 info, protocol 节点
      const payTo = [
        {
          amount: 1000,
          address: infoAddress,
        },
      ]
      if (params.nft.avatarImage !== userStore.user!.avatarImage) {
        payTo.push({
          amount: 2000,
          address: protocolAddress,
        })
      }

      const transfer = await wallet?.makeTx({
        utxos: utxos,
        opReturn: [],
        change: wallet.rootAddress,
        payTo,
      })
      broadcasts.push(transfer.toString())
      let utxo = await wallet?.utxoFromTx({
        tx: transfer,
        addressInfo: {
          addressType: parseInt(wallet.keyPathMap.Info.keyPath.split('/')[0]),
          addressIndex: parseInt(wallet.keyPathMap.Info.keyPath.split('/')[1]),
        },
        outPutIndex: 0,
      })
      //
      if (utxo) {
        utxos = [utxo]
        const createNameNode = await userStore.showWallet!.wallet!.createNode({
          nodeName: 'name',
          parentTxId: userStore.user!.infoTxId,
          data: params.name ? params.name : `${import.meta.env.VITE_DefaultName}`,
          utxos: utxos,
          change:
            params.nft.avatarImage !== userStore.user!.avatarImage
              ? infoAddress
              : wallet!.rootAddress,
        })
        broadcasts.push(createNameNode!.transaction.toString())
      }

      if (params.nft.avatarImage !== userStore.user!.avatarImage) {
        // 创建 NFTAvatar brfc 节点
        utxo = await wallet?.utxoFromTx({
          tx: transfer,
          addressInfo: {
            addressType: parseInt(wallet.keyPathMap.Protocols.keyPath.split('/')[0]),
            addressIndex: parseInt(wallet.keyPathMap.Protocols.keyPath.split('/')[1]),
          },
          outPutIndex: 1,
        })
        if (utxo) utxos = [utxo]
        const NFTAvatarBrfcNodeBaseInfo = await wallet?.provider.getNewBrfcNodeBaseInfo(
          wallet.wallet.xpubkey.toString(),
          userStore.user!.infoTxId
        )
        const createNFTAvatarBrfcNode = await wallet!.createNode({
          nodeName: NodeName.NFTAvatar,
          parentTxId: userStore.user!.infoTxId,
          data: AllNodeName[NodeName.NFTAvatar].brfcId,
          utxos: utxos,
          change: wallet!.createAddress('0/0').address,
          node: NFTAvatarBrfcNodeBaseInfo,
        })
        broadcasts.push(createNFTAvatarBrfcNode!.hex!)

        // 创建 NFTAvatar 子节点
        utxo = await wallet?.utxoFromTx({
          tx: createNFTAvatarBrfcNode!.transaction!,
          addressInfo: {
            addressType: 0,
            addressIndex: 0,
          },
        })
        if (utxo) utxos = [utxo]
        const createNFTAvatarBrfcChildNode = await wallet!.createBrfcChildNode(
          {
            nodeName: NodeName.NFTAvatar,
            brfcTxId: createNFTAvatarBrfcNode!.txId,
            data: JSON.stringify({
              type: 'nft',
              tx: params.nft.txId,
              codehash: params.nft.codehash,
              genesis: params.nft.genesis,
              tokenIndex: params.nft.tokenIndex,
              updateTime: new Date().getTime(),
              memo: params.nft.desc,
              image: params.nft.avatarImage,
              chain: params.nft.avatarImage.split('://')[0],
            }),
            utxos: utxos,
          },
          { isBroadcast: false }
        )
        broadcasts.push(createNFTAvatarBrfcChildNode!.transaction.toString())
      }
      //  广播
      let errorMsg: any

      // if () {
      //       const unSignTransations: TransactionInfo[] = []
      //     hexTxs.forEach(tx => {
      //       const { transation } = tx
      //       unSignTransations.push({
      //         txHex: transation.toString(),
      //         address: transation.inputs[0].output!.script.toAddress(this.network).toString(),
      //         inputIndex: 0,
      //         scriptHex: transation.inputs[0].output!.script.toHex(),
      //         satoshis: transation.inputs[0].output!.satoshis,
      //       })
      //     })

      //     const { signedTransactions } = await this.metaIDJsWallet.signTransactions({
      //       transactions: unSignTransations,
      //     })
      // }

      for (let i = 0; i < broadcasts.length; i++) {
        try {
          await wallet?.provider.broadcast(broadcasts[i])
        } catch (error) {
          errorMsg = error
          break
        }
      }
      if (errorMsg) throw new Error(errorMsg.message)

      const userInfo = {
        ...userStore.user!,
        name: params.name ? params.name : userStore.user!.name,
      }
      // @ts-ignore
      userInfo.userType = userInfo.userType ? userInfo.userType : userInfo?.registerType
      // 上报修改的用户信息
      await SetUserInfo({
        metaid: userStore.user!.metaId,
        accessKey: userStore.user!.token,
        ...userInfo,
        userName: params.name ? params.name : userStore.user!.name,
      })
      // 更新本地用户信息
      userStore.updateUserInfo({
        ...userStore.user!,
        name: params.name ? params.name : userStore.user!.name,
      })
    }

    if (params.name) {
      setBaseInfoRef.value.FormRef.resetFields()
    }
    loading.value = false
    isShowSetBaseInfo.value = false
    isSHowBackupMnemonic.value = true
  } catch (error) {
    loading.value = false
    // ElMessage.error((error as any).message)
    throw new Error(error as any)
  }
}

async function connectMetalet() {
  // if (isMobile.value) {
  //   return ElMessage.error(`${i18n.t('not_support_mobile_login_metalet')}`)
  // }

   if (!window.metaidwallet) {
    setMissingWallet('metalet')
    //TODO: 这里需要提示用户安装metalet钱包
    return
  }


    const connection = await connectionStore.connect('metalet').catch((err) => {
    ElMessage.warning({
      message: err.message,
      type: 'warning',
    })
  })

  //   if (connectionStore?.adapter?.metaletConnect) {

  //   await connectionStore?.adapter.metaletConnect()!.catch((err) => {
  //     ElMessage.warning({
  //       message: err.message,
  //       type: 'warning',
  //     })
  //   })
  // }

    if (connection?.status === 'connected') {
    await credentialsStore.login()
    
    if(!userStore.last.name){
       closeConnectionModal()
      return
    }

    
    
    


    await sleep(300)

    closeConnectionModal()

    const channelId=route.params.channelId
    const communityId=route.params.communityId


    if(channelId && channelId !== 'welcome'){
         router.push({
        name: 'talkChannel',
        params:{
          communityId:communityId,
          channelId:channelId
        }
      })
     setTimeout(() => {
       window.location.reload()
     }, 2000);
    }else{
        let newChannelId
        let channleType=1
    const myChannelList= await getChannels({
      metaId:userStore.last.metaid
    })

    if(myChannelList.length){
      if(Number(myChannelList[0]?.type) == 2){
        channleType=2
        debugger
          newChannelId=myChannelList[0].metaId
      }else{
        
          newChannelId=myChannelList[0].groupId
      }
    

    }else{
    //    const allChannelList= await getAllChannels({
    //   metaId:userStore.last.metaid
    // })

      newChannelId='welcome' //import.meta.env.VITE_CHAT_DEFAULT_CHANNEL//allChannelList[1].groupId
      layout.$patch({showJoinView:true})
    }
    simpleChatStore.initMuteNotify().then().catch((e)=>{
    
    })

    if(channleType == 1){
        router.push({
        name: 'talkChannel',
        params:{
          communityId:'public',
          channelId:newChannelId
        }
      })
    }else{
        router.push({
        name: 'talkAtMe',
        params:{
          channelId:newChannelId
        }
      })
    }
  
    }


  }



  // const loading = ElLoading.service({
  //   text: 'Loading...',
  //   lock: true,
  //   spinner: 'el-icon-loading',
  //   background: 'rgba(0, 0, 0, 0.7)',
  //   customClass: 'full-loading',
  // })
  // try {
  //   const { address } = await window.metaidwallet.connect()
  //   //
  //   if (!address) {
  //     loading.close()
  //     return ElMessage.error(`${i18n.t('wallet_addres_empty')}`)
  //   }
  //   let metaIdInfo

  //   const { network } = await window.metaidwallet.getNetwork()
  //   const xpub = await window.metaidwallet.getXPublicKey()

  //   const metaidWallet = new MetaletWallet({
  //     xpub,
  //     address: address,
  //     metaIDJsWallet: window.metaidwallet,
  //     network: network,
  //   })
  //   //304402204f83bd2372d09a99bbec51f1f7e3a1f647c132009d4cfc869df18ee0f7dbaf09022009cbc788ad026f3a9641c7b0c211849959a71b5013349d1

  //   metaIdInfo = await metaidWallet.getMetaIdInfo(address).catch(error => {
  //     throw new Error(error)
  //   })

  //   if (!metaIdInfo.metaId && !metaIdInfo.infoTxId && !metaIdInfo.protocolTxId) {

  //     metaIdInfo = await metaidWallet.initMetaIdNode().catch(e => {

  //       throw new Error(e.toString())
  //     })

  //   }

  //   console.log('metaletWallet', metaIdInfo)
  //   //
  //   userStore.updateUserInfo({
  //     ...metaIdInfo,
  //     metaId: metaIdInfo.metaId, // account 有时拿回来的metaId为空
  //     name: metaIdInfo.name!, // account 有时拿回来的name 是旧 name
  //     //password: form.password,
  //     address: metaidWallet.rootAddress,
  //     loginType: 'MetaID',
  //   })
  //   console.log('metaidwallet', metaidWallet)
  //   userStore.updateMetaletLoginState(true)
  //   userStore.$patch({
  //     wallet: null,
  //   })

  //   userStore.$patch({
  //     wallet: new MetaletSDK({
  //       network: import.meta.env.VITE_NET_WORK,
  //       wallet: metaidWallet,
  //     }),
  //   })
  //   //userStore.showWallet.initWallet()

  //   status.value = ConnectWalletStatus.Watting
  //   rootStore.$patch({ isShowLogin: false })
  //   loading.close()
  //   if (!metaIdInfo.name) {
  //     isShowSetBaseInfo.value = true
  //   }
  // } catch (error) {
  //   loading.close()
  //   rootStore.$patch({ isShowLogin: true })
  //   ElMessage.error(`${(error as any).toString()}`)
  // }

  //metalet-SDK实例化
   rootStore.checkBtcAddressSameAsMvc().then().catch((err)=>{
          
            ElMessage.warning({
              message:i18n.t('btcSameAsMvcError'),
              type: 'warning',
              })
              setTimeout(() => {
                 connectionStore.disconnect(router)
              }, 3000);
            
        })


}

async function connectWalletConnect(isUpdate: boolean = false) {
  const connector = new WalletConnect({
    bridge: 'https://bridge.walletconnect.org', // Required
    qrcodeModal: QRCodeModal,
    clientMeta: {
      description: 'My website description ',
      url: 'https://mywebsite.url',
      icons: ['../assets/svg/icon.svg'],
      name: import.meta.env.VITE_App_Key,
    },
  })

  connector.on('session_update', async (error, payload) => {
    if (error) {
      throw error
    }

    // Get updated accounts and chainId
    const { accounts, chainId } = payload.params[0]
  })

  connector.on('disconnect', (error, payload) => {
    if (error) {
      throw error
    }

    // Delete connector
  })
  ;(window as any).WallectConnect = connector
  const { accounts, chainId } = await connector.connect()
  let res, address, message
  const hexChainId = `0x${chainId.toString(16)}`
  // const chainWhiteList = currentSupportChain.filter(item => {
  //   return item.chainId == hexChainId
  // })
  if (!rootStore.chainWhiteList.includes(hexChainId)) {
    ElMessageBox.confirm(
      i18n.t('MetaMak.Chain Network Error Tips') + `${import.meta.env.VITE_ETH_CHAIN}`,
      i18n.t('MetaMak.Chain Network Error'),
      {
        customClass: 'primary',
        confirmButtonText: i18n.t('MetaMak.Change') + `${import.meta.env.VITE_ETH_CHAIN}`,
        cancelButtonText: i18n.t('Cancel'),
      }
    )
      .then(async () => {
        connector
          .sendCustomRequest({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId:
                  import.meta.env.VITE_DEFAULT_NETWORK == 'eth'
                    ? currentSupportChain[0].chainId
                    : currentSupportChain[1].chainId,
              },
            ],
          })
          .then(async () => {
            address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
            message = isUpdate
              ? import.meta.env.MODE == 'gray'
                ? `0x${ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0])).split('0x')[1]}`
                : `${ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0])).slice(2, -1)}`
              : `${ethers.utils.hexValue(
                  ethers.utils.toUtf8Bytes(
                    ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0].toLocaleLowerCase()))
                  )
                )}`
            if (rootStore.updatePlanWhiteList.includes(accounts[0])) {
              address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
              message = isUpdate
                ? `${ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0])).slice(2, -1)}`
                : `${ethers.utils.hexValue(
                    ethers.utils.toUtf8Bytes(
                      ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0].toLocaleLowerCase()))
                    )
                  )}`
            }
            res = await connector.signPersonalMessage([
              isUpdate ? message : address,
              isUpdate ? address : message,
              // `${ethers.utils
              //   .sha256(ethers.utils.toUtf8Bytes(accounts[0]))
              //   .slice(2, -1)
              //   .toLocaleUpperCase()}`,
            ])

            if (res) {
              rootStore.$patch({ isShowLogin: false })
              await onThreePartLinkSuccess({
                signAddressHash: res,
                address: address,
                walletOrigin: WalletOrigin.WalletConnect,
              })
            }
          })
          .catch((error: any) => {
            return ElMessage.error(error.message)
            // emit('update:modelValue', false)
          })
      })
      .catch((error: any) => {
        return ElMessage.error(error.message)
        // emit('update:modelValue', false)
      })
  } else {
    try {
      console.log('accounts[0]', accounts[0])
      address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
      message = isUpdate
        ? import.meta.env.MODE == 'gray'
          ? `0x${ethers.utils.sha256(ethers.utils.toUtf8Bytes(address)).split('0x')[1]}`
          : `${ethers.utils.sha256(ethers.utils.toUtf8Bytes(address)).slice(2, -1)}`
        : `${ethers.utils.hexValue(
            ethers.utils.toUtf8Bytes(
              ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0].toLocaleLowerCase()))
            )
          )}`

      if (rootStore.updatePlanWhiteList.includes(accounts[0])) {
        address = isUpdate ? accounts[0] : accounts[0].toLocaleLowerCase()
        message = isUpdate
          ? `${ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0])).slice(2, -1)}`
          : `${ethers.utils.hexValue(
              ethers.utils.toUtf8Bytes(
                ethers.utils.sha256(ethers.utils.toUtf8Bytes(accounts[0].toLocaleLowerCase()))
              )
            )}`
      }
      res = await connector.signPersonalMessage([
        isUpdate ? message : address,
        isUpdate ? address : message,
        // `0x${ethers.utils
        //   .sha256(ethers.utils.toUtf8Bytes(accounts[0]))
        //   .split('0x')[1]
        //   .toLocaleUpperCase()}`,
        // `${ethers.utils
        //   .sha256(ethers.utils.toUtf8Bytes(accounts[0]))
        //   .slice(2, -1)
        //   .toLocaleUpperCase()}`,

        // import.meta.env.MODE == 'gray'
        //   ? `0x${ethers.utils
        //       .sha256(ethers.utils.toUtf8Bytes(accounts[0]))
        //       .split('0x')[1]
        //       .toLocaleUpperCase()}`
        //   : `${ethers.utils
        //       .sha256(ethers.utils.toUtf8Bytes(accounts[0]))
        //       .slice(2, -1)
        //       .toLocaleUpperCase()}`,
      ])

      if (res) {
        rootStore.$patch({ isShowLogin: false })
        await onThreePartLinkSuccess({
          signAddressHash: res,
          address: address,
          walletOrigin: WalletOrigin.WalletConnect,
        })
      }
    } catch (error) {
      console.log('签名失败')
    }
  }

  connector.killSession()
}

async function onModalClose() {
  rootStore.$patch({ isShowLogin: false })

  if (userStore.isAuthorized) {
    // 登陆了要设置sentry 用户
    setUser({
      id: userStore.user!.metaId,
      email: userStore.user!.phone || userStore.user!.email,
      username: userStore.user!.name,
    })

    // 如果在首页登录完，要自动跳转到buzz
    if (route.name === 'home') {
      const res = await GetUserFollow(userStore.user!.metaId).catch(() => {
        router.push({
          name: 'buzz',
        })
      })
      if (res?.code === 0) {
        if (res.data.followingList && res.data.followingList.length) {
          router.push({
            name: 'buzzIndex',
          })
        } else {
          router.push({
            name: 'buzzRecommend',
          })
        }
      }
    }
  }
}

// onMounted(async () => {
//   const authClient = await AuthClient.init({
//     projectId: '39eec2aad9a4402a5c02f37b1f942f24',
//     iss: `did:pkh:eip155:1`,
//     metadata: {
//       name: 'ShowApp3',
//       description: 'A dapp using WalletConnect AuthClient',
//       url: 'www.baidu.com',
//       icons: ['https://my-auth-dapp.com/icons/logo.png'],
//     },
//   })
//   console.log(authClient)
//   authClient.on('auth_response', res => {
//     console.log(res)
//     if (Boolean(params.result?.s)) {
//       // Response contained a valid signature -> user is authenticated.
//     } else {
//       // Handle error or invalid signature case
//       console.error(params.message)
//     }
//   })
//   const { uri } = await authClient.request({
//     aud: 'https://www.baidu.com/',
//     domain: 'www.baidu.com',
//     chainId: 'eip155:1',
//     nonce: generateNonce(),
//   })
//   //
//   if (uri) {
//     await authClient.core.pairing.pair({ uri })
//     QRCodeModal.open(uri, res => {
//       console.log('EVENT', 'QR Code Modal closed')
//     })
//   }
// })
</script>
<style lang="scss" scoped src="./ConnectWalletModal.scss"></style>
