<template>
  <div class="whitelist-page" :class="{ 'page-invalid': mainTab === 'invalidate' }">
    <van-nav-bar
      title="同业准入申请"
      left-text="返回"
      left-arrow
      fixed
      class="page-nav"
      @click-left="goBack"
    />

    <main class="page-content">
      <van-tabs
        v-model:active="mainTab"
        sticky
        animated
        swipeable
        offset-top="46"
        color="#0f766e"
        class="main-tabs"
      >
        <van-tab title="准入申请" name="apply">
          <div class="tab-content">
            <section class="panel">
              <div class="panel-title">申请模式</div>
              <van-tabs v-model:active="activeTab" line-width="20" color="#0f766e">
                <van-tab title="单户申请" name="single" />
                <van-tab title="批量准入" name="batch" />
              </van-tabs>
            </section>

            <section class="panel">
              <van-search
                v-model.trim="searchKeyword"
                shape="round"
                placeholder="搜索客户名称或编号"
                class="search-box"
                @search="refreshCustomers"
                @clear="refreshCustomers"
              />

              <button type="button" class="status-trigger" @click="statusPickerVisible = true">
                <div class="status-left">
                  <van-icon name="filter-o" class="status-icon" />
                  <span class="status-label">{{ selectedStatusLabel }}</span>
                </div>
                <van-icon name="arrow-down" class="status-arrow" />
              </button>

              <div v-if="searching" class="empty-tip">搜索中...</div>

              <template v-else>
                <div v-if="displayCustomers.length === 0" class="empty-wrap">
                  <div class="empty-tip">未匹配到同业客户</div>
                  <van-button plain type="primary" size="small" class="create-btn" @click="handleCreateCustomer">
                    手工新建同业客户
                  </van-button>
                </div>

                <div v-else class="customer-list">
                  <template v-if="activeTab === 'single'">
                    <button
                      v-for="customer in displayCustomers"
                      :key="customer.id"
                      type="button"
                      class="customer-item customer-item--button"
                      :class="{ disabled: customer.status === '生效' }"
                      @click="handleSingleSelect(customer)"
                    >
                      <div class="customer-main">
                        <div class="customer-name">{{ customer.name }}</div>
                        <div class="customer-no">编号：{{ customer.id }}</div>
                      </div>
                      <div class="customer-side">
                        <van-tag plain :color="statusColor(customer.status)">{{ customer.status }}</van-tag>
                      </div>
                    </button>
                  </template>

                  <template v-else>
                    <van-checkbox-group v-model="batchSelectedIds">
                      <div
                        v-for="customer in displayCustomers"
                        :key="customer.id"
                        class="customer-item customer-item--check"
                        :class="{ disabled: customer.status === '生效' }"
                        @click="toggleBatchSelection(customer)"
                      >
                        <van-checkbox :name="customer.id" @click.stop />
                        <div class="customer-main">
                          <div class="customer-name">{{ customer.name }}</div>
                          <div class="customer-no">编号：{{ customer.id }}</div>
                        </div>
                        <div class="customer-side">
                          <van-tag plain :color="statusColor(customer.status)">{{ customer.status }}</van-tag>
                        </div>
                      </div>
                    </van-checkbox-group>
                  </template>
                </div>
              </template>
            </section>

            <section class="panel">
              <div class="panel-title">申请信息</div>
              <van-cell title="拟申请状态" value="生效（锁定）" />
              <van-field
                v-model.trim="opinion"
                type="textarea"
                rows="4"
                maxlength="200"
                show-word-limit
                label="意见详情"
                placeholder="请输入意见详情（最多200字）"
              />
              <div v-if="activeTab === 'single'" class="selected-tip">
                已选客户：{{ selectedSingleCustomer ? selectedSingleCustomer.name : '未选择' }}
              </div>
              <div v-else class="selected-tip">已选客户：{{ batchSelectedIds.length }} 户</div>
            </section>
          </div>
        </van-tab>

        <van-tab title="准入失效" name="invalidate">
          <div class="tab-content">
            <section class="panel">
              <div class="panel-title">已准入客户列表</div>
              <van-search
                v-model.trim="invalidateKeyword"
                shape="round"
                placeholder="搜索已准入客户"
                class="search-box"
                @search="refreshInvalidateList"
                @clear="refreshInvalidateList"
              />
              
              <div v-if="loadingInvalidate" class="empty-tip">加载中...</div>
              <template v-else>
                <div v-if="invalidateList.length === 0" class="empty-wrap">
                  <div class="empty-tip">暂无已准入客户</div>
                </div>
                <div v-else class="customer-list">
                  <button
                    v-for="customer in invalidateList"
                    :key="customer.id"
                    type="button"
                    class="customer-item customer-item--button"
                    :class="{ active: selectedInvalidateId === customer.id }"
                    @click="handleSelectInvalidate(customer)"
                  >
                    <div class="customer-main">
                      <div class="customer-name">{{ customer.name }}</div>
                      <div class="customer-no">编号：{{ customer.id }}</div>
                    </div>
                    <div class="customer-side">
                      <van-tag type="success">生效</van-tag>
                    </div>
                  </button>
                </div>
              </template>
            </section>

            <section class="panel" v-if="selectedInvalidateId">
              <div class="panel-title">失效处理</div>
              <van-cell title="选定客户" :value="selectedInvalidateCustomer?.name" />
              <van-field
                v-model.trim="invalidateReason"
                type="textarea"
                rows="3"
                required
                label="失效原因"
                placeholder="请详细说明废止准入的原因（必填）"
              />
            </section>
          </div>
        </van-tab>
      </van-tabs>
    </main>

    <footer class="page-footer">
      <van-button
        v-if="mainTab === 'apply'"
        type="primary"
        block
        round
        class="submit-btn"
        :loading="submitting"
        loading-text="提交中..."
        @click="submitApply"
      >
        提交准入申请
      </van-button>
      <van-button
        v-else
        type="danger"
        block
        round
        class="submit-btn danger-btn"
        :loading="submittingInvalidate"
        :disabled="!selectedInvalidateId"
        loading-text="处理中..."
        @click="submitInvalidate"
      >
        提交失效申请
      </van-button>
    </footer>

    <van-action-sheet
      v-model:show="statusPickerVisible"
      :actions="statusActions"
      cancel-text="取消"
      close-on-click-action
      @select="handleSelectStatus"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { showConfirmDialog, showDialog, showFailToast, showLoadingToast, showSuccessToast, showToast } from 'vant';
