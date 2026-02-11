<template>
  <AppSkeleton v-if="pageLoading" />
  <div v-else class="list-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>

    <main class="content">
      <div class="header-space"></div>
      <section class="title-row">
        <div>
          <p class="eyebrow">Loan Studio</p>
          <h1 class="page-title">{{ text.pageTitle }}</h1>
        </div>
        <van-button plain type="primary" class="back-btn" @click="router.push('/apply')">
          {{ text.backToApply }}
        </van-button>
      </section>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          :finished-text="text.noMore"
          :immediate-check="false"
          @load="onLoad"
        >
          <van-empty v-if="!loading && !refreshing && list.length === 0 && !errorMessage" :description="text.noData" />

          <van-empty v-if="errorMessage" :description="text.loadFailed">
            <p class="error-tip">{{ errorMessage }}</p>
            <van-button plain type="primary" class="retry-btn" @click="retryLoad">{{ text.retry }}</van-button>
          </van-empty>

          <article
            v-for="item in list"
            :key="item.applicationId"
            class="process-card"
            @click="toggleExpand(item.applicationId)"
          >
            <header class="card-header">
              <span class="order-no">{{ text.orderNoPrefix }}{{ item.approvalNo }}</span>
              <van-tag :type="getStatusType(item.status)" round>{{ item.statusText || text.processing }}</van-tag>
            </header>

            <section class="card-content">
              <div class="info-row">
                <span class="label">{{ text.applicant }}</span>
                <span class="value">{{ item.applicantName }}</span>
              </div>
              <div class="info-row">
                <span class="label">{{ text.amount }}</span>
                <span class="value money">{{ item.approvedAmount }}</span>
              </div>
            </section>

            <div v-if="isExpanded(item.applicationId)" class="steps-wrapper">
              <van-steps :active="item.activeStep || 0" active-color="#0f766e">
                <van-step>{{ text.stepSubmitted }}</van-step>
                <van-step>{{ text.stepReview }}</van-step>
                <van-step>{{ text.stepRisk }}</van-step>
                <van-step>{{ text.stepPending }}</van-step>
              </van-steps>
            </div>
            <p class="expand-tip">{{ isExpanded(item.applicationId) ? text.collapse : text.expand }}</p>
          </article>
        </van-list>
      </van-pull-refresh>
    </main>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { showFailToast } from 'vant';
import { useRouter } from 'vue-router';
import AppSkeleton from '../components/AppSkeleton.vue';
import { fetchProgressPage } from '../api/progress';

const router = useRouter();
const pageLoading = ref(true);
const loading = ref(false);
const refreshing = ref(false);
const finished = ref(false);
const list = ref([]);
const errorMessage = ref('');
const pageNo = ref(1);
const pageSize = 6;
const expandedMap = reactive({});

const text = {
  pageTitle: '\u6211\u7684\u7533\u8bf7\u8fdb\u5ea6',
  backToApply: '\u8fd4\u56de\u7533\u8bf7',
  noMore: '\u6ca1\u6709\u66f4\u591a\u7533\u8bf7\u4e86',
  noData: '\u6682\u65e0\u7533\u8bf7\u8bb0\u5f55',
  loadFailed: '\u7533\u8bf7\u8fdb\u5ea6\u52a0\u8f7d\u5931\u8d25',
  retry: '\u91cd\u8bd5',
  orderNoPrefix: '\u5355\u53f7\uff1a',
  processing: '\u5904\u7406\u4e2d',
  applicant: '\u7533\u8bf7\u4eba',
  amount: '\u7533\u8bf7\u91d1\u989d',
  unknownApplicant: '\u672a\u77e5\u7533\u8bf7\u4eba',
  stepSubmitted: '\u7533\u8bf7\u63d0\u4ea4',
  stepReview: '\u8d44\u6599\u5ba1\u6838',
  stepRisk: '\u98ce\u63a7\u8bc4\u4f30',
  stepPending: '\u5f85\u653e\u6b3e',
  collapse: '\u6536\u8d77\u8fdb\u5ea6',
  expand: '\u70b9\u51fb\u67e5\u770b\u8be6\u7ec6\u8fdb\u5ea6',
  defaultError: '\u52a0\u8f7d\u5931\u8d25'
};

const statusTypeMap = {
  reviewing: 'primary',
  rejected: 'danger',
  disbursed: 'success',
  pending: 'warning'
};

const statusTextMap = {
  reviewing: '\u5ba1\u6279\u4e2d',
  rejected: '\u5df2\u62d2\u7edd',
  disbursed: '\u5df2\u653e\u6b3e',
  pending: '\u5f85\u653e\u6b3e'
};

const getStatusType = (status) => statusTypeMap[status] || 'primary';
const hasBrokenText = (value) => typeof value === 'string' && value.includes('\uFFFD');

const normalizeRow = (row) => {
  const status = row?.status || 'reviewing';
  const safeStatusText = hasBrokenText(row?.statusText) ? statusTextMap[status] : row?.statusText;
  const safeApplicantName = hasBrokenText(row?.applicantName) ? text.unknownApplicant : row?.applicantName;
  return {
    ...row,
    statusText: safeStatusText || statusTextMap[status] || text.processing,
    applicantName: safeApplicantName || text.unknownApplicant
  };
};

const isExpanded = (id) => Boolean(expandedMap[id]);

const toggleExpand = (id) => {
  expandedMap[id] = !expandedMap[id];
};

const onLoad = async () => {
  if (finished.value) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await fetchProgressPage({
      pageNo: pageNo.value,
      pageSize
    });

    const rows = Array.isArray(data.list) ? data.list.map(normalizeRow) : [];

    if (refreshing.value) {
      list.value = [];
      refreshing.value = false;
    }

    list.value = [...list.value, ...rows];
    pageNo.value += 1;
    finished.value = !data.hasMore;
  } catch (error) {
    errorMessage.value = error.message || text.defaultError;
    showFailToast(errorMessage.value);
  } finally {
    loading.value = false;
  }
};

const onRefresh = async () => {
  finished.value = false;
  pageNo.value = 1;
  list.value = [];
  Object.keys(expandedMap).forEach((key) => {
    delete expandedMap[key];
  });
  await onLoad();
};

const retryLoad = async () => {
  errorMessage.value = '';
  if (list.value.length === 0) {
    finished.value = false;
  }
  await onLoad();
};

onMounted(async () => {
  await onLoad();
  pageLoading.value = false;
});
</script>

<style scoped>
.list-page {
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
  padding: 16px;
}

.header-space {
  height: 40px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f766e;
  opacity: 0.8;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #1a2333;
}

.back-btn {
  border-radius: 999px;
  border-color: rgba(15, 118, 110, 0.35);
  color: #0f766e;
  height: 32px;
}

.process-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 24px rgba(149, 157, 165, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.order-no {
  font-size: 13px;
  color: #5f6f82;
}

.card-content {
  margin-top: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.label {
  color: #8a95a3;
}

.value {
  color: #2d3748;
}

.money {
  color: #d72c2c;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
}

.steps-wrapper {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(15, 118, 110, 0.22);
}

.expand-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #7a8898;
}

.error-tip {
  margin: 0;
  color: #7a8898;
  font-size: 13px;
}

.retry-btn {
  margin-top: 10px;
}
</style>
