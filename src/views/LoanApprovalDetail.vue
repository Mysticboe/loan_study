<template>
  <div class="approval-page">
    <van-nav-bar
      title="审批决策台"
      left-text="返回"
      left-arrow
      fixed
      @click-left="router.back()"
    />

    <main v-if="detail" class="content">
      <!-- 风险扫描仪 (离) -->
      <van-notice-bar
        v-if="riskWarnings.length > 0"
        left-icon="warning-o"
        :text="riskWarnings.join('；')"
        color="#ed6a0c"
        background="#fffbe8"
        mode="closeable"
      />

      <!-- 基础信息 -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">基础信息</span>
          <van-tag :type="detail.applyType === '新增' ? 'success' : 'primary'">{{ detail.applyType }}</van-tag>
        </div>
        <van-cell-group inset>
          <van-field label="申请机构" :model-value="detail.applicantName" readonly />
          <van-field label="信用评级" :model-value="detail.creditRating" readonly />
          <van-field label="申请单号" :model-value="detail.approvalNo" readonly />
          <van-field label="集团授信" :model-value="formatAmount(detail.groupExposure)" readonly />
        </van-cell-group>
      </section>

      <!-- 额度对比视图 (守 - 非对称视角) -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">授信方案对比</span>
        </div>
        
        <div v-if="detail.applyType === '续作'" class="comparison-view">
          <van-row gutter="16">
            <van-col span="12">
              <div class="column-header original">原授信方案</div>
              <div class="comparison-box">
                <div class="comp-item">
                  <label>总额度</label>
                  <span class="amount">{{ formatAmount(detail.previousQuota?.total) }}</span>
                </div>
                <div class="comp-divider"></div>
                <div class="comp-item sub">
                  <label>票据</label>
                  <span>{{ formatAmount(detail.previousQuota?.bill) }}</span>
                </div>
                <div class="comp-item sub">
                  <label>融资</label>
                  <span>{{ formatAmount(detail.previousQuota?.finance) }}</span>
                </div>
                <div class="comp-item sub">
                  <label>投资</label>
                  <span>{{ formatAmount(detail.previousQuota?.invest) }}</span>
                </div>
              </div>
            </van-col>
            <van-col span="12">
              <div class="column-header current">本次申请</div>
              <div class="comparison-box highlight">
                <div class="comp-item">
                  <label>总额度</label>
                  <span class="amount">{{ formatAmount(detail.amountValue) }}</span>
                </div>
                <div class="comp-divider"></div>
                <!-- 自动计算分项 (破 - 逻辑自洽检查) -->
                <div class="comp-item sub">
                  <label>票据 ({{ (detail.quotaBreakdown?.bill * 100).toFixed(0) }}%)</label>
                  <span>{{ formatAmount(detail.amountValue * detail.quotaBreakdown?.bill) }}</span>
                </div>
                <div class="comp-item sub">
                  <label>融资 ({{ (detail.quotaBreakdown?.finance * 100).toFixed(0) }}%)</label>
                  <span>{{ formatAmount(detail.amountValue * detail.quotaBreakdown?.finance) }}</span>
                </div>
                <div class="comp-item sub">
                  <label>投资 ({{ (detail.quotaBreakdown?.invest * 100).toFixed(0) }}%)</label>
                  <span>{{ formatAmount(detail.amountValue * detail.quotaBreakdown?.invest) }}</span>
                </div>
              </div>
            </van-col>
          </van-row>
        </div>

        <div v-else class="single-view">
           <van-cell-group inset>
              <van-field label="申请总额" :model-value="formatAmount(detail.amountValue)" readonly />
              <van-field label="票据额度" :model-value="formatAmount(detail.amountValue * detail.quotaBreakdown?.bill)" readonly />
              <van-field label="融资额度" :model-value="formatAmount(detail.amountValue * detail.quotaBreakdown?.finance)" readonly />
              <van-field label="投资额度" :model-value="formatAmount(detail.amountValue * detail.quotaBreakdown?.invest)" readonly />
           </van-cell-group>
        </div>
        
        <div v-if="logicError" class="logic-error-tip">
           <van-icon name="info" /> {{ logicError }}
        </div>
      </section>

      <!-- 审批痕迹 (破) -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">流转历史</span>
        </div>
        <van-steps direction="vertical" :active="detail.auditHistory?.length || 0" active-color="#0f766e">
           <van-step v-for="(log, index) in detail.auditHistory" :key="index">
            <h3>{{ log.stage }} <span class="operator">({{ log.operator }})</span></h3>
            <p v-if="log.comment" :class="{'error-text': log.status === 'error', 'warn-text': log.status === 'warning'}">
              {{ log.comment }}
            </p>
            <p class="time">{{ new Date(log.time).toLocaleString() }}</p>
          </van-step>
        </van-steps>
      </section>

      <div class="bottom-spacer"></div>
    </main>
    
    <AppSkeleton v-else />

    <!-- 审批决策操作栏 (破) -->
    <van-action-bar v-if="detail && detail.status === 'reviewing'">
      <van-action-bar-button type="danger" text="拒绝" @click="handleReject" />
      <van-action-bar-button type="warning" text="退回" @click="handleReturn" />
      <van-action-bar-button type="primary" text="通过" color="#0f766e" @click="handleApprove" />
    </van-action-bar>

    <!-- 退回处理弹窗 (破) -->
    <van-popup v-model:show="showReturnSheet" position="bottom" round style="height: 60%">
      <div class="popup-header">
         <span>退回审批</span>
         <span class="close-btn" @click="showReturnSheet = false">取消</span>
      </div>
      <div class="popup-content">
         <van-field
            v-model="form.returnReasonText"
            is-link
            readonly
            label="退回原因"
            placeholder="请选择"
            @click="showReasonPicker = true"
         />
         <van-field
            v-model="form.comment"
            rows="3"
            autosize
            label="补充意见"
            type="textarea"
            placeholder="请输入具体修改建议..."
         />
         <div class="action-btn-area">
            <van-button block type="primary" :disabled="!form.returnReasonText" @click="submitReturn">确认退回</van-button>
         </div>
      </div>
      <van-popup v-model:show="showReasonPicker" position="bottom" round>
         <van-picker
           :columns="returnReasons"
           @confirm="onConfirmReason"
           @cancel="showReasonPicker = false"
         />
      </van-popup>
    </van-popup>

    <!-- 拒绝弹窗 -->
    <van-dialog v-model:show="showRejectDialog" title="拒绝申请" show-cancel-button @confirm="submitReject">
       <van-field
         v-model="form.rejectReason"
         rows="3"
         autosize
         type="textarea"
         placeholder="请输入拒绝理由..."
         class="reject-input"
       />
    </van-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog, showDialog, showSuccessToast, showLoadingToast, showFailToast } from 'vant';
