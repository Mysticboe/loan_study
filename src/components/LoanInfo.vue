<template>
  <van-cell-group inset title="申请人基本信息">
    <van-field v-model="modelValue.customerName" label="客户姓名" placeholder="请输入姓名" />
    
    <van-field 
  v-model="displayIdCard" 
  label="身份证号" 
  placeholder="请输入身份证号"
  :rules="[{ validator: validateIdCard, message: '请输入18位合法身份证号' }]"
  @focus="isEditing = true"
  @blur="isEditing = false"
/>
<van-field 
  v-model="modelValue.birthDate" 
  label="出生日期" 
  readonly 
  placeholder="系统根据身份证自动解析"
/>
  </van-cell-group>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// 1. 修正：必须接收 defineProps 的返回值，计算属性才能访问到数据
const props = defineProps({
  modelValue: Object,
});

const isEditing = ref(false); 

// 2. 核心：displayIdCard 负责“拦截”和“加工”展示值
const displayIdCard = computed({
  get: () => {
    // 逻辑：编辑时显示明文，平时显示脱敏星号
    if (isEditing.value) {
      return props.modelValue.idCard;
    }
    return formatIdCard(props.modelValue.idCard);
  },
  set: (val) => {
    // 将用户输入的值同步回原始的 reactive 对象
    props.modelValue.idCard = val;
  }
});

const formatIdCard = (id) => {
  if (!id || id.length < 18) return id;
  // 保留前6后4，中间8位星号
  return id.slice(0, 6) + '********' + id.slice(14, 18);
};

const normalizeIdCard = (id) => String(id || '').trim().toUpperCase();

const parseBirthDateFromIdCard = (id) => {
  const actualId = normalizeIdCard(id);
  const reg = /^\d{17}(\d|X)$/i;
  if (!reg.test(actualId)) return '';
  const year = actualId.slice(6, 10);
  const month = actualId.slice(10, 12);
  const day = actualId.slice(12, 14);
  return `${year}-${month}-${day}`;
};

const validateIdCard = () => {
  const actualId = normalizeIdCard(props.modelValue.idCard);
  const reg = /^\d{17}(\d|X)$/i;
  return reg.test(actualId);
};

watch(
  () => props.modelValue.idCard,
  (newId) => {
    props.modelValue.birthDate = parseBirthDateFromIdCard(newId);
  },
  { immediate: true }
);
</script>
