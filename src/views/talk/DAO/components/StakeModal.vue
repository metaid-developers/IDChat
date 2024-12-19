<template>
  <Modal
    :modelValue="modelValue"
    :extraCloseEvent="
      () => {
        isSkeleton = true
        amountNumber = 0
        percentage = 0
      }
    "
    @update:modelValue="val => emit('update:modelValue', val)"
    :loading="loading"
  >
    <template #title>{{ type === StakeType.Pledge ? $t('DAO.Stake') : $t('DAO.UnLock') }}</template>
    <template #body>
      <ElSkeleton :loading="isSkeleton" animated>
        <div class="stake">
          <div class="stake-amount">
            <div class="title flex flex-align-center">
              <div class="flex1">
                <span class="label">{{
                  type === StakeType.Pledge ? $t('DAO.Stake amount') : $t('DAO.Unlock amount')
                }}</span>
              </div>
              <a class="balance" @click="percentage = 100"
                >{{ balance }} {{ talk.activeCommunity!.dao!.governanceSymbol.toUpperCase() }}</a
              >
            </div>
            <div class="amount-percent">
              <div class="percent-numer">{{ percentage }}%</div>
              <div class="percent-line">
                <el-slider v-model="percentage" @change="onPercentChange" />
              </div>
              <div class="percent-options flex flex-align-center">
                <a
                  class="flex1"
                  v-for="option in options"
                  :key="option.value"
                  :class="{ active: percentage === option.value }"
                  @click="
                    () => {
                      percentage = option.value
                      onPercentChange()
                    }
                  "
                  >{{ option.name }}</a
                >
              </div>
            </div>

            <div class="amount-number flex flex-align-center">
              <div class="label flex flex-align-center">
                <img :src="icons[talk.activeCommunity!.dao!.governanceSymbol]" />
                {{ talk.activeCommunity?.dao?.governanceSymbol.toUpperCase() }}
              </div>
              <ElInput v-model="amountNumber" type="number" @change="onAmountChange" />

              
            </div>

            <div class="mt-3 text-xs text-[#fc6d5e]">
              *{{ $t('stake.maintain') }}
            </div>
           
            <div
              class="main-border"
              :class="[amountNumber > 0 ? 'primary' : 'faded']"
              @click="stake"
            >
              {{ type === StakeType.Pledge ? $t('DAO.Stake') : $t('DAO.UnLock') }}
            </div>
          </div>
        </div>
      </ElSkeleton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { GetStake, Pledge, GetUserStakeInfo, Unlock, Unlock2 } from '@/api/dao'
import Modal from '@/components/Modal/Modal.vue'
import { Chains, DAOStakeOperate, NodeName, SdkPayType, StakeType } from '@/enum'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { getBalance } from '@/utils/util'
import Decimal from 'decimal.js-light'
import { val } from 'dom7'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SPACEIcon from '@/assets/images/icon_mvc.png'
import { signTx, toHex, mvc } from 'mvc-scrypt/dist'
import { encodingType } from '@/utils/wallet/Metalet-wallet'
interface Props {
  modelValue: boolean
  type: StakeType
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'success'])

const talk = useTalkStore()
const userStore = useUserStore()
const i18n = useI18n()

const balance = ref(0)
const options = [
  { name: '25%', value: 25 },
  { name: '50%', value: 50 },
  { name: '75%', value: 75 },
  { name: 'MAX', value: 100 },
]
const symbols = [
  {
    symbol: 'space',
    rate: Math.pow(10, 8),
    toFixed: 8,
  },
]
const icons: { [key: string]: string } = {
  space: SPACEIcon,
}

const amountNumber = ref(0)
const percentage = ref(0)
const isSkeleton = ref(true)
const loading = ref(false)
const txFee = new Decimal(40000).div(Math.pow(10, 8)).toNumber()
const extractTxFee = new Decimal(960000).div(Math.pow(10, 8)).toNumber()
const currentSymbol = computed(() => {
  //return symbols.find(item => item.symbol === talk.activeCommunity?.dao?.governanceToken)
  return symbols.find(item => item.symbol === talk.activeCommunity?.dao?.governanceSymbol)
})

