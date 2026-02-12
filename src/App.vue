<template>
  <router-view />
  <div
    class="gesture-feedback"
    :class="[`side-${indicatorSide}`, { visible: indicatorVisible }]"
    :style="indicatorStyle"
    aria-hidden="true"
  >
    <div class="gesture-badge">
      <span class="gesture-arrow">{{ indicatorSide === 'left' ? '<' : '>' }}</span>
    </div>
  </div>
  <Watermark />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Watermark from './components/Watermark.vue';

const EDGE_SIZE = 30;
const TRIGGER_X = 80;
const TRIGGER_Y = 30;

const router = useRouter();
const route = useRoute();

const trackingEdge = ref(null);
const indicatorVisible = ref(false);
const indicatorProgress = ref(0);
const listenerOptions = { passive: true };

let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

const indicatorSide = computed(() => trackingEdge.value || 'left');
const indicatorStyle = computed(() => ({
  '--gesture-progress': String(indicatorProgress.value)
}));

const isDashboardRoute = () => route.path === '/workbench' || route.path === '/';

const resetGesture = () => {
  trackingEdge.value = null;
  indicatorVisible.value = false;
  indicatorProgress.value = 0;
  startX = 0;
  startY = 0;
  currentX = 0;
  currentY = 0;
};

const onTouchStart = (event) => {
  if (!event.touches || event.touches.length !== 1) return;

  const touch = event.touches[0];
  const width = window.innerWidth || document.documentElement.clientWidth;
  const x = touch.clientX;

  if (x <= EDGE_SIZE) {
    trackingEdge.value = 'left';
  } else if (x >= width - EDGE_SIZE) {
    trackingEdge.value = 'right';
  } else {
    resetGesture();
    return;
  }

  startX = x;
  startY = touch.clientY;
  currentX = x;
  currentY = touch.clientY;
  indicatorProgress.value = 0;
  indicatorVisible.value = true;
};

const onTouchMove = (event) => {
  if (!trackingEdge.value || !event.touches || event.touches.length !== 1) return;

  const touch = event.touches[0];
  currentX = touch.clientX;
  currentY = touch.clientY;

  const deltaX = currentX - startX;
  if (trackingEdge.value === 'left') {
    indicatorProgress.value = Math.max(0, Math.min(1, deltaX / TRIGGER_X));
    return;
  }
  indicatorProgress.value = Math.max(0, Math.min(1, -deltaX / TRIGGER_X));
};

const onTouchEnd = (event) => {
  if (!trackingEdge.value) return;

  const changedTouch = event.changedTouches && event.changedTouches[0];
  const endX = changedTouch ? changedTouch.clientX : currentX;
  const endY = changedTouch ? changedTouch.clientY : currentY;
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  let shouldBack = false;
  if (trackingEdge.value === 'left') {
    shouldBack = deltaX > TRIGGER_X && Math.abs(deltaY) < TRIGGER_Y;
  }
  if (trackingEdge.value === 'right') {
    shouldBack = deltaX < -TRIGGER_X;
  }

  if (shouldBack && !isDashboardRoute()) {
    router.back();
  }

  resetGesture();
};

onMounted(() => {
  window.addEventListener('touchstart', onTouchStart, listenerOptions);
  window.addEventListener('touchmove', onTouchMove, listenerOptions);
  window.addEventListener('touchend', onTouchEnd, listenerOptions);
  window.addEventListener('touchcancel', resetGesture, listenerOptions);
});

onUnmounted(() => {
  window.removeEventListener('touchstart', onTouchStart, listenerOptions);
  window.removeEventListener('touchmove', onTouchMove, listenerOptions);
  window.removeEventListener('touchend', onTouchEnd, listenerOptions);
  window.removeEventListener('touchcancel', resetGesture, listenerOptions);
});
</script>

<style scoped>
.gesture-feedback {
  position: fixed;
  top: 50%;
  pointer-events: none;
  z-index: 9000;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity 120ms ease;
}

.gesture-feedback.visible {
  opacity: 1;
}

.side-left {
  left: 0;
}

.side-right {
  right: 0;
}

.gesture-badge {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 118, 110, 0.24);
  box-shadow: 0 4px 18px rgba(15, 118, 110, 0.2);
  backdrop-filter: blur(6px);
  transition: transform 90ms linear, background-color 120ms ease;
}

.side-left .gesture-badge {
  border-radius: 0 28px 28px 0;
  transform: translateX(calc((-1 + var(--gesture-progress)) * 30px));
}

.side-right .gesture-badge {
  border-radius: 28px 0 0 28px;
  transform: translateX(calc((1 - var(--gesture-progress)) * 30px));
}

.gesture-arrow {
  font-size: 30px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  font-weight: 700;
}
</style>
