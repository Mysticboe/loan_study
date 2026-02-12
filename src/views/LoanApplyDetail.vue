<template>
  <div class="detail-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>

    <main class="content">
      <section class="header-row">
        <div>
          <p class="eyebrow">Loan Studio</p>
          <h1>同业授信复杂申请</h1>
        </div>
      </section>

      <section class="panel">
        <van-steps :active="activeStep" active-color="#0f766e" inactive-color="#9aa8b6" class="steps">
          <van-step>基本信息</van-step>
          <van-step>额度分配</van-step>
        </van-steps>

        <van-form @submit="handleSubmit">
          <div v-show="activeStep === 0" class="step-card">
            <van-cell-group inset>
              <van-field v-model="customerKeyword" label="客户检索" placeholder="输入客户名称/编号" clearable />
              <div class="search-row">
                <van-button
                  type="primary"
                  size="small"
                  :loading="searching"
                  class="search-btn"
                  @click="handleSearchCustomer"
                >
                  查询客户
                </van-button>
              </div>
              <van-field v-model="applyForm.customerName" label="客户名称" readonly />
              <van-field v-model="applyForm.customerNo" label="客户编号" readonly />
              <van-field v-model="applyForm.occurrenceType" label="发生类型" readonly />
            </van-cell-group>

            <p class="compare-text">
              上一期额度参考：总敞口 {{ formatAmount(previousQuota.totalExposure) }} 元，自营类
              {{ formatAmount(previousQuota.selfRunExposure) }} 元，资管类
              {{ formatAmount(previousQuota.assetManageExposure) }} 元
            </p>
          </div>

          <div v-show="activeStep === 1" class="step-card">
            <van-cell-group inset title="额度总览">
              <van-field
                v-model.number="applyForm.totalCredit.cny"
                type="number"
                label="总额度(人民币)"
                suffix="元"
                placeholder="请输入"
              />
              <van-field
                v-model.number="applyForm.totalCredit.usd"
                type="number"
                label="总额度(美元)"
                suffix="USD"
                placeholder="请输入"
              />
              <van-field :model-value="formatAmount(applyForm.totalCredit.totalExposure)" label="总敞口额度" readonly />
            </van-cell-group>

            <van-cell-group inset title="额度分配">
              <van-field
                v-model.number="applyForm.selfRunLimit.cny"
                type="number"
                label="自营类额度(人民币)"
                suffix="元"
                placeholder="请输入"
                :class="{ 'field-error': overSelfLimit }"
              />
              <van-field
                v-model.number="applyForm.selfRunLimit.usd"
                type="number"
                label="自营类额度(美元)"
                suffix="USD"
                placeholder="请输入"
                :class="{ 'field-error': overSelfLimit }"
              />
              <van-field
                :model-value="formatAmount(applyForm.selfRunLimit.totalExposure)"
                label="自营类总敞口"
                readonly
                :class="{ 'field-error': overSelfLimit }"
              />

              <van-field
                v-model.number="applyForm.assetManageLimit.cny"
                type="number"
                label="资管类额度(人民币)"
                suffix="元"
                placeholder="请输入"
              />
              <van-field
                v-model.number="applyForm.assetManageLimit.usd"
                type="number"
                label="资管类额度(美元)"
                suffix="USD"
                placeholder="请输入"
              />
              <van-field :model-value="formatAmount(applyForm.assetManageLimit.totalExposure)" label="资管类总敞口" readonly />
            </van-cell-group>

            <van-collapse v-model="collapseNames" class="collapse-wrap">
              <van-collapse-item name="self-detail" title="自营类明细分项（6项）">
                <div v-for="item in selfDetailConfigs" :key="item.key" class="detail-block">
                  <h3>{{ item.label }}</h3>
                  <van-field
                    v-model.number="applyForm.selfRunLimit.details[item.key].cny"
                    type="number"
                    label="人民币额度"
                    suffix="元"
                    placeholder="请输入"
                    :class="{ 'field-error': overSelfLimit }"
                  />
                  <van-field
                    v-model.number="applyForm.selfRunLimit.details[item.key].usd"
                    type="number"
                    label="美元额度"
                    suffix="USD"
                    placeholder="请输入"
                    :class="{ 'field-error': overSelfLimit }"
                  />
                  <div class="product-box">
                    <div class="product-title">适用产品</div>
                    <van-checkbox-group v-model="applyForm.selfRunLimit.details[item.key].products" direction="horizontal">
                      <van-checkbox
                        v-for="option in productOptions"
                        :key="`${item.key}-${option.value}`"
                        :name="option.value"
                        shape="square"
                      >
                        {{ option.label }}
                      </van-checkbox>
                    </van-checkbox-group>
                  </div>
                </div>
                <div class="sum-text" :class="{ warn: overSelfLimit }">
                  分项合计敞口：{{ formatAmount(selfDetailExposureTotal) }} 元
                </div>
              </van-collapse-item>
            </van-collapse>
          </div>

          <div class="action-row">
            <van-button v-if="activeStep === 1" plain type="primary" class="ghost-btn" @click="activeStep = 0">上一步</van-button>
            <van-button
              v-if="activeStep === 0"
              type="primary"
              class="next-btn"
              @click="goStep2"
            >
              下一步
            </van-button>
            <van-button
              v-else
              type="primary"
              native-type="submit"
              class="submit-btn"
              :loading="submitting"
              :loading-text="'风险探测中...'"
            >
              提交申请
            </van-button>
          </div>
        </van-form>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { showFailToast, showSuccessToast, showToast } from 'vant';