import { useRouter } from 'vue-router';
import { searchCustomers, invalidateCustomer } from '../api/loan';

const router = useRouter();
const ALLOWED_STATUS = ['未纳入', '失效'];

const mainTab = ref('apply');
const activeTab = ref('single');
const searchKeyword = ref('');
const selectedStatus = ref('');
const statusPickerVisible = ref(false);
const searching = ref(false);
const submitting = ref(false);
const opinion = ref('');

const customerOptions = ref([]);
const selectedSingleId = ref('');
const batchSelectedIds = ref([]);

// 准入失效相关状态
const invalidateKeyword = ref('');
const invalidateList = ref([]);
const loadingInvalidate = ref(false);
const selectedInvalidateId = ref('');
const invalidateReason = ref('');
const submittingInvalidate = ref(false);

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '生效', value: '生效' },
  { text: '失效', value: '失效' },
  { text: '未纳入', value: '未纳入' }
];

const selectedStatusLabel = computed(() => {
  const option = statusOptions.find((item) => item.value === selectedStatus.value);
  return option ? option.text : '全部状态';
});

const statusActions = computed(() => {
  return statusOptions.map((item) => ({
    name: item.text,
    value: item.value,
    color: item.value === selectedStatus.value ? '#0f766e' : '#1f2d3d'
  }));
});

const displayCustomers = computed(() => customerOptions.value);

