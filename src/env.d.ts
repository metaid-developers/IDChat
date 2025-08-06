/// <reference types="vite-svg-loader" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  VITE_Hosts: string
  VITE_RedirectPath: string
  VITE_AppId: string
  VITE_AppSecret: string
  VITE_BASEAPI: string
  VITE_AppImgApi: string
  VITE_AuthUrl: string
  VITE_NftApi: string
  VITE_MetaIdTag: string
  VITE_WhatsonChain: string
  VITE_Genesis: string
  VITE_GenesisTxId: string
  VITE_CodeHash: string
  VITE_SensibleId: string
  VITE_CreateNeedMc: string
  VITE_AppAddress: string
  // 自适应
  VITE_Design_Size: string
  VITE_Min_FontSize: string
  // 打点钱包
  VITE_DotWallet_AppId: string
  VITE_DotWallet_AppSecret: string
  VITE_DotWallet_ENV: string
  VITE_AppName: string
  VITE_NET_WORK: Network
}


interface ImportMeta {
  readonly env: ImportMetaEnv
}
