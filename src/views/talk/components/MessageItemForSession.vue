<template>
  <div
    class=" lg:hover:bg-gray-200 lg:dark:hover:bg-gray-950 px-4 py-1.5 relative group transition-all duration-150"
    :class="{ replying: reply.val?.timestamp === message.timestamp }"
  >
    <UnreadMessagesDivider
      v-if="props.lastReadIndex !== undefined && message.index === props.lastReadIndex + 1"
      id="unread-divider"
    />
    <!-- 消息菜单 -->
    <MessageMenu
      :message="props.message"
      :parsed="
        parseTextMessage(
          decryptedMessage(
            message?.content,
            message?.encryption,
            message?.protocol,
            message?.isMock,
            true
          )
        )
      "
      v-model:translateStatus="translateStatus"
      v-model:translatedContent="translatedContent"
      @quote="message => emit('quote', message)"
      @toBuzz="data => emit('toBuzz', data)"
      :isMyMessage="isMyMessage"
      v-if="isText"
    />
    <MessageMenu
      :isMyMessage="isMyMessage"
      :message="props.message"
      @quote="message => emit('quote', message)"
      @toBuzz="data => emit('toBuzz', data)"
      v-else
    />

    <!-- Quout -->
    <MessageItemQuote
      v-if="message.replyInfo"
      :quote="{
        avatarImage: message.replyInfo?.userInfo?.avatarImage,
        metaName: '',
        metaId: message.replyInfo?.userInfo?.metaid,
        nickName: message.replyInfo.userInfo?.name,
        protocol: message.replyInfo.protocol,
        content: containsString(message.replyInfo.protocol, NodeName.SimpleFileMsg)
          ? message.replyInfo.content
          : message.replyInfo.content,
        encryption: message.replyInfo.encryption,
        timestamp: message.replyInfo.timestamp,
        isMock: message.isMock,
        index: message.replyInfo.index,
      }"
      :isSession="true"
      v-bind="$attrs"
      :isMyMessage="(isMyMessage as boolean)"
      @toTimeStamp="handlerScrollIndex"
    />

    <div class="flex" :class="[isMyMessage ? 'flex-row-reverse' : '']">
      <UserAvatar
        :image="messageAvatarImage"
        :meta-id="'undefined'"
        :name="message?.fromUserInfo?.name"
        :meta-name="''"
        class="w-10 h-10 lg:w-13.5 lg:h-13.5 shrink-0 select-none"
        :disabled="true"
      />
      <div
        class="grow"
        :class="[isMyMessage ? 'mr-2 lg:mr-4 pl-8 lg:pl-12' : 'ml-2 lg:ml-4 pr-8 lg:pr-12']"
      >
        <div
          class="flex  space-x-2"
          :class="[isMyMessage ? 'flex-row-reverse items-center' : 'items-baseline']"
        >
          <UserName
            :name="message?.fromUserInfo?.name"
            :meta-name="''"
            :text-class="'text-sm font-medium dark:text-gray-100'"
            :class="[isMyMessage ? 'ml-2' : '']"
          />
          <div
            class=" text-xs shrink-0 flex  whitespace-nowrap items-center"
            :class="[
              isMyMessage ? 'flex-row-reverse  justify-center' : 'gap-1 ',
              msgChain == ChatChain.btc ? 'text-[#EBA51A]' : 'text-dark-300 dark:text-gray-400',
            ]"
          >
            <span> {{ formatTimestamp(message.timestamp, i18n) }}</span>
            <div class="flex ">
              <Icon
                name="btc"
                v-if="msgChain == ChatChain.btc"
                class="chain-icon-menu w-[16px] h-[16px]"
                :class="isMyMessage ? 'mr-1' : ''"
              ></Icon>
              <!-- <img
              :src="btcIcon"
              
             
              
            /> -->
            </div>
          </div>
        </div>

        <div class="w-full" v-if="isNftEmoji">
          <Image
            :src="
              decryptedMessage(
                message?.content,
                message?.encryption,
                message?.protocol,
                message?.isMock,
                true
              )
            "
            customClass="max-w-[80%] md:max-w-[50%] lg:max-w-[320px] py-0.5 object-scale-down"
          />

          <NftLabel class="w-8 mt-1" />
        </div>

        <div class="my-1.5 flex" v-else-if="isFollow">
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl flex items-center"
            :class="isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700'"
          >
            <Icon name="message_follow" class="w-4 h-4 mr-1.5" />
            <span>
              {{ $t('Talk.Messages.follow') }}
            </span>
          </div>
        </div>

        <div class="my-1.5 flex" v-else-if="isFtTransfer">
          <div
            class="max-w-full min-w-[240PX] md:w-[300PX] shadow rounded-xl rounded-tl bg-blue-400"
          >
            <div
              class="rounded-xl p-4 flex space-x-4.5 bg-white dark:bg-gray-700 items-center rounded-tl border border-solid border-blue-400"
            >
              <Image
                :src="message.icon"
                customClass="h-15 w-15 rounded-md shrink-0"
                loading="lazy"
              />
              <div class="flex flex-col space-y-1.5">
                <div
                  class="text-dark-800 dark:text-gray-100 text-base font-medium capitalize max-w-[160PX] truncate"
                >
                  {{ message.memo }}
                </div>
                <div class="text-dark-400 dark:text-gray-200 text-xs">
                  {{ message.amountStr.split('.')[0] + ' ' + message.symbol }}
                </div>
              </div>
            </div>

            <div class="flex py-2.5 items-center space-x-1.5 px-4">
              <Icon name="message_token" class="w-4 h-4 text-white" />
              <div class="text-white text-xs">{{ $t('Talk.Messages.token_transfer') }}</div>
            </div>
          </div>
        </div>

        <div class="my-1.5 flex" v-else-if="isNftTransfer">
          <div
            class="max-w-full min-w-[240PX] md:w-[300PX] shadow rounded-xl rounded-tl bg-blue-400"
          >
            <div
              class="rounded-xl p-4 flex space-x-4.5 bg-white dark:bg-gray-700 items-center rounded-tl border border-solid border-blue-400"
            >
              <Image
                :src="message.icon"
                customClass="h-15 w-15 rounded-md shrink-0"
                loading="lazy"
              />
              <div class="flex flex-col space-y-1">
                <div
                  class="text-dark-800 dark:text-gray-100 text-base font-medium capitalize max-w-[160PX] truncate"
                >
                  {{ message.memo }}
                </div>
                <div class="text-dark-400 dark:text-gray-200 text-xs" v-if="message.data">
                  # {{ message.data.tokenIndex }}
                </div>
              </div>
            </div>

            <div class="flex py-2.5 items-center space-x-1.5 px-4">
              <Icon name="message_token" class="w-4 h-4 text-white" />
              <div class="text-white text-xs">{{ $t('Talk.Messages.nft_transfer') }}</div>
            </div>
          </div>
        </div>

        <div class="my-1.5 flex flex-col items-start" v-else-if="isNftBuy">
          <div
            class="max-w-full min-w-[240PX] md:w-[300PX] shadow rounded-xl rounded-tl bg-blue-400"
          >
            <RouterLink
              :to="{
                name: 'nftDetail',
                params: {
                  tokenIndex: message.data.tokenIndex,
                  genesis: message.data?.genesis,
                  codehash: message.data?.codehash,
                  chain: 'mvc',
                },
              }"
              class="block rounded-xl p-4 bg-white dark:bg-gray-700 rounded-tl border border-solid border-blue-400 divide-y divide-dark-200 dark:divide-gray-600"
            >
              <div class="flex items-center gap-x-4.5 mb-3">
                <Image
                  :src="message.icon"
                  customClass="h-15 w-15 rounded-md shrink-0"
                  loading="lazy"
                />
                <div class="flex flex-col space-y-1">
                  <div
                    class="text-dark-800 dark:text-gray-100 text-base font-medium capitalize max-w-[160PX] truncate"
                  >
                    {{ message.memo }}
                  </div>
                  <div class="text-dark-400 dark:text-gray-200 text-xs" v-if="message.data">
                    # {{ message.data.tokenIndex }}
                  </div>
                </div>
              </div>

              <div class="pt-3 flex justify-between items-center">
                <div class="text-xs text-dark-300 dark:text-gray-400">
                  {{ $t('Talk.Messages.price') }}
                </div>
                <div class="text-sm">{{ nftPrice }}</div>
              </div>
            </RouterLink>

            <div class="flex py-2.5 items-center space-x-1.5 px-4">
              <Icon name="message_token" class="w-4 h-4 text-white" />
              <div class="text-white text-xs">{{ $t('Talk.Messages.nft_buy') }}</div>
            </div>
          </div>

          <div
            class="mt-1.5 bg-dark-800/5 dark:bg-gray-800  text-sm text-dark-400 dark:text-gray-200 rounded-xl px-3 py-2"
          >
            {{ $t('Talk.Messages.buy_tip') }}
          </div>
        </div>

        <div class="my-1.5 flex flex-col items-start" v-else-if="isRepost">
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl flex items-center"
            :class="isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700'"
          >
            <Icon name="message_repost" class="w-4 h-4 mr-1.5" />
            <span>
              {{ $t('Talk.Messages.repost') }}
            </span>
          </div>
          <div
            class="mt-1.5 bg-dark-800/5 dark:bg-gray-800  text-sm text-dark-400 dark:text-gray-200 rounded-xl px-3 py-2"
            v-if="message.data.rePostComment"
          >
            {{ message.data.rePostComment }}
          </div>
        </div>

        <div class="my-1.5 flex flex-col items-start" v-else-if="isRepostWithComment">
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl flex items-center"
            :class="isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700'"
          >
            <Icon name="message_repost" class="w-4 h-4 mr-1.5" />
            <span>
              {{ $t('Talk.Messages.repost_with_comment') }}
            </span>
          </div>
          <div
            class="mt-1.5 bg-dark-800/5 dark:bg-gray-800 break-all text-sm text-dark-400 dark:text-gray-200 rounded-xl px-3 py-2"
            v-if="message.data.content"
          >
            {{ message.data.content }}
          </div>
        </div>

        <div class="my-1.5 flex flex-col items-start" v-else-if="isLike">
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl flex items-center"
            :class="isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700'"
          >
            <Icon name="message_like" class="w-4 h-4 mr-1.5" />
            <span>
              {{ $t('Talk.Messages.like') }}
            </span>
          </div>
        </div>

        <div class="my-1.5 flex flex-col items-start" v-else-if="isComment">
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl flex items-center"
            :class="isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700'"
          >
            <Icon name="message_comment" class="w-4 h-4 mr-1.5" />
            <span>
              {{ $t('Talk.Messages.comment') }}
            </span>
          </div>
          <div
            class="mt-1.5 bg-dark-800/5 dark:bg-gray-800 break-all text-sm text-dark-400 dark:text-gray-200 rounded-xl px-3 py-2"
          >
            {{ message.data.content }}
          </div>
        </div>

        <div
          class="w-full py-0.5 flex items-center"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isImage"
        >
          <div
            class="w-fit max-w-[90%] md:max-w-[50%] lg:max-w-[235PX] max-h-[600PX] overflow-y-hidden rounded bg-transparent cursor-pointer transition-all duration-200"
            :class="[message.error && 'opacity-50']"
            @click="previewImage(decryptedImageMessage)"
          >
            <Image
              :src="decryptedImageMessage"
              :isPrivateChat="true"
              :chatPubkeyForDecrypt="chatPubkeyForDecrypt"
              customClass="rounded py-0.5 object-scale-down"
            />
          </div>
          <button v-if="message.error" class="ml-3" :title="resendTitle" @click="tryResend">
            <Icon
              name="arrow_path"
              class="w-4 h-4 text-dark-400 dark:text-gray-200 hover:animate-spin-once"
            />
          </button>
          <Teleport to="body" v-if="isImage && showImagePreview">
            <TalkImagePreview
              v-if="showImagePreview"
              :src="message.content"
              :isPrivateChat="true"
              :chatPubkeyForDecrypt="chatPubkeyForDecrypt"
              @close="showImagePreview = false"
            />
          </Teleport>
        </div>

        <div
          class="text-xs text-dark-400 dark:text-gray-200 my-0.5 capitalize"
          v-else-if="isReceiveRedEnvelope"
        >
          {{ redEnvelopeReceiveInfo }}
        </div>

        <div
          class="w-full flex py-0.5"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isGiveawayRedEnvelope"
        >
          <div
            class="max-w-full md:max-w-[50%] lg:max-w-[400px] shadow-lg rounded-xl cursor-pointer origin-top-left hover:shadow-xl hover:scale-105  transition-all duration-300"
          >
            <div class="rounded-xl bg-red-400 p-6 flex space-x-2">
              <img :src="redEnvelopeImg" class="h-12" loading="lazy" />
              <div class="">
                <div class="text-white text-lg font-medium capitalize">
                  {{ $t('Talk.Channel.come_get_red_envelope') }}
                </div>
                <div class="text-red-50 text-xs mt-0.5">{{ redEnvelopeMessage }}</div>
              </div>
            </div>
            <div class=" py-2 px-6 text-dark-400 dark:text-gray-200 text-xs">Show红包</div>
          </div>
        </div>

        <!-- 群聊邀请链接 -->
        <div
          class="w-full flex py-0.5"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isChatGroupLink"
        >
          <div
            class="lg:max-w-full max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md group"
            @click="handleGroupLinkClick"
          >
            <div class="p-4 space-y-3">
              <!-- 群头像和基本信息 -->
              <div class="flex items-center space-x-3">
                <div class="">
                  <ChatIcon
                    :src="groupLinkInfo.groupAvatar"
                    :alt="groupLinkInfo.groupName"
                    custom-class="w-12 h-12 min-w-12 min-h-12 rounded-full"
                    :size="48"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <div
                    class="text-dark-800 dark:text-gray-100 font-medium text-base truncate max-w-[200px]"
                  >
                    {{ groupLinkInfo.groupName || 'Group Chat' }}
                  </div>
                  <div class="text-dark-400 dark:text-gray-400 text-sm">
                    {{ props.message.userInfo?.name || 'Someone' }} {{ $t('share_group_invites') }}
                  </div>
                </div>
              </div>
              <div class="flex gap-4 items-center">
                <div class="text-dark-400 dark:text-gray-400 text-xs mt-1 truncate max-w-[150px]">
                  {{ $t('share_group_creator') }}: {{ groupLinkInfo.creator }}
                </div>
                <div
                  v-if="groupLinkInfo.memberCount > 0"
                  class="text-dark-400 dark:text-gray-400 text-xs mt-1"
                >
                  {{ $t('share_group_member') }}: {{ groupLinkInfo.memberCount }}
                </div>
              </div>

              <!-- 查看群组按钮 -->
              <div class="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div
                  class="main-border bg-primary hover:bg-primary-dark text-black text-center py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
                >
                  {{ $t('share_group_view') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MetaApp 应用链接卡片 -->
        <div
          class="w-full py-0.5 flex"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isMetaAppLink && metaAppInfo"
        >
          <div
            class="lg:max-w-full max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md group overflow-hidden"
            @click="handleMetaAppLinkClick"
          >
            <!-- 顶部：icon | appName version | Made by creator -->
            <div
              class="p-4 pb-2 flex items-center gap-3 border-b border-gray-200 dark:border-gray-600"
            >
              <!-- Icon -->
              <div class="w-12 h-12 shrink-0">
                <ChatImage
                  v-if="metaAppLinkInfo.icon"
                  :src="metaAppLinkInfo.icon"
                  customClass="w-12 h-12 rounded-lg object-cover"
                />
                <div
                  v-else
                  class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                >
                  <Icon name="cube" class="w-6 h-6 text-gray-400" />
                </div>
              </div>

              <!-- AppName & Version -->
              <div class="flex-1 min-w-0">
                <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
                  {{ metaAppLinkInfo.appName || 'MetaApp' }}
                </div>
                <div class="text-dark-400 dark:text-gray-400 text-xs mt-0.5">
                  {{ metaAppLinkInfo.version }}
                </div>
              </div>

              <!-- Made by Creator -->
              <div class="flex flex-col">
                <div class="text-dark-400 dark:text-gray-400 font-medium text-sm">
                  Made by
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <UserAvatar
                    :image="pinUserInfo[metaAppLinkInfo.creator]?.avatar || ''"
                    :name="
                      pinUserInfo[metaAppLinkInfo.creator]?.name ||
                        metaAppLinkInfo.creator.slice(0, 8)
                    "
                    :meta-id="pinUserInfo[metaAppLinkInfo.creator]?.metaid || ''"
                    :meta-name="''"
                    class="w-6 h-6"
                    :disabled="true"
                  />
                  <div class="text-dark-800 dark:text-gray-100 text-xs">
                    {{
                      pinUserInfo[metaAppLinkInfo.creator]?.name ||
                        metaAppLinkInfo.creator.slice(0, 8)
                    }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Title -->
            <div class="px-4 py-3">
              <div class="text-dark-800 dark:text-gray-100 font-medium text-base line-clamp-2">
                {{ metaAppLinkInfo.title }}
              </div>
            </div>

            <!-- Cover Image -->
            <div
              v-if="metaAppLinkInfo.coverImg"
              class="w-full h-40 bg-gray-100 dark:bg-gray-800 p-4"
            >
              <ChatImage
                :src="metaAppLinkInfo.coverImg"
                customClass="w-full h-full object-cover rounded-none"
                wrapperClass="w-full h-full"
              />
            </div>

            <!-- OPEN APP 按钮 -->
            <div class="p-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div
                class="main-border bg-primary hover:bg-primary-dark text-black text-center py-2 px-4 rounded-lg transition-colors duration-200 font-medium text-sm"
              >
                OPEN APP
              </div>
            </div>
          </div>
        </div>

        <!-- Buzz 卡片 -->
        <div
          class="w-full py-0.5 flex"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isBuzzLink && pinInfo"
        >
          <div
            class="max-w-[300px]  min-w-[300px] lg:max-w-[420px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
            @click="handleBuzzOrNoteLinkClick"
          >
            <div class="p-4 space-y-3">
              <!-- 用户信息和时间 -->
              <div class="flex items-center space-x-2">
                <UserAvatar
                  :image="pinUserInfo[pinInfo.creator]?.avatar || ''"
                  :name="pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8)"
                  :meta-id="pinUserInfo[pinInfo.creator]?.metaid || ''"
                  :meta-name="''"
                  class="w-10 h-10 shrink-0"
                  :disabled="true"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
                    {{ pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8) }}
                  </div>
                  <div class="text-dark-400 dark:text-gray-400 text-xs">
                    {{ formatTimestamp(pinInfo.timestamp * 1000, i18n) }}
                  </div>
                </div>
              </div>

              <!-- 内容布局：图片 + 文本 -->
              <div class="flex gap-3">
                <!-- 图片或视频图标 -->
                <div
                  v-if="buzzHasVideo || buzzFirstImage"
                  class="w-20 h-20 shrink-0 overflow-hidden rounded relative"
                >
                  <!-- 视频图标 -->
                  <div
                    v-if="buzzHasVideo"
                    class="w-20 h-20 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded"
                  >
                    <el-icon><VideoPlay /></el-icon>
                  </div>
                  <!-- 图片 -->
                  <ChatImage
                    v-else-if="buzzFirstImage"
                    :src="buzzFirstImage"
                    customClass="w-20 h-20 object-cover rounded-none"
                  />
                </div>

                <!-- 文本内容 -->
                <div class="flex-1 min-w-0">
                  <div class="text-dark-800 dark:text-gray-100 text-sm line-clamp-3">
                    {{ pinInfo.parsedSummary?.content || '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SimpleNote 卡片 -->
        <div
          class="w-full py-0.5 flex"
          :class="[isMyMessage ? 'flex-row-reverse' : '']"
          v-else-if="isSimpleNoteLink && pinInfo"
        >
          <div
            class="lg:max-w-full max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
            @click="handleBuzzOrNoteLinkClick"
          >
            <!-- 用户信息和时间 -->
            <div class="p-4 pb-2 flex items-center space-x-2">
              <UserAvatar
                :image="pinUserInfo[pinInfo.creator]?.avatar || ''"
                :name="pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8)"
                :meta-id="pinUserInfo[pinInfo.creator]?.metaid || ''"
                :meta-name="''"
                class="w-8 h-8 shrink-0"
                :disabled="true"
              />
              <div class="flex-1 min-w-0">
                <div class="text-dark-800 dark:text-gray-100 font-medium text-xs truncate">
                  {{ pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8) }}
                </div>
                <div class="text-dark-400 dark:text-gray-400 text-xxs">
                  {{ formatTimestamp(pinInfo.timestamp * 1000, i18n) }}
                </div>
              </div>
            </div>

            <!-- 封面图 -->
            <div
              v-if="noteCoverImage"
              class="w-full h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden"
            >
              <ChatImage :src="noteCoverImage" customClass="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center"
            >
              <Icon name="document_text" class="w-16 h-16 text-gray-400" />
            </div>

            <!-- 标题 -->
            <div class="p-4 pt-3">
              <div class="text-dark-800 dark:text-gray-100 font-medium text-base line-clamp-2">
                {{ pinInfo.parsedSummary?.title || 'Untitled Note' }}
              </div>
            </div>
          </div>
        </div>
        <div class="my-1.5 max-w-full flex" :class="[isMyMessage ? 'flex-row-reverse' : '']" v-else>
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal  p-3 rounded-xl  transition-all duration-200"
            :class="[
              msgChain == ChatChain.btc && 'btc-item',
              isMyMessage
                ? 'bg-primary dark:text-gray-800 rounded-tr'
                : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
              message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
            ]"
            v-if="translateStatus === 'showing'"
            @click="handleMessageClick"
          >
            <div class="" v-html="translatedContent"></div>
            <div class="text-xxs text-dark-300 dark:text-gray-400 mt-1 underline">
              {{ $t('Talk.Messages.translated') }}
            </div>
          </div>

          <div
            v-else
            class="flex items-center gap-2 text-sm   text-dark-800 dark:text-gray-100 font-normal  p-3 rounded-xl  transition-all duration-200"
            :class="[
              msgChain == ChatChain.btc && 'btc-item',
              isMyMessage
                ? 'bg-primary dark:text-gray-800 rounded-tr'
                : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
              message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
            ]"
            @click="handleMessageClick"
          >
            <div
              class="whitespace-pre-wrap break-all"
              v-html="
                parseTextMessage(
                  decryptedMessage(
                    message?.content,
                    message?.encryption,
                    message?.protocol,
                    message?.isMock,
                    true
                  )
                )
              "
            ></div>
            <div
              v-if="message.mockId && !message.error"
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 inline-block
                opacity-50"
            ></div>
          </div>
          <button
            v-if="message.error"
            class="ml-3   break-words flex items-center  justify-center"
            :title="resendTitle"
            @click="tryResend"
          >
            <span v-if="message?.error" class="text-[#fc457b] flex-1 font-sm mr-2">{{
              message?.error
            }}</span>
            <Icon
              name="arrow_path"
              class="w-4 h-4 flex-1  text-dark-400 dark:text-gray-200 hover:animate-spin-once"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ecdhDecrypt } from '@/utils/crypto'
