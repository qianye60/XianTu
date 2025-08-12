<template>
  <div class="lingqi-ju-long">
    <div class="lingqi-core"></div>
    <div class="lingqi-trail trail-1"></div>
    <div class="lingqi-trail trail-2"></div>
    <div class="lingqi-trail trail-3"></div>
  </div>
</template>

<style scoped>
.lingqi-ju-long {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  transform-style: preserve-3d;
  animation: rotate-base 8s linear infinite;
}

@keyframes rotate-base {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.lingqi-core {
  width: 20px;
  height: 20px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 0 10px #fff, 0 0 20px #8c734a, 0 0 30px #b85b5b;
  animation: pulse-core 2s ease-in-out infinite;
}

@keyframes pulse-core {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.lingqi-trail {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-radius: 50%;
  border-top-color: #8c734a; /* 暗金 */
  opacity: 0.8;
}

.trail-1 {
  animation: rotate-trail 1.5s linear infinite;
}

.trail-2 {
  transform: scale(0.8) rotate(45deg);
  border-top-color: #b85b5b; /* 朱砂红 */
  animation: rotate-trail 2s linear infinite reverse;
}

.trail-3 {
  transform: scale(0.6) rotate(-45deg);
  border-top-color: #6b8e23; /* 青玉色 */
  animation: rotate-trail 2.5s linear infinite;
}

@keyframes rotate-trail {
  from {
    transform: rotate(0deg) scale(1);
  }
  to {
    transform: rotate(360deg) scale(1);
  }
}
</style>