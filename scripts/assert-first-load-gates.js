const fs = require('fs')
const path = require('path')

const mainPath = path.resolve(__dirname, '../src/main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf8')
const appPath = path.resolve(__dirname, '../src/App.vue')
const source = fs.readFileSync(appPath, 'utf8')
const channelHeaderPath = path.resolve(__dirname, '../src/views/talk/components/ChannelHeader.vue')
const channelHeaderSource = fs.readFileSync(channelHeaderPath, 'utf8')
const channelBodyPath = path.resolve(__dirname, '../src/views/talk/components/ChannelBody.vue')
const channelBodySource = fs.readFileSync(channelBodyPath, 'utf8')
const channelPath = path.resolve(__dirname, '../src/views/talk/Channel.vue')
const channelSource = fs.readFileSync(channelPath, 'utf8')
const routerPath = path.resolve(__dirname, '../src/router.ts')
const routerSource = fs.readFileSync(routerPath, 'utf8')
const permissionPath = path.resolve(__dirname, '../src/utils/permission.ts')
const permissionSource = fs.readFileSync(permissionPath, 'utf8')
const directContactListPath = path.resolve(
  __dirname,
  '../src/views/talk/components/direct-contact/List.vue'
)
const directContactListSource = fs.readFileSync(directContactListPath, 'utf8')
const chainStorePath = path.resolve(__dirname, '../src/stores/chain.ts')
const chainStoreSource = fs.readFileSync(chainStorePath, 'utf8')
const simpleTalkPath = path.resolve(__dirname, '../src/stores/simple-talk.ts')
const simpleTalkSource = fs.readFileSync(simpleTalkPath, 'utf8')
const talkApiPath = path.resolve(__dirname, '../src/api/talk.ts')
const talkApiSource = fs.readFileSync(talkApiPath, 'utf8')
const apiIndexPath = path.resolve(__dirname, '../src/api/index.ts')
const apiIndexSource = fs.readFileSync(apiIndexPath, 'utf8')
const chatNotifyApiPath = path.resolve(__dirname, '../src/api/chat-notify.ts')
const chatNotifyApiSource = fs.readFileSync(chatNotifyApiPath, 'utf8')
const aggregationApiPath = path.resolve(__dirname, '../src/api/aggregation.ts')
const aggregationApiSource = fs.readFileSync(aggregationApiPath, 'utf8')
const connectionStorePath = path.resolve(__dirname, '../src/stores/connection.ts')
const connectionStoreSource = fs.readFileSync(connectionStorePath, 'utf8')
const layoutStorePath = path.resolve(__dirname, '../src/stores/layout.ts')
const layoutStoreSource = fs.readFileSync(layoutStorePath, 'utf8')
const userStorePath = path.resolve(__dirname, '../src/stores/user.ts')
const userStoreSource = fs.readFileSync(userStorePath, 'utf8')
const wsStorePath = path.resolve(__dirname, '../src/stores/ws_new.ts')
const wsStoreSource = fs.readFileSync(wsStorePath, 'utf8')
const userAvatarPath = path.resolve(__dirname, '../src/components/UserAvatar/UserAvatar.vue')
const userAvatarSource = fs.readFileSync(userAvatarPath, 'utf8')
const imageComponentPath = path.resolve(__dirname, '../src/components/Image/Image.vue')
const imageComponentSource = fs.readFileSync(imageComponentPath, 'utf8')
const messageItemPath = path.resolve(__dirname, '../src/views/talk/components/MessageItem.vue')
const messageItemSource = fs.readFileSync(messageItemPath, 'utf8')
const requestPath = path.resolve(__dirname, '../src/utils/request.ts')
const requestSource = fs.readFileSync(requestPath, 'utf8')

const requiredComponentGates = [
  'DragonBall',
  'SearchModal',
  'ConnectWalletModalVue',
  'WalletMissingModal',
  'ImagePreviewVue',
]

const missing = requiredComponentGates.filter(componentName => {
  const tagPattern = new RegExp(`<${componentName}[^>]*\\bv-if=`, 'm')
  return !tagPattern.test(source)
})

const requiredStateHooks = [
  'isConnectionModalOpen',
  'isWalletMissingModalOpen',
  'useImagePreview',
]

const missingHooks = requiredStateHooks.filter(hook => !source.includes(hook))
const hasStaticLoginedUserOperateImport =
  /import\s+LoginedUserOperate\s+from\s+['"]@\/components\/LoginedUserOperate\/LoginedUserOperate\.vue['"]/.test(
    channelHeaderSource
  )

