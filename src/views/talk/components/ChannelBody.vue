<template>
  <ChannelWelcome v-if="talk.isActiveChannelTheVoid" />
  <ChannelSettings v-else-if="talk.isActiveChannelTheVoid" />
  <ChannelContent v-else />
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { nextTick, onBeforeUnmount, watch } from 'vue'

import { useTalkStore } from '@/stores/talk'
import { GroupChannelType } from '@/enum'
import { verifyPassword } from '@/utils/talk'
import { useLayoutStore } from '@/stores/layout'
import { GetGenesisNFTs, GetNFT, GetFT, GetFTs } from '@/api/aggregation'
import { useUserStore } from '@/stores/user'
import { sleep } from '@/utils/util'

import ChannelSettings from './ChannelSettings.vue'
import ChannelWelcome from './ChannelWelcome.vue'
import ChannelContent from './ChannelContent.vue'
import { GetOwnerStakeInfo } from '@/api/dao'
const talk = useTalkStore()
const layout = useLayoutStore()
const user = useUserStore()
const route = useRoute()
const { communityId, channelId } = route.params

const tryInitChannel = async (status: string) => {
  if (status !== 'ready') return

  const initChannelStatus = await talk.initChannel(communityId as string, channelId as string)
  if (['redirect'].includes(initChannelStatus)) return

  const selfMetaId = talk.selfMetaId
  // 重置頻道凭证
  talk.hasActiveChannelConsent = false
  await nextTick()
  if (!talk.canAccessActiveChannel) {
    // 添加遮罩先
    layout.isShowCheckingPass = true
    const minCheckingDuration = 1000 // 最少检查时间
    const start = Date.now()

    const checkAtLeastMinDuration = async () => {
      const duration = Date.now() - start
      if (duration < minCheckingDuration) {
        await sleep(minCheckingDuration - duration)
      }
      layout.isShowCheckingPass = false
    }

    let chain: string
    switch (talk.activeGroupChannelType) {
      case GroupChannelType.Password:
        // 先检查是否本地有存储该頻道密码
        const _passwordLookup = localStorage.getItem(`channelPasswords-${selfMetaId}`)
        const passwordLookup = _passwordLookup ? JSON.parse(_passwordLookup) : {}
        const hashedPassword = passwordLookup[talk.activeChannelId]

        // 如果没有，则弹出密码输入框
        if (!hashedPassword) {
          await checkAtLeastMinDuration()
          layout.isShowPasswordModal = true
          return
        }

        // 检查密码是否正确
        const channelKey = talk.activeChannel.roomStatus
        const creatorMetaId = talk.activeChannel.createUserMetaId

        await checkAtLeastMinDuration()

        if (verifyPassword(channelKey, hashedPassword, creatorMetaId)) {
          await checkAtLeastMinDuration()
          talk.hasActiveChannelConsent = true
        } else {
          await checkAtLeastMinDuration()
          layout.isShowPasswordModal = true
        }

        return

      case GroupChannelType.NFT:
      case GroupChannelType.POLYGON_NFT:
      case GroupChannelType.BSV_NFT:
      case GroupChannelType.ETH_NFT: {
        let chain: string
        switch (talk.activeGroupChannelType) {
          case GroupChannelType.NFT:
            chain = 'mvc'
            break
          case GroupChannelType.BSV_NFT:
            chain = 'bsv'
            break
          case GroupChannelType.POLYGON_NFT:
            chain = import.meta.env.VITE_POLYGON_CHAIN
            break
          case GroupChannelType.ETH_NFT:
            chain = import.meta.env.VITE_ETH_CHAIN
            break
          default:
            chain = 'mvc'
            break
        }
        let selfAddress: string
        switch (chain) {
          case 'mvc':
            selfAddress = user.last!.address
            break
          // case 'eth':
          //   selfAddress = user.last?.evmAddress as string
          //   break
          // case 'goerli':
          //   selfAddress = user.last?.evmAddress as string
          //   break
          // case 'polygon':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'mumbai':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          default:
            selfAddress = user.last!.address
            break
        }
        const consensualGenesis = talk.activeChannel.roomGenesis
        const consensualCodehash = talk.activeChannel.roomCodeHash

        // 如果不存在该链地址，则直接拒绝进入
        if (!selfAddress) {
          const {
            data: {
              results: { items },
            },
          } = await GetNFT({
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            chain,
            tokenIndex: 0,
          })
          const nftInfo = {
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            icon: items[0].nftIcon,
            name: items[0].nftName,
            seriesName: items[0].nftSeriesName || items[0].nftName,
            chain,
          }
          talk.consensualNft = nftInfo

          await checkAtLeastMinDuration()

          layout.isShowRequireNftModal = true
          return
        }

        const {
          data: {
            results: { items: userNfts },
          },
        } = await GetGenesisNFTs({
          address: selfAddress,
          codehash: consensualCodehash,
          genesis: consensualGenesis,
          chain,
          page: 1,
          pageSize: 3,
        })

        if (userNfts.length > 0) {
          await checkAtLeastMinDuration()

          talk.hasActiveChannelConsent = true
        } else {
          const {
            data: {
              results: { items },
            },
          } = await GetNFT({
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            chain,
            tokenIndex: 0,
          })
          const nftInfo = {
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            icon: items[0].nftIcon,
            name: items[0].nftName,
            seriesName: items[0].nftSeriesName || items[0].nftName,
            chain,
          }
          talk.consensualNft = nftInfo
          await checkAtLeastMinDuration()
          layout.isShowRequireNftModal = true
        }
        return
      }

      case GroupChannelType.FT:
      case GroupChannelType.BSV_FT: {
        let chain: string
        switch (talk.activeGroupChannelType) {
          case GroupChannelType.BSV_FT:
            chain = 'bsv'
            break
          default:
            chain = 'mvc'
            break
        }
        let selfAddress: string
        switch (chain) {
          case 'mvc':
            selfAddress = user.last!.address
            break
          // case 'eth':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'goerli':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'polygon':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'mumbai':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          default:
            selfAddress = user.last!.address
            break
        }
        const consensualGenesis = talk.activeChannel.roomGenesis
        const consensualCodehash = talk.activeChannel.roomCodeHash

        // 如果不存在该链地址，则直接拒绝进入
        if (!selfAddress) {
          const {
            data: {
              data: items,
            },
          } = await GetFT({
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            chain,
          })
          const ftInfo = {
            codehash: consensualCodehash,
            genesis: consensualGenesis,
            icon: items[0].icon,
            name: items[0].name,
            chain,
          }
          talk.consensualFt = ftInfo
          await checkAtLeastMinDuration()
          layout.isShowRequireFtModal = true
          return
        }

        const {
          data: {
            data: userFts,
          },
        } = await GetFTs({
          address: selfAddress,
          codehash: consensualCodehash,
          genesis: consensualGenesis,
          // chain,
          // page: 1,
          // pageSize: 3,
        })

        if (userFts.length > 0) {
          // 所需数量
          const needAmount = talk.activeChannel.roomLimitAmount
          // 用户拥有数量
          const userAmount = parseInt(userFts[0].confirmedString.split('.')[0])
          if (userAmount < needAmount) {
            // const {
            //   data: {
            //     results: { items },
            //   },
            // } = await GetFT({
            //   codehash: consensualCodehash,
            //   genesis: consensualGenesis,
            //   chain,
            // })
            // const ftInfo = {
            //   codehash: consensualCodehash,
            //   genesis: consensualGenesis,
            //   icon: items[0].icon,
            //   name: items[0].name,
            //   chain,
            // }
            const ftInfo = {
              codehash: '',
              genesis: '',
              icon: '',
              name: '',
              chain,
            }
            talk.consensualFt = ftInfo
            await checkAtLeastMinDuration()
            layout.isShowRequireFtModal = true
            return
          }

          // 拥有指定数量的token，直接进入
          await checkAtLeastMinDuration()
          talk.hasActiveChannelConsent = true
        } else {
          // const {
          //   data: {
          //     results: { items },
          //   },
          // } = await GetFT({
          //   codehash: consensualCodehash,
          //   genesis: consensualGenesis,
          //   chain,
          // })
          const ftInfo = {
            codehash: '',
            genesis: '',
            icon: '',
            name: '',
            chain,
          }
          talk.consensualFt = ftInfo
          await checkAtLeastMinDuration()
          layout.isShowRequireFtModal = true
        }
        return
      }

      case GroupChannelType.Native:
        const chain: string = 'mvc'
        let selfAddress: string
        switch (chain) {
          case 'mvc':
            selfAddress = user.last!.address
            break
          // case 'eth':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'goerli':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'polygon':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          // case 'mumbai':
          //   selfAddress = user.user?.evmAddress as string
          //   break
          default:
            selfAddress = user.last!.address
            break
        }

        // 如果不存在该链地址，则直接拒绝进入
        if (!selfAddress) {
          await checkAtLeastMinDuration()
          return
        }

        // 检查币数量
        // 获取餘额
        let balance
        if (user.isAuthorized) {
          const { total } = await window.metaidwallet.getMvcBalance()
            .catch(error => {
              ElMessage.error(error.message)
            })
            
          balance = total
        } else {
          balance = await window.metaidwallet.getMvcBalance()
            .catch(error => {
              ElMessage.error(error.message)
            })
        }
        const stakeAmount = await GetOwnerStakeInfo({
          symbol: import.meta.env.VITE_MY_STAKE_SYMBOL,
          address: user.last?.address,
        })

        let requiredAmount = Number(talk.activeChannel.roomLimitAmount)
        if (balance >= requiredAmount || stakeAmount >= requiredAmount) {
          await checkAtLeastMinDuration()
          talk.hasActiveChannelConsent = true
        } else {
          talk.consensualNative = {
            amount: requiredAmount,
            chain,
            balance,
          }
          await checkAtLeastMinDuration()
          layout.isShowRequireNativeModal = true
        }

        return
    }
  }

  await talk.initChannelMessages()
}

watch(
  () => talk.communityStatus,
  async (status: string) => await tryInitChannel(status),
  { immediate: true }
)

watch(
  () => talk.canAccessActiveChannel,
  async canAccess => {
    if (canAccess) {
      await talk.initChannelMessages()
    }
  }
)

onBeforeUnmount(() => {
  talk.resetCurrentChannel()
})
</script>
