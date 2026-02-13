<template>
  <div class="mine-page">
    <div class="user-header">
      <van-image
        round
        width="64"
        height="64"
        :src="user.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
      />
      <div class="user-info">
        <h2 class="name">{{ user.name }}</h2>
        <p class="role-tag">{{ user.role === 'APPROVER' ? '风险审批官' : '客户经理' }}</p>
      </div>
    </div>
    
    <van-cell-group inset class="menu-group">
      <van-cell title="个人信息" is-link icon="user-o" />
      <van-cell title="账号安全" is-link icon="shield-o" />
      <van-cell title="通用设置" is-link icon="setting-o" />
    </van-cell-group>
    
    <div class="logout-box">
      <van-button block type="default" @click="handleLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showSuccessToast } from 'vant';
import { clearSession } from '../session/authSession';

const router = useRouter();
const user = reactive({
  name: localStorage.getItem('user_name') || '用户',
  role: localStorage.getItem('user_role') || 'APPLICANT',
  avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
});

const handleLogout = () => {
  showConfirmDialog({
    title: '退出登录',
    message: '确认退出当前账号吗？',
  }).then(() => {
    clearSession();
    showSuccessToast('已退出登录');
    router.replace('/login');
  });
};
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-top: 20px;
}
.user-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  background: #fff;
  margin-bottom: 12px;
}
.user-info {
  margin-top: 12px;
  text-align: center;
}
.name {
  margin: 0;
  font-size: 18px;
  color: #323233;
}
.role-tag {
  margin: 4px 0 0;
  font-size: 12px;
  color: #969799;
}
.menu-group {
  margin-bottom: 20px;
}
.logout-box {
  padding: 0 16px;
}
</style>