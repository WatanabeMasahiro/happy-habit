// ==========================================
// 1. 初期データ定義 & ヘルパー
// ==========================================
const now = new Date();
const formatDateComponent = (num) => String(num).padStart(2, '0');

const todayKey = `${now.getFullYear()}-${formatDateComponent(now.getMonth() + 1)}-${formatDateComponent(now.getDate())}`;

const initialSettings = {
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

const initialLogs = {
  [todayKey]: {
    "item_sample": { status: true, memo: "サンプル記録です" }
  }
};

// ==========================================
// 2. メインアプリケーションクラス
// ==========================================
class HabitTracker {
  constructor(initialSettings, initialLogs = {}) {
    this.settings = JSON.parse(localStorage.getItem('habit_settings')) ?? initialSettings;
    this.logs = JSON.parse(localStorage.getItem('habit_logs')) ?? initialLogs;
    this.memos = JSON.parse(localStorage.getItem('habit_memos')) ?? {};
    
    // 編集中のステート管理
    this.currentEditingItemId = null;
    this.currentEditingCatId = null;
    this.editingMemoKey = null;
    
    this.init();
  }

  init() {
    this.renderHeader();
    this.renderMatrix();
    this.bindEvents();
  }

  // ------------------------------------------
  // データ永続化 (Storage)
  // ------------------------------------------
  saveSettings() {
    localStorage.setItem('habit_settings', JSON.stringify(this.settings));
  }

  saveLogs() {
    localStorage.setItem('habit_logs', JSON.stringify(this.logs));
  }

  saveMemos() {
    localStorage.setItem('habit_memos', JSON.stringify(this.memos));
  }

  // ------------------------------------------
  // レンダリング (DOM Generation)
  // ------------------------------------------
  renderHeader() {
    const { year, month } = this.settings;
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    
    // 年月表示の更新
    const currentYearMonthDisplay = document.getElementById('currentYearMonthDisplay');
    const yearMonthInput = document.getElementById('currentYearMonth');
    const currentYearDisplay = document.getElementById('currentYearDisplay');

    if (currentYearMonthDisplay) currentYearMonthDisplay.textContent = `${year}年-${month}月`;
    if (yearMonthInput) yearMonthInput.value = `${year}-${formatDateComponent(month)}`;
    if (currentYearDisplay) currentYearDisplay.textContent = `${year}年`;

    // ヘッダー行の生成
    const headerRow = document.getElementById('dateHeader');
    let html = `<th class="sticky-col memo-trigger" data-memo-type="monthly">${month}月</th>`;
    
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (
        year === today.getFullYear() && 
        month === (today.getMonth() + 1) && 
        d === today.getDate()
      );
      const dateStr = `${year}-${formatDateComponent(month)}-${formatDateComponent(d)}`;
      html += `<th class="${isToday ? 'is-today' : ''} memo-trigger" data-memo-type="daily" data-date="${dateStr}">${d}</th>`;
    }
    headerRow.innerHTML = html;
  }

  renderMatrix() {
    const { year, month } = this.settings;
    const daysInMonth = new Date(year, month, 0).getDate();
    const body = document.getElementById('trackerBody');
    let html = '';

    this.settings.categories.forEach(cat => {
      // カテゴリ行
      html += `
        <tr class="category-row" style="--cat-color: ${cat.color}">
            <td class="sticky-col category-title" data-cat-id="${cat.id}">
              <span class="title">${cat.name}</span>
              <button class="add-item-btn" data-cat-id="${cat.id}">＋</button>
            </td>
            <td colspan="${daysInMonth}"></td>
        </tr>`;

      // TODO項目行
      cat.items.forEach(item => {
        html += `<tr>
                  <td class="sticky-col" data-item-id="${item.id}" data-cat-id="${cat.id}">${item.name}</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${year}-${formatDateComponent(month)}-${formatDateComponent(d)}`;
          const logEntry = this.logs?.[dateKey]?.[item.id];
          const status = (logEntry && typeof logEntry === 'object') ? logEntry.status : (logEntry ?? 'none');
          html += `<td>
                    <div 
                      class="cell-btn"
                      data-date="${dateKey}"
                      data-item="${item.id}"
                      data-status="${status}">
                    </div>
                  </td>`;
        }
        html += `</tr>`;
      });
    });
    body.innerHTML = html;
  }

  // ------------------------------------------
  // イベントリスナー一元管理 (Event Binding)
  // ------------------------------------------
  bindEvents() {
    this.setupTableEvents();
    this.setupDialogSubmitEvents();
    this.setupNavigationEvents();
    this.setupGlobalModalControls();
  }

  // テーブル（メインマトリックス）内のクリックイベント
  setupTableEvents() {
    document.getElementById('trackerBody').addEventListener('click', (e) => {
      // 日付マスのクリック
      if (e.target.classList.contains('cell-btn')) {
        this.openEditDialog(e.target);
        return;
      }

      // 新規リスト項目（TODO）追加ボタンのクリック
      if (e.target.classList.contains('add-item-btn')) {
        this.currentEditingCatId = e.target.dataset.catId;
        document.getElementById('addItemName').value = '';
        document.getElementById('additemDialog').showModal();
        return;
      }

      // 各行左側の項目名（sticky-col）のクリック
      const targetTd = e.target.closest('.sticky-col');
      if (!targetTd) return;

      if (targetTd.parentElement.classList.contains('category-row')) {
        this.openCategoryEditDialog(targetTd);
      } else {
        this.openItemEditDialog(targetTd);
      }
    });

    // カテゴリの新規追加ボタン
    const addCatBtn = document.querySelector('.add-category-item-btn');
    if (addCatBtn) {
      addCatBtn.onclick = () => {
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryColor').value = '#c8e6c9'; 
        document.getElementById('addCategoryDialog').showModal();
      };
    }

    // 全データリセットボタン
    const dataResetBtn = document.querySelector('.all-data-reset-btn');
    if (dataResetBtn) {
      dataResetBtn.onclick = () => {
        document.getElementById('resetText').value = '';
        document.getElementById('resetData').disabled = true;
        document.getElementById('allDataResetDialog').showModal();
      };
    }

    // 全データ削除のバリデーション文言監視
    document.getElementById('resetText').addEventListener('input', (e) => {
      document.getElementById('resetData').disabled = (e.target.value !== "すべて削除");
    });

    // 4階層メモのトリガー（ドキュメント全体で監視）
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.memo-trigger');
      if (trigger) {
        this.openMemoModal(trigger.dataset.memoType, trigger.dataset.date);
      }
    });
  }

  // 各種ダイアログ内の「保存・追加・移動」などのアクションイベント（1回だけ登録）
  setupDialogSubmitEvents() {
    // マス目ステータス保存
    document.getElementById('saveStatus').onclick = (e) => {
      e.preventDefault();
      const dialog = document.getElementById('statusDialog');
      const selectedStatus = dialog.querySelector('input[name="status"]:checked').value;
      const memo = document.getElementById('memoArea').value;
      const { date, item } = dialog.dataset; // ダイアログ自体に持たせたdatasetから安全に取得
      this.updateLog(date, item, selectedStatus, memo);
      dialog.close();
    };

    // カテゴリ追加
    document.getElementById('saveCategory').onclick = () => this.handleCreateCategory();

    // カテゴリ編集保存
    document.getElementById('saveCategoryEdit').onclick = () => {
      const category = this.settings.categories.find(c => c.id === this.currentEditingCatId);
      const newCategoryName = document.getElementById('editCategoryName').value;
      const newCategoryColor = document.getElementById('categoryColorEdit').value;
      if (category && newCategoryName) {
        category.name = newCategoryName;
        category.color = newCategoryColor;
        this.saveSettings();
        this.renderMatrix();
        document.getElementById('categoryEditDialog').close();
      }
    };

    // カテゴリ移動・削除
    document.getElementById('categoryMoveUpBtn').onclick = () => this.moveCategory('catUp');
    document.getElementById('categoryMoveDownBtn').onclick = () => this.moveCategory('catDown');
    document.getElementById('deleteCategoryBtn').onclick = () => this.handleDeleteCategory();

    // リスト項目（TODO）追加・編集保存
    document.getElementById('saveItemAdd').onclick = () => this.handleCreateItem();
    document.getElementById('saveItemEdit').onclick = () => {
      const newName = document.getElementById('editItemName').value;
      if (newName) {
        this.saveItemName(this.currentEditingItemId, newName);
        document.getElementById('itemEditDialog').close();
      }
    };

    // リスト項目移動・削除
    document.getElementById('moveUpBtn').onclick = () => this.moveItem('up');
    document.getElementById('moveDownBtn').onclick = () => this.moveItem('down');
    document.getElementById('deleteItemBtn').onclick = () => this.handleDeleteItem();

    // 全リセット実行
    document.getElementById('resetData').onclick = () => this.resetAllData();

    // 共通メモ保存
    document.getElementById('saveMemo').onclick = () => this.saveMemoData();
  }

  // カレンダー切り替え・ナビゲーション
  setupNavigationEvents() {
    document.getElementById('prevMonth').onclick = () => this.changeMonth(-1);
    document.getElementById('nextMonth').onclick = () => this.changeMonth(1);

    const yearMonthInput = document.getElementById('currentYearMonth');
    if (yearMonthInput) {
      yearMonthInput.addEventListener('change', (e) => {
        const value = e.target.value;
        if (!value) return;
        const [year, month] = value.split('-').map(Number);
        this.updateCalendarView(year, month);
      });
    }
  }

  // 全ダイアログ共通の閉じる振る舞い（背景クリック、Xボタン）
  setupGlobalModalControls() {
    const modals = document.querySelectorAll('dialog');
    const bodyContent = document.querySelector('body');
    
    modals.forEach(modal => {
      modal.addEventListener('close', () => {
        bodyContent.style.overflow = 'visible';
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
      });
      const closeBtn = modal.querySelector('.modal-close-icon-button');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
      }
    });
  }

  // ------------------------------------------
  // 各ダイアログの表示処理 (Modal Openers)
  // ------------------------------------------
  openEditDialog(target) {
    const { date, item } = target.dataset;
    const dialog = document.getElementById('statusDialog');
    dialog.dataset.date = date;
    dialog.dataset.item = item;

    const selectDayDisplay = document.getElementById('selectDayInStatusDialog');
    if (selectDayDisplay) selectDayDisplay.textContent = `${date.replaceAll('-', '/')}`;

    const logEntry = this.logs[date]?.[item];
    const currentStatus = (logEntry && typeof logEntry === 'object') ? String(logEntry.status) : String(logEntry ?? 'none');
    const currentMemo = logEntry?.memo || "";

    const radio = dialog.querySelector(`input[name="status"][value="${currentStatus}"]`);
    if (radio) radio.checked = true;
    document.getElementById('memoArea').value = currentMemo;

    dialog.showModal();
  }

  openCategoryEditDialog(target) {
    const { catId } = target.dataset;
    this.currentEditingCatId = catId;

    const dialog = document.getElementById('categoryEditDialog');
    const category = this.settings.categories.find(c => c.id === catId);
    if (!category) return;

    document.getElementById('editCategoryName').value = category.name;
    document.getElementById('categoryColorEdit').value = category.color || '#c8e6c9';

    this.updateCategoryOrderDisplay();
    dialog.showModal();
  }

  updateCategoryOrderDisplay() {
    const idx = this.settings.categories.findIndex(c => c.id === this.currentEditingCatId);
    const totalCats = this.settings.categories.length;
    document.getElementById('categoryOrderDisplay').textContent = `（${idx + 1}番目 / ${totalCats}項目中）`;
  }

  openItemEditDialog(target) {
    const { itemId, catId } = target.dataset;
    this.currentEditingItemId = itemId;
    this.currentEditingCatId = catId;

    const dialog = document.getElementById('itemEditDialog');
    const category = this.settings.categories.find(c => c.id === catId);
    const item = category.items.find(i => i.id === itemId);

    const catDisplay = document.getElementById('displayCatName');
    if (catDisplay) catDisplay.innerText = `${category.name}`;
    document.getElementById('editItemName').value = item.name;

    this.updateItemOrderDisplay(category);
    dialog.showModal();
  }

  updateItemOrderDisplay(category) {
    const idx = category.items.findIndex(i => i.id === this.currentEditingItemId);
    const totalItems = category.items.length;
    document.getElementById('orderDisplay').textContent = `（${idx + 1}番目 / ${totalItems}項目中）`;
  }

  openMemoModal(type, date) {
    const { year, month } = this.settings;
    let storageKey = '';
    let labelText = '';

    switch (type) {
      case 'global':
        storageKey = 'global';
        labelText = '「全体」のメモ';
        break;
      case 'yearly':
        storageKey = `year-${year}`;
        labelText = `「${year}年」のメモ`;
        break;
      case 'monthly':
        storageKey = `month-${year}-${month}`;
        labelText = `「${year}年 ${month}月」のメモ`;
        break;
      case 'daily':
        storageKey = `day-${date}`;
        labelText = `「${date.replaceAll('-', '/')}」のメモ`;
        break;
    }

    this.editingMemoKey = storageKey;

    const dialog = document.getElementById('memosCommonDialog');
    const label = dialog.querySelector('label[for="memoInput"]');
    const textarea = document.getElementById('memoInput');

    label.textContent = `↓ ${labelText} ↓`;
    textarea.value = this.memos[storageKey] || '';

    dialog.showModal();
  }

  // ------------------------------------------
  // ビジネスロジック・データ操作 (Handlers & Logics)
  // ------------------------------------------
  updateLog(date, itemId, status, memo) {
    if (!this.logs[date]) this.logs[date] = {};
    this.logs[date][itemId] = {
      status: (status === 'none') ? undefined : (status === 'true'),
      memo: memo
    };
    this.saveLogs();
    this.renderMatrix();
  }

  moveCategory(direction) {
    const idx = this.settings.categories.findIndex(c => c.id === this.currentEditingCatId);
    const targetIdx = direction === 'catUp' ? idx - 1 : idx + 1;

    if (targetIdx >= 0 && targetIdx < this.settings.categories.length) {
      [this.settings.categories[idx], this.settings.categories[targetIdx]] = [this.settings.categories[targetIdx], this.settings.categories[idx]];
      this.saveSettings();
      this.renderMatrix();
      this.updateCategoryOrderDisplay();
    }
  }

  handleDeleteCategory() {
    const category = this.settings.categories.find(c => c.id === this.currentEditingCatId);
    if (!category) return;

    if (window.confirm(`カテゴリ「${category.name}」を削除してもよろしいですか？\n※カテゴリ内の項目もすべて削除されます。`)) {
      const itemIdsToRemove = category.items.map(item => item.id);
      Object.keys(this.logs).forEach(dateKey => {
        itemIdsToRemove.forEach(itemId => {
          if (this.logs[dateKey][itemId] !== undefined) {
            delete this.logs[dateKey][itemId];
          }
        });
        if (Object.keys(this.logs[dateKey]).length === 0) {
          delete this.logs[dateKey];
        }
      });
      this.settings.categories = this.settings.categories.filter(c => c.id !== this.currentEditingCatId);
      this.saveSettings();
      this.saveLogs();
      this.renderMatrix();
      document.getElementById('categoryEditDialog').close();
    }
  }

  saveItemName(itemId, newName) {
    this.settings.categories.forEach(cat => {
      const item = cat.items.find(i => i.id === itemId);
      if (item) item.name = newName;
    });
    this.saveSettings();
    this.renderMatrix();
  }

  moveItem(direction) {
    const cat = this.settings.categories.find(c => c.id === this.currentEditingCatId);
    if (!cat) return;

    const idx = cat.items.findIndex(i => i.id === this.currentEditingItemId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (targetIdx >= 0 && targetIdx < cat.items.length) {
      [cat.items[idx], cat.items[targetIdx]] = [cat.items[targetIdx], cat.items[idx]];
      this.saveSettings();
      this.renderMatrix();
      this.updateItemOrderDisplay(cat);
    }
  }

  handleDeleteItem() {
    const cat = this.settings.categories.find(c => c.id === this.currentEditingCatId);
    const item = cat?.items.find(i => i.id === this.currentEditingItemId);
    if (!cat || !item) return;

    if (window.confirm(`「${item.name}」を削除してもよろしいですか？\n※過去の記録も完全に削除されます。`)) {
      const targetItemId = this.currentEditingItemId;
      Object.keys(this.logs).forEach(dateKey => {
        if (this.logs[dateKey][targetItemId] !== undefined) {
          delete this.logs[dateKey][targetItemId];
        }
        if (Object.keys(this.logs[dateKey]).length === 0) {
          delete this.logs[dateKey];
        }
      });
      cat.items = cat.items.filter(i => i.id !== targetItemId);
      this.saveSettings();
      this.saveLogs();
      this.renderMatrix();
      document.getElementById('itemEditDialog').close();
    }
  }

  handleCreateCategory() {
    const nameInput = document.getElementById('categoryName');
    const colorInput = document.getElementById('categoryColor');
    const name = nameInput.value.trim();

    if (!name) {
      alert("カテゴリ名を入力してください");
      return;
    }

    this.settings.categories.push({
      id: `cat_${Date.now()}`,
      name: name,
      color: colorInput.value,
      items: []
    });
    this.saveSettings();
    this.renderMatrix();
    document.getElementById('addCategoryDialog').close();
  }

  handleCreateItem() {
    const nameInput = document.getElementById('addItemName');
    const name = nameInput.value.trim();

    if (!name) {
      alert("項目名を入力してください");
      return;
    }

    const category = this.settings.categories.find(c => c.id === this.currentEditingCatId);
    if (category) {
      category.items.push({
        id: `item_${Date.now()}`,
        name: name
      });
      this.saveSettings();
      this.renderMatrix();
      document.getElementById('additemDialog').close();
    }
  }

  saveMemoData() {
    if (!this.editingMemoKey) return;
    const updatedText = document.getElementById('memoInput').value.trim();

    if (updatedText === '') {
      delete this.memos[this.editingMemoKey];
    } else {
      this.memos[this.editingMemoKey] = updatedText;
    }

    this.saveMemos();
    this.editingMemoKey = null;
    document.getElementById('memosCommonDialog').close();
  }

  changeMonth(offset) {
    this.settings.month += offset;
    if (this.settings.month > 12) {
      this.settings.month = 1;
      this.settings.year++;
    } else if (this.settings.month < 1) {
      this.settings.month = 12;
      this.settings.year--;
    }
    this.saveSettings();
    this.renderHeader();
    this.renderMatrix();
  }

  updateCalendarView(year, month) {
    this.settings.year = year;
    this.settings.month = month;
    this.saveSettings();
    this.renderHeader();
    this.renderMatrix();
  }

  resetAllData() {
    if (!confirm("本当にすべてのデータを削除してもよろしいですか？")) return;
    localStorage.removeItem('habit_settings');
    localStorage.removeItem('habit_logs');
    localStorage.removeItem('habit_memos');
    location.reload();
  }
}

// ==========================================
// 3. アプリケーション起動
// ==========================================
const app = new HabitTracker(initialSettings, initialLogs);