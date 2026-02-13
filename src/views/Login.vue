<template>
  <AppSkeleton v-if="pageLoading" />
  <div v-else class="login-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>

    <main class="content">
      <section class="brand">
        <p class="eyebrow">Loan Studio</p>
        <h1>欢迎登录信贷作业系统</h1>
        <p class="sub">请输入账号信息后继续办理业务</p>
      </section>

      <section class="panel">
        <van-form @submit="handleLogin">
          <van-field
            v-model.trim="form.username"
            name="username"
            label="账号"
            placeholder="请输入账号"
            :rules="[{ required: true, message: '请输入账号' }]"
          />
          <van-field
            v-model="form.password"
            name="password"
            type="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
          <van-field
            v-model.trim="form.captchaInput"
            name="captcha"
            label="验证码"
            placeholder="请输入验证码"
            class="captcha-field"
            :rules="[{ required: true, message: '请输入验证码' }]"
          >
            <template #button>
              <div class="captcha-wrapper">
                <img
                  class="captcha-image"
                  :src="captchaImage"
                  alt="验证码"
                  title="点击刷新验证码"
                  @click="refreshCaptcha"
                />
              </div>
            </template>
          </van-field>

          <div class="action">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="submitting"
              :disabled="submitting"
              class="login-btn"
            >
              登录
            </van-button>
          </div>
        </van-form>


      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { showFailToast, showSuccessToast, showLoadingToast } from 'vant';
import { useRoute, useRouter } from 'vue-router';
import AppSkeleton from '../components/AppSkeleton.vue';
import { fetchCaptcha, loginByPassword } from '../api/auth';
import { saveSession } from '../session/authSession';

const router = useRouter();
const route = useRoute();
const pageLoading = ref(true);
const submitting = ref(false);
const loadingCaptcha = ref(false);
const captchaToken = ref('');
const captchaImage = ref('');
const form = reactive({
  username: 'admin',
  password: 'admin',
  captchaInput: ''
});

const refreshCaptcha = async () => {
  if (loadingCaptcha.value) return;
  loadingCaptcha.value = true;
  try {
    const data = await fetchCaptcha();
    captchaToken.value = data.captchaToken;
    captchaImage.value = data.imageBase64;
    form.captchaInput = '';
  } catch (error) {
    showFailToast(error.message || '验证码加载失败');
  } finally {
    loadingCaptcha.value = false;
  }
};

const handleLogin = async () => {
  if (!form.username || !form.password || !form.captchaInput) {
    showFailToast('请完整填写登录信息');
    return;
  }
  if (!captchaToken.value) {
    showFailToast('验证码已失效，请刷新后重试');
    await refreshCaptcha();
    return;
  }

  submitting.value = true;
  try {
    const session = await loginByPassword({
      username: form.username,
      password: form.password,
      captchaToken: captchaToken.value,
      captchaCode: form.captchaInput
    });
    saveSession(session);
    
    // Role handling
    const userRole = session.user?.role || 'APPLICANT';
    const username = session.user?.name || form.username;
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('user_name', username);
    
    const loadingToast = showLoadingToast({
      message: '正在进入工作台...',
      forbidClick: true,
      duration: 0
    });

    // Simulated delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    loadingToast.close();

    const welcomeTitle = userRole === 'APPROVER' ? '风险审批官' : '客户经理';
    showSuccessToast(`欢迎回来，${welcomeTitle} ${username}`);
    
    let redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    
    // Role-based redirection
    if (!redirect) {
       if (userRole === 'APPROVER') {
          redirect = '/progress'; // Approver dashboard (Task Hall)
       } else {
          redirect = '/workbench'; // Applicant workbench
       }
    }
    
    await router.replace(redirect);
  } catch (error) {
    showFailToast(error.message || '登录失败');
    await refreshCaptcha();
  } finally {
    submitting.value = false;
  }
};

refreshCaptcha();

onMounted(() => {
  setTimeout(() => {
    pageLoading.value = false;
  }, 450);
});
</script>

<style scoped>
:root {
  --login-bg: #edf3fa;
  --login-panel: #ffffff;
  --login-text: #13233a;
  --login-sub: #5f6f82;
  --login-accent: #0f766e;
  --login-accent-dark: #0a5d57;
}

.login-page {
  min-height: 100vh;
  background: radial-gradient(160% 80% at 20% 15%, #d8e7ff 0%, transparent 55%),
    radial-gradient(120% 70% at 90% 80%, #d8f3eb 0%, transparent 60%), var(--login-bg);
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
  padding: 72px 16px 28px;
  animation: fadeUp 320ms ease-out;
}

.brand {
  margin: 18px 4px 14px;
}

.eyebrow {
  font-size: 14px;
  text-transform: uppercase;
  color: var(--login-accent);
  opacity: 0.8;
  font-weight: 700;
  margin: 0 0 12px;
  display: block;
}

.brand h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.28;
  color: #1a202c;
}

.sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--login-sub);
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(15px) saturate(180%);
  border-radius: 24px;
  padding: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.captcha-field :deep(.van-field__body) {
  display: flex;
  align-items: center;
}

.captcha-field :deep(.van-field__control) {
  flex: 1;
}

.captcha-wrapper {
  display: flex;
  align-items: center;
  padding-left: 8px;
  border-left: 1px solid #eee;
  margin-left: 8px;
  height: 24px;
}

.captcha-image {
  width: 90px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #d8e2ef;
  cursor: pointer;
  user-select: none;
  display: block;
  transition: opacity 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.captcha-image:active {
  opacity: 0.7;
}

:deep(.van-field) {
  transition: all 0.3s;
  padding: 16px 12px;
  background: transparent !important;
  margin-bottom: 4px;
}

:deep(.van-field--focus) {
  background: rgba(15, 118, 110, 0.02);
}

:deep(.van-field__control) {
  font-size: 16px;
  color: #2d3748;
}

.action {
  margin: 18px 8px 8px;
}

.login-btn {
  background: linear-gradient(135deg, #0f766e 0%, #0a5d57 100%);
  border: none;
  height: 48px;
  font-weight: 600;
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.2);
}

.tips {
  margin: 10px 12px 0;
  font-size: 12px;
  color: #7a8898;
}

@keyframes fadeUp {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (min-width: 768px) {
  .content {
    padding-top: 72px;
  }
}
</style>
