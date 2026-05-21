// ==========================================
// 初期データ定義 & ヘルパー (Exported)
// ==========================================

export const formatDateComponent = (num) => String(num).padStart(2, '0');

const now = new Date();
const todayKey = `${now.getFullYear()}-${formatDateComponent(now.getMonth() + 1)}-${formatDateComponent(now.getDate())}`;

export const initialSettings = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  categories: [
    {
      id: "cat_sample", 
      name: "例)健康習慣", 
      color: "#c8e6c9",
      items: [
        { id: "item_sample", name: "例)コップ1杯の水を飲む" }
      ]
    }
  ]
};

export const initialLogs = {
  [todayKey]: {
    "item_sample": { status: true, memo: "サンプル記録です" }
  }
};