const selectedSingleCustomer = computed(() => {
  return customerOptions.value.find((item) => item.id === selectedSingleId.value) || null;
});

const selectedInvalidateCustomer = computed(() => {
  return invalidateList.value.find((item) => item.id === selectedInvalidateId.value) || null;
});

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.replace('/workbench');
}

function statusColor(status) {
  if (status === '生效') return '#16a34a';
  if (status === '失效') return '#f59e0b';
  return '#64748b';
}

function checkStatus(customer) {
  if (ALLOWED_STATUS.includes(customer.status)) return { valid: true, message: '' };
  if (customer.status === '生效') return { valid: false, message: '该客户已准入，无需重复申请' };
  return { valid: false, message: '当前状态不允许发起准入申请' };
}

function checkInProcess(customer) {
  if (!customer.hasInProcess) return { valid: true, message: '' };
  return { valid: false, message: `存在在途任务：${customer.processId || '未知流水号'}` };
}

async function refreshCustomers() {
  searching.value = true;
  try {
    const data = await searchCustomers(searchKeyword.value, selectedStatus.value);
    customerOptions.value = Array.isArray(data?.list) ? data.list : [];

    batchSelectedIds.value = batchSelectedIds.value.filter((id) =>
      customerOptions.value.some((item) => item.id === id)
    );
    if (selectedSingleId.value && !customerOptions.value.some((item) => item.id === selectedSingleId.value)) {
      selectedSingleId.value = '';
    }
  } catch (error) {
    showFailToast(error?.message || '客户搜索失败');
  } finally {
    searching.value = false;
  }
}

async function refreshInvalidateList() {
  loadingInvalidate.value = true;
  try {
    // 强制只查询“生效”的客户
    const data = await searchCustomers(invalidateKeyword.value, '生效');
    invalidateList.value = Array.isArray(data?.list) ? data.list : [];
    
    // 如果当前选中的客户不在新列表中，清空选择
    if (selectedInvalidateId.value && !invalidateList.value.some((item) => item.id === selectedInvalidateId.value)) {
      selectedInvalidateId.value = '';
      invalidateReason.value = '';
    }
  } catch (error) {
    showFailToast(error?.message || '已准入客户加载失败');
  } finally {
    loadingInvalidate.value = false;
  }
}

function handleSelectStatus(action) {
  selectedStatus.value = action.value;
  refreshCustomers();
}

function handleCreateCustomer() {
  showToast('请先在信贷系统维护客户基础信息');
}

async function handleSingleSelect(customer) {
  const statusResult = checkStatus(customer);
  if (!statusResult.valid) {
    showFailToast(statusResult.message);
    return;
  }

  const inProcessResult = checkInProcess(customer);
  if (!inProcessResult.valid) {
    await showDialog({
      title: '在途任务拦截',
      message: inProcessResult.message,
      confirmButtonText: '我知道了'
    });
    return;
  }

  try {
    await showConfirmDialog({
      title: '确认单户准入',
      message: `客户“${customer.name}”拟申请状态将锁定为“生效”，确认继续？`,
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });
    selectedSingleId.value = customer.id;
    showSuccessToast('已选择该客户');
  } catch {
    // canceled
  }
}

async function toggleBatchSelection(customer) {
  const exists = batchSelectedIds.value.includes(customer.id);
  if (exists) {
    batchSelectedIds.value = batchSelectedIds.value.filter((id) => id !== customer.id);
    return;
  }

  const statusResult = checkStatus(customer);
  if (!statusResult.valid) {
    showFailToast(statusResult.message);
    return;
  }

  const inProcessResult = checkInProcess(customer);
  if (!inProcessResult.valid) {
    await showDialog({
      title: '在途任务拦截',
      message: inProcessResult.message,
      confirmButtonText: '我知道了'
    });
    return;
  }

  batchSelectedIds.value = [...batchSelectedIds.value, customer.id];
}

