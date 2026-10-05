// AsyncStorage 2.x 在找不到原生模組時 import 就會丟錯（3.x 不會），
// 間接引用到 storage 的測試因此全部跑不起來。這裡掛官方的記憶體版 mock；
// 測試檔自己的 jest.mock 會覆蓋它。
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
