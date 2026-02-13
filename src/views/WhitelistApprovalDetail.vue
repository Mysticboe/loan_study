<template>
  <div class="approval-page">
    <van-nav-bar
      title="准入审批详情"
      left-text="返回"
      left-arrow
      fixed
      @click-left="router.back()"
    />

    <main v-if="detail" class="content">
      <!-- 基础信息 -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">机构信息</span>
          <van-tag type="primary">准入申请</van-tag>
        </div>
        <van-cell-group inset>
          <van-field label="机构名称" :model-value="detail.applicantName" readonly />
          <van-field label="统一信用代码" :model-value="detail.idCard" readonly />
          <van-field label="拟定信用等级" :model-value="detail.targetCreditLevel || 'AA'" readonly />
          <van-field label="申请单号" :model-value="detail.approvalNo" readonly />
        </van-cell-group>
      </section>

      <!-- 准入理由 -->
      <section class="panel">
        <div class="panel-header">
          <span class="title">准入理由</span>
        </div>
        <div class="reason-content">
          {{ detail.applyReason || '暂无详细理由' }}
        </div>
      </section>

      <!-- 资质材料 (模拟) -->
      <section class="panel">
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

      <div class="bottom-spacer"></div>
    </main>
    
    <AppSkeleton v-else />

    <!-- 审批决策操作栏 -->
    <van-action-bar v-if="detail && detail.status === 'reviewing'">
      <van-action-bar-button type="danger" text="拒绝" @click="handleReject" />
      <van-action-bar-button type="primary" text="通过" color="#7232dd" @click="handleApprove" />
    </van-action-bar>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog, showDialog, showSuccessToast, showLoadingToast, showFailToast } from 'vant';
import { fetchLoanApplicationDetail, submitApprovalDecision } from '../api/loan';
import AppSkeleton from '../components/AppSkeleton.vue';

const route = useRoute();
const router = useRouter();
const detail = ref(null);

const loadDetail = async () => {
  try {
    const id = route.params.applicationId;
    // Reuse existing detail fetcher since mock structure is similar
    detail.value = await fetchLoanApplicationDetail(id);
  } catch (error) {
    showFailToast('加载失败');
    router.back();
  }
};

const handleApprove = () => {
  showConfirmDialog({
    title: '准入审批确认',
    message: `确认批准“${detail.value.applicantName}”的准入资格？\n批准后该机构状态将变更为【生效】。`,
    confirmButtonText: '确认批准',
    confirmButtonColor: '#7232dd'
  }).then(async () => {
    const loading = showLoadingToast({ message: '处理中...', duration: 0 });
    try {
      await new Promise(r => setTimeout(r, 800));
      await submitApprovalDecision({
        applicationId: detail.value.applicationId,
        action: 'approve'
      });
      loading.close();
      showSuccessToast('准入审批已通过');
      router.back();
    } catch (error) {
      loading.close();
      showFailToast(error.message || '操作失败');
    }
  });
};

const handleReject = () => {
  showDialog({
    title: '拒绝准入',
    message: '请输入拒绝理由：',
    showCancelButton: true,
    confirmButtonColor: '#ee0a24',
    confirmButtonText: '确认拒绝'
  }).then(async () => {
     try {
       await submitApprovalDecision({
         applicationId: detail.value.applicationId,
         action: 'reject',
         reason: '资质不符' 
       });
       showSuccessToast('已拒绝');
       router.back();
     } catch (error) {
       showFailToast(error.message || '操作失败');
     }
  });
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
  border-left: 3px solid #7232dd; /* Purple for Whitelist */
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

.bottom-spacer {
  height: 60px;
}
</style>