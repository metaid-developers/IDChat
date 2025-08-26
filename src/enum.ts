const POLYGON_CHAIN = import.meta.env.VITE_POLYGON_CHAIN


export enum ChatType{
  msg=0,
  red=1,
  img=3
}

export enum GrabStatus{
  grabSuccess=0,
  grabSuccessAndBroadcastPending=1,
  broadCastSuccess=2,
  grabSuccessAndBroadcastFail=3
}

export enum CollectionSortType {
  Price = 1,
  TokenIndex = 2,
  Default = 3,
  Time = 0,
}

export const enum CollectionOrderType {
  ASC = 1,
  DESC = -1,
}

export const enum ToBsvType {
  Number = 'number',
  String = 'string',
}
export const enum TextAlign {
  Start = 'start',
  End = 'end',
  Right = 'right',
  Center = 'center',
  Justify = 'justify',
  MatchParent = 'match-parent',
}

export enum ScreenTypes {
  ButtonList = 'ButtonList',
  Price = 'Price',
  CheckboxList = 'checkboxList',
}

export enum legalOrderType {
  PRICE = 1, // 按价格排序
  ID = 2, // 按序号排序
}

export enum legalSortType {
  ASC = 1, // 正序
  DESC = 2, // 倒序
}

export enum NFTSellType {
  All = '', // 全部
  SALE = 1, // 可购买
  NONSALE = 2, // 非销售
  AUCTION = 3, // 拍卖
  NEWSALE = 4, // 新上架
}

export enum LegalPayType {
  Native = 1,
  App = 2,
  H5 = 3,
  Jsapi = 4,
}

export enum Unit {
  BSV = 'BSV',
  CNY = 'CNY',
}

export enum PayType {
  Native = 1,
  App = 2,
  H5 = 3,
  Jsapi = 4,
}

export enum PayStatus {
  Ing = 0,
  Fail = -1,
  Success = 1,
}

export enum CertificationType {
  isCert = 1,
  unCert = 2,
}

export enum PayPlatform {
  WechatPay = 1,
  AliPay = 401,
  AliPaySelf = 2,
  UnionPay = 300,
  QuickPay = 301,
  BalancePay = 350,
  ETH = 1001,
  POLYGON = 1002,
  BSV = 1003,
  SPACE = 1000,
}

export const PayPlatformUnit = {
  [PayPlatform.AliPay]: 'AliPay',
  [PayPlatform.WechatPay]: 'WechatPay',
  [PayPlatform.AliPaySelf]: 'AliPaySelf',
  [PayPlatform.UnionPay]: 'UnionPay',
  [PayPlatform.QuickPay]: 'QuickPay',
  [PayPlatform.BalancePay]: 'BalancePay',
  [PayPlatform.ETH]: import.meta.env.VITE_ETH_CHAIN.toUpperCase(),
  [PayPlatform.POLYGON]: import.meta.env.VITE_POLYGON_CHAIN.toUpperCase(),
  [PayPlatform.BSV]: 'BSV',
  [PayPlatform.SPACE]: 'SPACE',
}

export enum NFTSellState {
  Sale = 0, // 可购买
  OffSale, // 下架
  Buyed, // 已购买，
  ComingSoon, // 敬请期待，
  PanicBuying, // 抢购状态，
  NotSale, // 非销售，
  AuctionUnStart, // 拍卖未开始
  Auctioning, // 拍卖进行中
  AuctionEndButNotSend, // 拍卖结束但未发送NFT
  AuctionEndAndSended, // 拍卖结束且已发送NFT
}

export enum NFTOperateType {
  Buy,
  Sale,
  OffSale,
  Transfer,
}

export enum withdrawStatus {
  wait = '待审核',
  fail = '审核失败',
  successButNotWithdraw = '提现中',
  thirdWithdrawFail = '提现失败',
  thirdWithdrawSucc = '提现成功',
  adminClose = '提现关闭',
  rebackBalance = '回退餘额',
}

export enum withdrawStatusId {
  wait = 0,
  fail = 1,
  successButNotWithdraw = 2,
  thirdWithdrawFail = 3,
  thirdWithdrawSucc = 4,
  adminClose = 5,
  rebackBalance = 7,
}