import NftLabel from './NftLabel.vue'
import MessageMenu from './MessageMenu.vue'
import redEnvelopeImg from '@/assets/images/red-envelope.svg?url'
import TalkImagePreview from './ImagePreview.vue'
import { computed, ref, toRaw, Ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp, decryptedMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useTalkStore } from '@/stores/talk'
import { useJobsStore } from '@/stores/jobs'
import { NodeName,ChatChain } from '@/enum'
import MessageItemQuote from './MessageItemQuote.vue'
import { containsString } from '@/utils/util'
import type { PriviteChatMessageItem } from '@/@types/common'
import btcIcon from '@/assets/images/btc.png'
import { useImagePreview } from '@/stores/imagePreview'
import { DB } from '@/utils/db'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { UnifiedChatMessage } from '@/@types/simple-chat'
import { getOneChannel,getGroupChannelList } from '@/api/talk'
import { getUserInfoByAddress } from '@/api/man'
import { useRootStore } from '@/stores/root'
import {openAppBrowser} from '@/wallet-adapters/metalet'
import UnreadMessagesDivider from './UnreadMessagesDivider.vue'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'
import { VideoPlay } from '@element-plus/icons-vue'
const reply: any = inject('Reply')
const i18n = useI18n()
const rootStore=useRootStore()
const showImagePreview = ref(false)
// 群信息缓存
const channelInfo = ref<any>(null)
const subChannelInfo=ref<any>(null)

