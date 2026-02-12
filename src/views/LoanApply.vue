﻿<template>
  <AppSkeleton v-if="pageLoading" />
  <div v-else class="apply-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>

    <main class="content">
      <section class="header-row">
        <div>
          <p class="eyebrow">Loan Studio</p>
          <h1>信贷申请</h1>
        </div>
        <div class="header-actions">
          <van-button text="进度" type="primary" plain class="ghost-head-btn" @click="goProgress" />
          <van-button text="返回工作台" type="primary" plain class="logout-btn" @click="goWorkbench" />
        </div>
      </section>

      <section class="panel">
        <van-form @submit="submitApply">
          <LoanInfo
            v-model="formData"
            :can-submit="isAgreed"
            :is-submitting="submitting"
            @request-submit="submitApply"
          />

          <van-cell-group inset title="贷款方案" class="loan-plan-group">
            <van-field
              v-model.number="formData.collateralValue"
              type="number"
              label="抵押物价值"
              suffix="元"
            />
            <van-field
              :model-value="loanAmount"
              label="建议额度"
              readonly
              :class="{ 'high-amount': isHighAmount }"
            />
          </van-cell-group>

          <van-cell-group inset title="影像上传" class="upload-group">
            <van-cell title="身份证影像" value="支持拍照上传" />
            <div class="upload-inner">
              <van-uploader
                v-model="idImages"
                accept="image/*"
                capture="camera"
                :max-count="2"
                :preview-size="84"
                upload-text="拍摄身份证"
              />
            </div>
          </van-cell-group>

          <div class="agreement">
            <van-checkbox v-model="isAgreed" shape="square">
              我已阅读并同意《征信查询协议》
            </van-checkbox>
          </div>

          <div class="action">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="submitting"
              :loading-text="'风险评估中...'"
              :disabled="!isAgreed"
              class="submit-btn"
              :class="{ 'is-active': isAgreed }"
            >
              <template v-if="!submitting">提交信贷审批</template>
            </van-button>
          </div>
        </van-form>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive, computed } from 'vue';
import { showFailToast, showSuccessToast } from 'vant';
import { useRouter } from 'vue-router';
import LoanInfo from '../components/LoanInfo.vue';
import AppSkeleton from '../components/AppSkeleton.vue';
import { createLoanApplication } from '../api/loan';
import { uploadIdCards } from '../api/upload';

const router = useRouter();
const pageLoading = ref(true);
const isAgreed = ref(false);
const submitting = ref(false);
const radio = ref(0.7);
const idImages = ref([]);
const formData = reactive({
  customerName: '',
  idCard: '',
  birthDate: '',
  collateralValue: 0
});

const loanAmount = computed(() => {
  if (!formData.collateralValue || formData.collateralValue <= 0) return '0.00';
  const result = formData.collateralValue * radio.value;
  return result.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
});

const isHighAmount = computed(() => {
  if (!formData.collateralValue || formData.collateralValue <= 0) return false;
  const result = formData.collateralValue * radio.value;
  return result > 1000000;
});

onMounted(async () => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  Object.assign(formData, {
    customerName: '李建国',
    idCard: '11010119990713001X',
    collateralValue: 2000000
  });
  pageLoading.value = false;
});

