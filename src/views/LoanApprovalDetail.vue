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
        <van-steps direction="vertical" :active="2" active-color="#0f766e">
          <van-step>
            <h3>客户经理提交</h3>
            <p>{{ formatDate(new Date(Date.now() - 86400000 * 2)) }}</p>
          </van-step>
          <van-step>
            <h3>部门负责人初审</h3>
            <p>意见：同意报送，建议关注集团集中度。</p>
            <p>{{ formatDate(new Date(Date.now() - 86400000)) }}</p>
          </van-step>
          <van-step>
            <h3>风险审批官审批</h3>
            <p>当前环节</p>
          </van-step>
        </van-steps>
      </section>

      <div class="bottom-spacer"></div>
    </main>
    
    <AppSkeleton v-else />

    <!-- 审批决策操作栏 (破) -->
    <van-action-bar v-if="detail && detail.status === 'reviewing'">
      <van-action-bar-button type="danger" text="拒绝" @click="handleReject" />
      <van-action-bar-button type="warning" text="退回" @click="showReturnSheet = true" />
      <van-action-bar-button type="primary" text="通过" color="#0f766e" @click="handleApprove" />
    </van-action-bar>

    <!-- 退回原因选择 -->
    <van-action-sheet
      v-model:show="showReturnSheet"
      :actions="returnActions"
      cancel-text="取消"
      description="请选择退回原因"
      close-on-click-action
      @select="confirmReturn"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog, showDialog, showSuccessToast, showLoadingToast, showFailToast } from 'vant';
import { fetchLoanApplicationDetail, submitApprovalDecision } from '../api/loan';
import AppSkeleton from '../components/AppSkeleton.vue';

const route = useRoute();
const router = useRouter();
const detail = ref(null);
const showReturnSheet = ref(false);
const submitting = ref(false);

const returnActions = [
  { name: '产品树选择错误' },
  { name: '证明材料缺失' },
  { name: '额度测算依据不足' },
  { name: '其他' }
];

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
    message: '确认批准该笔授信申请？\n(模拟) 请使用数字证书签名',
    confirmButtonText: '确认签名',
    confirmButtonColor: '#0f766e'
  }).then(async () => {
    const loading = showLoadingToast({ message: '签名中...', duration: 0 });
    try {
      await new Promise(r => setTimeout(r, 800)); // Signature delay
      await submitApprovalDecision({
        applicationId: detail.value.applicationId,
        action: 'approve'
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
  showDialog({
    title: '拒绝申请',
    message: '请输入详细拒绝理由：',
    showCancelButton: true,
    confirmButtonColor: '#ee0a24',
    confirmButtonText: '确认拒绝',
    teleport: 'body',
    messageAlign: 'left',
    // Vant 4 Dialog input workaround or usage of component slots is better, 
    // but for simple text, standard confirm is used. 
    // In real scenario, we'd use a custom component inside the dialog or a form.
    // For this demo, we assume the user "mentally" inputs it or we use a prompt if available.
    // Vant 4 doesn't support 'prompt' style out of box easily without component.
    // We will just simulate the confirmation action.
  }).then(async () => {
     try {
       await submitApprovalDecision({
         applicationId: detail.value.applicationId,
         action: 'reject',
         reason: '综合评分不足' // Mock reason
       });
       showSuccessToast('已拒绝该申请');
       router.back();
     } catch (error) {
       showFailToast(error.message || '操作失败');
     }
  });
};

const confirmReturn = async (action) => {
  showReturnSheet.value = false;
  const loading = showLoadingToast({ message: '退回中...', duration: 0 });
  try {
     await submitApprovalDecision({
       applicationId: detail.value.applicationId,
       action: 'return',
       reason: action.name
     });
     loading.close();
     showSuccessToast(`已退回：${action.name}`);
     router.back();
  } catch (error) {
     loading.close();
     showFailToast(error.message || '操作失败');
  }
};

onMounted(() => {
  loadDetail();
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

.bottom-spacer {
  height: 60px;
}
</style>