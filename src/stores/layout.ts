import { Channel } from '@/@types/talk'
import { checkUserLogin } from '@/utils/util'
import { defineStore } from 'pinia'

export const useLayoutStore = defineStore('layout', {
  state: () => {
    return {
      isShowLeftNav: false,
      showJoinView: false,
      showWelcomeDescView: false,
      isShowPublishBuzz: false,
      isShowCreateCommunityModal: false,

      isShowCreatePublicChannelModal: false,
      isShowCreateConsensualChannelModal: false,
      isShowCreateGeneralChannelModal: false,
      isShowCreateDaoModal: false,
      isShowCommunityInfoModal: false,
      isShowCommunityCardModal: false,
      isShowNoMetaNameModal: false,
      isShowSearchModal: false,
      isShowLeaveCommunityModal: false,

      isShowSettingsModal: false,
      isShowProfileEditModal: false,
      isShowChooseTokenModal: false,
      isShowChooseMetaNameModal: false,
      isShowChooseMetaNameModal2: false,
      isShowRedPacketModal: false,
      isShowRedPacketOpenModal: false,
      isShowRedPacketResultModal: false,
      isShowInviteModal: false,
      isShowChannelInviteModal: false,
      isShowShareToBuzzModal: false,
      isShowShareSuccessModal: false,
      isShowAcceptInviteModal: false,
      isShowChannelAcceptInviteModal: false,
      isShowMessagesLoading: false,
      isShowCommunitySettingsModal: false,
      isShowMemberList: true,
      isShowMemberListDrawer: false,
      isShowPasswordModal: false,
      isShowRequireNftModal: false,
      isShowRequireFtModal: false,
      isShowRequireNativeModal: false,
      isShowCheckingPass: false,
      isShowUserInfo: false,
      isShowUserCard: false,
      isShowLoading: false,
      never: false,
      isShowWallet: false,
      selectedRedPacketType: 'mvc' as 'btc' | 'mvc', // 红包类型选择，独立于gas链
      inviteLink: '',
    }
  },
  actions: {},
})