import { fetchLoanApplicationDetail, submitApprovalDecision } from '../api/loan';
import { request } from '../api/http';
import AppSkeleton from '../components/AppSkeleton.vue';

const route = useRoute();
const router = useRouter();
const detail = ref(null);
const showReturnSheet = ref(false);
const showRejectDialog = ref(false);
const submitting = ref(false);

const returnReasons = ref([]);
const commonComments = ref([]);

const form = ref({
  returnReason: '',
  returnReasonText: '',
  rejectReason: '',
  comment: ''
});
const showReasonPicker = ref(false);

const loadDicts = async () => {
  try {
     const reasons = await request({ method: 'GET', path: '/api/dict/approval-comments', query: { type: 'return' } });
     returnReasons.value = reasons;
     const comments = await request({ method: 'GET', path: '/api/dict/approval-comments', query: { type: 'common' } });
     commonComments.value = comments;
  } catch (e) { console.error(e); }
};

const onConfirmReason = ({ selectedOptions }) => {
  form.value.returnReasonText = selectedOptions[0]?.text;
  form.value.returnReason = selectedOptions[0]?.text;
  showReasonPicker.value = false;
};

const logicError = computed(() => {
   if (!detail.value || !detail.value.quotaBreakdown) return '';
   const { bill, finance, invest } = detail.value.quotaBreakdown;
   // Mock logic check: sum should be 1 (100%)
   if (Math.abs(bill + finance + invest - 1) > 0.01) {
      return '数据逻辑异常：分项比例之和不等于100%，建议退回';
   }
   return '';
});

const riskWarnings = computed(() => {
  const warnings = [];
  if (detail.value?.groupExposure > 5000000000) {
     warnings.push('集团集中度预警：该集团全行总授信已超 50 亿');
  }
  if (logicError.value) {
     warnings.push(logicError.value);
  }
  return warnings;
});

const formatAmount = (num) => {
  if (!num && num !== 0) return '-';
  if (num > 100000000) return (num / 100000000).toFixed(2) + '亿';
  if (num > 10000) return (num / 10000).toFixed(2) + '万';
  return num.toLocaleString();
};

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

