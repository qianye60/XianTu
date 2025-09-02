eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => {
  toastr.error(`谁让你动我第 ${message_id} 楼消息的😡`, `干什么!`);
});