// MetaApp 信息缓存
interface MetaAppContentSummary {
  title: string
  appName: string
  runtime: string
  icon: string
  prompt: string
  coverImg: string
  introImgs: string[]
  intro: string
  disabled: boolean
  indexFile: string
  code: string
  contentHash: string
  metadata: string
  tags: string[]
  version: string
  contentType: string
  content: string
}

// 统一的 PIN 信息类型
interface UniversalPinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: MetaAppContentSummary | PinContentSummary
}

interface MetaAppPinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: MetaAppContentSummary
}

// 统一的 PIN 信息
const universalPinInfo = ref<UniversalPinInfo | null>(null)

const metaAppInfo = ref<MetaAppPinInfo | null>(null)

// Pin 信息缓存 (Buzz/SimpleNote)
interface PinContentSummary {
  content?: string
  contentType?: string
  attachments?: string[]
  title?: string
  subtitle?: string
  coverImg?: string
  encryption?: string
  createTime?: number
  tags?: string[]
}

interface PinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: PinContentSummary
}

interface UserInfoCache {
  [address: string]: {
    name?: string
    avatar?: string
    metaid?: string
  }
}

const pinInfo = ref<PinInfo | null>(null)
const pinUserInfo = ref<UserInfoCache>({})

interface Props {
  message:UnifiedChatMessage //ChatSessionMessageItem
  lastReadIndex?: number
}
const props = withDefaults(defineProps<Props>(), {})

