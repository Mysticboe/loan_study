import { createRouter, createWebHashHistory } from 'vue-router';
import LoanApply from '../views/LoanApply.vue';
import InterbankCreditApply from '../views/InterbankCreditApply.vue';
import LoanResult from '../views/LoanResult.vue';
import LoanProgress from '../views/LoanProgress.vue';
import Login from '../views/Login.vue';
import Workbench from '../views/Workbench.vue';
import WhitelistApply from '../views/WhitelistApply.vue';
import LoanApprovalDetail from '../views/LoanApprovalDetail.vue';
import Mine from '../views/Mine.vue';
import WhitelistApprovalDetail from '../views/WhitelistApprovalDetail.vue';
import { setUnauthorizedHandler } from '../api/http';
import { clearSession, isSessionValid } from '../session/authSession';

const routes = [
  {
    path: '/',
    redirect: '/workbench'
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
    path: '/apply-detail',
    name: 'ApplyDetail',
    component: InterbankCreditApply,
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
  },
  {
    path: '/approval/:applicationId',
    name: 'ApprovalDetail',
    component: LoanApprovalDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/approval/whitelist/:applicationId',
    name: 'WhitelistApprovalDetail',
    component: WhitelistApprovalDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/workbench',
    name: 'Workbench',
    component: Workbench,
    meta: { requiresAuth: true }
  },
  {
    path: '/whitelist-apply',
    name: 'WhitelistApply',
    component: WhitelistApply,
    meta: { requiresAuth: true }
  },
  {
    path: '/mine',
    name: 'Mine',
    component: Mine,
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

  // Role Firewall (离)
  const role = localStorage.getItem('user_role');
  if (role) {
    // Approver trying to access applicant pages
    if (role === 'APPROVER' && ['Workbench', 'Apply', 'ApplyDetail', 'Result', 'WhitelistApply'].includes(to.name)) {
       return { path: '/progress' };
    }
    // Applicant trying to access approver pages
    if (role === 'APPLICANT' && ['ApprovalDetail', 'WhitelistApprovalDetail'].includes(to.name)) {
       return { path: '/workbench' };
    }
  }

  return true;
});

setUnauthorizedHandler(() => {
  const current = router.currentRoute.value;
  if (current.path === '/login') return;
  router.replace({ path: '/login', query: { redirect: current.fullPath } });
});

export default router;
