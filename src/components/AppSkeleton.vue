<template>
  <div class="skeleton-page">
    <div class="bg-shape bg-shape-a"></div>
    <div class="bg-shape bg-shape-b"></div>
    <main class="content">
      <section class="panel">
        <div class="sk sk-title"></div>
        <div class="sk sk-sub"></div>
        <div class="sk sk-row"></div>
        <div class="sk sk-row"></div>
        <div class="sk sk-row"></div>
        <div class="sk sk-card"></div>
        <div class="sk sk-btn"></div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.skeleton-page {
  min-height: 100vh;
  background: radial-gradient(160% 80% at 20% 15%, #d8e7ff 0%, transparent 55%),
    radial-gradient(120% 70% at 90% 80%, #d8f3eb 0%, transparent 60%), #edf3fa;
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
}

.panel {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(15px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  padding: 16px 12px;
}

.sk {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(133, 150, 173, 0.2);
  margin-bottom: 12px;
}

.sk::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: shimmer 1.2s infinite;
}

.sk-title {
  width: 56%;
  height: 26px;
}

.sk-sub {
  width: 74%;
  height: 16px;
}

.sk-row {
  width: 100%;
  height: 54px;
}

.sk-card {
  width: 100%;
  height: 120px;
}

.sk-btn {
  width: 100%;
  height: 48px;
  border-radius: 999px;
  margin-top: 6px;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