export enum orderError {
  lostParams = 1000,
  notAllowBuy = 1001,
  restEnougth = 1002,
  limitedOnceSale = 1003,
  limitedMetaIdBuy = 1004,
  serviceBusy = 1005,
  notFoundWxCoreId = 1006,
  wxCoreOrderFail = 1007,
  noThatBlindBox = 1008,
  noThisNft = 1009,
}

// 活动预约状态
export enum ActDateStaus {
  Dateing = 1,
  DateSuccess = 2,
  DateFail = 3,
}

export enum RemintStatus {
  Remint = 0,
  Reminting = 1,
  RemintSuccess = 2,
}

export enum InviteActivityTag {
  ShareWechat = 1, // 分享微信
  ShareWechatCircle = 2, // 分享朋友圈
  SharLink = 3, // 复制URL
  ShareImage = 4, // 分享图片
  Rigisted = 5, // 注册完成
  Kyced = 6, // kyc完成
  ShareOnChain = 10, // 链上补充
}

export enum BlindboxUUIDStatus {
  Queue = 1, // 排队中
  ToBePay = 2, // 待支付
  PaySuccess = 3, // 支付完成 (完成)
  PayFail = 4, // 支付失败 (完成)
  PayCancel = 5, // 支付取消 (完成)
  QueueFail = 6, // 排队失败 (完成)
}

export enum CloudWalletStatus {
  Normal = '00',
  Freeze = '01',
  Inactivated = '02',
  UnCreated = '03',
  SoldOut = '09',
}

export enum WalletCheckType {
  Recharge = 'recharge',
  Withdraw = 'withdraw',
}

export enum CloudWalletOrderStatus {
  PaySuccess = '00', // 成功
  PayIng = '01', // 处理中
  PayFail = '02', // 失败
  isCollection = '06', // 已收款
  isReturn = '08', // 已退回
}

export enum WalletRecordType {
  Pay = '00', // 餘额支付
  Transfer = '01', // 若喜餘额转帐
  Withdraw = '02', // 提现
  Recharge = '03', // 充值
  Refund = '04', // 退款
  AirDrop = '05', // 空投
  SystemRetraction = '06', // 系统收回
  Feed = '07', // 系统收回
}

export enum CollectRecordType {
  Buy = 1, // 购买类型，
  Sale = 2, // 上架类型
  OffSale = 3, // -下架类型
}

export enum IsEncrypt {
  Yes = 1,
  No = 0,
}

export enum NFTSaleAmountType {
  SalePrice = 1,
  IncomePrice = 2,
}

export enum PayMeParamsType {
  BuzzPublish = 'SimpleMicroblog',
  BuzzPayLike = 'BuzzPayLike',
  BuzzComment = 'PayComment',
  BuzzReopost = 'SimpleRePost',
}
export enum SdkPayType {
  ME = 'ME',
  SPACE = 'SPACE',
  BSV = 'BSV',
}

export enum BuzzTabType {
  Hot = 'hot',
  Home = 'home',
  Follow = 'follow',
}

export enum BuzzHotTabType {
  Today = 'today',
  Week = 'week',
  Month = 'month',
}

export enum MetaEggStatus {
  Inactivated = 1,
  Activated = 2,
  Expired = 3,
}

export enum MetaEggTaskType {
  RealnNameAndCardBinding = 'RealnNameAndCardBinding',
  MetaEggLock = 'MetaEggLock',
  FeedMe = 'FeedMe',
  FeedFSTigerFragment = 'FeedFSTigerFragment',
  FeedNFT = 'FeedNFT',
}

export enum BatchType {
  Sale = 'batchSale',
  Transfer = 'batchTransfer',
}

export enum SignUserType {
  Phone = 'phone',
  Email = 'email',
}

export enum CurrentSupportChain {
  Eth = 'eth',
  Polygon = 'polygon',
}

