// 在界面加载好后执行某个函数
// 注意: 必须使用 `$()` 而不是 `document.addEventListener('DOMContentLoaded'`, 后者会让实时修改失效
$(() => {
  toastr.success('你已经成功加载界面!', '恭喜你!');
});

// 在界面卸载时执行某个函数
$(window).on('pagehide', () => {
  toastr.info('你已经卸载界面!', '再见!');
});