// 定义事件发射器
const emit = defineEmits<{
  (e: 'quote', message: any): void
  (e: 'toBuzz', data: any): void
  (e: 'to-time-stamp', timestamp: number): void
}>()

function handlerScrollIndex(index:number){

  emit("to-time-stamp",index)
}

const userStore = useUserStore()
const rootstore=useRootStore()
const simpleTalkStore = useSimpleTalkStore()
const activeChannel = computed(() => simpleTalkStore.activeChannel)
const jobs = useJobsStore()
const imagePreview = useImagePreview()


/** 翻译 */
type TranslateStatus = 'hidden' | 'showing' | 'processing'
const translateStatus: Ref<TranslateStatus> = ref('hidden')
const translatedContent = ref('')
/** 翻译 end */

const senderName = computed(() => {
  if (props.message.from === userStore.user?.metaId) {
    return userStore.user?.name
  }

  return activeChannel.value?.name
})

const msgChain = computed(() => {
  return props.message.chain
})

const senderMetaName = computed(() => {
  if (props.message.from === userStore.user?.metaId) {
    return userStore.user?.metaName
  }

  return activeChannel.value?.metaName
})

// const previewImage = () => {
//   showImagePreview.value = true
// }

const resendTitle = computed(() => {
  return i18n.t('Talk.Messages.resend')
})

const isChatGroupLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    props.message.isMock,
    true
  )

  // 检测群聊链接的正则表达式
  const groupLinkPattern = /\/channels\/public\/([a-f0-9]+)/i
  const subChannelLinkPattern=/\/channels\/public\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i
  const isGroupLink = groupLinkPattern.test(messageContent)
  const isSubChannelLink = subChannelLinkPattern.test(messageContent)

  // 如果是群链接且还没有获取过群信息，则获取群信息
  if (isGroupLink  && !channelInfo.value) {
        const match = messageContent.match(groupLinkPattern)
        if (match) {

        const pinId = match[1]
        fetchChannelInfo(pinId+'i0')
        }

      if(isSubChannelLink && !subChannelInfo.value){

         const subMatch = messageContent.match(subChannelLinkPattern)
     if (subMatch) {

      const pinId = subMatch[1]
      fetchSubChannelInfo(pinId)
    }
    }





  }

  return isGroupLink
})

const handleMessageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'A' && target.classList.contains('webview-link')) {
    event.preventDefault()
    const url = target.getAttribute('data-webview-url')
    if (url) {

     openAppBrowser({ url })
    }
  }
}

// 获取群信息
const fetchChannelInfo = async (pinId: string) => {
  try {
    const channel = await getOneChannel(pinId)
    channelInfo.value = channel
    console.log('Fetched channel info:', channel)
  } catch (error) {
    console.error('Failed to fetch channel info:', error)
  }
}

