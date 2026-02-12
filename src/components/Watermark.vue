<template>
  <div class="watermark-layer" aria-hidden="true">
    <div class="watermark-grid">
      <span v-for="index in markCount" :key="index" class="watermark-item">
        Li Jianguo | 2026-02-12
      </span>
    </div>
  </div>
</template>

<script setup>
const markCount = 64;
</script>

<style scoped>
.watermark-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.watermark-grid {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  transform: rotate(-25deg);
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  align-content: space-around;
  justify-items: center;
  opacity: 0.12;
}

.watermark-item {
  color: #0f766e;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
  white-space: nowrap;
  user-select: none;
}

@media (max-width: 768px) {
  .watermark-grid {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }

  .watermark-item {
    font-size: 12px;
  }
}
</style>
