import { computed, onUnmounted, ref } from 'vue';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function useCountUp(options = {}) {
  const duration = options.duration ?? 1200;
  const decimals = options.decimals ?? 0;
  const formatter = options.formatter;
  const easing = options.easing ?? easeOutCubic;

  const value = ref(0);
  let frameId = 0;

  const stop = () => {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };

  const start = (target = 0, from = 0) => {
    stop();

    const startValue = Number(from) || 0;
    const endValue = Number(target) || 0;
    const delta = endValue - startValue;
    const startTime = performance.now();
    value.value = startValue;

    const run = (now) => {
      const elapsed = now - startTime;
      const percent = Math.min(1, elapsed / duration);
      const current = startValue + delta * easing(percent);
      value.value = Number(current.toFixed(decimals));

      if (percent < 1) {
        frameId = requestAnimationFrame(run);
      } else {
        frameId = 0;
      }
    };

    frameId = requestAnimationFrame(run);
  };

  const displayValue = computed(() => {
    if (typeof formatter === 'function') {
      return formatter(value.value);
    }
    return Number(value.value).toFixed(decimals);
  });

  onUnmounted(stop);

  return {
    value,
    displayValue,
    start,
    stop
  };
}
