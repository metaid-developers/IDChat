import {
  AppMsg,
  createBrfcChildNodeParams,
  CreateNodeBaseRes,
  CreateNodeBrfcRes,
  CreateNodeMetaFileRes,
  HdWalletCreateBrfcChildNodeParams,
  MetaIdJsRes,
  UtxoItem,
} from '@/@types/sdk'
import Decimal from 'decimal.js-light'
import {
  DEFAULTS,
  HdWallet,
  hdWalletFromAccount,
  hdWalletFromMnemonic,
  NftTransferResult,
} from '@/utils/wallet/hd-wallet'
import { MetaletWallet, TransactionInfo } from '@/utils/wallet/Metalet-wallet'
import { AttachmentItem } from '@/@types/hd-wallet'
import { router } from '@/router'
import { toClipboard } from '@soerenmartius/vue3-clipboard'
import { isAndroid, isAndroidApp, isIOS, isIosApp, useRootStore } from '@/stores/root'
import { PayToItem } from '@/@types/hd-wallet'
import {
  SdkPayType,
  NodeName,
  JobStepStatus,
  JobStatus,
  HdWalletChain,
  WalletTxVersion,
  Network,
} from '@/enum'
import { GetMeUtxos, GetMyMEBalance, GetProtocolMeInfo } from '@/api/v3'
import * as bsv from '@sensible-contract/bsv'
import { getLocalAccount } from './util'
import { Transaction } from 'dexie'

import { useUserStore } from '@/stores/user'
import { useJobsStore } from '@/stores/jobs'
import i18n from './i18n'
import SdkPayConfirmModalVue from '@/components/SdkPayConfirmModal/SdkPayConfirmModal.vue'
import { h, render } from 'vue'
import { mvc } from 'meta-contract'
import { v1 as UUID } from 'uuid'
import { useLayoutStore } from '@/stores/layout'
import { GetTx } from '@/api/metaid-base'
import AllNodeName from './AllNodeName'
import { GetMetafileBySha256 } from '@/api/aggregation'
import { getFtUtxo } from '@/api'
enum AppMode {
  PROD = 'prod',
  GRAY = 'gray',
  TEST = 'test',
  DEV2 = 'dev2',
}

enum Txkey {
  payToRes = 'payToRes',
  payToAddress = 'payToAddress',
  sendMoney = 'sendMoney',
  metaFileBrfc = 'metaFileBrfc',
  metaFiles = 'metaFiles',
  currentNodeBrfc = 'currentNodeBrfc',
  currentNode = 'currentNode',
  nft = 'nft',
  ft = 'ft',
}

export class MetaletSDK {
  // Nft收手续费的地址
  appAddress = {
    [AppMode.PROD]: '19NeJJM6eEa3bruYnqkTA4Cp6VvdFGSepd',
    [AppMode.TEST]: '1BrfsynMJ56gc2HFicgpBhEKRtRQYTm82E',
  }

  appMsg: AppMsg | null = null
  appMetaIdJs = (window as any).appMetaIdJsV2
  wallet: MetaletWallet | null = null
  //wallet: MetaletWallet | null = null
  isInitSdked = false
  network = Network.mainnet
  bfrcNodeList: { nodeName: NodeName; data: CreateNodeBrfcRes }[] = [] // 存储Brfc节点， 防止未广播时重复构建
  metaFileSha256TxIdList: { sha256: string; txId: string }[] = [] // 存储metaFileSha256TxId， 防止未广播时重复构建
  transactionsNFTKey = {
    [NodeName.NftGenesis]: 'genesis',
    [NodeName.NftTransfer]: 'transfer',
    [NodeName.NftSell]: 'sell',
    [NodeName.NftCancel]: 'cancel',
    [NodeName.nftBuy]: 'buy',
  }
  transactionsFTKey = {
    [NodeName.FtTransfer]: 'transfer',
    [NodeName.FtMerge]: 'merge',
  }

  constructor(params: { network: any; wallet: MetaletWallet }) {
    this.network = params.network
    this.wallet = params.wallet
    //this.wallet =
    if (this.appMetaIdJs) this.isInitSdked = true
  }

  randomString() {
    return Math.random()
      .toString()
      .replace('.', '')
  }