function handleSelectInvalidate(customer) {
  if (selectedInvalidateId.value === customer.id) return;
  selectedInvalidateId.value = customer.id;
  invalidateReason.value = ''; // 切换客户时重置原因
}

function validateOpinion() {
  if (!opinion.value) {
    showFailToast('请填写意见详情');
    return false;
  }
  if (opinion.value.length > 200) {
    showFailToast('意见详情不能超过200字');
    return false;
  }
  return true;
}

function getSelectedBatchCustomers() {
  return customerOptions.value.filter((item) => batchSelectedIds.value.includes(item.id));
}

function validateBatchSelection(customers) {
  for (const customer of customers) {
    const statusResult = checkStatus(customer);
    if (!statusResult.valid) return statusResult;
    const inProcessResult = checkInProcess(customer);
    if (!inProcessResult.valid) return inProcessResult;
  }
  return { valid: true, message: '' };
}

import { createLoanApplication } from '../api/loan';

async function submitSingleApply() {
  if (!selectedSingleCustomer.value) {
    showFailToast('请先选择客户');
    return;
  }
  if (!validateOpinion()) return;

  const loading = showLoadingToast({ message: '提交中...', duration: 0, forbidClick: true });
  submitting.value = true;
  try {
    // 守：重塑准入申请的「提交态」
    // 使用 createLoanApplication 提交，type: 'WHITELIST'
    await createLoanApplication({
       customerName: selectedSingleCustomer.value.name,
       idCard: selectedSingleCustomer.value.id, // Using ID as identifier
       amount: 0, // No amount for whitelist
       idCardFileIds: ['mock_file_id'], // Mock file
       applyReason: opinion.value,
       type: 'WHITELIST',
       targetCreditLevel: 'AA' // Mock level
    });
    
    await new Promise((resolve) => setTimeout(resolve, 800));
    showSuccessToast('准入申请已提交，请等待风险管理部审批');
    router.replace('/progress');
  } catch (error) {
    showFailToast(error.message || '提交失败');
  } finally {
    loading.close();
    submitting.value = false;
  }
}

