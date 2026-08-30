export interface BrowserStorageInterface {
  'getItem': (key: string) => string | null;
  'removeItem': (key: string) => void;
  'setItem': (key: string, value: string) => void;
}