const fetchSubChannelInfo=async(pinId:string)=>{
  try {

    const subChannel = await getGroupChannelList({groupId:pinId})

    if(subChannel.data.list.length){

      subChannelInfo.value = subChannel.data.list[0]
    }

  } catch (error) {

  }
}

// 从 URL 中提取 PIN ID
const extractPinId = (url: string): string | null => {
  const pinPattern = /([a-f0-9]{64}i\d+)/i
  const match = url.match(pinPattern)
  return match ? match[1] : null
}

// 判断消息是否包含 URL + PIN
const hasPinLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false,
    true
  )

  if (!messageContent) return false

  // 检测是否为 URL
  const urlPattern = /(https?:\/\/[^\s]+)/i
  const isUrl = urlPattern.test(messageContent)

  // 检测是否包含 PIN
  const pinId = extractPinId(messageContent)

  // 如果是 URL 且包含 PIN，尝试获取信息
  if (isUrl && pinId && !universalPinInfo.value) {
    fetchUniversalPinInfo(pinId, messageContent)
  }

  return isUrl && !!pinId
})

// 统一获取 PIN 信息
const fetchUniversalPinInfo = async (pinId: string, fullUrl: string) => {
  try {
    const response = await fetch(`https://manapi.metaid.io/pin/${pinId}`)
    const result = await response.json()

    if (result.code === 1 && result.data) {
      universalPinInfo.value = result.data

      // 解析 contentSummary
      if (result.data.contentSummary && universalPinInfo.value) {
        try {
          universalPinInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
        } catch (e) {
          console.error('Failed to parse contentSummary:', e)
        }
      }

      // 获取创建者用户信息
      if (result.data.creator && !pinUserInfo.value[result.data.creator]) {
        fetchPinUserInfo(result.data.creator)
      }

      // 根据 path 更新对应的缓存
      const path = result.data.path
      if (path === '/protocols/metaapp') {
        metaAppInfo.value = result.data
        if (result.data.contentSummary && metaAppInfo.value) {
          try {
            metaAppInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          } catch (e) {}
        }
      } else if (path === '/protocols/simplebuzz' || path === '/protocols/simplenote') {
        pinInfo.value = result.data
        if (result.data.contentSummary && pinInfo.value) {
          try {
            pinInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          } catch (e) {}
        }
      }

      console.log('Fetched Universal Pin info:', universalPinInfo.value)
    }
  } catch (error) {
    console.error('Failed to fetch Universal Pin info:', error)
  }
}

// 判断是否为 MetaApp（基于 path）
const isMetaAppLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/metaapp'
})

// 判断是否为 Buzz（基于 path）
const isBuzzLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/simplebuzz'
})

// 判断是否为 SimpleNote（基于 path）
const isSimpleNoteLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/simplenote'
})

// 解析 MetaApp 链接信息
const metaAppLinkInfo = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false,
    true
  )

  if (!metaAppInfo.value) {
    return {
      pid: '',
      title: 'MetaApp',
      appName: '',
      version: '',
      icon: '',
      coverImg: '',
      creator: '',
      fullUrl: messageContent || ''
    }
  }

  const summary = metaAppInfo.value.parsedSummary

  return {
    pid: metaAppInfo.value.id || '',
    title: summary?.title || 'MetaApp',
    appName: summary?.appName || '',
    version: summary?.version || '',
    icon: summary?.icon || '',
    coverImg: summary?.coverImg || '',
    creator: metaAppInfo.value.creator || '',
    fullUrl: messageContent || ''
  }
})

// 处理 MetaApp 链接点击
const handleMetaAppLinkClick = () => {
  const linkInfo = metaAppLinkInfo.value
  if (linkInfo.fullUrl) {
    if(rootStore.isWebView){
      openAppBrowser({ url: linkInfo.fullUrl })
      return
    }
    // 在新窗口打开 MetaApp 链接
    window.open(linkInfo.fullUrl, openWindowTarget())

  }
}

// 获取 Pin 创建者用户信息
const fetchPinUserInfo = async (address: string) => {
  try {
    const userInfo = await getUserInfoByAddress(address)
    pinUserInfo.value[address] = {
      name: userInfo.name || address.slice(0, 8),
      avatar: userInfo.avatar,
      metaid: userInfo.metaid
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    // 设置默认值
    pinUserInfo.value[address] = {
      name: address.slice(0, 8),
      avatar: '',
      metaid: ''
    }
  }
}

// 判断附件是否为图片
const isImageAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const metafilePattern = /^metafile:\/\/[a-f0-9]+i0(\.(png|jpg|jpeg|gif|webp))?$/i
  return metafilePattern.test(attachment)
}

// 判断附件是否为视频
const isVideoAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const videoPattern = /^metafile:\/\/video\/[a-f0-9]+i0$/i
  return videoPattern.test(attachment)
}

