// IndexedDB 存储工具 - 用于持久化存储用户数据

const DB_NAME = 'KOL_BI_Database';
const DB_VERSION = 1;
const STORE_NAME = 'user_data';

// 打开数据库
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
  });
}

// 用户数据接口
export interface UserStoredData {
  userId: string;
  rawData: any[];
  fileName: string;
  filters: any;
  filterChoices: any;
  uploadTime: string;
}

// 保存用户数据
export async function saveUserData(userId: string, data: Omit<UserStoredData, 'userId'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put({
      userId,
      ...data
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 获取用户数据
export async function getUserData(userId: string): Promise<UserStoredData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(userId);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// 删除用户数据
export async function deleteUserData(userId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(userId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 检查是否有存储的数据
export async function hasUserData(userId: string): Promise<boolean> {
  const data = await getUserData(userId);
  return data !== null && data.rawData && data.rawData.length > 0;
}