export enum NodeName {
  Simplebuzz='simplebuzz',
  ETHBinding = 'EVMBinding',
  MetaFile = 'metafile',
  File = 'file',
  NFTAvatar = 'NFTAvatar',
  PayComment = 'PayComment',
  PayLike = 'PayLike',
  PayFollow = 'PayFollow',
  SimpleMicroblog = 'SimpleMicroblog',
  SimpleRePost = 'SimpleRePost',
  SimpleGroupChat = 'simplegroupchat',
  SimpleFileGroupChat = 'simplefilegroupchat',
  SimpleCommunity = 'SimpleCommunity',
  SimpleCommunityJoin = 'simplecommunityjoin',
  SimpleGroupJoin='simplegroupjoin',
  SimpleGroupCreate = 'simplegroupcreate',
  ShowMsg = 'showmsg',
  NftIssue = 'NftIssue',
  NftGenesis = 'NftGenesis',
  NftSell = 'NftSell',
  NftCancel = 'NftCancel',
  nftBuy = 'nftBuy',
  FtGenesis = 'FtGenesis',
  FtIssue = 'FtIssue',
  FtTransfer = 'FtTransfer',
  FtMerge = 'merge',
  SimpleRedEnvelope = 'Simpleredenvelope',
  SimpleGroupLuckyBag='simplegroupluckybag',
  OpenRedenvelope = 'openredenvelope',
  SimpleGroupOpenLuckybag='simplegroupopenLuckybag',
  SimplePublicShare = 'SimplePublicShare',
  LegalSellNft = 'sell_nft',
  Name = 'name',
  MetaNote = 'metanote',
  SimpleFileMsg = 'Simplefilemsg',
  SimpleCreateAnnouncement = 'SimpleCreateAnnouncement',
  SimpleAnnouncementQuote = 'SimpleAnnouncementQuote',
  SimpleDAOCreate = 'SimpleDAOCreate',
  NftName = 'NftName',
  NftTransfer = 'NftTransfer',
  SendMoney = 'SendMoney',
  Phone = 'phone',
  Email = 'email',
  ShareChatMessage = 'sharechatmessage',
  SimpleVote = 'SimpleVote',
  // DAO
}

export const enum GetInitAmountType {
  metasv = 'metasv',
  metalet = 'metalet',
}

export const enum BindStatus {
  ChooseType,
  BindHavedMetaId,
  BindRegisterMetaId,
  BindSuccess,
  InputPassword,
}

export enum PaySource {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
}
export const enum RegisterSource {
  showmoney = 'normal',
  metamask = 'evm',
}
export const enum CommunityJoinAction {
  Join = 1,
  Leave = -1,
}

export const enum ChannelPublicityType {
  Public = '1',
  Private = '2',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  NftEmoji = 'nftEmoji',
  OnChainImage = 'onChainImage',
}

export enum ChannelType {
  Group = 'group',
  Session = 'session',
}

export enum GroupChannelType {
  PublicText = 'publicText',
  Password = 'password',
  NFT = 'NFT',
  FT = 'FT',
  Native = 'native',
  ETH_NFT = 'ETH_NFT',
  POLYGON_NFT = 'POLYGON_NFT',
  BSV_NFT = 'BSV_NFT',
  BSV_FT = 'BSV_FT',
}

export enum ShowControl {
  isShowCreateCommunityModal = 'isShowCreateCommunityModal',
  isShowCreatePublicChannelModal = 'isShowCreatePublicChannelModal',
  isShowCreateConsensualChannelModal = 'isShowCreateConsensualChannelModal',
  isShowCreateGeneralChannelModal = 'isShowCreateGeneralChannelModal',
  isShowCreateDaoModal = 'isShowCreateDaoModal',
  isShowSearchModal = 'isShowSearchModal',
  isShowCommunityCardModal = 'isShowCommunityCardModal',
  isShowCommunityInfoModal = 'isShowCommunityInfoModal',
  isShowChooseTokenModal = 'isShowChooseTokenModal',
  isShowRedPacketModal = 'isShowRedPacketModal',
  isShowRedPacketResultModal = 'isShowRedPacketResultModal',
  isShowPasswordModal = 'isShowPasswordModal',
  isShowRequireNftModal = 'isShowRequireNftModal',
  isShowInviteModal = 'isShowInviteModal',
   isShowChannelInviteModal = 'isShowChannelInviteModal',
  isShowAcceptInviteModal = 'isShowAcceptInviteModal',
  isShowChannelAcceptInviteModal='isShowChannelAcceptInviteModal',
  isShowChooseMetaNameModal = 'isShowChooseMetaNameModal',
  isShowShareToBuzzModal = 'isShowShareToBuzzModal',
  isShowShareSuccessModal = 'isShowShareSuccessModal',
  isShowCommunitySettingsModal = 'isShowCommunitySettingsModal',
  isShowRequireFtModal = 'isShowRequireFtModal',
  isShowRequireNativeModal = 'isShowRequireNativeModal',
  isShowCheckingPass = 'isShowCheckingPass',
  isShowUserInfo = 'isShowUserInfo',
  isShowUserCard = 'isShowUserCard',
  isShowNoMetaNameModal = 'isShowNoMetaNameModal',
  isShowChooseMetaNameModal2 = 'isShowChooseMetaNameModal2',
  isShowLeaveCommunityModal = 'isShowLeaveCommunityModal',
  never = 'never',
}

