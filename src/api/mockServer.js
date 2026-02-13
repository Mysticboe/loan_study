const STORAGE_KEY = 'loan_study_mock_applications';

const USERS = [
  { 
    id: 'u-admin', 
    username: 'admin', 
    password: '123456', 
    name: '张总',
    dept: '风险管理部',
    role: 'APPROVER',
    avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
  },
  {
    id: 'u-applicant',
    username: 'li-jianguo',
    password: '123456', 
    name: '李建国',
    dept: '公司业务部',
    role: 'APPLICANT',
    avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
  }
];

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
  const institutions = [
    { name: '中国建设银行', rating: 'AAA', limit: 3000000000 },
    { name: '兴业基金', rating: 'AA+', limit: 1000000000 },
    { name: '招商证券', rating: 'AA', limit: 500000000 }
  ];

  const seeds = Array.from({ length: 12 }).map((_, i) => {
    const idx = i + 1;
    // Approver flow test data (last 4 items)
    if (i >= 8) {
       const inst = institutions[i % 3];
       const isHighRisk = i === 9; // Make one item high risk
       const amount = isHighRisk ? inst.limit + 100000000 : inst.limit * 0.8;
       const status = i === 11 ? 'disbursed' : 'reviewing'; // One done, others todo
       
       return {
         applicationId: `APP_APPR_${idx}`,
         approvalNo: `APR2026${String(200000 + idx).slice(-6)}`,
         applicantName: inst.name,
         approvedAmount: amountText(amount),
         amountValue: amount,
         status: status,
         statusText: STATUS_TEXT[status],
         activeStep: status === 'disbursed' ? 3 : 2,
         timeline: buildTimeline(status),
         type: 'CREDIT', // Default type
         // New fields for approver view
         creditRating: inst.rating,
         applyType: i % 2 === 0 ? '续作' : '新增',
         groupExposure: isHighRisk ? 8000000000 : 2000000000, // For concentration warning
         previousQuota: i % 2 === 0 ? {
            bill: inst.limit * 0.5,
            finance: inst.limit * 0.3,
            invest: inst.limit * 0.2,
            total: inst.limit
         } : null,
         quotaBreakdown: {
           bill: 0.8,
           finance: 0.15,
           invest: 0.05
         },
         assignee: 'u-admin', // Assign to current user
         applicantId: 'li-jianguo', // Assume Li submitted these
         auditHistory: [
            { stage: '提交申请', operator: '李建国', time: new Date(Date.now() - idx * 3600000).toISOString(), status: 'success', comment: '发起授信申请' }
         ]
       };
    }

    // Inject Whitelist Applications
    if (idx === 8) {
       return {
         applicationId: `APP_WL_${idx}`,
         approvalNo: `APR2026${String(300000 + idx).slice(-6)}`,
         applicantName: '某待准入基金公司',
         approvedAmount: '-',
         amountValue: 0,
         status: 'reviewing',
         statusText: '准入审批中',
         activeStep: 1,
         timeline: buildTimeline('reviewing'),
         type: 'WHITELIST',
         creditRating: 'AA',
         assignee: 'u-admin',
         applicantId: 'li-jianguo',
         auditHistory: [
            { stage: '提交申请', operator: '李建国', time: new Date().toISOString(), status: 'success', comment: '发起准入申请' }
         ]
       };
    }

    const status = statusDefs[idx % statusDefs.length];
    const amount = 300000 + idx * 52000;
    const applicationId = `APP2026${String(100000 + idx).slice(-6)}`;
    return {
      applicationId,
      approvalNo: `APR2026${String(100000 + idx).slice(-6)}`,
      applicantName: names[idx % 4],
      approvedAmount: amountText(amount),
      amountValue: amount,
      status: status.key,
      statusText: status.text,
      activeStep: status.step,
      timeline: buildTimeline(status.key),
      type: 'CREDIT',
      createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      applicantId: 'li-jianguo', // Default to Li
      auditHistory: [
         { stage: '提交申请', operator: '李建国', time: new Date(Date.now() - idx * 3600000).toISOString(), status: 'success', comment: '发起授信申请' }
      ]
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

const productTree = {
  bill: [
    { text: '银票承兑', value: 'P001' },
    { text: '银票贴现', value: 'P002' },
    { text: '商票保贴', value: 'P003' }
  ],
  finance: [
    { text: '同业拆借', value: 'F001' },
    { text: '同业借款', value: 'F002' },
    { text: '转贴现', value: 'F003' }
  ],
  invest: [
    { text: '同业理财', value: 'I001' },
    { text: '债券投资', value: 'I002' },
    { text: '基金投资', value: 'I003' }
  ]
};

const customersData = [
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
    id: 'C006',
    name: '东方商业银行总行',
    status: '生效',
    type: '银行金融机构',
    customerType: 'INSTITUTION',
    hasInProcess: false,
    hasValidQuota: true,
    existingLimit: 500000000,
    creditRating: 'AAA',
    previousQuota: {
      totalExposure: 500000000,
      selfRunExposure: 300000000,
      assetManageExposure: 200000000
    }
  },
  {
    id: 'C007',
    name: '南方证券股份有限公司',
    status: '生效',
    type: '非银行金融机构',
    customerType: 'INSTITUTION',
    hasInProcess: false,
    hasValidQuota: false,
    existingLimit: 0,
    creditRating: 'AA+',
    previousQuota: {
      totalExposure: 0,
      selfRunExposure: 0,
      assetManageExposure: 0
    }
  },
  {
    id: 'C008',
    name: '西部基金管理有限公司',
    status: '生效',
    type: '非银行金融机构',
    customerType: 'INSTITUTION',
    hasInProcess: false,
    hasValidQuota: true,
    existingLimit: 120000000,
    creditRating: 'AA',
    previousQuota: {
      totalExposure: 120000000,
      selfRunExposure: 80000000,
      assetManageExposure: 40000000
    }
  }
];

const approvalDictionary = {
  returnReasons: [
    { text: '材料不齐', value: 'R001' },
    { text: '行业投向不符', value: 'R002' },
    { text: '额度切分逻辑错误', value: 'R003' },
    { text: '风险缓释措施不足', value: 'R004' },
    { text: '其他', value: 'R999' }
  ],
  commonComments: [
    { text: '拟同意，请落实增信措施', value: 'C001' },
    { text: '建议加强贷后监控', value: 'C002' },
    { text: '同意报送', value: 'C003' },
    { text: '该机构信用良好，授信额度符合我行同业限额管理规定，拟同意。', value: 'C004' }
  ]
};

export const mockRequest = async ({ method, path, body, headers }) => {
  ensureSeedData();
  await sleep(rand(260, 620));

  const cleanPath = parsePath(path);

  if (method === 'GET' && cleanPath === '/api/dict/approval-comments') {
     const query = new URLSearchParams(path.split('?')[1] || '');
     const type = query.get('type');
     if (type === 'return') return approvalDictionary.returnReasons;
     return approvalDictionary.commonComments;
  }

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
    if (!user) throw jsonError(401, '账号或密码错误');

    const rolePrefix = user.role === 'APPLICANT' ? 'applicant-token-' : 'approver-token-';
    const menus = user.role === 'APPLICANT' 
      ? [{ title: '工作台', path: '/workbench' }, { title: '发起申请', path: '/apply' }] 
      : [{ title: '审批台', path: '/progress' }];

    return {
      accessToken: `${rolePrefix}${makeId('')}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      user: { 
        id: user.id, 
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        dept: user.dept,
        menus
      }
    };
  }

  const token = headers?.Authorization?.replace('Bearer ', '') || '';
  if (!token || (!token.startsWith('mock_token_') && !token.startsWith('applicant-token-') && !token.startsWith('approver-token-'))) {
    throw jsonError(401, '登录状态已失效');
  }

  if (method === 'GET' && cleanPath === '/api/user/summary') {
    // Determine user role from token for mock purposes
    // In real app, we decode token. Here we check prefix.
    const isApprover = token.startsWith('approver-token-');
    const rows = readApplications();

    if (isApprover) {
       const pending = rows.filter(r => r.status === 'reviewing' && r.assignee === 'u-admin').length;
       const highRisk = rows.filter(r => r.assignee === 'u-admin' && (r.amountValue > 3000000000 || r.creditRating?.includes('B'))).length;
       return { pendingCount: pending, highRiskCount: highRisk };
    } else {
       // Applicant summary
       const inProgress = rows.filter(r => ['reviewing', 'pending'].includes(r.status)).length;
       const returned = rows.filter(r => r.status === 'rejected').length; // Mock rejected as returned for simplicity
       return { inProgressCount: inProgress, returnedCount: returned };
    }
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
    if (payload.type === 'WHITELIST' || payload.type === 'WHITELIST_REVOKE') {
        const isRevoke = payload.type === 'WHITELIST_REVOKE';
        const applicationId = makeId(isRevoke ? 'APP_WL_REVOKE_' : 'APP_WL_');
        const row = {
            applicationId,
            approvalNo: `APR${Date.now().toString().slice(-10)}`,
            applicantName: payload.customerName, // For revoke, this might be passed or derived
            customerId: payload.idCard || payload.customerId, // Should support both
            approvedAmount: '-',
            amountValue: 0,
            status: 'reviewing',
            statusText: isRevoke ? '失效审批中' : '准入审批中',
            activeStep: 1,
            timeline: buildTimeline('reviewing'),
            type: payload.type,
            creditRating: payload.targetCreditLevel || 'AA',
            applyReason: payload.applyReason,
            createdAt: new Date().toISOString(),
            assignee: 'u-admin', 
            applicantId: 'li-jianguo',
            auditHistory: [
               { stage: '提交申请', operator: '李建国', time: new Date().toISOString(), status: 'success', comment: isRevoke ? '发起失效申请' : '发起准入申请' }
            ]
        };
        // For revoke, ensure we get name if only ID provided
        if (isRevoke && !row.applicantName && row.customerId) {
           const c = customersData.find(x => x.id === row.customerId);
           if (c) row.applicantName = c.name;
        }

        const rows = readApplications();
        rows.unshift(row);
        writeApplications(rows);
        
        return {
            applicationId,
            approvalNo: row.approvalNo,
            status: row.status
        };
    }

    if (!payload.customerName || !payload.idCard || (!payload.collateralValue && !payload.amount)) {
      throw jsonError(400, '\u7533\u8bf7\u4fe1\u606f\u4e0d\u5b8c\u6574');
    }
    if (!Array.isArray(payload.idCardFileIds) || payload.idCardFileIds.length === 0) {
      throw jsonError(400, '\u8bf7\u5148\u4e0a\u4f20\u8eab\u4efd\u8bc1\u5f71\u50cf');
    }

    const amount = payload.amount ? Number(payload.amount) : Number(payload.collateralValue) * 0.7;
    const status = pickStatus();
    const applicationId = makeId('APP_');
    const row = {
      applicationId,
      approvalNo: `APR${Date.now().toString().slice(-10)}`,
      applicantName: payload.customerName,
      customerId: payload.idCard, // Store Customer ID for linkage
      approvedAmount: amountText(amount),
      amountValue: amount,
      status: status.key,
      statusText: status.text,
      activeStep: status.step,
      timeline: buildTimeline(status.key),
      type: 'LOAN', // Explicitly set type for credit application
      createdAt: new Date().toISOString(),
      assignee: 'u-admin', // Auto-assign to approver
      applicantId: 'li-jianguo', // Default to Li
      auditHistory: [
         { stage: '提交申请', operator: '李建国', time: new Date().toISOString(), status: 'success', comment: '发起授信申请' }
      ]
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

  if (method === 'GET' && cleanPath === '/api/loan/products') {
    const query = new URLSearchParams(path.split('?')[1] || '');
    const category = query.get('category');
    return productTree[category] || [];
  }

  if (method === 'GET' && cleanPath === '/api/customer/search') {
    const query = new URLSearchParams(path.split('?')[1] || '');
    const keyword = (query.get('keyword') || '').trim();
    const status = (query.get('status') || '').trim();
    
    const list = customersData.filter((item) => {
      const keywordMatch = !keyword || item.name.includes(keyword) || item.id.includes(keyword);
      const statusMatch = !status || item.status === status;
      return keywordMatch && statusMatch;
    });

    return { list };
  }

  if (method === 'POST' && cleanPath === '/api/customer/invalidate') {
    const payload = body || {};
    const customerId = payload.customerId;
    const reason = payload.reason;

    if (!customerId) {
      throw jsonError(400, '缺少客户ID');
    }
    if (!reason) {
      throw jsonError(400, '必须填写失效原因');
    }

    const customer = customersData.find((c) => c.id === customerId);
    if (!customer) {
      throw jsonError(404, '未找到该客户');
    }

    if (customer.status === '失效') {
      throw jsonError(400, '该客户已处于失效状态');
    }

    customer.status = '失效';
    // 可以在这里添加一些日志或者副作用，比如冻结额度等
    customer.previousQuota = {
      totalExposure: 0,
      selfRunExposure: 0,
      assetManageExposure: 0
    };
    customer.hasValidQuota = false;

    return { success: true, message: '客户准入已失效' };
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

    if (totalExposure > 5000000000 || detailExposure > 3200000000) {
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

  if (method === 'POST' && cleanPath === '/api/loan/approve') {
    const payload = body || {};
    const { applicationId, action, reason } = payload;
    const rows = readApplications();
    const row = rows.find(r => r.applicationId === applicationId);
    
    if (!row) throw jsonError(404, '申请不存在');
    
    if (action === 'approve') {
       row.status = 'disbursed';
       // Check type
       if (row.type === 'WHITELIST') {
          row.statusText = '已准入';
          // Find customer and update status
          const customer = customersData.find(c => c.id === row.customerId || c.name === row.applicantName);
          if (customer) {
             customer.status = '生效';
             customer.hasValidQuota = true; // Also enable quota flag
          }
       } else if (row.type === 'WHITELIST_REVOKE') {
          row.statusText = '已失效';
          // Find customer and update status to Invalid
          const customer = customersData.find(c => c.id === row.customerId || c.name === row.applicantName);
          if (customer) {
             customer.status = '失效';
             customer.hasValidQuota = false;
             // Clear Quota
             if (customer.previousQuota) {
                customer.previousQuota.totalExposure = 0;
                customer.previousQuota.selfRunExposure = 0;
                customer.previousQuota.assetManageExposure = 0;
             }
          }
       } else {
          row.statusText = '已放款';
       }
       row.activeStep = 3;
       row.timeline.push({ title: '审批通过', time: new Date().toISOString() });
       row.auditHistory.push({ stage: '风险审批', operator: '张总', time: new Date().toISOString(), status: 'success', comment: '审批通过' });
    } else if (action === 'reject') {
       row.status = 'rejected';
       row.statusText = row.type === 'WHITELIST' ? '准入拒绝' : '已拒绝';
       row.timeline.push({ title: '审批拒绝', time: new Date().toISOString() });
       row.auditHistory.push({ stage: '风险审批', operator: '张总', time: new Date().toISOString(), status: 'error', comment: reason || '拒绝' });
    } else if (action === 'return') {
       row.status = 'returned'; // New status for return
       row.statusText = '已退回';
       row.returnReason = reason; // Store reason
       row.activeStep = 0; // Reset step
       row.timeline.push({ title: '退回补充材料', time: new Date().toISOString() });
       row.auditHistory.push({ stage: '风险审批', operator: '张总', time: new Date().toISOString(), status: 'warning', comment: reason || '退回' });
    }
    
    writeApplications(rows);
    return { success: true };
  }

  throw jsonError(404, `\u672a\u5339\u914d\u5230\u63a5\u53e3: ${method} ${cleanPath}`);
};
