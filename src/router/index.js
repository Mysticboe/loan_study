import { createRouter, createWebHashHistory } from 'vue-router';
import LoanApply from '../views/LoanApply.vue';
import LoanResult from '../views/LoanResult.vue';
import LoanProgress from '../views/LoanProgress.vue';
import Login from '../views/Login.vue';

const AUTH_KEY = 'loan_study_logged_in';

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
    path: '/result',
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
  const isLoggedIn = sessionStorage.getItem(AUTH_KEY) === '1';

  if (to.meta.requiresAuth && !isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    };
  }

  return true;
});

export default router;