function getBlance() {
  return new Promise<void>(async (resolve, reject) => {
    //const item = symbols.find(_item => _item.symbol === talk.activeCommunity!.dao!.governanceToken)
    const item = symbols.find(_item => _item.symbol === talk.activeCommunity!.dao!.governanceSymbol)
    if (props.type === StakeType.Pledge) {
      // 质押
      const chains: any = {
        space: Chains.MVC,
      }
      // @ts-ignore
      console.log('start get balance')
      const res = await getBalance({ chain: chains[talk.activeCommunity!.dao!.governanceSymbol] })
      //const res = await getBalance({ chain: chains[talk.activeCommunity!.dao!.governanceToken] })
      if (typeof res === 'number') {
        if (res) {
          balance.value = new Decimal(
            new Decimal(res).div(item!.rate).toFixed(item?.toFixed)
          ).toNumber()
        }

        resolve()
      }
    } else {
      // 解锁
      const res = await GetUserStakeInfo({
        symbol: `${talk.activeCommunity!.dao!.governanceSymbol}_${
          talk.activeCommunity!.dao!.daoId
        }`,
        address: userStore.user!.address!,
      })

      if (res.code === 0) {
        balance.value = new Decimal(
          new Decimal(res.data.lockedTokenAmount).div(item!.rate).toFixed(item?.toFixed)
        ).toNumber()
        resolve()
      }
    }
  })
}

function onPercentChange() {
  if (balance.value) {
    let result = new Decimal(balance.value)
      .mul(percentage.value)
      .div(100)
      .toNumber()
    if (props.type === StakeType.Pledge) {
      if (result + txFee + extractTxFee >= balance.value) {
        result = result - (txFee + extractTxFee)
      }
    }

    amountNumber.value = new Decimal(new Decimal(result).toFixed(8)).toNumber()
  } else {
    amountNumber.value = 0
  }
  console.log('amountNumber.value', amountNumber.value, txFee, balance.value)
}

function onAmountChange() {
  if (amountNumber.value > balance.value) {
    amountNumber.value = balance.value
  }
  if (props.type === StakeType.Pledge) {
  
    if(+amountNumber.value + txFee + extractTxFee - balance.value < txFee + extractTxFee){
     
      amountNumber.value = new Decimal(
        new Decimal(amountNumber.value)
          .sub(txFee)
          .sub(extractTxFee)
          .toFixed(8)
      ).toNumber()
    }

    if (+amountNumber.value + txFee + extractTxFee >= balance.value ) {
      amountNumber.value = new Decimal(
        new Decimal(amountNumber.value)
          .sub(txFee)
          .sub(extractTxFee)
          .toFixed(8)
      ).toNumber()
    }


  } else {
    if (+amountNumber.value + txFee >= balance.value) {
      amountNumber.value = new Decimal(new Decimal(amountNumber.value).toFixed(8)).toNumber()
    }
  }

  if (balance.value) {
    percentage.value = new Decimal(amountNumber.value)
      .div(balance.value)
      .mul(100)
      .toInteger()
      .toNumber()
  } else {
    percentage.value = 0
  }
  console.log('amountNumber.value', amountNumber.value, txFee, balance.value)
}

