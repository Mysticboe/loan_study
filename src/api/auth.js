import { request } from './http';

export const fetchCaptcha = () => request({ method: 'GET', path: '/api/auth/captcha' });

export const loginByPassword = (payload) => request({ method: 'POST', path: '/api/auth/login', body: payload });
