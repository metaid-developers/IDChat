<template>
  <Modal
    :model-value="modelValue"
    @update:modelValue="val => emit('update:modelValue', val)"
    :loading="loading"
    :extra-close-event="
      () => {
        isSkeleton = true
      }
    "
  >
    <template #title>
      {{ $t('DAO.Extract') }}
    </template>
    <template #body>
      <ElSkeleton :loading="isSkeleton" animated>
        <div class="extract">
          <div class="section">
            <div class="title">{{ $t('DAO.Extractable') }}</div>
            <div class="cont">
              <div class="extractable flex flex-align-center">
                <div class="amount flex1">{{ $filters.space(tokens.active.amount) }}</div>
                <a
                  class="main-border"
                  @click="extract"
                  :class="[tokens.active.amount ? 'primary' : 'faded']"
                  >{{ $t('DAO.Extract') }}</a
                >
              </div>
            </div>
          </div>

          <div class="section">
            <div class="title">
              {{ $t('DAO.Not Extractable') }}
              <span>({{ $t('DAO.Not Extractable Time Tips') }})</span>
            </div>
            <div class="tips">
              {{ $t('DAO.New Block Time') }}:
              {{ $filters.dateTimeFormat(blockTimeStamp, 'UTC') }}(UTC)
            </div>
            <div class="cont">
              <div class="list">
                <div
                  class="item flex flex-align-center"
                  v-for="item in tokens.disableds"
                  :key="item.expired"
                >
                  <div class="amount flex1">{{ $filters.space(item.amount) }}</div>
                  <div class="time">
                    {{ $filters.dateTimeFormat(item.expired * 1000, 'UTC') }}(UTC)
                  </div>
                </div>

                <IsNull v-if="tokens.disableds.length === 0" />
              </div>
            </div>
          </div>
        </div>
      </ElSkeleton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { GetBlockTime, GetStake, GetUserStakeInfo, Withdraw, Withdraw2 } from '@/api/dao'
import Modal from '@/components/Modal/Modal.vue'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import Decimal from 'decimal.js-light'
import { reactive, ref, watch } from 'vue'
import IsNull from '@/components/IsNull/IsNull.vue'
import { DAOStakeOperate, NodeName, SdkPayType } from '@/enum'
import { signTx, toHex, mvc } from 'mvc-scrypt/dist'
import { useI18n } from 'vue-i18n'
import { reject } from 'lodash'
import { getBlocks } from '@/api'

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'success'])
const tokens: {
  active: {
    amount: number
  }
  disableds: {
    expired: number
    amount: string
  }[]
} = reactive({
  active: {
    amount: 0,
  },
  disableds: [],
})

const blockTimeStamp = ref(0)

const talk = useTalkStore()
const userStore = useUserStore()
const isSkeleton = ref(true)
const loading = ref(false)
const i18n = useI18n()

function getUserStakeInfo() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetUserStakeInfo({
      symbol: `${talk.activeCommunity!.dao!.governanceSymbol}_${talk.activeCommunity!.dao!.daoId}`,
      address: userStore.user!.address!,
    }).catch(error => {
      ElMessage.error(error.message)
    })
    if (res?.code === 0) {
      tokens.disableds.length = 0
      tokens.active.amount = 0
      for (let i = 0; i < res.data.unlockingTokens.length; i++) {
        if (res.data.unlockingTokens[i].expired * 1000 > blockTimeStamp.value) {
          tokens.disableds.push(res.data.unlockingTokens[i])
        } else {
          tokens.active.amount = new Decimal(tokens.active.amount)
            .add(res.data.unlockingTokens[i].amount)
            .toNumber()
        }
      }
      resolve()
    }
  })
}

async function extract() {
  if (!tokens.active.amount) return
  loading.value = true
  try {
    const symbol = `${talk.activeCommunity!.dao!.governanceSymbol}_${
      talk.activeCommunity!.dao!.daoId
    }`
    const stakeRes = await GetStake({
      symbol,
      address: userStore.user!.address!,
      op: DAOStakeOperate.Extract,
    })
    if (stakeRes.code === 0) {
      const transfer = await userStore.showWallet.createBrfcChildNode(
        {
          nodeName: NodeName.SendMoney,
          payTo: [{ address: stakeRes.data.mvcToAddress, amount: stakeRes.data.txFee }],
        },
        { isBroadcast: false, payType: SdkPayType.SPACE, isTransfer: true }
      )
      if (transfer) {
        if (transfer.payToAddress?.transaction) {
          if (userStore.metaletLogin) {
            await userStore.showWallet.wallet?.provider.broadcast(transfer.payToAddress?.txHex)
          } else {
            await userStore.showWallet.wallet?.provider.broadcast(
              transfer.payToAddress?.transaction.toString()
            )
          }
        }
        
        const withdrawRes = await Withdraw({
          symbol,
          requestIndex: stakeRes.data.requestIndex,
          mvcRawTx: userStore.metaletLogin
            ? transfer.sendMoney.txHex
            : transfer.sendMoney.transaction.toString(),
          mvcOutputIndex: 0,
        })
        
        if (withdrawRes.code === 0) {
          const tx = new mvc.Transaction(withdrawRes.data.txHex)
          // @ts-ignore
          const script = mvc.Script.fromBuffer(Buffer.from(withdrawRes.data.scriptHex, 'hex'))
          const pubKey = userStore.metaletLogin
            ? await userStore.showWallet.wallet!.metaIDJsWallet.getPublicKey({
                path: '0/0',
              })
            : userStore.showWallet.wallet!.getPathPubliceKey('0/0').toHex()

          let signedTransaction
          if (userStore.metaletLogin) {
            const { signature } = await userStore.showWallet.wallet!.metaIDJsWallet.signTransaction(
              {
                transaction: {
                  txHex: withdrawRes.data.txHex,
                  inputIndex: withdrawRes.data.inputIndex,
                  scriptHex: withdrawRes.data.scriptHex,
                  satoshis: Number(withdrawRes.data.satoshis),
                },
              }
            )
            console.log('signedTransactions', signature, pubKey)

            signedTransaction = signature.sig
          }

          const sig = userStore.metaletLogin
            ? signedTransaction
            : toHex(
                signTx(
                  // @ts-ignore
                  tx,
                  userStore.showWallet.wallet!.getPathPrivateKey('0/0'),
                  script,
                  Number(withdrawRes.data.satoshis),
                  withdrawRes.data.inputIndex
                )
              )
          const withdrawRes2 = await Withdraw2({
            symbol,
            requestIndex: stakeRes.data.requestIndex,
            pubKey,
            sig,
          })
          if (withdrawRes2.code === 0) {
            getUserStakeInfo()
            emit('success')
            ElMessage.success(i18n.t('DAO.Extract Successful'))
            loading.value = false
          }
        }
      } else if (transfer === null) {
        loading.value = false
      }
    }
  } catch (error) {
    ElMessage.error((error as any).message)
    loading.value = false
  }
}

function getLeastBlockTimestamp() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetBlockTime().catch(error => {
      ElMessage.error(error.message)
    })
    if (res?.code === 0) {
      blockTimeStamp.value = res.data * 1000
      resolve()
    }
  })
}

watch(
  () => props.modelValue,
  result => {
    if (result) {
      getLeastBlockTimestamp().then(() => {
        getUserStakeInfo().then(() => {
          isSkeleton.value = false
        })
      })
    }
  }
)
</script>

<style lang="scss" scoped src="./ExtractModal.scss"></style>
