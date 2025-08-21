<template>
  <!-- 钱包缺失提示弹窗 -->
  <ElDialog
    :model-value="isWalletMissingModalOpen"
    :close-on-click-modal="false"
    :show-close="false"
    class="none-header wallet-missing-modal"
    :width="400"
    @close="closeWalletMissingModal"
  >
    <div class="wallet-missing-warp flex flex-v">
      <a class="close flex flex-align-center flex-pack-center" @click="closeWalletMissingModal">
        <Icon name="x_mark" />
      </a>
      <div class="content flex1 flex flex-v">
        <div class="title">{{ $t('Wallet Installation Required') }}</div>

        <div class="description">
          {{
            $t(
              'We are a decentralized Web3 application that requires a wallet for signing, authorization, and more.'
            )
          }}
        </div>
        <div class="description">
          {{
            $t(
              "You haven't installed the corresponding wallet yet. Click the button, and we will guide you to the Metalet wallet official website for installation (we recommend the browser extension version)."
            )
          }}
        </div>
        <div class="operate-container">
          <div class="main-border primary operate-wrap" @click="goToMetaletWebsite">
            <img :src="MetaletLogo" alt="" />
            <p>{{ $t('Go to Metalet Website') }}</p>
            <el-icon :size="16" style="font-weight: 500;"><Right /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { ElButton } from 'element-plus'
import { Right } from '@element-plus/icons-vue'
import MetaletLogo from '@/assets/images/metalet-logo-cricle.svg?url'

const { isWalletMissingModalOpen, closeWalletMissingModal, missingWallet } = useConnectionModal()

const goToMetaletWebsite = () => {
  window.open('https://www.metalet.space/', '_blank')
  closeWalletMissingModal()
}
</script>

<style lang="scss" scoped>
.wallet-missing-warp {
  padding: 28px 24px;
  .close {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--themeBgSecondColor);
    cursor: pointer;
    margin-left: -17px;
    margin-bottom: -70px;

    .icon {
      width: 12px;
      height: 12px;
      transition: all 0.5s;
    }

    &:hover {
      .icon {
        transform: rotate(180deg);
      }
    }
  }

  .content {
    .title {
      font-size: 24px;
      font-weight: 600;
      color: var(--themeTextColor);
      margin-bottom: 16px;
      text-align: center;
    }

    .description {
      font-size: 16px;
      line-height: 1.5;
      color: var(--themeTextSecondColor);
      margin-bottom: 24px;
      text-align: left;
    }

    .operate-container {
      display: flex;
      flex-direction: row-reverse;
      .operate-wrap {
        display: flex;
        align-items: center;
        // justify-content: center;
        gap: 8px;
        padding: 8px 12px;
        font-size: 16px;
        // font-weight: 500;
        // white-space: nowrap;
        span {
          font-size: 12px;
        }
      }
    }
  }
}
</style>