import { useRouter } from 'vue-router';
import { createLoanApplication, probeCreditRisk, searchCustomers } from '../api/loan';

const activeStep = ref(0);
const searching = ref(false);
const submitting = ref(false);
const customerKeyword = ref('');
const collapseNames = ref(['self-detail']);
const exchangeRate = ref(7.2);
const overWarned = ref(false);
const router = useRouter();

const productOptions = [
  { label: '短融', value: 'short_finance' },
  { label: '同业存单', value: 'interbank_cd' },
  { label: '信托计划', value: 'trust_plan' },
  { label: '资产支持', value: 'abs' }
];

const selfDetailConfigs = [
  { key: 'bill', label: '票据' },
  { key: 'financing', label: '融资' },
  { key: 'interbankInvestment', label: '同业投资' },
  { key: 'bond', label: '债券' },
  { key: 'repo', label: '回购' },
  { key: 'other', label: '其他' }
];

const previousQuota = reactive({
  totalExposure: 0,
  selfRunExposure: 0,
  assetManageExposure: 0
});

const applyForm = reactive({
  customerName: '',
  customerNo: '',
  occurrenceType: '',
  totalCredit: {
    cny: 0,
    usd: 0,
    totalExposure: 0
  },
  selfRunLimit: {
    cny: 0,
    usd: 0,
    totalExposure: 0,
    details: {
      bill: { cny: 0, usd: 0, products: [] },
      financing: { cny: 0, usd: 0, products: [] },
      interbankInvestment: { cny: 0, usd: 0, products: [] },
      bond: { cny: 0, usd: 0, products: [] },
      repo: { cny: 0, usd: 0, products: [] },
      other: { cny: 0, usd: 0, products: [] }
    }
  },
  assetManageLimit: {
    cny: 0,
    usd: 0,
    totalExposure: 0
  }
});

const selfDetailExposureTotal = computed(() =>
  selfDetailConfigs.reduce((sum, item) => {
    const row = applyForm.selfRunLimit.details[item.key];
    return sum + computeExposure(row.cny, row.usd);
  }, 0)
);

const overSelfLimit = computed(() => selfDetailExposureTotal.value > applyForm.selfRunLimit.totalExposure);

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function computeExposure(cny, usd) {
  return toNumber(cny) + toNumber(usd) * exchangeRate.value;
}

