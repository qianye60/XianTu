$(() => {
  replaceScriptButtons([{ name: '晚上好', visible: true }]);

  eventOn(getButtonEvent('晚上好'), () => {
    toastr.warning('晚安, 络络');
  });
});