async function submitBatchApply() {
  if (batchSelectedIds.value.length === 0) {
    showFailToast('请至少选择1户客户');
    return;
  }
  if (!validateOpinion()) return;

  const selectedRows = getSelectedBatchCustomers();
  const validResult = validateBatchSelection(selectedRows);
  if (!validResult.valid) {
    showFailToast(validResult.message);
    return;
  }

  const loading = showLoadingToast({ message: '提交中...', duration: 0, forbidClick: true });
  submitting.value = true;
  try {
    // Batch submission simulation - create one by one or batch API if exists
    // For now loop create
    for (const customer of selectedRows) {
        await createLoanApplication({
           customerName: customer.name,
           idCard: customer.id,
           amount: 0,
           idCardFileIds: ['mock_file_id'],
           applyReason: opinion.value,
           type: 'WHITELIST',
           targetCreditLevel: 'AA'
        });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    showSuccessToast(`批量准入申请已提交（${selectedRows.length}户），请等待审批`);
    router.replace('/progress');
  } catch (error) {
    showFailToast(error.message || '提交失败');
  } finally {
    loading.close();
    submitting.value = false;
  }
}

function submitApply() {
  if (activeTab.value === 'single') {
    submitSingleApply();
    return;
  }
  submitBatchApply();
}

async function submitInvalidate() {
  if (!selectedInvalidateId.value) {
    showFailToast('请先选择要失效的客户');
    return;
  }
  if (!invalidateReason.value) {
    showFailToast('请填写失效原因');
    return;
  }

  try {
    await showConfirmDialog({
      title: '高风险操作确认',
      message: '确定要废止该机构的准入资格吗？此操作将导致该机构所有在途授信业务被自动冻结。',
      confirmButtonText: '确定废止',
      confirmButtonColor: '#d9534f',
      cancelButtonText: '取消'
    });

    const loading = showLoadingToast({ message: '处理中...', duration: 0, forbidClick: true });
    submittingInvalidate.value = true;
    
    try {
      await invalidateCustomer(selectedInvalidateId.value, invalidateReason.value);
      showSuccessToast('准入资格已废止');
      // 刷新列表
      refreshInvalidateList();
      selectedInvalidateId.value = '';
      invalidateReason.value = '';
    } catch (error) {
      showFailToast(error?.message || '操作失败');
    } finally {
      loading.close();
      submittingInvalidate.value = false;
    }
  } catch {
    // canceled
  }
}

watch(mainTab, (val) => {
  if (val === 'invalidate') {
    // 切换到失效页：清空失效页的搜索和状态，并刷新
    invalidateKeyword.value = '';
    selectedInvalidateId.value = '';
    invalidateReason.value = '';
    refreshInvalidateList();
  } else {
    // 切换回申请页：保持状态 (Keep-alive)
    // 仅当列表为空且未在搜索时才刷新（例如首次进入或被清除后）
    if (customerOptions.value.length === 0 && !searching.value) {
      refreshCustomers();
    }
  }
});

onMounted(() => {
  refreshCustomers();
});
</script>

<style scoped>
:root {
  --primary-color: #0f766e;
  --panel-bg: rgba(255, 255, 255, 0.78);
  --text-primary: #13233a;
  --text-secondary: #5f6f82;
}

.whitelist-page {
  min-height: 100vh;
  position: relative;
  z-index: 1;
  padding-bottom: 84px;
  background-color: #f7f8fa;
  transition: background 0.3s ease;
}

.whitelist-page.page-invalid {
  background: linear-gradient(180deg, #f8f8f8 0%, #f2f3f5 100%);
}

.page-nav {
  --van-nav-bar-icon-color: #0f766e;
  --van-nav-bar-title-text-color: #13233a;
  --van-nav-bar-background: rgba(255, 255, 255, 0.9);
}

.page-content {
  padding: 58px 12px 10px;
}

.panel {
  background: var(--panel-bg);
  border-radius: 14px;
  backdrop-filter: blur(14px) saturate(160%);
  box-shadow: 0 8px 18px rgba(16, 38, 67, 0.08);
  margin-bottom: 12px;
  padding: 12px;
}

.panel-title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.search-box {
  margin-bottom: 8px;
}

.status-trigger {
  width: 100%;
  border: 0;
  border-radius: 999px;
  background: #f2f3f5;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #323233;
  min-height: 40px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  color: #969799;
  font-size: 16px;
}

.status-label {
  font-size: 14px;
  color: #646566;
}

.status-arrow {
  color: #969799;
  font-size: 14px;
}

.empty-wrap {
  padding: 12px 6px;
  text-align: center;
}

.empty-tip {
  font-size: 13px;
  color: #7b8ca2;
}

.create-btn {
  margin-top: 10px;
}

.customer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.customer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(15, 118, 110, 0.12);
  background: rgba(255, 255, 255, 0.66);
}

.customer-item--button {
  text-align: left;
  cursor: pointer;
}

.customer-item--check {
  cursor: pointer;
}

.customer-item.disabled {
  opacity: 0.65;
}

.customer-item.active {
  border-color: #0f766e;
  background: rgba(15, 118, 110, 0.08);
}

.customer-main {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a2e42;
}

.customer-no {
  margin-top: 3px;
  font-size: 12px;
  color: #6f8096;
}

.customer-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.task-tip {
  font-size: 11px;
  color: #ef4444;
}

.selected-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.page-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 10px 12px 14px;
  background: linear-gradient(180deg, rgba(237, 243, 250, 0) 0%, rgba(237, 243, 250, 0.92) 36%);
}

.submit-btn {
  border: 0;
  background: linear-gradient(135deg, #0f766e 0%, #0b625b 100%);
  box-shadow: 0 8px 16px rgba(15, 118, 110, 0.24);
}

.danger-btn {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.24);
}

:deep(.van-tabs__line) {
  background-color: #0f766e;
}
</style>