export enum loginOrRegisterProtocolType {
  userProtocol = 1,
  privitePolicy = 2,
}

export enum RedPacketDistributeType {
  Random = '0',
  Nft = '2',
}

export enum JobStepStatus {
  Waiting = 'waiting',
  Success = 'success',
  Failed = 'failed',
}

export enum JobStatus {
  Waiting = 'waiting',
  Success = 'success',
  Failed = 'failed',
}

export enum ToCurrency {
  ETH = 'ETH',
  CNY = 'CNY',
  USD = 'USD',
  MVC = 'MVC',
  BSV = 'BSV',
  POLYGON = 'POLYGON',
}

export enum ChannelRoomType {
  Public = '',
  Private = '1',
  NFT = '2',
  FT = '3',
  ETHNFT = '2001',
  Native_MVC = '4000',
  Native_BSV = '4001',
}

export enum Chains {
  MVC = 'mvc',
  ETH = 'eth',
  Goerli = 'goerli',
  MUMBAI = 'mumbai',
  POLYGON = 'polygon',
  BSV = 'bsv',
}

export enum ProductType {
  ME = 100,
  LegalNft = 200,
  MetaName = 300,
}

export enum MetaNameOperateType {
  Register = 1,
  Renew = 2,
  UpdateInfo = 3,
}

export enum OrderPayType {
  wechat = 1,
  alipay = 2,
  sandpay = 300,
  eth = 1001,
}

export enum MetaNameRegisterStatus {
  Finish = 'finish',
  Error = 'error',
  Wait = 'wait',
  Process = 'process',
}

export enum WalletPath {
  BSV = 236,
  MVC = 10001,
}

export enum Lang {
  ZH = 'zh',
  EN = 'en',
}

export enum WalletTxVersion {
  BSV = 1,
}

export enum MetaNameRegisterState {
  Registered = 1,
  RegisteredAndSending = 2,
  UnRegister = 3,
}

export enum EnvMode {
  Mainnet = 'mainnet',
  MainnetGray = 'mainnetgray',
  TestnetGray = 'gray',
}

export enum HdWalletChain {
  BSV = 'bsv',
  MVC = 'mvc',
}

export enum WalletOrigin {
  WalletConnect = 'WalletConnect',
  MetaMask = 'MetaMask',
}

export enum Network {
  mainnet = 'mainnet',
  testnet = 'testnet',
}

export enum BuyNFTStatus {
  CanBuy = 0,
  Purchased = 1,
  NotCanBuy = 2,
}

export enum DAOVoteDefaultOption {
  Opposition = 0,
  Approve = 1,
  Abstain = 2,
}

export enum DAOProposalType {
  Base = '0',
  DiySingleChoose = '1',
  DiyMultipleChoose = '2',
  Approve = '3',
}

export enum DAOVoteType {
  Base = 'Base',
  SingleChoose = 'SingleChoose',
  MultipleChoose = 'MultipleChoose',
  Approve = 'Approve',
}

export enum DAOStakeOperate {
  Pledge = 1,
  Unlock = 3,
  Extract = 4,
  Reward = 5,
  Vote = 7,
  CreateVote = 5000,
}

export const enum StakeType {
  Pledge = 0,
  Unlock = 1,
}

export const enum DAOProposalStatus {
  UnStart = 0,
  Active = 1,
  Ended = 2,
}
