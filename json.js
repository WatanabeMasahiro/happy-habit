export const newsData = {
  "settings": {
    "year": 2026,
    "month": 4,
    "categories": [
      {
        "id": "cat_morning",
        "name": "朝",
        "color": "#fff9c4",
        "items": [
          {"id": "item_1", "name": "早起き：定時に起きれた"},
          {"id": "item_2", "name": "朝ごはんを食べられた"},
          {"id": "item_3", "name": "ストレッチができた"}
        ]
      },
      {
        "id": "cat_noon",
        "name": "昼",
        "color": "#c8e6c9",
        "items": [
          {"id": "item_4", "name": "散歩に行けた"}
        ]
      },
      {
        "id": "cat_none",
        "name": "その他",
        "color": "#f5f5f5",
        "items": [
          {"id": "item_extra", "name": "パニックにならなかった"}
        ]
      }
    ]
  },
  "logs": {
    "2026-04-01": {
      "item_1": true,
      "item_2": false,
      "item_extra": true
    },
    "2026-04-02": {
      "item_1": true
    }
  }
}