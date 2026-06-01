<template>
  <template v-if="shouldShowWalletActions">
    <a
      v-if="!connectionStore.connected"
      class="main-border primary connect-wallet"
      @click="openConnectionModal"
    >
      {{ $t('Login.connectWallet') }}
    </a>

    <a
      v-else-if="!credentialsStore.get"
      class="main-border primary connect-wallet"
      @click="credentialsStore.login()"
    >
      {{ $t('Login.authorize') }}
    </a>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isAndroid, isIOS, useRootStore } from '@/stores/root'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useConnectionStore } from '@/stores/connection'
import { useCredentialsStore } from '@/stores/credentials'

const { openConnectionModal } = useConnectionModal()
const connectionStore = useConnectionStore()
const credentialsStore = useCredentialsStore()
const rootStore = useRootStore()

const shouldShowWalletActions = computed(() => !isAndroid && !isIOS && !rootStore.isWebView)
</script>

<style lang="scss" scoped src="./LoginedUserOperate.scss"></style>
