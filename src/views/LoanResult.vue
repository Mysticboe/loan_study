<template>
  <AppSkeleton v-if="pageLoading" />
  <div v-else class="result-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>

    <main class="content">
      <section class="header-row">
        <div>
          <p class="eyebrow">Loan Studio</p>
          <h1>申请结果</h1>
        </div>
      </section>

      <section class="panel">
        <template v-if="errorMessage">
          <van-empty description="结果加载失败">
            <p class="error-tip">{{ errorMessage }}</p>
            <div class="action">
              <van-button plain type="primary" class="ghost-btn" @click="loadDetail">重新加载</van-button>
            </div>
            <div class="action action-small">
              <van-button plain type="primary" class="ghost-btn" @click="router.push('/apply')">返回申请</van-button>
            </div>
          </van-empty>
        </template>
        <template v-else>
          <van-icon name="checked" color="#0f766e" size="80" class="status-icon" />
          <h2>提交成功</h2>
          <p class="sub">审批信息已生成，请确认结果</p>

          <van-cell-group inset class="result-group">
            <van-cell title="审批单号" :value="approvalNo" />
            <van-cell title="申请人" :value="applicantName" />
            <van-cell title="审批额度">
              <template #value>
                <span class="amount-value" :class="{ 'amount-enter': amountEntered }">{{ approvedAmount }}</span>
              </template>
            </van-cell>
          </van-cell-group>

          <div class="action">
            <van-button plain block type="primary" class="ghost-btn" @click="saveReceipt">
              保存凭证
            </van-button>
          </div>
          <div class="action action-small">
            <van-button plain block type="primary" class="ghost-btn" @click="router.push('/progress')">
              查看详情
            </van-button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { showFailToast, showSuccessToast } from 'vant';
import { useRoute, useRouter } from 'vue-router';
import AppSkeleton from '../components/AppSkeleton.vue';
import { fetchLoanApplicationDetail } from '../api/loan';

const route = useRoute();
const router = useRouter();
const pageLoading = ref(true);
const amountEntered = ref(false);
const detail = ref(null);
const errorMessage = ref('');
const loadingDetail = ref(false);

const applicationId = computed(() => String(route.params.applicationId || ''));
const applicantName = computed(() => detail.value?.applicantName || '-');
const approvedAmount = computed(() => detail.value?.approvedAmount || '-');
const approvalNo = computed(() => detail.value?.approvalNo || '-');

const loadDetail = async () => {
  if (!applicationId.value || loadingDetail.value) {
    if (!applicationId.value) errorMessage.value = '缺少申请编号，无法加载结果';
    return;
  }
  loadingDetail.value = true;
  errorMessage.value = '';
  try {
    detail.value = await fetchLoanApplicationDetail(applicationId.value);
    requestAnimationFrame(() => {
      amountEntered.value = true;
    });
  } catch (error) {
    errorMessage.value = error.message || '加载审批结果失败';
    showFailToast(errorMessage.value);
  } finally {
    loadingDetail.value = false;
  }
};

const saveReceipt = () => {
  if (!detail.value) {
    showFailToast('审批结果尚未加载完成');
    return;
  }

  const content = [
    '信贷审批凭证',
    `审批单号: ${approvalNo.value}`,
    `申请人: ${applicantName.value}`,
    `审批额度: ${approvedAmount.value}`,
    `保存时间: ${new Date().toLocaleString()}`
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${approvalNo.value}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showSuccessToast('凭证已保存');
};

onMounted(() => {
  setTimeout(() => {
    pageLoading.value = false;
    loadDetail();
  }, 450);
});
</script>

<style scoped>
:global(body) {
  background-color: #edf3fa;
}

.result-page {
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
  margin: 6px 4px 14px;
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

.panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(15px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  padding: 24px 12px 12px;
  text-align: center;
}

.status-icon {
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #1a202c;
}

.sub {
  margin: 8px 0 18px;
  font-size: 13px;
  color: #5f6f82;
}

.error-tip {
  margin: 0;
  font-size: 13px;
  color: #5f6f82;
}

.result-group {
  text-align: left;
}

.amount-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  color: #ee0a24;
  font-weight: 700;
  display: inline-block;
  transform: translateY(14px);
  opacity: 0;
  filter: blur(4px);
}

.amount-enter {
  animation: rollAmount 520ms cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

.action {
  margin: 18px 8px 8px;
}

.action-small {
  margin-top: 10px;
}

.ghost-btn {
  height: 40px;
  border-radius: 999px;
  border-color: rgba(15, 118, 110, 0.45);
  color: #0f766e;
  background: rgba(255, 255, 255, 0.35);
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
}

:deep(.van-cell) {
  background: transparent;
}

:deep(.van-cell__title) {
  color: #5f6f82;
}

:deep(.van-cell__value) {
  color: #2d3748;
}

@keyframes rollAmount {
  from {
    transform: translateY(14px);
    opacity: 0;
    filter: blur(4px);
  }
  to {
    transform: translateY(0);
    opacity: 1;
    filter: blur(0);
  }
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