const submitApply = async () => {
  if (idImages.value.length === 0) {
    showFailToast('请先上传身份证影像');
    return;
  }
  if (!formData.customerName || !formData.idCard || !formData.birthDate || !formData.collateralValue) {
    showFailToast('请完整填写申请信息');
    return;
  }

  submitting.value = true;
  try {
    const files = idImages.value
      .map((item) => item.file)
      .filter((file) => file instanceof File);

    const uploadResult = await uploadIdCards(files);
    const idCardFileIds = uploadResult.files.map((item) => item.fileId);

    const idempotencyKey = `loan_apply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      customerName: formData.customerName,
      idCard: formData.idCard,
      birthDate: formData.birthDate,
      collateralValue: Number(formData.collateralValue),
      idCardFileIds
    };
    const result = await createLoanApplication(payload, idempotencyKey);
    showSuccessToast('提交成功');
    router.push(`/result/${result.applicationId}`);
  } catch (error) {
    showFailToast(error.message || '提交失败');
  } finally {
    submitting.value = false;
  }
};

const goWorkbench = () => {
  router.push('/workbench');
};

const goProgress = () => {
  router.push('/progress');
};
</script>

<style scoped>
:global(body) {
  background-color: #edf3fa;
}

.apply-page {
  min-height: 100vh;
  background: radial-gradient(160% 80% at 20% 15%, #d8e7ff 0%, transparent 55%),
    radial-gradient(120% 70% at 90% 80%, #d8f3eb 0%, transparent 60%), #edf3fa;
  position: relative;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 999px;
  filter: blur(2px);
}

.bg-shape-a {
  width: 220px;
  height: 220px;
  background: linear-gradient(135deg, #9ec5ff, #67a4ff);
  top: -60px;
  left: -40px;
  opacity: 0.25;
}

.bg-shape-b {
  width: 260px;
  height: 260px;
  background: linear-gradient(135deg, #6bcab8, #77e2d0);
  right: -100px;
  bottom: -80px;
  opacity: 0.2;
}

.content {
  position: relative;
  z-index: 2;
  max-width: 560px;
  margin: 0 auto;
  padding: 72px 16px 28px;
  animation: fadeUp 320ms ease-out;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 6px 4px 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f766e;
  opacity: 0.8;
}

h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #1a202c;
}

.logout-btn {
  border-color: rgba(15, 118, 110, 0.35);
  color: #0f766e;
  border-radius: 999px;
  padding: 0 10px;
  height: 32px;
}

.ghost-head-btn {
  border-color: rgba(15, 118, 110, 0.35);
  color: #0f766e;
  border-radius: 999px;
  padding: 0 10px;
  height: 32px;
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(15px) saturate(180%);
  border-radius: 24px;
  padding: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.loan-plan-group,
.upload-group {
  margin-top: 20px;
}

.upload-inner {
  padding: 10px 12px 14px;
}

.agreement {
  padding: 16px 12px 8px;
}

.action {
  margin: 12px 8px 8px;
}

.submit-btn {
  background: linear-gradient(135deg, #8fa9a1 0%, #7f958f 100%);
  border: none;
  height: 48px;
  font-weight: 600;
  opacity: 1;
  box-shadow: 0 8px 16px rgba(89, 116, 108, 0.22);
}

.submit-btn.is-active {
  background: linear-gradient(135deg, #0f766e 0%, #0a5d57 100%);
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.2);
}

.submit-btn.van-button--disabled {
  background: linear-gradient(135deg, #8fa9a1 0%, #7f958f 100%);
  color: rgba(255, 255, 255, 0.88);
  opacity: 1;
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
}

:deep(.van-cell-group__title) {
  color: #5f6f82;
  padding: 0 4px 10px;
}

:deep(.van-cell::after) {
  display: none;
}

:deep(.van-field) {
  transition: all 0.3s;
  padding: 16px 12px;
  background: transparent !important;
  border-bottom: 1px solid rgba(45, 55, 72, 0.12);
}

:deep(.van-field:last-child) {
  border-bottom: none;
}

:deep(.van-field__label),
:deep(.van-cell__title) {
  color: #8a95a3;
}

:deep(.van-field__control),
:deep(.van-field__value),
:deep(.van-cell__value) {
  font-size: 16px;
  color: #2d3748;
}

:deep(.van-field--focus) {
  background: rgba(15, 118, 110, 0.02);
}

:deep(.van-checkbox__label) {
  color: #2d3748;
}

:deep(.van-checkbox__icon--checked .van-icon) {
  background-color: #0f766e;
  border-color: #0f766e;
}

.high-amount :deep(.van-field__label),
.high-amount :deep(.van-field__value),
.high-amount :deep(.van-field__control) {
  color: #ee0a24;
}

:deep(.van-uploader__upload) {
  width: 84px;
  height: 84px;
  border-radius: 12px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
}

:deep(.van-uploader__preview-image) {
  border-radius: 12px;
}

@keyframes fadeUp {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (min-width: 768px) {
  .content {
    padding-top: 72px;
  }
}
</style>
