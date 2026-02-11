import { createRouter, createWebHashHistory } from 'vue-router';
import LoanApply from '../views/LoanApply.vue';
import LoanResult from '../views/LoanResult.vue';
import LoanProgress from '../views/LoanProgress.vue';
import Login from '../views/Login.vue';
import { setUnauthorizedHandler } from '../api/http';
import { clearSession, isSessionValid } from '../session/authSession';

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/apply',
    name: 'Apply',
    component: LoanApply,
    meta: { requiresAuth: true }
  },
  {
    path: '/result/:applicationId',
    name: 'Result',
    component: LoanResult,
    meta: { requiresAuth: true }
  },
  {
    path: '/progress',
    name: 'Progress',
    component: LoanProgress,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isSessionValid()) {
    clearSession();
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    };
  }

  return true;
});

setUnauthorizedHandler(() => {
  const current = router.currentRoute.value;
  if (current.path === '/login') return;
  router.replace({ path: '/login', query: { redirect: current.fullPath } });
});

export default router;
