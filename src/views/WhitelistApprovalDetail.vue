<template>
  <div class="approval-page">
    <van-nav-bar
      :title="isRevoke ? '准入失效清理审批' : '准入审批详情'"
      left-text="返回"
      left-arrow
      fixed
      @click-left="router.back()"
    />

    <main v-if="detail" class="content">
      <!-- 基础信息 -->
      <section class="panel">
        <div class="panel-header" :class="{ 'revoke-header': isRevoke }">
          <span class="title">机构信息</span>
          <van-tag :type="isRevoke ? 'warning' : 'primary'">{{ isRevoke ? '失效申请' : '准入申请' }}</van-tag>
        </div>
        <van-cell-group inset>
          <van-field label="机构名称" :model-value="detail.applicantName" readonly />
          <van-field label="统一信用代码" :model-value="detail.idCard" readonly />
          <van-field label="拟定信用等级" :model-value="detail.targetCreditLevel || 'AA'" readonly />
          <van-field label="申请单号" :model-value="detail.approvalNo" readonly />
        </van-cell-group>
      </section>

      <!-- 申请理由 -->
      <section class="panel">
        <div class="panel-header" :class="{ 'revoke-header': isRevoke }">
          <span class="title">{{ isRevoke ? '失效原因' : '准入理由' }}</span>
        </div>
        <div class="reason-content" :class="{ 'revoke-reason': isRevoke }">
          {{ detail.applyReason || '暂无详细理由' }}
        </div>
      </section>

      <!-- 资质材料 (仅准入显示，失效可能不显示或显示证据) -->
      <section class="panel" v-if="!isRevoke">
        <div class="panel-header">
          <span class="title">资质材料</span>
        </div>
        <div class="file-list">
           <div class="file-item">
             <van-icon name="description" size="24" color="#0f766e" />
             <span>营业执照.pdf</span>
           </div>
           <div class="file-item">
             <van-icon name="description" size="24" color="#0f766e" />
             <span>金融许可证.pdf</span>
           </div>
        </div>
      </section>

      <!-- 审批流轨迹 (破) -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">审批轨迹</span>
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

    <!-- 审批决策操作栏 -->
    <van-action-bar v-if="detail && detail.status === 'reviewing'">
      <van-action-bar-button type="danger" text="拒绝" @click="handleReject" />
      <van-action-bar-button type="warning" text="退回" @click="handleReturn" />
      <van-action-bar-button type="primary" text="通过" :color="isRevoke ? '#f59e0b' : '#7232dd'" @click="handleApprove" />
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
const returnReasons = ref([]);
const commonComments = ref([]);

const form = ref({
  returnReason: '',
  returnReasonText: '',
  rejectReason: '',
  comment: ''
});
const showReasonPicker = ref(false);

const isRevoke = computed(() => detail.value?.type === 'WHITELIST_REVOKE');

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

const handleReturn = () => {
  showReturnSheet.value = true;
};

const submitReturn = async () => {
  if (!form.value.returnReason) {
    showFailToast('请选择退回原因');
    return;
  }
  const fullReason = `${form.value.returnReason} ${form.value.comment ? ' - ' + form.value.comment : ''}`;
  
  const loading = showLoadingToast({ message: '处理中...', duration: 0 });
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

const generateSmartComment = () => {
   if (detail.value?.targetCreditLevel === 'AAA' || detail.value?.creditRating === 'AAA') {
      form.value.comment = '该机构信用良好，资质优异，拟同意。';
   } else {
      form.value.comment = '拟同意，请落实相关风险缓释措施。';
   }
};

const loadDetail = async () => {
  try {
    const id = route.params.applicationId;
    detail.value = await fetchLoanApplicationDetail(id);
  } catch (error) {
    showFailToast('加载失败');
    router.back();
  }
};

const handleApprove = () => {
  // Use smart comment for approve if empty
  if (!form.value.comment) generateSmartComment();
  
  const title = isRevoke.value ? '确认失效清理' : '准入审批确认';
  const message = isRevoke.value 
    ? `确认同意废止“${detail.value.applicantName}”的准入资格？`
    : `确认批准“${detail.value.applicantName}”的准入资格？`;
  const confirmColor = isRevoke.value ? '#f59e0b' : '#7232dd';

  showConfirmDialog({
    title,
    message: `${message}\n\n审批意见：${form.value.comment}`,
    confirmButtonText: '确认批准',
    confirmButtonColor: confirmColor
  }).then(async () => {
    const loading = showLoadingToast({ message: '处理中...', duration: 0 });
    try {
      await new Promise(r => setTimeout(r, 800));
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
     showSuccessToast('已拒绝');
     router.back();
   } catch (error) {
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
  border-left: 3px solid #7232dd; /* Purple for Whitelist */
}

.panel-header.revoke-header {
  border-left-color: #f59e0b; /* Orange for Revoke */
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
  margin-left: 8px;
}

.reason-content {
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
}

.reason-content.revoke-reason {
  background: #fffbe8;
  color: #b45309;
  font-weight: 500;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #475569;
  font-size: 14px;
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