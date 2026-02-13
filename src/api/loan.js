import { request } from './http';

export const createLoanApplication = (payload, idempotencyKey) =>
  request({
    method: 'POST',
    path: '/api/loan/applications',
    body: payload,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
  });

export const fetchLoanApplicationDetail = (applicationId) =>
  request({ method: 'GET', path: `/api/loan/applications/${applicationId}` });

export const fetchLoanApplicationList = ({ pageNo, pageSize }) =>
  request({ method: 'GET', path: '/api/loan/applications', query: { pageNo, pageSize } });

export const searchCustomers = (keyword = '', status = '') =>
  request({
    method: 'GET',
    path: '/api/customer/search',
    query: { keyword, status }
  });

export const probeCreditRisk = (payload) =>
  request({
    method: 'POST',
    path: '/api/risk/probe',
    body: payload
  });

export const invalidateCustomer = (customerId, reason) =>
  request({
    method: 'POST',
    path: '/api/customer/invalidate',
    body: { customerId, reason }
  });

export const fetchLoanProducts = (category) =>
  request({
    method: 'GET',
    path: '/api/loan/products',
    query: { category }
  });

export const submitApprovalDecision = (payload) =>
  request({
    method: 'POST',
    path: '/api/loan/approve',
    body: payload
  });
