import { ref } from 'vue'

export function useCaptcha() {
  const captchaText = ref('')
  const captchaInput = ref('')
  const isCaptchaValid = ref(false)

  const generateCaptcha = (length = 4) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    captchaText.value = result
    captchaInput.value = '' // Clear previous input
    isCaptchaValid.value = false
  }

  const validateCaptcha = () => {
    isCaptchaValid.value = captchaInput.value.toLowerCase() === captchaText.value.toLowerCase()
    return isCaptchaValid.value
  }

  return {
    captchaText,
    captchaInput,
    isCaptchaValid,
    generateCaptcha,
    validateCaptcha,
  }
}
