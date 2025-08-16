// 声明全局 window 对象上的 SillyTavern 属性
interface Window {
  SillyTavern?: {
    executeSlashCommands: (command: string) => Promise<any>;
    getContext?: () => any;
  };
}