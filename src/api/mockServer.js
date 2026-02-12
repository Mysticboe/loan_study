const STORAGE_KEY = 'loan_study_mock_applications';

const USERS = [{ id: 'u-admin', username: 'admin', password: 'admin', name: '\u7ba1\u7406\u5458' }];

const captchaStore = new Map();

const STATUS_TEXT = {
  reviewing: '\u5ba1\u6279\u4e2d',
  rejected: '\u5df2\u62d2\u7edd',
  disbursed: '\u5df2\u653e\u6b3e',
  pending: '\u5f85\u653e\u6b3e'
};

const statusDefs = [
  { key: 'reviewing', text: STATUS_TEXT.reviewing, step: 2 },
  { key: 'rejected', text: STATUS_TEXT.rejected, step: 2 },
  { key: 'disbursed', text: STATUS_TEXT.disbursed, step: 3 },
  { key: 'pending', text: STATUS_TEXT.pending, step: 3 }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const readApplications = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const writeApplications = (rows) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const amountText = (amount) =>
  Number(amount || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const buildTimeline = (status) => {
  const now = new Date();
  const base = [
    { title: '\u7533\u8bf7\u63d0\u4ea4', time: new Date(now.getTime() - 1000 * 60 * 30).toISOString() },
    { title: '\u8d44\u6599\u5ba1\u6838', time: new Date(now.getTime() - 1000 * 60 * 20).toISOString() },
    { title: '\u98ce\u63a7\u8bc4\u4f30', time: new Date(now.getTime() - 1000 * 60 * 10).toISOString() },
    { title: status === 'rejected' ? '\u5ba1\u6279\u62d2\u7edd' : '\u7b49\u5f85\u653e\u6b3e', time: now.toISOString() }
  ];
  return base;
};

const createSvgCaptcha = (code) => {
  const noise = Array.from({ length: 5 })
    .map(
      () =>
        `<line x1="${rand(0, 108)}" y1="${rand(2, 34)}" x2="${rand(0, 108)}" y2="${rand(2, 34)}" stroke="rgb(${rand(90, 180)},${rand(90, 180)},${rand(90, 180)})" stroke-width="1" />`
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="38" viewBox="0 0 110 38"><rect width="110" height="38" rx="6" fill="#f4f7fb"/>${noise}<text x="55" y="25" text-anchor="middle" font-family="Georgia" font-size="24" font-weight="700" fill="#0f766e">${code}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const jsonError = (status, message, details = null) => {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
};

const hasBrokenText = (value) => {
  if (typeof value !== 'string') return false;
  return value.includes('\uFFFD') || /[ÃæÎÊÖ·µ]/.test(value);
};

const hasBrokenRows = (rows) =>
  rows.some((row) => {
    const fields = [row?.applicantName, row?.statusText, row?.approvalNo];
    return fields.some(hasBrokenText);
  });

const ensureSeedData = () => {
  const existing = readApplications();
  if (existing.length > 0 && !hasBrokenRows(existing)) return;

  const names = ['\u674e\u5efa\u56fd', '\u738b\u6653\u4e91', '\u5f20\u6587\u6d9b', '\u8d75\u5b50\u6db5'];
  const seeds = Array.from({ length: 8 }).map((_, i) => {
    const idx = i + 1;
    const status = statusDefs[idx % statusDefs.length];
    const amount = 300000 + idx * 52000;
    const applicationId = `APP2026${String(100000 + idx).slice(-6)}`;
    return {
      applicationId,
      approvalNo: `APR2026${String(100000 + idx).slice(-6)}`,
      applicantName: names[idx % 4],
      approvedAmount: amountText(amount),
      status: status.key,
      statusText: status.text,
      activeStep: status.step,
      timeline: buildTimeline(status.key),
      createdAt: new Date(Date.now() - idx * 3600000).toISOString()
    };
  });

  writeApplications(seeds);
};

const parsePath = (path) => path.split('?')[0];

const parseFormDataFiles = (formData) => {
  const files = [];
  for (const entry of formData.values()) {
    if (entry instanceof File) files.push(entry);
  }
  return files;
};

const pickStatus = () => statusDefs[rand(0, statusDefs.length - 1)];

export const mockRequest = async ({ method, path, body, headers }) => {
  ensureSeedData();
  await sleep(rand(260, 620));

  const cleanPath = parsePath(path);

  if (method === 'GET' && cleanPath === '/api/auth/captcha') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i += 1) code += chars[rand(0, chars.length - 1)];
    const captchaToken = makeId('captcha_');
    captchaStore.set(captchaToken, code);
    return { captchaToken, imageBase64: createSvgCaptcha(code) };
  }

  if (method === 'POST' && cleanPath === '/api/auth/login') {
    const payload = body || {};
    const expected = captchaStore.get(payload.captchaToken);
    if (!expected || expected !== String(payload.captchaCode || '').trim().toUpperCase()) {
      throw jsonError(400, '\u9a8c\u8bc1\u7801\u9519\u8bef\u6216\u5df2\u8fc7\u671f');
    }
    captchaStore.delete(payload.captchaToken);

    const user = USERS.find((u) => u.username === payload.username && u.password === payload.password);
    if (!user) throw jsonError(401, '\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef');

    return {
      accessToken: `mock_token_${makeId('')}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      user: { id: user.id, name: user.name }
    };
  }

  const token = headers?.Authorization?.replace('Bearer ', '') || '';
  if (!token || !token.startsWith('mock_token_')) {
    throw jsonError(401, '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548');
  }

  if (method === 'POST' && cleanPath === '/api/uploads/id-cards') {
    if (!(body instanceof FormData)) throw jsonError(400, '\u4e0a\u4f20\u6570\u636e\u683c\u5f0f\u9519\u8bef');
    const files = parseFormDataFiles(body);
    if (files.length === 0) throw jsonError(400, '\u8bf7\u5148\u4e0a\u4f20\u8eab\u4efd\u8bc1\u5f71\u50cf');

    const responses = files.map((file) => ({
      fileId: makeId('file_'),
      url: URL.createObjectURL(file)
    }));
    return { files: responses };
  }

  if (method === 'POST' && cleanPath === '/api/loan/applications') {
    const payload = body || {};
    if (!payload.customerName || !payload.idCard || !payload.collateralValue) {
      throw jsonError(400, '\u7533\u8bf7\u4fe1\u606f\u4e0d\u5b8c\u6574');
    }
    if (!Array.isArray(payload.idCardFileIds) || payload.idCardFileIds.length === 0) {
      throw jsonError(400, '\u8bf7\u5148\u4e0a\u4f20\u8eab\u4efd\u8bc1\u5f71\u50cf');
    }

    const amount = Number(payload.collateralValue) * 0.7;
    const status = pickStatus();
    const applicationId = makeId('APP_');
    const row = {
      applicationId,
      approvalNo: `APR${Date.now().toString().slice(-10)}`,
      applicantName: payload.customerName,
      approvedAmount: amountText(amount),
      status: status.key,
      statusText: status.text,
      activeStep: status.step,
      timeline: buildTimeline(status.key),
      createdAt: new Date().toISOString()
    };

    const rows = readApplications();
    rows.unshift(row);
    writeApplications(rows);

    return {
      applicationId,
      approvalNo: row.approvalNo,
      suggestedAmount: row.approvedAmount,
      status: row.status
    };
  }

  if (method === 'GET' && /^\/api\/loan\/applications\/.+/.test(cleanPath)) {
    const applicationId = cleanPath.split('/').pop();
    const rows = readApplications();
    const row = rows.find((item) => item.applicationId === applicationId);
    if (!row) throw jsonError(404, '\u7533\u8bf7\u8bb0\u5f55\u4e0d\u5b58\u5728');
    return row;
  }

  if (method === 'GET' && cleanPath === '/api/loan/applications') {
    const pageNo = Number(new URLSearchParams(path.split('?')[1] || '').get('pageNo') || 1);
    const pageSize = Number(new URLSearchParams(path.split('?')[1] || '').get('pageSize') || 6);
    const rows = readApplications();
    const start = (pageNo - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    return {
      list: pageRows,
      pageNo,
      pageSize,
      total: rows.length,
      hasMore: start + pageSize < rows.length
    };
  }

  if (method === 'GET' && cleanPath === '/api/customer/search') {
    const query = new URLSearchParams(path.split('?')[1] || '');
    const keyword = (query.get('keyword') || '').trim();
    const status = (query.get('status') || '').trim();
    const customers = [
      {
        id: 'C001',
        name: '中国建设银行',
        status: '生效',
        type: '银行金融机构',
        hasInProcess: false,
        hasValidQuota: true,
        previousQuota: {
          totalExposure: 3600000000,
          selfRunExposure: 2500000000,
          assetManageExposure: 1100000000
        }
      },
      {
        id: 'C002',
        name: '招商证券',
        status: '失效',
        type: '非银行金融机构',
        hasInProcess: false,
        hasValidQuota: false,
        previousQuota: {
          totalExposure: 0,
          selfRunExposure: 0,
          assetManageExposure: 0
        }
      },
      {
        id: 'C003',
        name: '兴业基金',
        status: '未纳入',
        type: '非银行金融机构',
        hasInProcess: false,
        hasValidQuota: false,
        previousQuota: {
          totalExposure: 0,
          selfRunExposure: 0,
          assetManageExposure: 0
        }
      },
      {
        id: 'C004',
        name: '浦发银行',
        status: '未纳入',
        type: '银行金融机构',
        hasInProcess: true,
        processId: 'LC202602120001',
        hasValidQuota: true,
        previousQuota: {
          totalExposure: 2100000000,
          selfRunExposure: 1400000000,
          assetManageExposure: 700000000
        }
      }
    ];

    const list = customers.filter((item) => {
      const keywordMatch = !keyword || item.name.includes(keyword) || item.id.includes(keyword);
      const statusMatch = !status || item.status === status;
      return keywordMatch && statusMatch;
    });

    return { list };
  }

  if (method === 'POST' && cleanPath === '/api/risk/probe') {
    const payload = body || {};
    const customerId = String(payload.customerId || '');
    const detailExposure = Number(payload.selfRunDetailExposure || 0);
    const totalExposure = Number(payload.totalExposure || 0);

    if (!customerId) {
      throw jsonError(400, '风险探测缺少客户信息');
    }

    if (customerId === 'C002') {
      return {
        pass: false,
        riskLevel: 'high',
        hitType: 'blacklist',
        message: '命中黑名单客户，禁止提交授信申请'
      };
    }

    if (customerId === 'C004' || totalExposure > 5000000000 || detailExposure > 3200000000) {
      return {
        pass: false,
        riskLevel: 'medium',
        hitType: 'related',
        message: '存在关联交易风险，需人工复核'
      };
    }

    return {
      pass: true,
      riskLevel: 'low',
      hitType: 'none',
      message: '风险探测通过'
    };
  }

  throw jsonError(404, `\u672a\u5339\u914d\u5230\u63a5\u53e3: ${method} ${cleanPath}`);
};