const hasGuestUserOperate = channelHeaderSource.includes('GuestUserOperate')
const hasStaticChannelContentImport =
  /import\s+ChannelContent\s+from\s+['"]\.\/ChannelContent\.vue['"]/.test(channelBodySource)
const hasAsyncChannelContent = channelBodySource.includes('defineAsyncComponent')
const hasChainStoreAutoFeeFetch =
  /onMounted\s*\(\s*\(\)\s*=>\s*{[\s\S]*updateAllFeeRates\s*\(/.test(chainStoreSource)
const hasExplicitFeeRefresh = chainStoreSource.includes('ensureFeeRatesFresh')
const channelLazyOnlyComponents = [
  'ChannelMemberListDrawer',
  'PasswordModal',
  'RequireNftModal',
  'RequireFtModal',
  'CheckingPass',
  'RequireNativeModal',
  'InviteModal',
  'CommunityCardModal',
  'AcceptInviteModal',
  'ChannelAcceptInviteModal',
  'LoadingCover',
  'RedPacketOpenModal',
  'RedPacketCreateModal',
  'RedPacketResultModal',
  'ShareToBuzzModal',
  'ShareSuccessModal',
  'CommunitySettingsModal',
  'leaveCommunityModal',
  'CreatePublicChannelModal',
  'CreateBroadcastChannelModal',
]
const staticChannelImports = channelLazyOnlyComponents.filter(componentName => {
  const importPattern = new RegExp(`import\\s+${componentName}\\s+from\\s+['"][^'"]+['"]`)
  return importPattern.test(channelSource)
})
const missingChannelDrawerGate = !/<ChannelMemberListDrawer[^>]*\bv-if=/.test(channelSource)
const hasStaticSimpleTalkUtilsImport = /import\s+\{[^}]*tryCreateNode[^}]*\}\s+from\s+['"]@\/utils\/talk['"]/.test(
  simpleTalkSource
)
const hasStaticSimpleTalkWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(
  simpleTalkSource
)
const hasStaticSimpleTalkHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(simpleTalkSource)
const hasStaticSimpleTalkHeavyCryptoImport = /from\s+['"]@\/utils\/crypto['"]/.test(simpleTalkSource)
const hasStaticConnectionWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(
  connectionStoreSource
)
const hasStaticConnectionMetaContractImport = /from\s+['"]meta-contract['"]/.test(
  connectionStoreSource
)
const hasStaticUserWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(userStoreSource)
const hasStaticAppHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(source)
const hasStaticLayoutHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(layoutStoreSource)
const hasStaticTalkApiHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(talkApiSource)
const hasStaticTalkApiWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(
  talkApiSource
)
const hasStaticChatNotifyHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(
  chatNotifyApiSource
)
const hasStaticChatNotifyWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(
  chatNotifyApiSource
)
const hasStaticAggregationHeavyUtilImport = /from\s+['"]@\/utils\/util['"]/.test(
  aggregationApiSource
)
const hasStaticAggregationEthersImport = /from\s+['"]ethers['"]/.test(aggregationApiSource)
const hasStaticAggregationConsoleImport = /from\s+['"]console['"]/.test(aggregationApiSource)
const hasStaticAggregationPostTagValueImport =
  /import\s+\{\s*PostTag\s*\}\s+from\s+['"]@\/stores\/buzz\/tag['"]/.test(aggregationApiSource)
const hasStaticApiIndexWalletTypeImport =
  /import\s+\{\s*Reqswapargs\s*\}\s+from\s+['"]@\/utils\/wallet\/hd-wallet['"]/.test(
    apiIndexSource
  )
const hasStaticRouterTalkApiImport = /from\s+['"]@\/api\/talk['"]/.test(routerSource)
const hasStaticPermissionHeavyUtilImport = /from\s+['"]\.\/util['"]/.test(permissionSource)
const hasStaticPermissionWalletImport =
  /from\s+['"]@\/utils\/wallet\/Metalet-wallet['"]/.test(permissionSource) ||
  /from\s+['"]@\/utils\/metalet-sdk['"]/.test(permissionSource) ||
  /from\s+['"]\.\/sdk['"]/.test(permissionSource)
const hasStaticMainGlobalDialogImport = /from\s+['"]@\/components\/GlobalDialog\/index\.vue['"]/.test(
  mainSource
)
const hasStaticUserAvatarUserCardImport = /from\s+['"]\.\.\/UserCard\/UserCard\.vue['"]/.test(
  userAvatarSource
)
const hasStaticImageDbImport = /from\s+['"]@\/utils\/db['"]/.test(imageComponentSource)
const hasStaticWsJobsImport = /from\s+['"]\.\/jobs['"]/.test(wsStoreSource)
const hasStaticWsProcessImport = /from\s+['"]process['"]/.test(wsStoreSource)
const hasMessageItemTinySecpImport = /from\s+['"]tiny-secp256k1['"]/.test(messageItemSource)
const hasStaticRequestSdkImport = /from\s+['"]request-sdk['"]/.test(requestSource)
const hasStaticDirectContactWalletImport = /from\s+['"]@\/wallet-adapters\/metalet['"]/.test(
  directContactListSource
)
const directContactStaticImports = [
  ['DirectContactItem', './Item.vue'],
  ['SearchModal', './SearchModal.vue'],
  ['CreatePubkey', './create-pubkey.vue'],
].filter(([componentName, importPath]) => {
  const escapedImportPath = importPath.replace('.', '\\.')
  const importPattern = new RegExp(
    `import\\s+${componentName}\\s+from\\s+['"]${escapedImportPath}['"]`
  )
  return importPattern.test(directContactListSource)
})

if (
  missing.length ||
  missingHooks.length ||
  hasStaticLoginedUserOperateImport ||
  !hasGuestUserOperate ||
  hasStaticChannelContentImport ||
  !hasAsyncChannelContent ||
  hasChainStoreAutoFeeFetch ||
  !hasExplicitFeeRefresh ||
  staticChannelImports.length ||
  missingChannelDrawerGate ||
  hasStaticSimpleTalkUtilsImport ||
  hasStaticSimpleTalkWalletImport ||
  hasStaticSimpleTalkHeavyUtilImport ||
  hasStaticSimpleTalkHeavyCryptoImport ||
  hasStaticConnectionWalletImport ||
  hasStaticConnectionMetaContractImport ||
  hasStaticUserWalletImport ||
  hasStaticAppHeavyUtilImport ||
  hasStaticLayoutHeavyUtilImport ||
  hasStaticTalkApiHeavyUtilImport ||
  hasStaticTalkApiWalletImport ||
  hasStaticChatNotifyHeavyUtilImport ||
  hasStaticChatNotifyWalletImport ||
  hasStaticAggregationHeavyUtilImport ||
  hasStaticAggregationEthersImport ||
  hasStaticAggregationConsoleImport ||
  hasStaticAggregationPostTagValueImport ||
  hasStaticApiIndexWalletTypeImport ||
  hasStaticRouterTalkApiImport ||
  hasStaticPermissionHeavyUtilImport ||
  hasStaticPermissionWalletImport ||
  hasStaticMainGlobalDialogImport ||
  hasStaticUserAvatarUserCardImport ||
  hasStaticImageDbImport ||
  hasStaticWsJobsImport ||
  hasStaticWsProcessImport ||
  hasMessageItemTinySecpImport ||
  hasStaticRequestSdkImport ||
  hasStaticDirectContactWalletImport ||
  directContactStaticImports.length
) {
  console.error('First-load gate assertion failed.')
  if (missing.length) {
    console.error(`Missing v-if gates for: ${missing.join(', ')}`)
  }
  if (missingHooks.length) {
    console.error(`Missing state hooks for lazy gates: ${missingHooks.join(', ')}`)
  }
  if (hasStaticLoginedUserOperateImport) {
    console.error('ChannelHeader must lazy-load the full LoginedUserOperate component.')
  }
  if (!hasGuestUserOperate) {
    console.error('ChannelHeader must render a lightweight GuestUserOperate for unauthenticated users.')
  }
  if (hasStaticChannelContentImport) {
    console.error('ChannelBody must lazy-load ChannelContent so the welcome route does not load input/fee modules.')
  }
  if (!hasAsyncChannelContent) {
    console.error('ChannelBody must use defineAsyncComponent for non-welcome channel content.')
  }
  if (hasChainStoreAutoFeeFetch) {
    console.error('Chain store must not fetch all fee rates on first component mount.')
  }
  if (!hasExplicitFeeRefresh) {
    console.error('Chain store must expose ensureFeeRatesFresh for fee UI and transaction flows.')
  }
  if (staticChannelImports.length) {
    console.error(
      `Channel.vue must lazy-load hidden drawers/modals: ${staticChannelImports.join(', ')}`
    )
  }
  if (missingChannelDrawerGate) {
    console.error('ChannelMemberListDrawer must only mount when its drawer is visible.')
  }
  if (hasStaticSimpleTalkUtilsImport) {
    console.error('simple-talk store must lazy-load tryCreateNode from utils/talk only when sending.')
  }
  if (hasStaticSimpleTalkWalletImport) {
    console.error('simple-talk store must lazy-load wallet adapter code only when creating private chats.')
  }
  if (hasStaticSimpleTalkHeavyUtilImport) {
    console.error('simple-talk store must import startup helpers from lightweight utilities, not utils/util.')
  }
  if (hasStaticSimpleTalkHeavyCryptoImport) {
    console.error('simple-talk store must not import the full crypto utility module on first load.')
  }
  if (hasStaticConnectionWalletImport) {
    console.error('connection store must lazy-load wallet adapter code after a wallet action starts.')
  }
  if (hasStaticConnectionMetaContractImport) {
    console.error('connection store must not import meta-contract on first load.')
  }
  if (hasStaticUserWalletImport) {
    console.error('user store must not import wallet adapter code on first load.')
  }
  if (hasStaticAppHeavyUtilImport) {
    console.error('App.vue must import startup helpers from lightweight utilities, not utils/util.')
  }
  if (hasStaticLayoutHeavyUtilImport) {
    console.error('layout store must not import utils/util on first load.')
  }
  if (hasStaticTalkApiHeavyUtilImport) {
    console.error('talk API module must not import utils/util on first load.')
  }
  if (hasStaticTalkApiWalletImport) {
    console.error('talk API module must lazy-load wallet adapter code only when ECDH is needed.')
  }
  if (hasStaticChatNotifyHeavyUtilImport) {
    console.error('chat-notify API module must not import utils/util on first load.')
  }
  if (hasStaticChatNotifyWalletImport) {
    console.error('chat-notify API module must not import wallet adapter code on first load.')
  }
  if (hasStaticAggregationHeavyUtilImport) {
    console.error('aggregation API module must import changeSymbol from lightweight utilities, not utils/util.')
  }
  if (hasStaticAggregationEthersImport) {
    console.error('aggregation API module must not import unused ethers on first load.')
  }
  if (hasStaticAggregationConsoleImport) {
    console.error('aggregation API module must not import Node console polyfills on first load.')
  }
  if (hasStaticAggregationPostTagValueImport) {
    console.error('aggregation API module must import PostTag as a type-only dependency.')
  }
  if (hasStaticApiIndexWalletTypeImport) {
    console.error('api index must import Reqswapargs as a type-only dependency.')
  }
  if (hasStaticRouterTalkApiImport) {
    console.error('router must not import talk API on first load for code that is only referenced in comments.')
  }
  if (hasStaticPermissionHeavyUtilImport) {
    console.error('permission guard must not import the full utils/util module on first load.')
  }
  if (hasStaticPermissionWalletImport) {
    console.error('permission guard must not import wallet SDK modules on first load.')
  }
  if (hasStaticMainGlobalDialogImport) {
    console.error('main entry must not import the unused GlobalDialog component on first load.')
  }
  if (hasStaticUserAvatarUserCardImport) {
    console.error('UserAvatar must not import the inactive UserCard popover on first load.')
  }
  if (hasStaticImageDbImport) {
    console.error('Image component must lazy-load DB helpers only when resolving an image URL.')
  }
  if (hasStaticWsJobsImport) {
    console.error('ws store must lazy-load jobs store only when a websocket job message arrives.')
  }
  if (hasStaticWsProcessImport) {
    console.error('ws store must not import process polyfills on first load.')
  }
  if (hasMessageItemTinySecpImport) {
    console.error('MessageItem must not import tiny-secp256k1 on the message-list path.')
  }
  if (hasStaticRequestSdkImport) {
    console.error('request utility must use axios directly instead of the browserified request-sdk bundle.')
  }
  if (hasStaticDirectContactWalletImport) {
    console.error('DirectContactList must lazy-load wallet adapter code after authorization.')
  }
  if (directContactStaticImports.length) {
    console.error(
      `DirectContactList must lazy-load authorized/search-only components: ${directContactStaticImports
        .map(([componentName]) => componentName)
        .join(', ')}`
    )
  }
  process.exit(1)
}

console.log('First-load gates are present.')