// 获取 Buzz 的第一张图片或视频
const buzzFirstImage = computed(() => {
  if (!pinInfo.value?.parsedSummary?.attachments) return null

  const images = pinInfo.value.parsedSummary.attachments.filter(isImageAttachment)
  return images.length > 0 ? images[0] : null
})

// 判断 Buzz 是否有视频
const buzzHasVideo = computed(() => {
  if (!pinInfo.value?.parsedSummary?.attachments || pinInfo.value.parsedSummary.attachments.length === 0) return false
  return isVideoAttachment(pinInfo.value.parsedSummary.attachments[0])
})

// 获取 SimpleNote 的封面图
const noteCoverImage = computed(() => {
  const summary = pinInfo.value?.parsedSummary
  if (!summary) return null

  // 优先使用 coverImg
  if (summary.coverImg && isImageAttachment(summary.coverImg)) {
    return summary.coverImg
  }

  // 尝试从 attachments 获取
  if (summary.attachments && summary.attachments.length > 0) {
    const images = summary.attachments.filter(isImageAttachment)
    if (images.length > 0) return images[0]
  }

  return null
})

// 处理 Buzz/Note 链接点击
const handleBuzzOrNoteLinkClick = () => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false,
    true
  )

  if (messageContent) {
    if(rootStore.isWebView){
      openAppBrowser({ url: messageContent })
      return
    }
    window.open(messageContent, openWindowTarget())
  }
}



// 处理群链接点击
const handleGroupLinkClick = () => {
  const linkInfo = groupLinkInfo.value
  if (linkInfo.fullUrl) {
    // 在新窗口打开群链接
    window.open(linkInfo.fullUrl, '_self')
  }
}

// 解析群链接信息
const groupLinkInfo = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    props.message.isMock,
    true
  )

  const groupLinkPattern = /\/channels\/public\/([a-f0-9]+)/i
  const subChannelLinkPattern=/\/channels\/public\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i

  const match = messageContent.match(groupLinkPattern)
  const subChannleMatch= messageContent.match(subChannelLinkPattern)

  if (match && !subChannleMatch[2]) {

    const pinId = match[1] + 'i0'

    return {
      pinId,
      groupName: channelInfo.value?.roomName ,
      groupAvatar: channelInfo.value?.roomIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
    }
  }else if(subChannleMatch[2]){
    console.log("subChannleMatch",messageContent)

    const pinId =subChannleMatch[2] + 'i0'
      return {
      pinId,
      groupName: subChannelInfo.value?.channelName ,
      groupAvatar: subChannelInfo.value?.channelIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
    }
  }

  return {
    pinId: '',
    groupName: 'Group Chat',
    groupAvatar: '',
    memberCount: 0,
    creator: '',
    fullUrl: messageContent
  }
})

const tryResend = async () => {
  // props.message.error = false
  // await jobs.resend(props.message.timestamp)
}

const chatPubkeyForDecrypt=computed(()=>{
  return simpleTalkStore.activeChannel!.publicKeyStr//props.message?.userInfo?.chatPublicKey
})

const decryptedImageMessage = computed(() => {
  console.log("props.message.content",props.message)

  if (props.message.isMock) {
    return props.message.content
  }



  if (props.message.encryption !== '1') {
    return props.message.data?.attachment || props.message?.content
  }


})

const decryptedImgMessage=async (content:string,chatPubkeyForDecrypt:string)=>{
  try {
    const res=await  DB.getMetaFileData(content, 235,true,chatPubkeyForDecrypt)
   return URL.createObjectURL(res.data)
  } catch (error) {

  }
}

const previewImage =async (image: string) => {
  const _image =await decryptedImgMessage(image, chatPubkeyForDecrypt.value!)
  imagePreview.images = [_image]
  imagePreview.index = 0
  imagePreview.visibale = true
}

// const decryptedMessage = computed(() => {
//   // 处理mock的图片消息
//   if (
//     props.message.isMock &&
//     (props.message.protocol === NodeName.SimpleFileGroupChat ||
//       props.message.protocol === NodeName.SimpleFileMsg)
//   ) {
//     return props.message.content
//   }

//   if (props.message.data?.encrypt !== '1') {
//     return props.message.data?.attachment || props.message.data?.content
//   }

//   // if (
//   //   props.message.protocol !== 'simpleGroupChat' &&
//   //   props.message.protocol !== 'SimpleFileGroupChat'
//   // ) {
//   //   return props.message.data.content
//   // }

//   if (!talkStore.activeChannel) return ''

//   const privateKey = toRaw(userStore?.wallet)!.getPathPrivateKey('0/0')
//   const privateKeyStr = privateKey.toHex()
//   const otherPublicKeyStr = talkStore.activeChannel.publicKeyStr

//   return ecdhDecrypt(props.message.data.content, privateKeyStr, otherPublicKeyStr)
// })

// const parseTextMessage = (text: string) => {
//   if (typeof text == 'undefined') {
//     return ''
//   }

//   const HTML = /<\/?.+?>/gi
//   const COOKIE = /document\.cookie/gi
//   const HTTP = /(http|https):\/\//gi
//   const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

//   if (HTML.test(text)) {
//     return '无效输入,别耍花样!'
//   }
//   if (COOKIE.test(text)) {
//     return '无效输入,你想干嘛!'
//   }
//   text = text.replace(re, function(url) {
//     if (HTTP.test(text)) {
//       if(rootStore.isWebView){
//         return `<a href=${url} style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
//       }

//       return `<a href=${url} target="_blank" style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
//     }

//     if(rootStore.isWebView){
//       return `<a onClick="window.open('http://${text}','_self')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" >${text}</a>`
//     }