async function stake() {

  if (!amountNumber.value) return
  if (props.type === StakeType.Pledge ) {
    if(amountNumber.value < 1){
      return ElMessage.error(`${i18n.t('stakeAmountLimit')}`)
    }
  }
  loading.value = true

  try {
    const amount = new Decimal(amountNumber.value)
      .mul(currentSymbol.value!.rate)
      .toInteger()
      .toNumber()

    const symbol = `${talk.activeCommunity!.dao!.governanceSymbol}_${
      talk.activeCommunity!.dao!.daoId
    }`
    console.log('symbol', symbol)

    if (props.type === StakeType.Pledge) {
      // 质押
      
      const stakeRes = await GetStake({
        symbol,
        address: userStore.user!.address!,
        op: DAOStakeOperate.Pledge,
      })

      
      if (stakeRes.code === 0) {
        const amount = new Decimal(amountNumber.value)
          .mul(currentSymbol.value!.rate)
          .toInteger()
          .toNumber()

        const result = await userStore.showWallet.createBrfcChildNode(
          {
            nodeName: NodeName.SendMoney,
            payTo: [
              {
                address: stakeRes.data.mvcToAddress,
                amount: new Decimal(amount)
                  .add(stakeRes.data.txFee)
                  .toInteger()
                  .toNumber(),
              },
            ],
          },
          {
            payType: SdkPayType.SPACE,
            isBroadcast: false,
            isStake: true,
          }
        )

        if (result) {
          if (result.payToAddress?.transaction) {
            if (userStore.metaletLogin) {
              await userStore.showWallet.wallet?.provider.broadcast(
                result.payToAddress?.txHex as string
              )
            } else {
              await userStore.showWallet.wallet?.provider.broadcast(
                result.payToAddress?.transaction.toString()
              )
            }
          }

          const res = await Pledge({
            symbol,
            requestIndex: stakeRes.data.requestIndex,
            mvcRawTx: userStore.metaletLogin
              ? result.sendMoney!.txHex
              : result.sendMoney.transaction.toString(),
            mvcOutputIndex: 0,
            mvcAddAmount: amount,
          })

          if (res.code === 0) {
            emit('success')
            ElMessage.success(i18n.t('DAO.Pledge successful'))
            emit('update:modelValue', false)
            percentage.value = 0
            amountNumber.value = 0
            loading.value = false
          }
        } else if (result === null) {
          loading.value = false
        }
      } else {
        throw new Error(stakeRes.msg)
      }
    } else {
      // 解锁
      const stakeRes = await GetStake({
        symbol,
        address: userStore.user!.address,
        op: DAOStakeOperate.Unlock,
      })
      if (stakeRes.code === 0) {
        const transfer = await userStore.showWallet.createBrfcChildNode(
          {
            nodeName: NodeName.SendMoney,
            payTo: [{ address: stakeRes.data.mvcToAddress, amount: stakeRes.data.txFee }],
          },
          {
            isBroadcast: false,
            payType: SdkPayType.SPACE,
            isTransfer: true,
          }
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
          const unlockRes = await Unlock({
            symbol,
            tokenRemoveAmount: amount.toString(),
            mvcRawTx: userStore.metaletLogin
              ? transfer.sendMoney.txHex
              : transfer.sendMoney.transaction.toString(),
            mvcOutputIndex: 0,
            requestIndex: stakeRes.data.requestIndex,
          })

          if (unlockRes.code === 0) {
            const tx = new mvc.Transaction(unlockRes.data.txHex)
            // @ts-ignore

            const script = mvc.Script.fromBuffer(Buffer.from(unlockRes.data.scriptHex, 'hex'))
            const pubKey = userStore.metaletLogin
              ? await userStore.showWallet.wallet!.metaIDJsWallet.getPublicKey({
                  path: '0/0',
                })
              : userStore.showWallet.wallet!.getPathPubliceKey('0/0').toHex()

            let signedTransaction
            if (userStore.metaletLogin) {
              const {
                signature,
              } = await userStore.showWallet.wallet!.metaIDJsWallet.signTransaction({
                transaction: {
                  txHex: unlockRes.data.txHex,
                  inputIndex: unlockRes.data.inputIndex,
                  scriptHex: unlockRes.data.scriptHex,
                  satoshis: Number(unlockRes.data.satoshis),
                },
              })
              console.log('signedTransactions', signature, pubKey)

              signedTransaction = signature.sig
            }
            console.log('zxxzczxcz', userStore.metaletLogin)
            const sig = userStore.metaletLogin
              ? signedTransaction
              : toHex(
                  signTx(
                    // @ts-ignore
                    tx,
                    userStore.showWallet.wallet!.getPathPrivateKey('0/0'),
                    script,
                    Number(unlockRes.data.satoshis),
                    unlockRes.data.inputIndex
                  )
                )
            console.log('sig', sig)
            //
            // const txHeex = new mvc.Transaction(sig)
            // // console.log('txHeex', txHeex)
            // //
            // // const txRes = await userStore.showWallet.wallet?.provider.broadcast(signedTransaction)
            // console.log('txtxRes', txHeex)
            //
            const unlock2Res = await Unlock2({
              symbol,
              requestIndex: stakeRes.data.requestIndex,
              pubKey,
              sig,
            })
            if (unlock2Res.code === 0) {
              emit('success')
              ElMessage.success(i18n.t('DAO.UnLock Successful'))
              emit('update:modelValue', false)
              percentage.value = 0
              amountNumber.value = 0
              loading.value = false
            }
          }
        } else if (transfer === null) {
          loading.value = false
        }
      }
    }
  } catch (error) {
    console.log('error', error)
    ElMessage.error((error as any).message)
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  result => {
    if (result) {
      getBlance().then(() => {
        isSkeleton.value = false
      })
    }
  }
)
</script>

<style lang="scss" scoped src="./StakeModal.scss"></style>