  initWallet() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.isInitSdked = true
        resolve()
      } catch (error) {
        console.error(error)
        reject(new Error('生成钱包失败' + (error as any).message))
      }
      // const userStore = useUserStore()
      // // if (userStore.metaletLogin) {
      // //   resolve()
      // //   return
      // // }
      // try {
      //   const account = getLocalAccount()
      //   const walletObj = await hdWalletFromAccount(
      //     {
      //       ...account.userInfo,
      //       password: account.password,
      //     },
      //     this.network,
      //     account.userInfo.path
      //   )

      //   const wallet = new HdWallet(walletObj.wallet)

      //   this.wallet = wallet
      //   this.isInitSdked = true
      //   resolve()
    })
  }

  initWalletFromMnemonic() {
    return new Promise<void>(async (resolve, reject) => {
      const userStore = useUserStore()
      try {
        const account = getLocalAccount()
        const walletObj = await hdWalletFromMnemonic(
          account.password,
          'new',
          import.meta.env.VITE_NET_WORK,
          userStore.user?.path
        )

        const wallet = new HdWallet(walletObj)

        this.wallet = wallet
        this.isInitSdked = true
        resolve()
      } catch (error) {
        console.error(error)
        reject(new Error('生成钱包失败' + (error as any).message))
      }
    })
  }

  checkAppHasMethod(methodName: string) {
    return new Promise<void>((resolve, reject) => {
      // @ts-ignore
      if (window.appMetaIdJsV2[methodName]) {
        resolve()
      } else {
        reject(Error('当前App版本不支持此功能，请先升级到最新版本使用'))
      }
    })
  }

  appSetUserInfo() {
    return new Promise<void>(async (resolve, reject) => {
      const userStore = useUserStore()
      await this.checkAppHasMethod('getUserInfo')
      const callback = async (res: MetaIdJsRes) => {
        try {
          if (typeof res === 'string') res = JSON.parse(res)
          if (res.code === 200) {
            if (res.appAccessToken) {
              res.data.token = res.appAccessToken
            }
            res.data.metaId = res.data.showId
            const userInfo = res.data
            if (userInfo) {
              userStore.updateUserInfo(userInfo)
              resolve()
            }
          } else {
            resolve()
          }
        } catch (error) {
          resolve()
        }
      }
      const functionName = `getUserInfoCallBack${this.randomString()}`
      // @ts-ignore
      window[functionName] = callback
      this.appMetaIdJs?.getUserInfo('', '', functionName)
    })
  }

  // 统一回调处理
  async callback(
    res: MetaIdJsRes,
    option?: {
      resolve?: (value: any) => any
      reject?: (reason: any) => void
    }
  ) {
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res)
      } catch (error) {
        if (option?.reject) option?.reject(error)
        else return error
      }
    }
    if (res.code !== 200 && res.code !== 205 && res.code !== 201) {
      if (option?.reject) {
        if (res.data.message) {
          option?.reject(new Error(res.data.message))
        } else {
          option?.reject(undefined)
        }
      } else return res
    } else {
      if (option?.resolve) option?.resolve(res.data)
      else return res.data
    }
  }

  getAppAddress() {
    const env =
      this.appMsg?.isProduction ||
      this.appMsg?.mode === AppMode.PROD ||
      this.appMsg?.mode === AppMode.GRAY
        ? AppMode.PROD
        : AppMode.TEST

    return this.appAddress[env]
  }

  // nft 转账
  transferNFT(
    params: {
      receiverAddress: string
      tokenIndex: string
      codehash: string
      genesis: string
    },
    option?: {
      isBroadcast: boolean
    }
  ) {
    return new Promise<{
      txHex: string
      txid: string
      tx: mvc.Transaction
    }>(async (resolve, reject) => {
      try {
        const userStore = useUserStore()
        await this.checkSdkStatus()
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('transferNFT')
          const callback = (res: MetaIdJsRes) => {
            this.callback(res, { reject, resolve })
          }
          const accessToken = userStore.user?.token
          const functionName = `nftSellCallBack${this.randomString()}`
          // @ts-ignore
          window[functionName] = callback
          this.appMetaIdJs.transferNFT(accessToken, JSON.stringify(params), functionName)
        } else {
          const res = await this.wallet?.transferNft(params, option)
          // @ts-ignore
          if (res) resolve(res)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  checkSdkStatus() {
    return new Promise<void>((resolve, reject) => {
      if (this.appMetaIdJs) {
        resolve()
      } else {
        const userStore = useUserStore()
        if (userStore.isAuthorized) {
          if (this.wallet) {
            resolve()
          } else {
            reject(new Error('生成钱包失败,请尝试重新登录'))
          }
        } else {
          reject(new Error('请先登录，再操作'))
        }
      }
    })
  }

  // 签名
  sigMessage(msg: string, path = '0/0') {
    return new Promise<string>(async (resolve, reject) => {
      try {
        await this.checkSdkStatus()
        const userStore = useUserStore()
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('sigMessage')
          const callback = (res: MetaIdJsRes) => {
            this.callback(res, { reject, resolve })
          }
          const callbackName = 'sigMessageCallback'
          // @ts-ignore
          window[callbackName] = callback
          this.appMetaIdJs!.sigMessage(
            userStore.user?.token,
            JSON.stringify({
              msg,
              path,
            }),
            callbackName
          )
        } else {
          const res = await this.wallet?.sigMessage(msg, path)
          if (res) {
            resolve(res)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  createBrfcChildNode(
    params: createBrfcChildNodeParams,
    option?: {
      isBroadcast?: boolean
      payType?: SdkPayType
      useQueue?: boolean
      subscribeId?: string
      checkOnly?: boolean //false弹窗，true不弹窗
      isStake?: boolean
      isTransfer?: boolean
    }
  ) {

    
    return new Promise<NodeTransactions | null>(async (resolve, reject) => {
      //
      console.log('option', option?.payType)
      
      const rootStore = useRootStore()
      const userStore = useUserStore()
      if (!rootStore.metaletWhiteProtocolList.includes(params.nodeName) && userStore.metaletLogin) {
        reject({
          message: 'Transactions initiated by this protocol are not currently supported.',
        })
        throw new Error('Transactions initiated by this protocol are not currently supported.')
      }

      const initOption = {
        isBroadcast: true,
        payType: userStore.getSdkPayment,
        useQueue: false,
        subscribeId: '',
        isStake: false,
        isTransfer: false,
      }
      const initParams = {
        appId: ['ShowV3', this.getOnLinkAppUrl(), this.getPlatform()],
        autoRename: true,
        version: '0.0.9',
        data: 'NULL',
        dataType: 'application/json',
        encoding: 'UTF-8',
        payTo: [],
        attachments: [],
        utxos: [],
        useFeeb: DEFAULTS.feeb,
      }
      params = {
        ...initParams,
        ...params,
      }
      const subscribeId = option?.subscribeId || (option?.useQueue ? UUID() : '')
      option = {
        ...initOption,
        ...option,
        subscribeId,
      }
      if (params.payTo && params.payTo.length) {
        params.payTo = params.payTo.filter(item => item.amount)
      }
      //
      try {
        // App 端
        if (this.appMetaIdJs) {
          await this.checkAppHasMethod('createBrfcChildNode')
          const functionName = `createBrfcChildNode${this.randomString()}`
          const callback: (res: string) => void = (res: any) => {
            this.callback(res, { resolve, reject })
          }
          // @ts-ignore
          window[functionName] = callback
          if (params.loading) delete params.loading
          if (params.attachments!.length > 0) {
            for (let i = 0; i < params.attachments!.length; i++) {
              // @ts-ignore
              params.attachments[i].data = params.attachments[i].hex
            }
          }
          this.appMetaIdJs.createBrfcChildNode(
            userStore.user?.token,
            JSON.stringify(params),
            functionName
          )
        } else {
          // 构建没有utxo 的所有 transactio metalet-change
          console.log('params', params)
          //
          let transactions = await this.createBrfcChildNodeTransactions(params)

          let payToRes: CreateNodeBaseRes | undefined = undefined
          if (!params.utxos!.length) {
            // 计算总价 预估
            let totalAmount = this.getNodeTransactionsAmount(transactions, params.payTo)
            if (params.nodeName == NodeName.FtTransfer) {
              totalAmount += 50000
            }
            const useSatoshis = totalAmount

            // 当时用Me支付时，总价 space 要转换为 ME 值 以下if判断不需要
            // if (option.payType === SdkPayType.ME) {
            //   const meInfo = await GetProtocolMeInfo({
            //     protocol: params.nodeName,
            //     address: userStore.user?.address!,
            //   })

            //   let useMe = Math.ceil(totalAmount / meInfo.me_rate_amount)

            //   if (useMe * 100 < meInfo.me_amount_min) useMe = meInfo.me_amount_min / 100
            //   totalAmount = useMe
            // }

            //  获取实际餘额

            let balance = await this.getBalance(option.payType!)
            if (balance < totalAmount) {
              throw new Error(i18n.global.t('Insufficient balance'))
              // metalet-change 报错余额不足
              // option.payType = SdkPayType.SPACE
              // totalAmount = useSatoshis
              // balance = await this.getBalance(option.payType!)
            }
            // 等待 确认支付
            const result = await this.awitSdkPayconfirm(
              option.payType!,
              totalAmount,
              balance!,
              option.checkOnly,
              option.isStake,
              option.isTransfer
            )

            if (result) {
              // 确认支付
              // 打钱地址

              //合并ftuxto
              if (params.nodeName == NodeName.FtTransfer) {
                const ftParams = JSON.parse(params.data!)
                const ftUtxo = await getFtUtxo({
                  address: this.wallet!.rootAddress,
                  codehash: ftParams.codehash,
                  genesis: ftParams.genesis,
                })

                if (ftUtxo.length && ftUtxo.length > 20) {
                  throw new Error(i18n.global.t('ftUtxo more than limited'))
                  let mergeAmount = '0'
                  // const getUtxoForMerge = await this.getAmountUxto({
                  //   sdkPayType: option.payType!,
                  //   amount: 50000,
                  //   nodeName: params.nodeName,
                  //   receive: {
                  //     address: this.wallet!.rootAddress,
                  //     addressIndex: 0,
                  //     addressType: 0,
                  //   },
                  // })
                  // const mergeFtUtxoParams = {
                  //   codehash: ftParams.codehash,
                  //   genesis: ftParams.genesis,
                  //   utxos: [getUtxoForMerge.utxo],
                  //   noBroadcast: false,
                  //   ownerWif: this.getPathPrivateKey('0/0')?.toString(),
                  //   changeAddress: this.wallet!.rootAddress,
                  // }
                  for (let utxo of ftUtxo) {
                    mergeAmount = new Decimal(mergeAmount).add(utxo.value).toString()
                  }
                  const mergeTransferUtxoParams = {
                    codehash: ftParams.codehash,
                    genesis: ftParams.genesis,
                    isMerge: true,
                    receivers: [
                      {
                        amount: mergeAmount,
                        address: this.wallet!.rootAddress,
                      },
                    ],
                  }

                  //const ftManager = this.wallet!.getFtManager()
                  const mergeRes = await this.wallet?.metaIDJsWallet.transfer({
                    tasks: [mergeTransferUtxoParams],
                    broadcast: true,
                  })

                  if (!mergeRes) {
                    throw new Error('merge FtUtxo failed')
                  }
                }
              }

              let receive = this.getNodeTransactionsFirstReceive(transactions, params)
              // 获取上链时的utxo metalet-change 以下getAmountUtxo 换成metalet相关

              const getUtxoRes = await this.getAmountUxto({
                sdkPayType: option.payType!,
                amount: useSatoshis,
                nodeName: params.nodeName,
                receive,
              })

              const currentUtxo = getUtxoRes.utxo
              if (getUtxoRes.payToRes) {
                payToRes = getUtxoRes.payToRes
              }

              // 使用utxo 组装 新的transactions
              console.log('transactions', transactions)
              //
              transactions = await this.setUtxoForCreateChileNodeTransactions(
                transactions,
                currentUtxo!,
                params,
                // 支付方式为Me时， 最后的找回地址是官方的地址， 不是就找回用户地址
                option.payType === SdkPayType.ME
                  ? import.meta.env.VITE_CHANGE_ADDRESS
                  : this.wallet!.rootAddress
              )

              /**
               * metalet-change setUtxoForCreateChileNodeTransactions 结束后进行签名 用metalet提供的方法
               */
              if (payToRes && payToRes.transaction) {
                transactions[Txkey.payToRes] = payToRes
              }
              const hexTxs = this.getHexTxs(transactions)
              console.log('hexTxs', hexTxs)

              const unSignTransations: TransactionInfo[] = []
              
              for (let i = 0; i < hexTxs.length; i++) {
                if (Array.isArray(hexTxs[i])) {
                  for (let j = 0; j < (hexTxs[i] as Array<any>).length; j++) {
                    const { transation } = hexTxs[i][j]
                    const { path } = await this.wallet.session.getAddressPath(
                      transation.inputs[0].output!.script.toAddress(this.network).toString()
                    )
                      
                    if (hexTxs[i].hasMetaId) {
                      unSignTransations.push({
                        txHex: transation.toString(),
                        address: transation.inputs[0]
                          .output!.script.toAddress(this.network)
                          .toString(),
                        inputIndex: 0,
                        scriptHex: transation.inputs[0].output!.script.toHex(),
                        satoshis: transation.inputs[0].output!.satoshis,
                        path: `0/${path}`,
                        hasMetaId: hexTxs[i].hasMetaId,
                        dataDependsOn: hexTxs[i].dataDependsOn,
                      })
                    } else {
                      unSignTransations.push({
                        txHex: transation.toString(),
                        address: transation.inputs[0]
                          .output!.script.toAddress(this.network)
                          .toString(),
                        inputIndex: 0,
                        scriptHex: transation.inputs[0].output!.script.toHex(),
                        satoshis: transation.inputs[0].output!.satoshis,
                        path: `0/${path}`,
                      })
                    }
                  }

                  // tx.forEach(txItem => {

                  // })
                } else {
                  //

                  const { transation } = hexTxs[i]
                  
                  console.log('transation', transation, hexTxs[i])

                  const { path } = await this.wallet.session.getAddressPath(
                    transation.inputs[0].output!.script.toAddress(this.network).toString()
                  )

                  //
                  if (hexTxs[i].hasMetaId) {
                    unSignTransations.push({
                      txHex: transation.toString(),
                      address: transation.inputs[0]
                        .output!.script.toAddress(this.network)
                        .toString(),
                      inputIndex: 0,
                      scriptHex: transation.inputs[0].output!.script.toHex(),
                      satoshis: transation.inputs[0].output!.satoshis,
                      path: `0/${path}`,
                      hasMetaId: hexTxs[i].hasMetaId,
                      dataDependsOn: hexTxs[i].dataDependsOn,
                    })
                  } else {
                    unSignTransations.push({
                      txHex: transation.toString(),
                      address: transation.inputs[0]
                        .output!.script.toAddress(this.network)
                        .toString(),
                      inputIndex: 0,
                      scriptHex: transation.inputs[0].output!.script.toHex(),
                      satoshis: transation.inputs[0].output!.satoshis,
                      path: `0/${path}`,
                    })
                  }
                }
              }
              // hexTxs.forEach(async tx => {

              // })
              console.log("unSignTransations",unSignTransations)
              
              const { signedTransactions } = await this.wallet!.metaIDJsWallet.signTransactions({
                transactions: unSignTransations,
              })

              // 广播
              let errorMsg: any

              hexTxs.forEach((hexTx, index) => {
                //console.log('hexTx', hexTx.txkey, signedTransactions[index].txHex)
                //
                if (Array.isArray(hexTx)) {
                  hexTx.forEach((hexTxItem, i) => {
                    //@ts-ignore
                    transactions[hexTxItem.txkey][i].txHex = signedTransactions[index].txHex
                  })
                } else if (
                  hexTx.operateKey &&
                  hexTx.operateKey == this.transactionsFTKey[NodeName.FtTransfer]
                ) {
                  transactions[hexTx.txkey][hexTx.operateKey].txHex =
                    signedTransactions[index].txHex
                } else if (
                  (hexTx.operateKey &&
                    hexTx.operateKey == this.transactionsNFTKey[NodeName.NftSell]) ||
                  hexTx.operateKey == this.transactionsNFTKey[NodeName.NftCancel] ||
                  hexTx.operateKey == this.transactionsNFTKey[NodeName.nftBuy]
                ) {
                  transactions[hexTx.txkey][hexTx.operateKey].txHex =
                    signedTransactions[index].txHex
                } else {
                  transactions[hexTx.txkey].txHex = signedTransactions[index].txHex
                }
              })
              console.log('option', option, transactions)

              // for (let i = 0; i < signedTransactions.length; i++) {
              //   try {
              //     const tx = signedTransactions[i]
              //     console.log('tx', tx)
              //     await this.wallet!.provider.broadcast(tx.txHex)
              //   } catch (error) {
              //     errorMsg = error
              //   }
              //   if (errorMsg) {
              //     break
              //   }
              // }
              // resolve
              // resolve({
              //   payToAddress: payToRes,
              //   ...transactions,
              //   subscribeId: option!.subscribeId,
              // })

              // if (userStore.metaletLogin) {
              //   option.isBroadcast = true
              // }
              if (option.isBroadcast && !option.useQueue) {
                // 广播 打钱操作
                //
                if (payToRes && payToRes.transaction) {
                  await this.wallet?.provider.broadcast(transactions.payToRes?.txHex)
                }
                // 广播 transactions 所有交易
                await this.broadcastNodeTransactions(transactions)
              }

              // 如果使用队列，则不进行广播，而是收集当次Job的所有交易作为step，推进队列
              if (option.useQueue) {
                this.convertTransactionsIntoJob(transactions, payToRes, option!.subscribeId!)
              }

              resolve({
                payToAddress: payToRes,
                ...transactions,
                subscribeId: option!.subscribeId,
              })
            } else {
              resolve(null)
            }
          } else {
            // 默认有 UTXO 不弹窗

            // 广播
            if (option.isBroadcast) {
              // 广播 打钱操作
              // if (payToRes && payToRes?.transaction) {
              //   await this.wallet?.provider.broadcast(payToRes.transaction.toString())
              // }
              // 广播 transactions 所有交易
              await this.broadcastNodeTransactions(transactions)
            }

            resolve({
              payToAddress: payToRes,
              ...transactions,
            })
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private convertTransactionsIntoJob(
    transactions: NodeTransactions,
    payToRes: CreateNodeBaseRes | undefined,
    subscribeId: string
  ) {
    const jobsStore = useJobsStore()
    const job: Job = {
      id: subscribeId,
      name: 'AReallyNormalJob',
      steps: [],
      status: JobStatus.Waiting,
    }
    const converting: Transaction[] = []

    // A. 收集交易
    // 1. 打钱交易
    if (payToRes && payToRes.transaction) {
      converting.push(payToRes.transaction)
    }
    // 2. Metafile Brfc交易
    if (transactions.metaFileBrfc?.transaction) {
      converting.push(transactions.metaFileBrfc.transaction)
    }
    // 3. Metafile 交易
    if (transactions.metaFiles && transactions.metaFiles.filter(item => item.transaction).length) {
      const metafileTransactionList = transactions.metaFiles.filter(item => item.transaction)
      for (let i = 0; i < metafileTransactionList.length; i++) {
        converting.push(metafileTransactionList[i].transaction)
      }
    }
    // 4. 当前节点 Brfc 交易
    if (transactions.currentNodeBrfc?.transaction) {
      converting.push(transactions.currentNodeBrfc.transaction)
    }
    // 5. 当前节点交易
    if (transactions.currentNode?.transaction) {
      converting.push(transactions.currentNode.transaction)
    }
    // 6. NFT issue 交易
    if (transactions.nft?.issue?.transaction) {
      converting.push(transactions.nft?.issue?.transaction)
    }

    // B. 将交易转换为step
    converting.forEach((tx: any) => {
      job.steps.push({
        txId: tx.id,
        txHex: tx.toString(),
        status: JobStepStatus.Waiting,
      })
    })

    // C. 将job推进队列
    jobsStore.push(job)
  }

  batchCreateBrfcChildNode(
    params: createBrfcChildNodeParams[],
    option?: {
      isBroadcast?: boolean
      payType?: SdkPayType
      callback?: (params: {
        index: number
        transactions: NodeTransactions
      }) => Promise<{
        isContinue: boolean
        error?: string
      }>
    }
  ) {
    return new Promise<null | {
      payToRes?: CreateNodeBaseRes
      transactionsList: NodeTransactions[]
    }>(async (resolve, reject) => {
      const initParams = {
        appId: ['ShowV3', this.getOnLinkAppUrl(), this.getPlatform()],
        autoRename: true,
        version: '0.0.9',
        data: 'NULL',
        dataType: 'application/json',
        encoding: 'UTF-8',
        payTo: [],
        attachments: [],
        utxos: [],
        useFeeb: DEFAULTS.feeb,
      }
      const userStore = useUserStore()
      const initOption = {
        isBroadcast: true,
        payType: userStore.getSdkPayment,
      }
      option = {
        ...initOption,
        ...option,
      }

      // 初始化 参数
      for (let i = 0; i < params.length; i++) {
        params[i] = {
          ...initParams,
          ...params[i],
        }
      }

      const transactionsList: NodeTransactions[] = []

      let payToRes: CreateNodeBaseRes | undefined = undefined
      let payToResIsbBroadcast = false

      // 构建tx 并机选总价
      let totalAmount = 0 // 总价
      let useSatoshis = 0
      for (let i = 0; i < params.length; i++) {
        const transactions = await this.createBrfcChildNodeTransactions(params[i])
        transactionsList.push(transactions)

        //  + transactions 价格
        totalAmount += this.getNodeTransactionsAmount(transactions, params[i].payTo)
        useSatoshis = totalAmount
      }

      // 使用MC 上链时，需要 把价格 换算成 ME
      if (option.payType === SdkPayType.ME) {
        const meInfo = await GetProtocolMeInfo({
          protocol: params[0].nodeName,
          address: userStore.user?.address!,
        })
        let useMe = Math.ceil(totalAmount / meInfo.me_rate_amount)
        if (useMe * 100 < meInfo.me_amount_min) useMe = meInfo.me_amount_min / 100
        totalAmount = useMe
      }

      // 获取餘额
      const balance = await this.getBalance(option.payType!)

      // 等待 确认支付
      const result = await this.awitSdkPayconfirm(option.payType!, totalAmount, balance!)
      if (result) {
        // 打钱地址
        let receive = this.getNodeTransactionsFirstReceive(transactionsList[0], params[0])

        // 获取上链时的utxo
        let currentUtxo: UtxoItem
        const getUtxoRes = await this.getAmountUxto({
          sdkPayType: option.payType!,
          amount: useSatoshis,
          nodeName: params[0].nodeName,
          receive,
        })
        currentUtxo = getUtxoRes.utxo
        if (getUtxoRes.payToRes) {
          payToRes = getUtxoRes.payToRes
        }

        let err // 广播错误？

        // 使用utxo 组装 每個 新的transactions
        for (let i = 0; i < transactionsList.length; i++) {
          try {
            //  下一个请求开始的第一个地址
            const nextNodeReceiveAddress =
              i < transactionsList.length - 1
                ? this.getNodeTransactionsFirstReceive(transactionsList[i + 1], params[i + 1])
                    .address
                : option.payType === SdkPayType.ME
                ? import.meta.env.VITE_CHANGE_ADDRESS
                : this.wallet!.rootAddress
            transactionsList[i] = await this.setUtxoForCreateChileNodeTransactions(
              transactionsList[i],
              currentUtxo!,
              params[i],
              nextNodeReceiveAddress
            )

            // 广播
            if (option.isBroadcast) {
              // 广播 打钱操作
              if (payToRes && payToRes.transaction && !payToResIsbBroadcast) {
                await this.wallet?.provider.broadcast(payToRes.transaction.toString())
                payToResIsbBroadcast = true
              }
              await this.broadcastNodeTransactions(transactionsList[i])
              if (option.callback) {
                const result = await option.callback({
                  index: i,
                  transactions: transactionsList[i],
                })
                if (!result.isContinue) {
                  err = new Error(result.error)
                  break
                }
              }
            }

            if (i !== transactionsList.length - 1) {
              //  获取 下一个请求 要用的 utxo
              currentUtxo = await this.wallet!.utxoFromTx({
                tx: this.getNodeTransactionsLastTx(transactionsList[i]),
              })
            }
          } catch (error) {
            err = error
          }

          if (err) {
            break
          }
        }

        // 广播
        // if (option.isBroadcast) {
        //   // 广播 打钱操作
        //   if (payToRes && payToRes.transaction) {
        //     await this.wallet?.provider.broadcast(payToRes.transaction.toString())
        //   }
        //   for (let i = 0; i < transactionsList.length; i++) {
        //     await this.broadcastNodeTransactions(transactionsList[i])
        //     if (option.callback) {
        //       const result = await option.callback({
        //         index: i,
        //         transactions: transactionsList[i],
        //       })
        //       if (!result.isContinue) {
        //         error = result.error
        //         break
        //       }
        //     }
        //   }
        // }

        if (err) {
          reject(err)
        } else {
          resolve({
            payToRes: payToRes,
            transactionsList,
          })
        }
      } else {
        resolve(null)
      }
    })
  }

  private createBrfcChildNodeTransactions(params: createBrfcChildNodeParams) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        //
        const userStore = useUserStore()
        //
        // 以下chain参数后续不需要了
        const chain = HdWalletChain.MVC //params?.payType === SdkPayType.BSV ? HdWalletChain.BSV : HdWalletChain.MVC
        let transactions: NodeTransactions = {}
        if (params.nodeName === NodeName.SendMoney) {
          // 只转钱
          const scriptPlayload = [import.meta.env.VITE_App_Key]
          const { tx, path } = await this.wallet?.makeTx({
            payTo: params.payTo,
            opReturn: [import.meta.env.VITE_App_Key],
            utxos: params.utxos,
            chain: chain,
          })

          if (tx) {
            transactions.sendMoney = {
              txId: tx.id,
              transaction: tx,
              scriptPlayload: scriptPlayload,
            }
          }
        } else if (this.isInfoNode(params.nodeName)) {
          // 非 Protocols节点    metalet-change
          const res = await this.wallet?.createNode({
            ...params,
            parentTxId: userStore.user!.infoTxId,
            chain,
          })
          transactions.currentNode = res
        } else {
          // Protocols 节点

          // 如果有附件
          if (params.attachments && params.attachments!.length > 0) {
            transactions.metaFileBrfc = await this.getBrfcNode(
              {
                nodeName: NodeName.MetaFile,
                parentTxId: userStore.user?.protocolTxId!,
                utxos: [],
                useFeeb: params.useFeeb,
              },
              {
                isBroadcast: false,
                chain,
              }
            )

            transactions.metaFiles = await this.createMetaFilesTransactions(
              transactions.metaFileBrfc!.txId,
              params.attachments,
              chain
            )
          }

          //  处理当前节点
          if (params.nodeName !== NodeName.MetaFile) {
            // 当前节点的brfc 节点
            if (params.publickey && params.txId) {
              // 修改
              const res = await GetTx(params.txId)
              if (res.code === 0) {
                const protocol = await this.wallet!.getProtocolInfo(
                  params.nodeName,
                  res.data.parentTxId,
                  res.data.parentData,
                  chain
                )
                transactions.currentNodeBrfc = {
                  address: res.data.parentAddress,
                  txId: res.data.parentTxId,
                  addressType: protocol!.addressType,
                  addressIndex: protocol!.addressIndex,
                }
              }
            } else {
              console.log('userStore.user', userStore.user)
              // 新增
              //

              transactions.currentNodeBrfc = await this.getBrfcNode(
                {
                  nodeName: params.nodeName,
                  parentTxId: userStore.user?.protocolTxId!,
                  utxos: params.utxos,
                  useFeeb: params.useFeeb,
                },
                { isBroadcast: false, chain }
              )
            }

            const createCurrentNodeParams = {
              ...params,
              publickey: params.publickey,
              brfcTxId: transactions.currentNodeBrfc!.txId,
              ...AllNodeName[params.nodeName as NodeName]!,
            }

            if (
              params.nodeName === NodeName.NftTransfer ||
              params.nodeName === NodeName.NftSell ||
              params.nodeName === NodeName.NftCancel ||
              params.nodeName === NodeName.nftBuy ||
              params.nodeName === NodeName.NftGenesis
            ) {
              // NFT genesis/transfer
              if (!transactions.nft) transactions.nft = {}

              const scriptPlayload = await this.getScriptPlayload(createCurrentNodeParams, chain)
              let _params = {
                opreturnData: scriptPlayload!,
                utxoMaxCount: 1,
              }
              _params = {
                ..._params,
                ...JSON.parse(params.data!),
              }
              const nftManager = this.wallet!.getNftManager()
              const NFTGetFeeFunctionName = {
                [NodeName.NftGenesis]: 'getGenesisEstimateFee',
                [NodeName.NftTransfer]: 'getTransferEstimateFee',
                [NodeName.NftSell]: 'getSellEstimateFee',
                [NodeName.NftCancel]: 'getCancelSellEstimateFee',
                [NodeName.nftBuy]: 'getBuyEstimateFee',
              }
              // @ts-ignore
              const feeNumber = await nftManager[NFTGetFeeFunctionName[params.nodeName]](_params)
              // @ts-ignore
              const res = {
                txId: '',
                transaction: {
                  getNeedFee: () => {
                    return feeNumber
                  },
                },
                scriptPlayload: [],
              }

              // @ts-ignore
              transactions.nft![this.transactionsNFTKey[params.nodeName]] = res
            } else if (params.nodeName === NodeName.FtTransfer) {
              // NFT genesis/transfer
              if (!transactions.ft) transactions.ft = {}

              const scriptPlayload: any[] = [] //await this.getScriptPlayload(createCurrentNodeParams, chain)
              let _params = {
                opreturnData: scriptPlayload!,
                utxoMaxCount: 3,
              }
              _params = {
                ..._params,
                ...JSON.parse(params.data!),
              }
              // const ftManager = this.wallet!.getFtManager()

              // const FTGetFeeFunctionName = {
              //   [NodeName.FtTransfer]: 'getTransferEstimateFee',
              // }

              // @ts-ignore
              const feeNumber = 20000 //await ftManager[FTGetFeeFunctionName[params.nodeName]](_params)
              // @ts-ignore
              const res = {
                txId: '',
                transaction: {
                  getNeedFee: () => {
                    return feeNumber
                  },
                },
                scriptPlayload: [],
              }

              // @ts-ignore
              transactions.ft![this.transactionsFTKey[params.nodeName]] = res
            } else {
              //
              //  transactions.currentNode
              transactions.currentNode = await this.wallet?.createBrfcChildNode(
                createCurrentNodeParams,
                {
                  isBroadcast: false,
                  chain,
                }
              )
              // nft issue
              if (params.nodeName === NodeName.NftIssue) {
                const data = JSON.parse(params.data!)
                const nftManager = this.wallet!.getNftManager()
                const response = await nftManager!.mint({
                  sensibleId: data.sensibleId,
                  metaTxId: transactions.currentNode!.txId,
                  noBroadcast: true,
                  metaOutputIndex: 0,
                  calcFee: true,
                })
                if (response) {
                  if (!transactions.nft) transactions.nft = {}
                  transactions.nft!.issue = {
                    txId: '',
                    transaction: {
                      // @ts-ignore
                      getNeedFee: () => {
                        return response.fee
                      },
                    },
                    tokenIndex: '0',
                  }
                }
              }
            }
          }
        }
        console.log('transactions', transactions)
        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  private getBrfcNode(
    params: CreateBrfcNodePrams,
    option?: { isBroadcast?: boolean; chain?: HdWalletChain }
  ) {
    return new Promise<CreateNodeBrfcRes>(async (resolve, reject) => {
      try {
        if (this.bfrcNodeList.some(item => item.nodeName === params.nodeName)) {
          resolve(this.bfrcNodeList.find(item => item.nodeName === params.nodeName)!.data)
        } else {
          console.log('params', params)

          const currentNodeBrfc = await this.wallet?.createBrfcNode(params, option)
          console.log('currentNodeBrfc', currentNodeBrfc)
          //
          this.bfrcNodeList.push({
            nodeName: params.nodeName,
            data: {
              ...currentNodeBrfc!,
              transaction: undefined,
            },
          })
          resolve(currentNodeBrfc!)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private getNodeTransactionsFirstReceive(
    transactions: NodeTransactions,
    params: createBrfcChildNodeParams
  ) {
    let receive: {
      address: string
      addressIndex: number
      addressType: number
    }
    //
    if (this.isInfoNode(NodeName.Name)) {
      receive = {
        address: this.wallet!.infoAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Info'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Info'].keyPath.split('/')[1]),
      }
    }
    if (transactions.sendMoney?.transaction) {
      receive = {
        address: this.wallet!.rootAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
      }
    } else if (transactions.metaFileBrfc?.transaction) {
      // 需要创建 metafile brfc 节点 ，把钱打去 protocol 地址
      receive = {
        address: this.wallet!.protocolAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]),
      }
    } else if (
      transactions.metaFiles &&
      transactions.metaFiles.filter(item => item.transaction).length
    ) {
      // 需要创建 metafile 节点 ，把钱打去 metafile brfc 地址
      receive = {
        address: transactions.metaFileBrfc!.address,
        addressType: transactions.metaFileBrfc!.addressType,
        addressIndex: transactions.metaFileBrfc!.addressIndex,
      }
    } else if (transactions.currentNodeBrfc?.transaction) {
      // 需要创建 brfc 节点 ，把钱打去 protocol 地址
      receive = {
        address: this.wallet!.protocolAddress,
        addressType: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]),
        addressIndex: parseInt(this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]),
      }
    } else if (transactions?.currentNodeBrfc) {
      receive = {
        address: transactions.currentNodeBrfc!.address,
        addressType: transactions.currentNodeBrfc!.addressType,
        addressIndex: transactions.currentNodeBrfc!.addressIndex,
      }
    }
    return receive
  }

  private getScriptPlayload(params: HdWalletCreateBrfcChildNodeParams, chain = HdWalletChain.MVC) {
    return new Promise<(string | Buffer)[]>(async (resolve, reject) => {
      const res = await this.wallet
        ?.createBrfcChildNode(params, {
          isBroadcast: false,
          chain,
        })
        .catch(error => {
          reject(error)
        })
      if (res) {
        resolve(res.scriptPlayload!)
      }
    })
  }

  private setUtxoForCreateChileNodeTransactions(
    transactions: NodeTransactions,
    utxo: UtxoItem,
    params: createBrfcChildNodeParams,
    lastChangeAddress: string
  ) {
    return new Promise<NodeTransactions>(async (resolve, reject) => {
      try {
        const chain = HdWalletChain.MVC
        if (params.nodeName === NodeName.SendMoney) {
          //
          this.setTransferUtxoAndOutputAndSign(
            transactions.sendMoney!.transaction,
            [utxo],
            lastChangeAddress
          )
          transactions.sendMoney!.txId = transactions.sendMoney!.transaction.id
          transactions.sendMoney!.utxo = utxo
        } else if (this.isInfoNode(params.nodeName)) {
          this.setTransferUtxoAndOutputAndSign(
            transactions.currentNode!.transaction,
            [utxo],
            lastChangeAddress
          )
          // 更新txId
          transactions.currentNode!.txId = transactions.currentNode!.transaction.id
          transactions.currentNode!.utxo = utxo
        } else {
          if (transactions.metaFileBrfc?.transaction) {
            this.setTransferUtxoAndOutputAndSign(
              transactions.metaFileBrfc.transaction,
              [utxo],
              transactions.metaFileBrfc.address
            )
            // 更新txId
            transactions.metaFileBrfc.txId = transactions.metaFileBrfc.transaction.id
            transactions.metaFileBrfc.utxo = utxo
            // 更新本地bfrcNodeList
            this.updateBfrcNodeList(NodeName.MetaFile, transactions.metaFileBrfc)

            // 组装新 utxo
            utxo = await this.wallet!.utxoFromTx({
              tx: transactions.metaFileBrfc.transaction,
              chain,
            })

            // 当有 metafile Brfc 改变时 metafile 节点也需要重新构建，因为父节点Brfc的txid 已改变
            transactions.metaFiles!.length = 0
            // 移除 旧的 metafile metaFileSha256TxIdList
            for (const item of params.attachments!) {
              const index = this.metaFileSha256TxIdList.findIndex(
                _item => _item.sha256 === item.sha256
              )
              if (index > -1) {
                this.metaFileSha256TxIdList.splice(index, 1)
              }
            }
            transactions.metaFiles = await this.createMetaFilesTransactions(
              transactions.metaFileBrfc!.txId,
              params.attachments,
              chain
            )
          }

          if (
            transactions.metaFiles &&
            transactions.metaFiles.filter(item => item.transaction).length
          ) {
            const metaFileTransactions = transactions.metaFiles.filter(item => item.transaction)
            for (let i = 0; i < metaFileTransactions.length; i++) {
              const changeAddress =
                i < metaFileTransactions.length - 1
                  ? transactions.metaFileBrfc!.address
                  : transactions.currentNodeBrfc?.transaction
                  ? this.wallet!.protocolAddress
                  : transactions.currentNode?.transaction ||
                    transactions.nft?.genesis?.transaction ||
                    transactions.nft?.transfer?.transaction
                  ? transactions.currentNodeBrfc!.address
                  : lastChangeAddress
              this.setTransferUtxoAndOutputAndSign(
                metaFileTransactions[i].transaction,
                [utxo],
                // 最后一个metafile 的找零地址 如果之后需要创建brfc节点 则打到 protocol 地址 否则 打到 bfr节点地址
                changeAddress
              )
              // 更新txId
              metaFileTransactions[i].txId = metaFileTransactions[i].transaction.id
              metaFileTransactions[i].utxo = utxo
              // 更新 所有的metafile Txid 待完善
              const metaFileSha256Index = this.metaFileSha256TxIdList.findIndex(
                _item => _item.sha256 === metaFileTransactions[i].sha256
              )
              if (metaFileSha256Index > -1) {
                this.metaFileSha256TxIdList[metaFileSha256Index].txId = metaFileTransactions[i].txId
              }

              // 组装新 utxo
              const addressInfo: any = {}
              if (i < metaFileTransactions.length - 1) {
                addressInfo.addressIndex = transactions.metaFileBrfc!.addressIndex
                addressInfo.addressType = transactions.metaFileBrfc!.addressType
              } else if (transactions.currentNodeBrfc?.transaction) {
                addressInfo.addressType = parseInt(
                  this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[0]
                )
                addressInfo.addressIndex = parseInt(
                  this.wallet!.keyPathMap['Protocols'].keyPath.split('/')[1]
                )
              } else if (
                transactions.nft?.issue?.transaction ||
                transactions.currentNode?.transaction
              ) {
                addressInfo.addressIndex = transactions.currentNodeBrfc!.addressIndex
                addressInfo.addressType = transactions.currentNodeBrfc!.addressType
              }
              utxo = await this.wallet!.utxoFromTx({
                tx: metaFileTransactions[i].transaction,
                addressInfo,
                chain,
                // addressInfo: {
                //   addressIndex: transactions.metaFileBrfc!.addressIndex,
                //   addressType: transactions.metaFileBrfc!.addressType,
                // },
              })
            }

            // 再循环一边， 把每个metafile txId 更新到最新的， 防止没有更新 ： batchCreateBrfcChildNode 的时候
            for (let i = 0; i < transactions.metaFiles.length; i++) {
              if (!transactions.metaFiles[i].transaction) {
                const index = this.metaFileSha256TxIdList.findIndex(
                  item => item.sha256 === transactions.metaFiles![i].sha256
                )
                if (index > -1) {
                  transactions.metaFiles[i].txId = this.metaFileSha256TxIdList[index].txId
                }
              }
            }
          }

          if (params.nodeName !== NodeName.MetaFile) {
            if (transactions.currentNodeBrfc?.transaction) {
              this.setTransferUtxoAndOutputAndSign(
                transactions.currentNodeBrfc.transaction,
                [utxo],
                transactions.currentNodeBrfc.address
              )

              // 更新txId
              transactions.currentNodeBrfc.txId = transactions.currentNodeBrfc.transaction.id
              transactions.currentNodeBrfc.utxo = utxo
              // 更新本地bfrcNodeList
              this.updateBfrcNodeList(params.nodeName, transactions.currentNodeBrfc)
              console.log('transactions', transactions)
              //
              // 组装新 utxo
              console.log(
                'transactions.currentNodeBrfc!.transaction',
                transactions.currentNodeBrfc!.transaction
              )

              utxo = await this.wallet!.utxoFromTx({
                tx: transactions.currentNodeBrfc!.transaction,
                chain,
              })

              console.log('utxo', utxo)

              //
            }

            // metafile txId变了，所以要改变currentNode 节点的data 对应数据
            if (transactions.metaFiles && transactions.metaFiles.length) {
              for (let i = 0; i < transactions.metaFiles.length; i++) {
                const fileSuffix = params.attachments![i].fileName.split('.')[
                  params.attachments![i].fileName.split('.').length - 1
                ]
                params.data = params.data!.replaceAll(
                  `$[${i}]`,
                  `${transactions.metaFiles[i].txId}.${fileSuffix}`
                )
              }
            }

            const createCurrentNodeParams = {
              ...params,
              brfcTxId: transactions.currentNodeBrfc!.txId!,
              ...AllNodeName[params.nodeName as NodeName]!,
            }
            //
            if (
              params.nodeName === NodeName.NftGenesis ||
              params.nodeName === NodeName.NftTransfer ||
              params.nodeName === NodeName.NftSell ||
              params.nodeName === NodeName.NftCancel ||
              params.nodeName === NodeName.nftBuy
            ) {
              const scriptPlayload = await this.getScriptPlayload(createCurrentNodeParams, chain)
              const nftManager = this.wallet!.getNftManager()
              const _params = {
                ...JSON.parse(params.data!),
                opreturnData: scriptPlayload,
                noBroadcast: true,
                utxos: [utxo],
                changeAddress: lastChangeAddress,
                sellerWif: this.getPathPrivateKey('0/0')?.toString(),
                buyerWif: this.getPathPrivateKey('0/0')?.toString(),
              }
              const NFTOperateFunName = {
                ...this.transactionsNFTKey,
                [NodeName.NftCancel]: 'cancelSell',
              }
              // @ts-ignore
              const res = await nftManager![NFTOperateFunName[params.nodeName]](_params)
              if (res && typeof res !== 'number') {
                if (params.nodeName === NodeName.NftGenesis) {
                  transactions.nft!.genesis = {
                    txId: res.txid!,
                    transaction: res.tx!,
                    // @ts-ignore
                    codehash: res!.codehash!,
                    // @ts-ignore
                    genesis: res!.genesis!,
                    // @ts-ignore
                    sensibleId: res!.sensibleId!,
                  }
                } else if (params.nodeName === NodeName.NftSell) {
                  transactions.nft!.sell = {
                    sellTransaction: res.sellTx!,
                    sellTxId: res.sellTxId!,
                    txId: res.txid!,
                    transaction: res.tx!,
                  }
                } else if (
                  params.nodeName === NodeName.nftBuy ||
                  params.nodeName === NodeName.NftCancel
                ) {
                  // @ts-ignore
                  transactions.nft![this.transactionsNFTKey[params.nodeName]] = {
                    txId: res.txid!,
                    transaction: res.tx!,
                    unlockCheckTxId: res.unlockCheckTxId!,
                    unlockCheckTransaction: res.unlockCheckTx!,
                  }
                } else {
                  // @ts-ignore
                  transactions.nft![this.transactionsNFTKey[params.nodeName]] = {
                    txId: res.txid!,
                    transaction: res.tx!,
                  }
                }
              }
            } else if (params.nodeName === NodeName.FtTransfer) {
              const scriptPlayload: any[] = [] //await this.getScriptPlayload(createCurrentNodeParams, chain)
              const ftManager = this.wallet!.getFtManager()
              const _params = {
                ...JSON.parse(params.data!),
                opreturnData: scriptPlayload,
                noBroadcast: true,
                utxos: [utxo],
                senderWif: this.getPathPrivateKey('0/0')?.toString(),
                changeAddress: lastChangeAddress,
              }
              const FTOperateFunName = this.transactionsFTKey
              // @ts-ignore
              const res = await ftManager![FTOperateFunName[params.nodeName]](_params)
              if (res && typeof res !== 'number') {
                console.log('res', res)

                // @ts-ignore
                transactions.ft![this.transactionsFTKey[params.nodeName]] = {
                  txId: res.txid!,
                  transaction: res.tx!,
                  checkTransaction: res.routeCheckTx,
                  checkTxId: res.routeCheckTx.id,
                }
              }
            } else {
              console.log('utxo', utxo)
              //

              const res = await this.wallet?.createBrfcChildNode(
                // @ts-ignore
                createCurrentNodeParams,
                {
                  isBroadcast: false,
                  chain,
                }
              )

              if (res) transactions.currentNode = res
              //
              this.setTransferUtxoAndOutputAndSign(
                transactions.currentNode!.transaction,
                [utxo],
                params.nodeName === NodeName.NftIssue ? this.wallet!.rootAddress : lastChangeAddress
              )
              console.log('currentNode', utxo)
              // 更新txId
              transactions.currentNode!.txId = transactions.currentNode!.transaction.id
              transactions.currentNode!.utxo = utxo

              if (params.nodeName === NodeName.NftIssue) {
                // 组装新 utxo
                utxo = await this.wallet!.utxoFromTx({
                  tx: transactions.currentNode!.transaction,
                  chain,
                })
                console.log('NftIssue', utxo)
                const data = JSON.parse(params.data!)
                const nftManager = this.wallet!.getNftManager()
                const res = await nftManager!.mint({
                  sensibleId: data.sensibleId,
                  metaTxId: transactions.currentNode!.txId,
                  noBroadcast: true,
                  metaOutputIndex: 0,
                  utxos: [utxo],
                  changeAddress: lastChangeAddress,
                })
                if (res) {
                  transactions.nft!.issue = {
                    tokenIndex: res.tokenIndex!,
                    transaction: res.tx,
                    // @ts-ignore
                    txId: res!.txid!,
                  }
                }
              }
            }
          }
        }

        // 把nft mvc transaction -> Bsv transaction
        if (params.payType === SdkPayType.BSV && transactions.nft) {
          for (let i in transactions.nft) {
            // @ts-ignore
            if (transactions.nft[i].transaction) {
              // @ts-ignore
              transactions.nft[i].transaction.version = WalletTxVersion.BSV
              // @ts-ignore
              transactions.nft[i].id = transactions.nft[i].transaction.id
            }
          }
        }
        resolve(transactions)
      } catch (error) {
        reject(error)
      }
    })
  }

  private createMetaFilesTransactions(
    metaFileBrfcTxId: string,
    attachments: AttachmentItem[] = [],
    chain: HdWalletChain
  ) {
    return new Promise<CreateNodeMetaFileRes[]>(async (resolve, reject) => {
      const transactions: CreateNodeMetaFileRes[] = []
      let err
      for (const item of attachments!) {
        try {
          //this.metaFileSha256TxIdList.some(_item => _item.sha256 == item.sha256)
          if (false) {
          } else {
            // 本地没有缓存
            const response = await GetMetafileBySha256({ sha256: item.sha256 })

            if (
              response.code === 0 &&
              response.data.results.items &&
              response.data.results.items.length
            ) {
              // 链上有
              transactions.push({
                txId: response.data.results.items[0].txId,
                sha256: item.sha256,
              })
              // 缓存到本地
              this.metaFileSha256TxIdList.push({
                sha256: item.sha256,
                txId: response.data.results.items[0].txId,
              })
            } else {
              // 本地 和 链上 都没有

              const res = await this.wallet?.createNode({
                nodeName: item.fileName,
                metaIdTag: import.meta.env.VITE_METAID_TAG,
                encrypt: item.encrypt,
                data: item.data,
                dataType: item.fileType,
                encoding: 'binary',
                parentTxId: metaFileBrfcTxId,
                chain,
              })
              if (res) {
                this.metaFileSha256TxIdList.push({
                  sha256: item.sha256,
                  txId: res.txId,
                })
                transactions.push({
                  ...res,
                  sha256: item.sha256,
                })
              }
            }
          }
        } catch (error) {
          err = error
        }

        if (err) {
          break
        }
      }

      if (err) {
        reject(err)
      } else {
        resolve(transactions)
      }
    })
  }

  // 更新本地存储的brfc节点信息
  private updateBfrcNodeList(nodeName: NodeName, nodeInfo: CreateNodeBrfcRes) {
    const index = this.bfrcNodeList.findIndex(item => item.nodeName === nodeName)
    if (index !== -1) {
      this.bfrcNodeList[index].data = {
        ...nodeInfo,
        transaction: undefined,
      }
    }
  }

  public broadcastNodeTransactions(
    transactions: NodeTransactions,
    option?: {
      notBroadcastKeys?: string[]
    }
  ) {
    return new Promise<void>(async (resolve, reject) => {
      //
      try {

        
        //  廣播  payToAddress
        if (
          !option?.notBroadcastKeys?.includes('payToAddress') &&
          transactions.payToAddress?.transaction
        ) {
          await this.wallet?.provider.broadcast(transactions.payToAddress.txHex)
        }
        // 广播 SendMoney
        if (
          !option?.notBroadcastKeys?.includes('sendMoney') &&
          transactions.sendMoney?.transaction
        ) {
          await this.wallet?.provider.broadcast(transactions.sendMoney.txHex)
        }
        // 广播 Metafile Brfc
        if (
          !option?.notBroadcastKeys?.includes('metaFileBrfc') &&
          transactions.metaFileBrfc?.transaction
        ) {
          await this.wallet?.provider.broadcast(transactions.metaFileBrfc.txHex)
        }
        // 广播 Metafile
        if (
          !option?.notBroadcastKeys?.includes('metaFiles') &&
          transactions.metaFiles &&
          transactions.metaFiles.length
        ) {
          let catchError
          for (let i = 0; i < transactions.metaFiles.filter(item => item.transaction).length; i++) {
            try {
              await this.wallet?.provider.broadcast(transactions.metaFiles[i].txHex)
            } catch (error) {
              catchError = (error as any).message
              break
            }
          }
          if (catchError) {
            throw new Error(catchError)
          }
        }
        // 广播当前节点的Brfc节点
        if (
          !option?.notBroadcastKeys?.includes('currentNodeBrfc') &&
          transactions.currentNodeBrfc?.transaction
        ) {
          await this.wallet?.provider.broadcast(transactions.currentNodeBrfc.txHex)
        }
        // 广播当前节点
        if (
          !option?.notBroadcastKeys?.includes('currentNode') &&
          transactions.currentNode?.transaction
        ) {
          await this.wallet?.provider.broadcast(transactions.currentNode.txHex)
        }

        // 广播 nft
        if (!option?.notBroadcastKeys?.includes('nft') && transactions.nft) {
          for (let i in transactions.nft) {
            if (i === 'sell' && !option?.notBroadcastKeys?.includes('sell')) {
              // sell 先广播 sellTransaction
              await this.wallet?.provider.broadcast(transactions.nft[i]!.txHex!)
              //await this.wallet?.provider.broadcast(transactions.nft[i]?.sellTransaction.toString())
            } else if (i === 'buy' || (i === 'cancel' && !option?.notBroadcastKeys?.includes(i))) {
              //  buy / cancel 先广播 unlockCheckTransaction
              // await this.wallet?.provider.broadcast(
              //   transactions.nft[i]!.unlockCheckTransaction.toString()
              // )
              await this.wallet?.provider.broadcast(transactions.nft[i]!.txHex!)
            }

            if (!option?.notBroadcastKeys?.includes(i)) {
              // @ts-ignore
              await this.wallet?.provider.broadcast(transactions.nft[i].txHex)
              //await this.wallet?.provider.broadcast(transactions.nft[i].transaction.toString())
            }
          }
        }

        //ft
        if (!option?.notBroadcastKeys?.includes('ft') && transactions.ft) {
          for (let i in transactions.ft) {
            if (i === 'transfer') {
              await this.wallet?.provider.broadcast(
                //transactions.ft.transfer?.checkTransaction.toString()
                transactions.ft.transfer!.txHex!
              )
            }

            // @ts-ignore
            await this.wallet?.provider.broadcast(transactions.ft[i].txHex)
          }
        }

        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  public getHexTxs(
    transactions: NodeTransactions,
    option?: {
      notBroadcastKeys?: string[]
    }
  ) {
    const hexTxs = []
    // PayToAddress
    if (transactions.payToRes?.transaction) {
      hexTxs.push({
        hex: transactions.payToRes.transaction.toString(),
        transation: transactions.payToRes.transaction,
        txkey: Txkey.payToRes,
      })
    }
    if (
      !option?.notBroadcastKeys?.includes('payToAddress') &&
      transactions.payToAddress?.transaction
    ) {
      hexTxs.push({
        hex: transactions.payToAddress.transaction.toString(),
        transation: transactions.payToAddress.transaction,
        txkey: Txkey.payToAddress,
      })
    }
    //  SendMoney
    if (!option?.notBroadcastKeys?.includes('sendMoney') && transactions.sendMoney?.transaction) {
      hexTxs.push({
        hex: transactions.sendMoney.transaction.toString(),
        transation: transactions.sendMoney.transaction,
        txkey: Txkey.sendMoney,
      })
    }
    //  Metafile Brfc
    if (
      !option?.notBroadcastKeys?.includes('metaFileBrfc') &&
      transactions.metaFileBrfc?.transaction
    ) {
      hexTxs.push({
        hex: transactions.metaFileBrfc.transaction.toString(),
        transation: transactions.metaFileBrfc.transaction,
        txkey: Txkey.metaFileBrfc,
      })
    }
    //  Metafile
    if (
      !option?.notBroadcastKeys?.includes('metaFiles') &&
      transactions.metaFiles &&
      transactions.metaFiles.length
    ) {
      const newTransactionMetafile = []
      for (let i = 0; i < transactions.metaFiles.filter(item => item.transaction).length; i++) {
        newTransactionMetafile.push({
          hex: transactions.metaFiles[i].transaction.toString(),
          transation: transactions.metaFiles[i].transaction,
          txkey: Txkey.metaFiles,
        })
      }

      transactions.metaFiles = newTransactionMetafile
      hexTxs.push(transactions.metaFiles)
    }
    // 广播当前节点的Brfc节点
    if (
      !option?.notBroadcastKeys?.includes('currentNodeBrfc') &&
      transactions.currentNodeBrfc?.transaction
    ) {
      hexTxs.push({
        hex: transactions.currentNodeBrfc.transaction.toString(),
        transation: transactions.currentNodeBrfc.transaction,
        txkey: Txkey.currentNodeBrfc,
      })
    }
    // 广播当前节点
    if (
      !option?.notBroadcastKeys?.includes('currentNode') &&
      transactions.currentNode?.transaction
    ) {
      if (transactions.currentNodeBrfc?.transaction) {
        hexTxs.push({
          hex: transactions.currentNode.transaction.toString(),
          transation: transactions.currentNode.transaction,
          txkey: Txkey.currentNode,
          hasMetaId: true,
          dataDependsOn: 1,
        })
      } else {
        hexTxs.push({
          hex: transactions.currentNode.transaction.toString(),
          transation: transactions.currentNode.transaction,
          txkey: Txkey.currentNode,
        })
      }
    }

    // 广播 nft

    if (!option?.notBroadcastKeys?.includes('nft') && transactions.nft) {
      for (let i in transactions.nft) {
        if (i === 'sell' && !option?.notBroadcastKeys?.includes('sell')) {
          // sell 先广播 sellTransaction
          hexTxs.push({
            hex: transactions.nft[i]?.sellTransaction.toString(),
            transation: transactions.nft[i]?.sellTransaction,
            txkey: Txkey.nft,
            operateKey: this.transactionsNFTKey[NodeName.NftSell],
          })
        } else if (i === 'buy' || (i === 'cancel' && !option?.notBroadcastKeys?.includes(i))) {
          //  buy / cancel 先广播 unlockCheckTransaction
          hexTxs.push({
            hex: transactions.nft[i]!.unlockCheckTransaction.toString(),
            transation: transactions.nft[i]!.unlockCheckTransaction,
            txkey: Txkey.nft,
            operateKey: i,
          })
        }

        if (!option?.notBroadcastKeys?.includes(i)) {
          // @ts-ignore
          hexTxs.push({
            // @ts-ignore
            hex: transactions.nft[i]!.transaction.toString(),
            // @ts-ignore
            transation: transactions.nft[i]!.transaction,
            txkey: Txkey.nft,
          })
        }
      }
    }

    //ft
    if (!option?.notBroadcastKeys?.includes('ft') && transactions.ft) {
      for (let i in transactions.ft) {
        if (i === 'transfer') {
          hexTxs.push({
            hex: transactions.ft.transfer?.checkTransaction.toString(),
            transation: transactions.ft.transfer?.checkTransaction,
            txkey: Txkey.ft,
            operateKey: this.transactionsFTKey[NodeName.FtTransfer],
          })
        }
        hexTxs.push({
          // @ts-ignore
          hex: transactions.ft[i].transaction.toString(),
          // @ts-ignore
          transation: transactions.ft[i].transaction,
          txkey: Txkey.ft,
        })
      }
    }

    return hexTxs
  }

  private getNodeTransactionsAmount(transactions: NodeTransactions, payTo: PayToItem[] = []) {
    let amount = 0
    // 计算总价
    // metafile brfc 节点价格

    if (transactions.sendMoney?.transaction) {
      amount += mvc.Transaction.DUST_AMOUNT + mvc.Transaction.DUST_AMOUNT
    }
    if (transactions.metaFileBrfc?.transaction)
      amount += transactions.metaFileBrfc.transaction.getNeedFee()
    // metafile 节点价格

    if (transactions.metaFiles && transactions.metaFiles.length > 0) {
      for (const item of transactions.metaFiles.filter(item => item.transaction)) {
        amount += item.transaction.getNeedFee()
      }
    }
    // brfc 节点价格
    if (transactions.currentNodeBrfc?.transaction)
      amount += transactions.currentNodeBrfc.transaction.getNeedFee()
    // 节点价格
    if (transactions.currentNode?.transaction)
      amount += transactions.currentNode.transaction.getNeedFee()

    if (transactions.nft) {
      for (let i in transactions.nft) {
        // @ts-ignore
        amount += transactions.nft[i].transaction.getNeedFee()
      }
    }
    // payTo 价格
    if (payTo && payTo.length > 0) {
      for (const item of payTo) {
        amount += item.amount
      }
    }

    return amount
  }

  private getBalance(type: SdkPayType) {
    return new Promise<number>(async (resolve, reject) => {
      try {
        let balance = 0
        const userStore = useUserStore()
        if (type === SdkPayType.SPACE) {
          // 使用bsv 上链时，不需要检查权限
          // 获取餘额

          const res = await this.wallet?.provider.getXpubBalance(
            //this.wallet.wallet.xpubkey.toString()
            this.wallet.rootAddress
          )
          console.log('res', res)
          //
          if (typeof res === 'number') balance = res
        } else if (type === SdkPayType.ME) {
          const userMeRes = await GetMyMEBalance({
            address: userStore.user?.address!,
          })
          if (userMeRes.code === 0) {
            balance = userMeRes.data.count / 100
          }
        } else if (type === SdkPayType.BSV) {
          const res = await this.wallet?.provider.getXpubBalance(
            this.wallet.rootAddress,
            HdWalletChain.BSV
          )
          if (typeof res === 'number') balance = res
        }
        resolve(balance)
      } catch (error) {
        reject(error)
      }
    })
  }

  getAmountUxto(params: {
    sdkPayType: SdkPayType
    amount: number
    nodeName: NodeName
    receive: {
      address: string
      addressType: number
      addressIndex: number
    }
  }) {
    return new Promise<{
      utxo: UtxoItem
      payToRes?: CreateNodeBaseRes
    }>(async (resolve, reject) => {
      const userStore = useUserStore()
      let utxo: UtxoItem
      let payToRes: CreateNodeBaseRes | undefined = undefined
      try {
        if (params.sdkPayType === SdkPayType.SPACE || params.sdkPayType === SdkPayType.BSV) {
          const chain = params.sdkPayType === SdkPayType.BSV ? HdWalletChain.BSV : HdWalletChain.MVC

          let allUtxos = await this.wallet?.metaIDJsWallet.getUtxos({ path: '0/0' })

          allUtxos = allUtxos?.map(utxo => {
            return {
              ...utxo,
              addressType: 0,
              addressIndex: 0,
            }
          })
          console.log('allUtxos', allUtxos)

          let useUtxos = []
          if (allUtxos && allUtxos?.length > 0) {
            // 总价加个 最小金额  给转账费用
            let leftAmount = params.amount + mvc.Transaction.DUST_AMOUNT
            for (let i = 0; i < allUtxos.length; i++) {
              if (leftAmount > 0) {
                useUtxos.push(allUtxos[i])
                leftAmount -= allUtxos[i].value
              } else {
                break
              }
            }
            if (leftAmount > 0) {
              // @ts-ignore
              throw new Error(i18n.global.t('Insufficient balance'))
            } else {
              if (allUtxos.length > 1) {
                useUtxos = []
                const txid = await this.wallet?.metaIDJsWallet.merge().catch(e => {
                  reject({
                    message: e.toString(),
                  })
                })

                if (txid.status !== 'canceled') {
                  let newUtxo = await this.wallet?.metaIDJsWallet.getUtxos({ path: '0/0' })

                  newUtxo = {
                    ...newUtxo[0],
                    addressType: 0,
                    addressIndex: 0,
                  }
                  useUtxos.push(newUtxo)
                } else {
                  throw new Error('Cancel transaction')
                }
              }
              const { tx, path } = await this.wallet?.makeTx({
                utxos: useUtxos,
                opReturn: [],
                change: this.wallet.rootAddress,
                payTo: [
                  {
                    amount: params.amount,
                    address: params.receive.address,
                  },
                ],
                chain,
              })
              if (tx) {
                payToRes = {
                  transaction: tx,
                  txId: tx.id,
                }
                //
                utxo = await this.wallet!.utxoFromTx({
                  tx: payToRes.transaction,
                  outPutIndex: 0,
                  chain,
                })
                console.log('utxo', utxo)
                //
              }
            }
          }
        } else {
          const getMeUtxo = await GetMeUtxos({
            address: userStore.user!.address,
            amount: params.amount,
            meta_id: userStore.user!.metaId,
            protocol: params.nodeName,
            // 打钱地址： 如果需要创建brfc节点则打到 protocol 地址，否则打到 brfc 节点地址
            receive_address: params.receive.address,
          })
          if (getMeUtxo.code === 0) {
            utxo = {
              address: getMeUtxo.data.address,
              // utxo 所在的路径
              addressIndex: params.receive.addressIndex,
              addressType: params.receive!.addressType,
              outputIndex: 0,
              txId: getMeUtxo.data.tx,
              xpub: this.wallet?.xpubkey,
              script: getMeUtxo.data.script,
              satoshis: getMeUtxo.data.amount,
              amount: getMeUtxo.data.amount / 1e8,
              wif: this.getPathPrivateKey(
                `${params.receive!.addressType}/${params.receive!.addressIndex}`
              )!.toString(),
            }
          }
        }
        resolve({
          utxo: utxo!,
          payToRes: payToRes,
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private awitSdkPayconfirm(
    payType: SdkPayType,
    useAmount: number,
    balance: number,
    checkOnly: boolean = false,
    isStake: boolean = false,
    isTransfer: boolean = false
  ) {
    return new Promise<boolean>((resolve, reject) => {
      const userStore = useUserStore()
      if (
        !checkOnly &&
        (userStore.sdkPayConfirm[payType].visible ||
          (!userStore.sdkPayConfirm[payType].visible &&
            userStore.sdkPayConfirm[payType].value < useAmount))
      ) {
        // 需要弹出确认框操作
        const divId = `sdk-pay-conirm-${new Date().getTime()}`
        const div = document.createElement('div')
        div.id = divId
        document.body.append(div)
        render(
          // @ts-ignore
          h(SdkPayConfirmModalVue, {
            i18n: i18n.global,
            confirmVisible: userStore.sdkPayConfirm[payType].visible,
            useAmount,
            maxCount: userStore.sdkPayConfirm[payType].value,
            balance,
            router,
            payType,
            isStake,
            isTransfer,
            onChangeConfirmVisible: (res: boolean) => {
              userStore.changeSdkPayConfirm('visible', res, payType)
            },
            onConfirm: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(true)
            },
            onCancel: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(false)
            },
            onRecharge: () => {
              setTimeout(() => {
                document.getElementById(divId)?.remove()
              }, 500)
              resolve(false)
              const layout = useLayoutStore()
              layout.$patch({ isShowWallet: true })
            },
          }),
          document.getElementById(divId)!
        )
      } else {
        // 不需要弹出 确认框操作
        resolve(true)
      }
    })
  }

  private getNodeTransactionsLastTx(transactions: NodeTransactions) {
    if (transactions.sendMoney?.transaction) {
      return transactions.sendMoney?.transaction
    } else if (transactions.nft) {
      if (transactions.nft.genesis) {
        return transactions.nft?.genesis?.transaction
      } else if (transactions.nft.transfer) {
        return transactions.nft?.transfer?.transaction
      } else if (transactions.nft.issue) {
        return transactions.nft?.issue?.transaction
      }
    } else if (transactions.currentNode?.transaction) {
      return transactions.currentNode?.transaction
    } else if (transactions.currentNodeBrfc?.transaction) {
      return transactions.currentNodeBrfc?.transaction
    } else if (transactions.metaFiles && transactions.metaFiles.length) {
      return transactions.metaFiles[transactions.metaFiles.length - 1].transaction
    } else if (transactions.metaFileBrfc?.transaction) {
      return transactions.metaFileBrfc?.transaction
    }
  }

  getPlatform() {
    return isIosApp
      ? 'iosApp'
      : isIOS
      ? 'ios:web'
      : isAndroidApp
      ? 'androidApp'
      : isAndroid
      ? 'android:web'
      : 'web'
  }

  getOnLinkAppUrl() {
    return import.meta.env.MODE === 'mainnet'
      ? 'https://show3.io'
      : import.meta.env.MODE === 'mainnetgray'
      ? 'gray'
      : import.meta.env.MODE === 'gray'
      ? 'test'
      : 'dev'
  }

  // 保存文件
  downloadFile(url: string, name = 'file') {
    return new Promise<void>(async resolve => {
      if (this.appMetaIdJs) {
        const userStore = useUserStore()
        await this.checkAppHasMethod('saveShareImage')
        window.appMetaIdJsV2.saveShareImage(userStore.user?.token, url, name)
        resolve()
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        resolve()
      }
    })
  }

  // 去登录， 兼容 iosApp 和其他情况
  toLogin(fullpath: string) {
    if (this.appMetaIdJs) {
      this.appMetaIdJs.needLogin('', '', '')
    } else {
      router.push({
        name: 'preLogin',
        query: {
          redirect: fullpath,
        },
      })
    }
  }

  // 分享链接， App 走 sdk可以直接分享到微信等等
  shareUrl(params: { url: string; text: string }) {
    return new Promise<void>(async (resolve, reject) => {
      if (this.appMetaIdJs) {
        await this.checkAppHasMethod('shareUrl')
        this.appMetaIdJs.shareUrl('', JSON.stringify(params), '')
      } else {
        toClipboard(params.text)
          .then(() => {
            resolve()
          })
          .catch(error => {
            reject(error)
          })
      }
    })
  }

  // 批量转NFT
  /**
   *
   * @param nftList
   * {
      receiverAddress: string
      codehash: string
      genesis: string
      tokenIndex: string
      sensibleId: string
      gensisiTxid:string
    }
   * @returns
   */
  public async batchTransferNft(
    NftList: any[],
    receiverAddress: string,
    noBroadcast = false
  ): Promise<any> {
    return new Promise<PromiseSettledResult<NftTransferResult>[]>(async (resolve, reject) => {
      try {
        if (this.appMetaIdJs) {
          reject(new Error('App暂不支持，请在H5端使用此功能'))
        } else {
          const res = await this.wallet?.batchTransferNft(NftList, receiverAddress, noBroadcast)
          if (res) {
            resolve(res)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  setTransferUtxoAndOutputAndSign(
    tx: bsv.Transaction,
    utxos: UtxoItem[],
    changeAddress: string,
    useFeeb = DEFAULTS.feeb
  ) {
    console.log('utxos', utxos, changeAddress, tx)
    //
    tx.from(utxos)
    //
    // @ts-ignore
    // if (tx.isNeedChange()) {
    // }

    tx.change(changeAddress)
    // @ts-ignore
    tx.fee(Math.ceil(tx._estimateSize() * useFeeb))

    // @ts-ignore
    // if (tx.isNeedChange()) {
    //   // tx.change(changeAddress)
    //   tx.addOutput(
    //     new bsv.Transaction.Output({
    //       // satoshis: Math.floor(
    //       //   brfcChildTransaction._getUnspentValue() -
    //       //     // @ts-ignore
    //       //     brfc.transaction.getNeedFee()
    //       // ),
    //       // @ts-ignore
    //       satoshis: tx.getChangeAmount(),
    //       script: bsv.Script.fromAddress(changeAddress),
    //     })
    //   )
    // }
    // const privateKeys = this.wallet!.getUtxosPrivateKeys(utxos)
    // // @ts-ignore
    // tx.sign(privateKeys)
    // return {
    //   transation: tx,
    // }
  }

  /**
   * ECIES 解密
   */
  eciesDecryptData(params: {
    data: string | Buffer
    privateKey?: mvc.PrivateKey | string
    publicKey?: string
  }) {
    return new Promise<string>(async (resolve, reject) => {
      if (this.appMetaIdJs) {
        await this.checkAppHasMethod('eciesDecryptData')
        const callback = (res: MetaIdJsRes) => {
          this.callback(res, { reject, resolve })
        }
        const callbackName = 'eciesDecryptDataCallback'
        // @ts-ignore
        window[callbackName] = callback
        const userStore = useUserStore()
        this.appMetaIdJs.eciesDecryptData(
          userStore.user?.token,
          JSON.stringify(params),
          callbackName
        )
      } else {
        const result = this.wallet!.eciesDecryptData(
          params.data,
          // @ts-ignore
          params.privateKey,
          params.publicKey
        )
        resolve(result)
      }
    })
  }

  getPathPrivateKey(path: string) {
    return this.wallet?.getPathPrivateKey(path)
  }

  isNFTProtocol(nodeName: NodeName) {
    if (
      nodeName === NodeName.NftGenesis ||
      nodeName === NodeName.NftIssue ||
      nodeName === NodeName.NftTransfer
    ) {
      return true
    } else {
      return false
    }
  }

  isFTProtocol(nodeName: NodeName) {
    const nfts = [NodeName.FtGenesis, NodeName.FtIssue, NodeName.NftSell]
    if (nfts.includes(nodeName)) {
      return true
    } else {
      return false
    }
  }

  ftGenesis() {
    return this.wallet?.ftGenesis()
  }

  async sendMoney(payTo: Array<{ amount: number; address: string }>) {
    const Utxos = await this.wallet?.provider.getUtxos(this.wallet.xpubkey.toString())

    const res = await this.wallet?.makeTx({
      utxos: Utxos,
      opReturn: [],
      change: this.wallet.rootAddress,
      payTo: payTo,
    })

    return await this.wallet?.provider.broadcast(res!.toString())
  }

  isInfoNode(nodeName: NodeName) {
    const target = AllNodeName[nodeName]
    if (target) {
      if (target.path === 'info') {
        return true
      } else {
        false
      }
    } else {
      // @ts-ignore
      throw new Error(i18n.global.t('Not Found Node Name') + ':' + nodeName)
    }
  }
}