//     return `<a onClick="window.open('http://${text}','_blank')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" target="_blank">${text}</a>`
//   })
//   text = text.replace(/\\n/g, '\n')
//   return text.replace(/\n/g, '<br />')
// }


const parseTextMessage = (text: string) => {
  if (typeof text === 'undefined') {
    return ''
  }

  const HTML = /<\/?.+?>/gi
  const COOKIE = /document\.cookie/gi
  const HTTP = /(http|https):\/\//gi
  const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

  // 检测特殊协议链接（这些链接会渲染成卡片，不需要转换成 HTML 链接）
  const specialProtocolPatterns = [
    /\/channels\/public\/[a-f0-9]+/i,           // 群聊链接
  ]

  // 通用 PIN 检测：检测 URL 中是否包含 PIN (64位16进制+"i"+数字)
  const urlPattern = /(https?:\/\/[^\s]+)/i
  const pinPattern = /([a-f0-9]{64}i\d+)/i

  const isUrl = urlPattern.test(text)
  const hasPinId = pinPattern.test(text)

  // 如果是 URL 且包含 PIN，说明是协议卡片链接，直接返回原文
  if (isUrl && hasPinId) {
    return text.replace(/\\n/g, '\n').replace(/\n/g, '<br />')
  }

  // 如果消息匹配其他特殊协议，直接返回原文
  for (const pattern of specialProtocolPatterns) {
    if (pattern.test(text)) {
      return text.replace(/\\n/g, '\n').replace(/\n/g, '<br />')
    }
  }

  if (HTML.test(text)) {
    return '无效输入,别耍花样!'
  }
  if (COOKIE.test(text)) {
    return '无效输入,你想干嘛!'
  }
  text = text.replace(re, function(url) {
    if (HTTP.test(text)) {
      if(rootstore.isWebView){

        return `<a href="javascript:void(0);" data-webview-url="${url}" class="url webview-link" style="text-decoration: underline;cursor: pointer;word-break: break-all;"> ${url} </a>`
      }

      return `<a href=${url} target="${openWindowTarget()}" style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
    }

    if(rootstore.isWebView){
        return `<a href="javascript:void(0);" data-webview-url="http://${text}" class="webview-link" style="text-decoration: underline;cursor: pointer;word-break: break-all;">${text}</a>`
    }


    return `<a onClick="window.open('http://${text}','${openWindowTarget()}')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" target="${openWindowTarget()}">${text}</a>`
  })
  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

const openWindowTarget = () => {
  if(rootstore.isWebView){
    return "_self";
  }else if (window.innerWidth > 768) {
    return "_blank";
  }
  return "_self";
};

const redEnvelopeReceiveInfo = computed(() => {
  const content: string = props.message.content
  if (!content) return ''

  if (props.message.metaId === props.message.data?.redEnvelopeMetaId) {
    return i18n.t('Talk.Channel.receive_own_red_envelope')
  }

  const [_receiver, sender] = content.split('|-|')

  return i18n.t('Talk.Channel.receive_red_envelope', {
    sender,
  })
})

const redEnvelopeMessage = computed(() => {
  return props.message.data?.content || i18n.t('Talk.Channel.default_red_envelope_message')
})

const isMyMessage = computed(() => {
  return userStore.last?.metaid && userStore.last?.metaid === props.message.from
})

const messageAvatarImage = computed(() => {
  if (props.message.from === userStore.last?.metaid) {
    return userStore.last?.avatar
  }

  return activeChannel.value?.avatar
})

const nftPrice = computed(() => {
  if (props.message.data?.sellUtxo?.price) {
    const rawPrice = props.message.data?.sellUtxo?.price
    let price = (rawPrice / 1e8).toFixed(8)
    // 去掉末尾的0
    price = price.replace(/0+$/, '')
    // 添加单位 SPACE
    price = price + ' SPACE'

    return price
  }

  return '-'
})

const isNftEmoji = computed(() =>containsString(props.message.protocol,NodeName.SimpleEmojiGroupChat))
const isImage = computed(() =>containsString(props.message.protocol,NodeName.SimpleFileMsg))
const isGiveawayRedEnvelope = computed(() =>containsString(props.message.protocol,NodeName.SimpleGroupLuckyBag))
const isReceiveRedEnvelope = computed(() =>containsString(props.message.protocol ,NodeName.OpenRedenvelope))
const isText = computed(() =>containsString(props.message.protocol, NodeName.SimpleMsg))
const isLike = computed(() =>containsString(props.message.protocol,NodeName.PayLike))
const isFollow = computed(() =>containsString(props.message.protocol,NodeName.PayFollow))
const isRepost = computed(() =>containsString(props.message.protocol,NodeName.SimpleRePost))
const isRepostWithComment = computed(() =>containsString(props.message.nodeName,NodeName.SimpleMicroblog))
const isComment = computed(() => containsString(props.message.protocol,NodeName.PayComment))
const isFtTransfer = computed(() =>containsString( props.message.protocol,NodeName.FtTransfer))
const isNftTransfer = computed(() =>containsString(props.message.protocol,NodeName.NftTransfer) )
const isNftBuy = computed(() => containsString(props.message.protocol, NodeName.nftBuy) )
</script>

<style lang="scss" scoped>
.replying {
  background: rgba(var(--themeTextColorRgb), 0.1);

  &::before {
    content: '';
    display: block;
    position: absolute;
    width: 2px;
    height: 100%;
    left: 0;
    top: 0;
    background: var(--color-primary);
  }
}

.not-mine {
  &.btc-item {
    background: linear-gradient(113deg, #fff6e6 -12%, #e5bc77 103%);
    color: #5a4015;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rounded-none {
  border-radius: 0 !important;
}
</style>