function formatAmount(value) {
  return toNumber(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function syncExposure() {
  applyForm.totalCredit.totalExposure = computeExposure(applyForm.totalCredit.cny, applyForm.totalCredit.usd);
  applyForm.selfRunLimit.totalExposure = computeExposure(applyForm.selfRunLimit.cny, applyForm.selfRunLimit.usd);
  applyForm.assetManageLimit.totalExposure = computeExposure(applyForm.assetManageLimit.cny, applyForm.assetManageLimit.usd);
}

function fillCustomer(customer) {
  applyForm.customerName = customer?.name || '';
  applyForm.customerNo = customer?.id || '';
  applyForm.occurrenceType = customer?.hasValidQuota ? '续作' : '新增';
  previousQuota.totalExposure = toNumber(customer?.previousQuota?.totalExposure);
  previousQuota.selfRunExposure = toNumber(customer?.previousQuota?.selfRunExposure);
  previousQuota.assetManageExposure = toNumber(customer?.previousQuota?.assetManageExposure);
}

async function handleSearchCustomer() {
  searching.value = true;
  try {
    const result = await searchCustomers(customerKeyword.value);
    const customer = result?.list?.[0];
    if (!customer) {
      showFailToast('未查询到客户');
      return;
    }
    fillCustomer(customer);
    showSuccessToast('客户信息已加载');
  } catch (error) {
    showFailToast(error?.message || '客户查询失败');
  } finally {
    searching.value = false;
  }
}

function goStep2() {
  if (!applyForm.customerNo) {
    showFailToast('请先查询并选择客户');
    return;
  }
  activeStep.value = 1;
}

function validateSubmit() {
  if (!applyForm.customerNo) return '客户信息未完成';
  if (applyForm.totalCredit.totalExposure <= 0) return '请填写总额度';
  if (applyForm.selfRunLimit.totalExposure <= 0) return '请填写自营类额度';
  if (overSelfLimit.value) return '自营类分项合计不得超过自营类总额';
  return '';
}

async function handleSubmit() {
  const message = validateSubmit();
  if (message) {
    showFailToast(message);
    return;
  }

  submitting.value = true;
  try {
    const riskResult = await probeCreditRisk({
      customerId: applyForm.customerNo,
      totalExposure: applyForm.totalCredit.totalExposure,
      selfRunDetailExposure: selfDetailExposureTotal.value
    });

    if (!riskResult?.pass) {
      showFailToast(riskResult?.message || '风险探测未通过');
      return;
    }

    const idempotencyKey = `loan_detail_apply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await createLoanApplication(
      {
        customerName: applyForm.customerName,
        idCard: '110101199001010011',
        birthDate: '1990-01-01',
        collateralValue: Math.max(1, Number(applyForm.totalCredit.totalExposure) || 1),
        idCardFileIds: ['detail_virtual_file']
      },
      idempotencyKey
    );

    showSuccessToast('提交成功，风险探测通过');
    if (result?.applicationId) {
      router.push(`/result/${result.applicationId}`);
      return;
    }
    router.push('/progress');
  } catch (error) {
    showFailToast(error?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

watch(
  () => [
    applyForm.totalCredit.cny,
    applyForm.totalCredit.usd,
    applyForm.selfRunLimit.cny,
    applyForm.selfRunLimit.usd,
    applyForm.assetManageLimit.cny,
    applyForm.assetManageLimit.usd,
    exchangeRate.value
  ],
  syncExposure,
  { immediate: true }
);

watch(overSelfLimit, (isOver) => {
  if (isOver && !overWarned.value) {
    showToast('刚控提示：分项金额不得超过自营总额');
    overWarned.value = true;
    return;
  }
  if (!isOver) {
    overWarned.value = false;
  }
});

onMounted(async () => {
  await handleSearchCustomer();
});
</script>

<style scoped>
:global(body) {
  background: #edf4f2;
}

.detail-page {
  min-height: 100vh;
  background: radial-gradient(160% 80% at 20% 15%, #d4f2eb 0%, transparent 55%),
    radial-gradient(120% 70% at 90% 80%, #d9ece8 0%, transparent 60%), #edf4f2;
  position: relative;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 999px;
}

.bg-shape-a {
  width: 240px;
  height: 240px;
  top: -80px;
  left: -60px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.3), rgba(42, 161, 152, 0.2));
}

.bg-shape-b {
  width: 280px;
  height: 280px;
  bottom: -120px;
  right: -120px;
  background: linear-gradient(135deg, rgba(110, 231, 183, 0.22), rgba(15, 118, 110, 0.12));
}

.content {
  position: relative;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
  padding: 56px 16px 28px;
}

.header-row {
  margin: 8px 2px 14px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #16302d;
  font-size: 27px;
  font-weight: 800;
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.68);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(14px) saturate(170%);
  border-radius: 24px;
  padding: 14px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.08);
}

.steps {
  margin: 2px 2px 18px;
}

.step-card {
  animation: fade-up 260ms ease-out;
}

.search-row {
  padding: 0 12px 12px;
}

.search-btn {
  width: 100%;
  background: linear-gradient(135deg, #0f766e, #0d5e58);
  border: none;
}

.compare-text {
  margin: 12px 6px 4px;
  color: #62707d;
  font-size: 12px;
  line-height: 1.6;
}

.collapse-wrap {
  margin-top: 14px;
}

.detail-block {
  border: 1px solid rgba(15, 118, 110, 0.12);
  border-radius: 12px;
  padding: 10px 10px 6px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.82);
}

.detail-block h3 {
  margin: 0 0 4px;
  color: #284542;
  font-size: 14px;
}

.product-box {
  padding: 8px 12px 10px;
}

.product-title {
  color: #637a76;
  font-size: 12px;
  margin-bottom: 8px;
}

.sum-text {
  color: #375955;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 2px;
}

.sum-text.warn {
  color: #b42318;
}

.action-row {
  display: flex;
  gap: 10px;
  padding: 16px 4px 4px;
}

.ghost-btn {
  flex: 1;
  border-color: rgba(15, 118, 110, 0.35);
  color: #0f766e;
}

.next-btn,
.submit-btn {
  flex: 1;
  background: linear-gradient(135deg, #0f766e, #0d5e58);
  border: none;
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
}

:deep(.van-cell::after) {
  display: none;
}

:deep(.van-field) {
  border-bottom: 1px solid rgba(56, 72, 90, 0.1);
  padding: 13px 12px;
  background: transparent !important;
}

:deep(.van-field:last-child) {
  border-bottom: none;
}

:deep(.field-error .van-field__control),
:deep(.field-error .van-field__label),
:deep(.field-error .van-field__value) {
  color: #b42318 !important;
}

:deep(.field-error) {
  background: rgba(180, 35, 24, 0.06) !important;
}

@keyframes fade-up {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
