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
          <h1 class="page-title">我的申请进度</h1>
        </div>
        <van-button plain type="primary" class="back-btn" @click="router.push('/apply')">
          返回申请
        </van-button>
      </section>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多申请了"
          :immediate-check="false"
          @load="onLoad"
        >
          <article
            v-for="item in list"
            :key="item.id"
            class="process-card"
            @click="toggleExpand(item.id)"
          >
            <header class="card-header">
              <span class="order-no">单号：{{ item.no }}</span>
              <van-tag :type="getStatusType(item.status)" round>{{ item.statusText }}</van-tag>
            </header>

            <section class="card-content">
              <div class="info-row">
                <span class="label">申请人</span>
                <span class="value">{{ item.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">申请金额</span>
                <span class="value money">{{ item.amount }}</span>
              </div>
            </section>

            <div v-if="isExpanded(item.id)" class="steps-wrapper">
              <van-steps :active="item.activeStep" active-color="#0f766e">
                <van-step>申请提交</van-step>
                <van-step>资料审核</van-step>
                <van-step>风控评价</van-step>
                <van-step>待放款</van-step>
              </van-steps>
            </div>
            <p class="expand-tip">{{ isExpanded(item.id) ? '收起进度' : '点击查看详细进度' }}</p>
          </article>
        </van-list>
      </van-pull-refresh>
    </main>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppSkeleton from '../components/AppSkeleton.vue';

const router = useRouter();
const pageLoading = ref(true);
const loading = ref(false);
const refreshing = ref(false);
const finished = ref(false);
const list = ref([]);
const pageNo = ref(1);
const pageSize = 6;
const expandedMap = reactive({});

const statusDefs = [
  { key: 'reviewing', text: '审批中', step: 2, tag: 'primary' },
  { key: 'rejected', text: '已拒绝', step: 2, tag: 'danger' },
  { key: 'disbursed', text: '已发放', step: 3, tag: 'success' },
  { key: 'pending', text: '待放款', step: 3, tag: 'warning' }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatusDef = (index) => statusDefs[index % statusDefs.length];

const amountText = (amount) =>
  amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildMockRows = (page, size) => {
  if (page > 3) return [];
  return Array.from({ length: size }).map((_, i) => {
    const n = (page - 1) * size + i + 1;
    const status = getStatusDef(n);
    return {
      id: `loan-${n}`,
      no: `APR2026${String(100000 + n).slice(-6)}`,
      name: ['李建国', '王晓云', '张文涛', '赵子涵'][n % 4],
      amount: amountText(300000 + n * 52000),
      status: status.key,
      statusText: status.text,
      activeStep: status.step
    };
  });
};

const getStatusType = (status) => {
  const found = statusDefs.find((s) => s.key === status);
  return found ? found.tag : 'primary';
};

const isExpanded = (id) => Boolean(expandedMap[id]);

const toggleExpand = (id) => {
  expandedMap[id] = !expandedMap[id];
};

const onLoad = async () => {
  if (finished.value) return;
  loading.value = true;
  await delay(700);
  const rows = buildMockRows(pageNo.value, pageSize);

  if (refreshing.value) {
    list.value = [];
    refreshing.value = false;
  }

  list.value = [...list.value, ...rows];
  pageNo.value += 1;
  finished.value = rows.length < pageSize;
  loading.value = false;
};

const onRefresh = async () => {
  finished.value = false;
  pageNo.value = 1;
  list.value = [];
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
</style>