const loadDetail = async () => {
  try {
    const id = route.params.applicationId;
    detail.value = await fetchLoanApplicationDetail(id);
  } catch (error) {
    showConfirmDialog({ title: '错误', message: '加载失败' }).then(() => router.back());
  }
};

const handleApprove = () => {
  // Smart Comment
  if (!form.value.comment) {
     if (detail.value?.creditRating === 'AAA') {
        form.value.comment = '该机构信用良好，授信额度符合我行同业限额管理规定，拟同意。';
     } else {
        form.value.comment = '拟同意，请落实相关风险缓释措施。';
     }
  }

  if (logicError.value) {
     showConfirmDialog({
       title: '风险提示',
       message: '当前申请存在逻辑异常，确认强制通过吗？',
       confirmButtonColor: '#ed6a0c'
     }).then(processApprove).catch(() => {});
     return;
  }
  processApprove();
};

const processApprove = () => {
  showConfirmDialog({
    title: '审批通过确认',
    message: `确认批准该笔授信申请？\n\n审批意见：${form.value.comment}\n(模拟) 请使用数字证书签名`,
    confirmButtonText: '确认签名',
    confirmButtonColor: '#0f766e'
  }).then(async () => {
    const loading = showLoadingToast({ message: '签名中...', duration: 0 });
    try {
      await new Promise(r => setTimeout(r, 800)); // Signature delay
      await submitApprovalDecision({
        applicationId: detail.value.applicationId,
        action: 'approve',
        reason: form.value.comment // Send comment as reason if needed or extend API
      });
      loading.close();
      showSuccessToast('审批已通过');
      router.back();
    } catch (error) {
      loading.close();
      showFailToast(error.message || '操作失败');
    }
  });
};

const handleReject = () => {
  showRejectDialog.value = true;
};

const submitReject = async () => {
  if (!form.value.rejectReason) {
     showFailToast('请输入拒绝理由');
     return;
  }
  try {
     await submitApprovalDecision({
       applicationId: detail.value.applicationId,
       action: 'reject',
       reason: form.value.rejectReason
     });
     showSuccessToast('已拒绝该申请');
     router.back();
   } catch (error) {
     showFailToast(error.message || '操作失败');
   }
};

const handleReturn = () => {
  showReturnSheet.value = true;
};

const submitReturn = async () => {
  if (!form.value.returnReason) {
    showFailToast('请选择退回原因');
    return;
  }
  const fullReason = `${form.value.returnReason} ${form.value.comment ? ' - ' + form.value.comment : ''}`;
  
  const loading = showLoadingToast({ message: '退回中...', duration: 0 });
  try {
     await submitApprovalDecision({
       applicationId: detail.value.applicationId,
       action: 'return',
       reason: fullReason
     });
     loading.close();
     showSuccessToast('已退回');
     router.back();
  } catch (error) {
     loading.close();
     showFailToast(error.message || '操作失败');
  }
};

onMounted(() => {
  loadDetail();
  loadDicts();
});
</script>

<style scoped>
.approval-page {
  min-height: 100vh;
  padding-top: 46px;
  background: #f7f8fa;
}

.content {
  padding: 16px;
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-left: 4px;
  border-left: 3px solid #0f766e;
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
  margin-left: 8px;
}

.comparison-view {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
}

.column-header {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
  text-align: center;
}

.comparison-box {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  height: 100%;
}

.comparison-box.highlight {
  border-color: #0f766e;
  background: #f0fdfa;
}

.comp-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.comp-item.sub {
  color: #64748b;
  font-size: 12px;
}

.comp-item .amount {
  font-weight: 600;
  color: #0f766e;
}

.comp-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 8px 0;
}

.logic-error-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #ee0a24;
  background: #fff5f5;
  padding: 8px;
  border-radius: 4px;
}

.operator {
  font-size: 12px;
  color: #64748b;
  font-weight: normal;
}

.time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.error-text {
  color: #ef4444;
  font-weight: 500;
}

.warn-text {
  color: #f59e0b;
  font-weight: 500;
}

.bottom-spacer {
  height: 60px;
}

.popup-header {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  position: relative;
}

.close-btn {
  position: absolute;
  right: 16px;
  color: #969799;
  font-weight: normal;
  font-size: 14px;
}

.popup-content {
  padding: 16px 0;
}

.action-btn-area {
  padding: 20px 16px;
}

.reject-input {
  background: #f7f8fa;
  margin: 10px 16px;
  width: auto;
  border-radius: 4px;
}
</style>