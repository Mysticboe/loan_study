<template>
  <div class="workbench-page">
    <header class="header-card">
      <div class="user-wrap">
        <div class="avatar">
          <van-icon name="manager-o" size="22" />
        </div>
        <div class="user-info">
          <h1 class="user-name">李建国</h1>
          <p class="user-role">同业授信客户经理</p>
        </div>
      </div>
      <van-button plain hairline size="small" type="primary" class="logout-btn" @click="handleLogout">
        退出
      </van-button>
    </header>

    <section class="panel">
      <div class="panel-title">业务看板</div>
      <van-row :gutter="12">
        <van-col v-for="item in displayStats" :key="item.label" :span="8">
          <div class="stat-card">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </van-col>
      </van-row>
    </section>

    <section class="panel">
      <div class="panel-title">快捷功能</div>
      <van-grid :column-num="4" :border="false" :gutter="8">
        <van-grid-item
          v-for="item in quickActions"
          :key="item.text"
          :icon="item.icon"
          :text="item.text"
          @click="handleQuickAction(item)"
        />
      </van-grid>
    </section>

    <section class="panel chart-panel">
      <div class="panel-title">额度上限仪表盘</div>
      <div class="chart-shell chart-shell--stack">
        <div ref="gaugeChartRef" class="chart-canvas gauge-canvas"></div>
        <van-skeleton v-if="chartLoading" title :row="4" animate class="chart-skeleton" />
      </div>
    </section>

    <section class="panel chart-panel">
      <div class="panel-title">分项额度压力分布</div>
      <div class="chart-shell chart-shell--stack">
        <div ref="quotaBarChartRef" class="chart-canvas quota-canvas"></div>
        <van-skeleton v-if="chartLoading" title :row="5" animate class="chart-skeleton" />
      </div>
    </section>

    <section class="panel chart-panel">
      <div class="panel-title">时效监控曲线（近7天）</div>
      <div class="chart-shell chart-shell--stack">
        <div ref="timingLineChartRef" class="chart-canvas timing-canvas"></div>
        <van-skeleton v-if="chartLoading" title :row="5" animate class="chart-skeleton" />
      </div>
    </section>

    <section class="panel detail-panel">
      <div class="panel-head">
        <div class="panel-title">审批完成业务明细</div>
        <div class="selected-date">当前日期：{{ selectedCompletionDate || '--' }}</div>
      </div>
      <div v-if="filteredCompletionDetails.length === 0" class="empty-state">当日暂无完成审批业务</div>
      <div v-else class="detail-list">
        <div v-for="item in filteredCompletionDetails" :key="item.id" class="detail-item">
          <div class="detail-main">
            <div class="detail-customer">{{ item.customerName }}</div>
            <div class="detail-meta">{{ item.businessType }} · {{ item.id }}</div>
          </div>
          <div class="detail-side">
            <div class="detail-amount">{{ formatMaskedAmount(item.amount) }}</div>
            <div class="detail-status">{{ item.status }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { BarChart, GaugeChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { init, use, graphic } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { showConfirmDialog, showSuccessToast, showToast } from 'vant';
import { useRouter } from 'vue-router';
import { useCountUp } from '../composables/useCountUp';
import { clearSession } from '../session/authSession';

use([GaugeChart, BarChart, LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const TEN_MILLION = 10000000;
const HUNDRED_MILLION = 100000000;

const router = useRouter();

const statTarget = {
  todo: 18,
  dueSoon: 6,
  quota: 136000000
};

const todoCounter = useCountUp({ duration: 1000, decimals: 0 });
const dueSoonCounter = useCountUp({ duration: 1200, decimals: 0 });
const quotaCounter = useCountUp({
  duration: 1400,
  decimals: 0,
  formatter: (value) => formatStatAmount(value)
});

const displayStats = computed(() => [
  { label: '待办任务', value: todoCounter.displayValue.value },
  { label: '即将到期', value: dueSoonCounter.displayValue.value },
  { label: '本月额度', value: quotaCounter.displayValue.value }
]);

const quickActions = [
  { text: '准入申请', icon: 'add-o' },
  { text: '授信申请', icon: 'edit' },
  { text: '批复查询', icon: 'search' },
  { text: '批量处理', icon: 'cluster-o' }
];

const chartLoading = ref(true);

const totalSelfQuota = ref(0);
const usedSelfQuota = ref(0);

const quotaCategories = ref([]);
const quotaUsed = ref([]);
const quotaInFlight = ref([]);

const recentSevenDays = ref([]);
const completedTaskCount = ref([]);
const completedTaskAmount = ref([]);
const completionDetails = ref([]);
const selectedCompletionDate = ref('');

const gaugeChartRef = ref(null);
const quotaBarChartRef = ref(null);
const timingLineChartRef = ref(null);

let gaugeChart = null;
let quotaBarChart = null;
let timingLineChart = null;
let stripeTimer = 0;
let stripeOffset = 0;

const usageRatio = computed(() => {
  if (!totalSelfQuota.value) return 0;
  return usedSelfQuota.value / totalSelfQuota.value;
});

const filteredCompletionDetails = computed(() => {
  if (!selectedCompletionDate.value) return [];
  return completionDetails.value.filter((item) => item.date === selectedCompletionDate.value);
});

function formatMaskedAmount(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= TEN_MILLION) {
    return `${(amount / HUNDRED_MILLION).toFixed(2)} 亿元`;
  }
  return `${Math.round(amount).toLocaleString('zh-CN')} 元`;
}

function formatAxisAmount(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= HUNDRED_MILLION) return `${(amount / HUNDRED_MILLION).toFixed(2)}亿`;
  if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(0)}万`;
  return `${Math.round(amount)}`;
}

function formatStatAmount(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= HUNDRED_MILLION) {
    return `¥${(amount / HUNDRED_MILLION).toFixed(2)}亿`;
  }
  return `¥${Math.round(amount).toLocaleString('zh-CN')}`;
}

function getRecentDayLabels(dayCount) {
  const labels = [];
  const current = new Date();
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const date = new Date(current.getFullYear(), current.getMonth(), current.getDate() - i);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    labels.push(`${month}-${day}`);
  }
  return labels;
}

function buildCompletionDetails(days) {
  return [
    { id: `CL-${days[0]}-001`, date: days[0], customerName: '上海申浦实业有限公司', businessType: '票据', amount: 12400000, status: '已完成' },
    { id: `CL-${days[0]}-002`, date: days[0], customerName: '南京弘泰供应链集团', businessType: '同业融资', amount: 8800000, status: '已完成' },
    { id: `CL-${days[1]}-001`, date: days[1], customerName: '苏州锦程商贸有限公司', businessType: '同业投资', amount: 10600000, status: '已完成' },
    { id: `CL-${days[2]}-001`, date: days[2], customerName: '浙江恒安租赁有限公司', businessType: '债券', amount: 9700000, status: '已完成' },
    { id: `CL-${days[2]}-002`, date: days[2], customerName: '北京融盛科技有限公司', businessType: '票据', amount: 15000000, status: '已完成' },
    { id: `CL-${days[3]}-001`, date: days[3], customerName: '广州海联国际贸易', businessType: '同业融资', amount: 13100000, status: '已完成' },
    { id: `CL-${days[4]}-001`, date: days[4], customerName: '成都泽润能源有限公司', businessType: '资管计划', amount: 11800000, status: '已完成' },
    { id: `CL-${days[4]}-002`, date: days[4], customerName: '天津新港物流有限公司', businessType: '同业投资', amount: 9200000, status: '已完成' },
    { id: `CL-${days[5]}-001`, date: days[5], customerName: '深圳前海创新实业', businessType: '票据', amount: 16200000, status: '已完成' },
    { id: `CL-${days[6]}-001`, date: days[6], customerName: '青岛盛达控股集团', businessType: '同业融资', amount: 21400000, status: '已完成' },
    { id: `CL-${days[6]}-002`, date: days[6], customerName: '武汉辰锐装备制造', businessType: '债券', amount: 10900000, status: '已完成' }
  ];
}

function createStripeGradient(offset = 0) {
  const segmentCount = 14;
  const colorStops = [];

  for (let i = 0; i <= segmentCount; i += 1) {
    const position = ((i / segmentCount) + offset) % 1;
    colorStops.push({
      offset: position,
      color: i % 2 === 0 ? 'rgba(52, 211, 153, 0.92)' : 'rgba(167, 243, 208, 0.42)'
    });
  }

  colorStops.sort((a, b) => a.offset - b.offset);
  if (colorStops.length > 0) {
    colorStops[0].offset = 0;
    colorStops[colorStops.length - 1].offset = 1;
  }

  return new graphic.LinearGradient(0, 0, 1, 1, colorStops, false);
}

async function loadDashboardData() {
  chartLoading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 900));

    totalSelfQuota.value = 6800000000;
    usedSelfQuota.value = 4520000000;

    quotaCategories.value = ['票据', '同业融资', '同业投资', '债券', '资管计划', '其他'];
    quotaUsed.value = [980000000, 1160000000, 860000000, 620000000, 590000000, 310000000];
    quotaInFlight.value = [180000000, 250000000, 110000000, 90000000, 150000000, 70000000];

    recentSevenDays.value = getRecentDayLabels(7);
    completedTaskCount.value = [24, 28, 22, 31, 27, 34, 29];
    completedTaskAmount.value = [195000000, 223000000, 176000000, 246000000, 209000000, 281000000, 238000000];
    completionDetails.value = buildCompletionDetails(recentSevenDays.value);
    selectedCompletionDate.value = recentSevenDays.value[recentSevenDays.value.length - 1];
  } catch (error) {
    showToast(error?.message || '图表数据加载失败');
  } finally {
    chartLoading.value = false;
    await nextTick();
    requestAnimationFrame(() => {
      const rendered = safeRenderAllCharts();
      if (rendered && quotaUsed.value.length > 0) {
        startStripeAnimation();
      }
    });
  }
}

function renderGaugeChart() {
  if (!gaugeChartRef.value) return;
  if (!gaugeChart) gaugeChart = init(gaugeChartRef.value);

  gaugeChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: () => {
        return [
          '全行自营总额度',
          `占用额度：${formatMaskedAmount(usedSelfQuota.value)}`,
          `总额度：${formatMaskedAmount(totalSelfQuota.value)}`,
          `占用比例：${(usageRatio.value * 100).toFixed(2)}%`
        ].join('<br/>');
      }
    },
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: totalSelfQuota.value || 1,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.6, '#22c55e'],
              [0.85, '#f59e0b'],
              [1, '#ef4444']
            ]
          }
        },
        progress: {
          show: true,
          roundCap: true,
          width: 14,
          itemStyle: { color: '#0f766e' }
        },
        pointer: {
          show: true,
          width: 6,
          length: '72%',
          itemStyle: { color: '#0f766e' }
        },
        anchor: {
          show: true,
          size: 11,
          itemStyle: { color: '#0f766e' }
        },
        axisTick: { show: false },
        splitLine: {
          distance: -14,
          length: 10,
          lineStyle: {
            width: 2,
            color: '#ffffff'
          }
        },
        axisLabel: {
          distance: 22,
          color: '#7b8ca2',
          fontSize: 10,
          formatter: (value) => `${Math.round((value / (totalSelfQuota.value || 1)) * 100)}%`
        },
        title: {
          offsetCenter: [0, '56%'],
          fontSize: 12,
          color: '#5f6f82'
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '79%'],
          color: '#13233a',
          fontSize: 14,
          formatter: (value) => `已占用 ${formatMaskedAmount(value)}`
        },
        data: [
          {
            value: usedSelfQuota.value,
            name: '全行自营总额度'
          }
        ]
      }
    ]
  });
}

function renderQuotaBarChart() {
  if (!quotaBarChartRef.value) return;
  if (!quotaBarChart) quotaBarChart = init(quotaBarChartRef.value);

  quotaBarChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const category = params[0]?.axisValue || '';
        const used = Number(params.find((item) => item.seriesName === '已占用')?.value || 0);
        const inFlight = Number(params.find((item) => item.seriesName === '在途审批')?.value || 0);
        const pressure = used + inFlight;
        return [
          `${category}`,
          `已占用：${formatMaskedAmount(used)}`,
          `在途审批：${formatMaskedAmount(inFlight)}`,
          `额度压力：${formatMaskedAmount(pressure)}`
        ].join('<br/>');
      }
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: '#5f6f82' },
      data: ['已占用', '在途审批']
    },
    grid: {
      left: 18,
      right: 18,
      top: 34,
      bottom: 10,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#d8e2ef' } },
      splitLine: { lineStyle: { color: '#ebf1f8' } },
      axisLabel: {
        color: '#5f6f82',
        formatter: (value) => formatAxisAmount(value)
      }
    },
    yAxis: {
      type: 'category',
      data: quotaCategories.value,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#2b3a4d' }
    },
    series: [
      {
        name: '已占用',
        type: 'bar',
        stack: 'quota',
        barWidth: 15,
        itemStyle: {
          color: '#0f766e',
          borderRadius: [7, 0, 0, 7]
        },
        animationDuration: 1200,
        data: quotaUsed.value
      },
      {
        name: '在途审批',
        type: 'bar',
        stack: 'quota',
        barWidth: 15,
        itemStyle: {
          color: createStripeGradient(stripeOffset),
          borderRadius: [0, 7, 7, 0],
          borderColor: 'rgba(15, 118, 110, 0.26)',
          borderWidth: 1
        },
        animationDuration: 1400,
        data: quotaInFlight.value
      }
    ]
  });
}

function renderTimingLineChart() {
  if (!timingLineChartRef.value) return;
  if (!timingLineChart) timingLineChart = init(timingLineChartRef.value);

  const lineData = recentSevenDays.value.map((date, index) => ({
    value: completedTaskCount.value[index],
    symbolSize: date === selectedCompletionDate.value ? 10 : 7,
    itemStyle:
      date === selectedCompletionDate.value
        ? {
            color: '#0f766e',
            borderColor: '#ffffff',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(15, 118, 110, 0.35)'
          }
        : {
            color: '#2aa198',
            borderColor: '#ffffff',
            borderWidth: 2
          }
  }));

  timingLineChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const point = params?.[0];
        const index = point?.dataIndex ?? 0;
        const date = point?.axisValue ?? '';
        const count = completedTaskCount.value[index] || 0;
        const amount = completedTaskAmount.value[index] || 0;
        return [`${date}`, `完成审批：${count} 笔`, `审批金额：${formatMaskedAmount(amount)}`].join('<br/>');
      }
    },
    grid: {
      left: 16,
      right: 16,
      top: 24,
      bottom: 16,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: recentSevenDays.value,
      axisLine: { lineStyle: { color: '#d8e2ef' } },
      axisLabel: { color: '#5f6f82' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#5f6f82' },
      splitLine: { lineStyle: { color: '#ebf1f8' } }
    },
    series: [
      {
        name: '完成审批任务',
        type: 'line',
        smooth: true,
        data: lineData,
        lineStyle: {
          width: 3,
          color: '#0f766e'
        },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(15, 118, 110, 0.25)' },
            { offset: 1, color: 'rgba(15, 118, 110, 0.02)' }
          ])
        },
        animationDuration: 2000
      }
    ]
  });

  timingLineChart.off('click');
  timingLineChart.on('click', (params) => {
    if (params?.name) selectedCompletionDate.value = String(params.name);
  });
}

function renderAllCharts() {
  renderGaugeChart();
  renderQuotaBarChart();
  renderTimingLineChart();
}

function safeRenderAllCharts() {
  try {
    renderAllCharts();
    handleResize();
    return true;
  } catch (error) {
    console.error('[Workbench] chart render failed', error);
    showToast('图表渲染异常，请刷新重试');
    return false;
  }
}

function startStripeAnimation() {
  stopStripeAnimation();
  stripeTimer = window.setInterval(() => {
    stripeOffset = (stripeOffset + 0.04) % 1;
    if (!quotaBarChart) return;
    quotaBarChart.setOption(
      {
        series: [{}, { itemStyle: { color: createStripeGradient(stripeOffset) } }]
      },
      false
    );
  }, 160);
}

function stopStripeAnimation() {
  if (!stripeTimer) return;
  clearInterval(stripeTimer);
  stripeTimer = 0;
}

function startCountUp() {
  todoCounter.start(statTarget.todo, 0);
  dueSoonCounter.start(statTarget.dueSoon, 0);
  quotaCounter.start(statTarget.quota, 0);
}

function handleResize() {
  gaugeChart?.resize();
  quotaBarChart?.resize();
  timingLineChart?.resize();
}

function handleQuickAction(item) {
  if (item.icon === 'add-o') {
    router.push('/whitelist-apply');
    return;
  }
  if (item.icon === 'edit') {
    router.push('/apply-detail');
    return;
  }
  showToast(`${item.text} 功能开发中`);
}

function handleLogout() {
  showConfirmDialog({
    title: '退出登录',
    message: '确认退出当前账号吗？',
    confirmButtonText: '确认',
    cancelButtonText: '取消'
  }).then(() => {
    clearSession();
    showSuccessToast('已退出登录');
    router.replace('/login');
  });
}

watch(selectedCompletionDate, () => {
  if (chartLoading.value) return;
  safeRenderAllCharts();
});

onMounted(async () => {
  startCountUp();
  await loadDashboardData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  stopStripeAnimation();
  gaugeChart?.dispose();
  quotaBarChart?.dispose();
  timingLineChart?.dispose();
  gaugeChart = null;
  quotaBarChart = null;
  timingLineChart = null;
});
</script>

<style scoped>
:root {
  --primary-color: #0f766e;
  --panel-bg: rgba(255, 255, 255, 0.78);
  --text-primary: #13233a;
  --text-secondary: #5f6f82;
  --line-color: #e6edf5;
}

.workbench-page {
  min-height: 100vh;
  padding: 14px 12px 24px;
  position: relative;
  z-index: 1;
}

.header-card,
.panel {
  background: var(--panel-bg);
  border-radius: 14px;
  backdrop-filter: blur(14px) saturate(160%);
  box-shadow: 0 8px 18px rgba(16, 38, 67, 0.08);
}

.header-card {
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.user-name {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  color: var(--text-primary);
}

.user-role {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.logout-btn {
  border-color: rgba(15, 118, 110, 0.38);
  color: var(--primary-color);
}

.panel {
  padding: 14px 12px;
  margin-bottom: 12px;
}

.panel-title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-card {
  padding: 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(229, 237, 245, 0.8);
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
  min-height: 24px;
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

:deep(.van-grid-item__content) {
  padding: 12px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.64);
}

:deep(.van-grid-item__icon) {
  color: var(--primary-color);
  margin-bottom: 6px;
}

:deep(.van-grid-item__text) {
  color: var(--text-primary);
  font-size: 12px;
}

.chart-shell {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(229, 237, 245, 0.8);
  padding: 8px;
}

.chart-shell--stack {
  position: relative;
}

.chart-canvas {
  width: 100%;
  position: relative;
  z-index: 1;
}

.gauge-canvas {
  height: 280px;
}

.quota-canvas {
  height: 320px;
}

.timing-canvas {
  height: 280px;
}

.chart-skeleton {
  position: absolute;
  top: 8px;
  right: 8px;
  bottom: 8px;
  left: 8px;
  z-index: 2;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 8px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-date {
  font-size: 12px;
  color: #5f6f82;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(15, 118, 110, 0.1);
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.detail-customer {
  font-size: 14px;
  font-weight: 600;
  color: #1a2e42;
}

.detail-meta {
  margin-top: 3px;
  font-size: 12px;
  color: #6f8096;
}

.detail-side {
  text-align: right;
}

.detail-amount {
  font-size: 13px;
  font-weight: 600;
  color: #0f766e;
}

.detail-status {
  margin-top: 3px;
  font-size: 12px;
  color: #5f6f82;
}

.empty-state {
  color: #7f8ea3;
  font-size: 13px;
  padding: 10px 0;
}
</style>
