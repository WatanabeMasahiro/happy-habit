// 初期データ定義 (本来は外部JSONから取得する想定)
const now = new Date();
const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

class HabitTracker {
  constructor(initialSettings, initialLogs = {}) {
    this.settings = JSON.parse(localStorage.getItem('habit_settings')) ?? initialSettings;
    this.logs = JSON.parse(localStorage.getItem('habit_logs')) ?? initialLogs;
    this.memos = JSON.parse(localStorage.getItem('habit_memos')) ?? {};
    this.currentEditingItemId = null;
    this.currentEditingCatId = null;
    this.editingMemoKey = null;
    this.init();
  }

  saveSettings() {
    localStorage.setItem('habit_settings', JSON.stringify(this.settings));
  }

  init() {
    this.renderHeader();
    this.renderMatrix();
    this.bindEvents();
  }

  // カレンダーの列（1日〜末日）を生成
  renderHeader() {
    const { year, month } = this.settings;
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    // カレンダー上外の年月の表示更新（currentYearMonthDisplay）
    const currentYearMonthDisplay = document.getElementById('currentYearMonthDisplay');
    const yearMonthInput = document.getElementById('currentYearMonth');
    if (currentYearMonthDisplay) {
      currentYearMonthDisplay.textContent = `${year}年-${month}月`;
    }
    if (yearMonthInput) {  // ツールチップ内の年月フォームの表示更新
      const formattedMonth = String(month).padStart(2, '0');
      yearMonthInput.value = `${year}-${formattedMonth}`;
    }
    // カレンダー上内の年の表示更新（currentYearDisplay）
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    if (currentYearDisplay) {
      currentYearDisplay.textContent = `${year}年`;
    }
    const headerRow = document.getElementById('dateHeader');
    let html = `<th class="sticky-col memo-trigger" data-memo-type="monthly">${month}月</th>`;  // カレンダー上内の月
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (
        year === today.getFullYear() && 
        month === (today.getMonth() + 1) && 
        d === today.getDate()
      );
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      html += `<th class="${isToday ? 'is-today' : ''} memo-trigger" data-memo-type="daily" data-date="${dateStr}">${d}</th>`;
    }
    headerRow.innerHTML = html;
  }

  // カレンダーのマトリックス本体の生成
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
            <td colspan="${daysInMonth}">
            </td>
        </tr>`;
      // 各TODO項目行
      cat.items.forEach(item => {
        html += `<tr>
                  <td class="sticky-col" data-item-id="${item.id}" data-cat-id="${cat.id}">${item.name}</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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

  bindEvents() {
    const addCatBtn = document.querySelector('.add-category-item-btn');
    // セルクリックでダイアログ表示
    document.getElementById('trackerBody').addEventListener('click', (e) => {

      // 各日付マス用のダイアログ表示
      if (e.target.classList.contains('cell-btn')) {
        this.openEditDialog(e.target);
        return;
      }

      const targetTd = e.target.closest('.sticky-col');
      if (!targetTd) return;

      const parentRow = targetTd.parentElement;

      // カテゴリの編集用ダイアログ表示
      if (parentRow.classList.contains('category-row')) {
        if (!e.target.classList.contains('add-item-btn')) {
          this.openCategoryEditDialog(targetTd);
        }
      }
      // カテゴリ内リスト項目の編集用ダイアログ表示
      else {
        this.openItemEditDialog(targetTd);
      }
      // 各カテゴリ内リスト項目の新規追加用ダイアログ表示
      if (e.target.classList.contains('add-item-btn')) {
        const { catId } = e.target.dataset;
        this.currentEditingCatId = catId;
        const dialog = document.getElementById('additemDialog');
        document.getElementById('addItemName').value = '';
        dialog.showModal();
      }
    });

    // カテゴリの新規追加用ダイアログ表示
    if (addCatBtn) {
      addCatBtn.onclick = () => {
        const dialog = document.getElementById('addCategoryDialog');
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryColor').value = '#c8e6c9'; 
        dialog.showModal();
      };
    }
    // カテゴリの新規追加用ダイアログ内：追加ボタンクリックイベント
    const saveCatBtn = document.getElementById('saveCategory');
    if (saveCatBtn) {
      saveCatBtn.onclick = () => {
        this.handleCreateCategory();
      };
    }
    // 各カテゴリ内リスト項目の新規追加用ダイアログ内：追加ボタンクリックイベント
    const saveItemAddBtn = document.getElementById('saveItemAdd');
    if (saveItemAddBtn) {
      saveItemAddBtn.onclick = () => this.handleCreateItem();
    }
    // 全データ削除リセット用ダイアログ表示
    const dataResetBtn = document.querySelector('.all-data-reset-btn');
    if (dataResetBtn) {
      dataResetBtn.onclick = () => {
        const dialog = document.getElementById('allDataResetDialog');
        document.getElementById('resetText').value = '';
        dialog.showModal();
      };
    }
    // 全データ削除リセット用ダイアログ内：削除ボタンクリックイベント
    const confirmInput = document.getElementById('resetText');
    const finalDeleteBtn = document.getElementById('resetData');
    confirmInput.addEventListener('input', (e) => {
      finalDeleteBtn.disabled = (e.target.value !== "すべて削除");
    });
    if (finalDeleteBtn) {
      finalDeleteBtn.onclick = () => this.resetAllData();
    }
    // 備考メモの共通ダイアログ表示
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.memo-trigger');
      if (!trigger) return;

      const type = trigger.dataset.memoType; // yearly, monthly, global, daily
      const date = trigger.dataset.date;     // dailyの場合のみ取得

      this.openMemoModal(type, date);
    });
    // 備考メモの共通ダイアログ内：保存ボタンクリックイベント
    const saveBtn = document.getElementById('saveMemo');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveMemoData();
      });
    }

    // 月切り替えボタンクリックイベント
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    prevBtn.onclick = () => this.changeMonth(-1);
    nextBtn.onclick = () => this.changeMonth(1);

    // カレンダー上外の年月ホバー時：ツールチップ内の年月フォームのイベント
    const yearMonthInput = document.getElementById('currentYearMonth');
    if (yearMonthInput) {
      yearMonthInput.addEventListener('change', (e) => {
        const value = e.target.value; // 例:2026-05
        if (!value) return;
        const [year, month] = value.split('-').map(Number);
        this.updateCalendarView(year, month);
      });
    }

    // モーダルを閉じる処理
    const modals = document.querySelectorAll('dialog');
    const bodyContent = document.querySelector('body');
    if (!modals || !bodyContent) return;
    modals.forEach(modal => {
      // 閉じた時の処理
      modal.addEventListener('close', () => {
        bodyContent.style.overflow = 'visible';
      });
      // 黒背景部分の押下
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
      });
      // ×印ボタンの押下
      const closeBtn = modal.querySelector('.modal-close-icon-button');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
      }
    });
  }

    openEditDialog(target) {
      const { date, item } = target.dataset;
      const dialog = document.getElementById('statusDialog');

      // 該当マスのタイトル日付表示更新（selectDayInStatusDialog）
      const selectDayDisplay = document.getElementById('selectDayInStatusDialog');
      if (selectDayDisplay) {
        selectDayDisplay.textContent = `${date.replaceAll('-', '/')}`;
      }

      const logEntry = this.logs[date]?.[item];
      const currentStatus = (logEntry && typeof logEntry === 'object') ? String(logEntry.status) : String(logEntry ?? 'none');
      const currentMemo = logEntry?.memo || "";

      const radio = dialog.querySelector(`input[name="status"][value="${currentStatus}"]`);
      if (radio) radio.checked = true;
      document.getElementById('memoArea').value = currentMemo;

      dialog.showModal();
      
      document.getElementById('saveStatus').onclick = (e) => {
        const selectedStatus = dialog.querySelector('input[name="status"]:checked').value;
        const memo = document.getElementById('memoArea').value;
        this.updateLog(date, item, selectedStatus, memo);
      };
    }

      updateLog(date, itemId, status, memo) {
        if (!this.logs[date]) this.logs[date] = {};
        this.logs[date][itemId] = {
          status: (status === 'none') ? undefined : (status === 'true'),
          memo: memo
        };
        localStorage.setItem('habit_logs', JSON.stringify(this.logs));
        this.renderMatrix();
      }

    openCategoryEditDialog(target) {
      const { catId } = target.dataset;
      this.currentEditingCatId = catId;

      const dialog = document.getElementById('categoryEditDialog');
      const category = this.settings.categories.find(c => c.id === catId);
      if (!category) return;

      document.getElementById('editCategoryName').value = category.name;
      document.getElementById('categoryColorEdit').value = category.color || '#c8e6c9';

      const idx = this.settings.categories.findIndex(c => c.id === catId);
      const totalCats = this.settings.categories.length;
      document.getElementById('categoryOrderDisplay').textContent = `（${idx + 1}番目 / ${totalCats}項目中）`;

      dialog.showModal();

      // --- カテゴリ名の編集 ---
      document.getElementById('saveCategoryEdit').onclick = () => {
        const newCategoryName = document.getElementById('editCategoryName').value;
        const newCategoryColor = document.getElementById('categoryColorEdit').value;
        if (newCategoryName) {
          category.name = newCategoryName;
          category.color = newCategoryColor;
          this.saveSettings();
          this.renderMatrix();
          dialog.close();
        }
      };

      // --- カテゴリの移動 ---
      document.getElementById('categoryMoveUpBtn').onclick = () => this.moveCategory('catUp');
      document.getElementById('categoryMoveDownBtn').onclick = () => this.moveCategory('catDown');

      // --- カテゴリの削除 ---
      document.getElementById('deleteCategoryBtn').onclick = () => {
        if (window.confirm(`カテゴリ「${category.name}」を削除してもよろしいですか？\n※カテゴリ内の項目もすべて削除されます。`)) {
          this.settings.categories = this.settings.categories.filter(c => c.id !== catId);
          this.saveSettings();
          this.renderMatrix();
          dialog.close();
        }
      };
    }

      moveCategory(direction) {
        const idx = this.settings.categories.findIndex(c => c.id === this.currentEditingCatId);
        const targetIdx = direction === 'catUp' ? idx - 1 : idx + 1;
        const totalCats = this.settings.categories.length;

        if (targetIdx >= 0 && targetIdx < totalCats) {
          [this.settings.categories[idx], this.settings.categories[targetIdx]] = [this.settings.categories[targetIdx], this.settings.categories[idx]];
          this.saveSettings();
          this.renderMatrix();

          document.getElementById('categoryOrderDisplay').textContent = `（${targetIdx + 1}番目 / ${totalCats}項目中）`;
        }
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

      const idx = category.items.findIndex(i => i.id === itemId);
      const totalItems = category.items.length;
      document.getElementById('orderDisplay').textContent = `（${idx + 1}番目 / ${totalItems}項目中）`;

      dialog.showModal();

      // --- リスト項目名の編集 ---
      document.getElementById('saveItemEdit').onclick = () => {
        const newName = document.getElementById('editItemName').value;
        if (newName) {
          this.saveItemName(this.currentEditingItemId, newName);
          dialog.close();
        }
      };

      // --- リスト項目の移動 ---
      document.getElementById('moveUpBtn').onclick = () => this.moveItem('up');
      document.getElementById('moveDownBtn').onclick = () => this.moveItem('down');

      // --- リスト項目の削除 ---
      document.getElementById('deleteItemBtn').onclick = () => {
        if (window.confirm(`「${item.name}」を削除してもよろしいですか？\n※過去の記録も表示されなくなります。`)) {
          this.deleteItem(this.currentEditingCatId, this.currentEditingItemId);
          dialog.close();
        }
      };
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
        const totalItems = cat.items.length;

        if (targetIdx >= 0 && targetIdx < totalItems) {
          [cat.items[idx], cat.items[targetIdx]] = [cat.items[targetIdx], cat.items[idx]];
          this.saveSettings();
          this.renderMatrix();

          document.getElementById('orderDisplay').textContent = `（${targetIdx + 1}番目 / ${totalItems}項目中）`;
        }
      }

      deleteItem(catId, itemId) {
        const cat = this.settings.categories.find(c => c.id === catId);
        cat.items = cat.items.filter(i => i.id !== itemId);
        this.saveSettings();
        this.renderMatrix();
      }

    handleCreateCategory() {
      const nameInput = document.getElementById('categoryName');
      const colorInput = document.getElementById('categoryColor');
      const name = nameInput.value.trim();
      const color = colorInput.value;

      if (!name) {
        alert("カテゴリ名を入力してください");
        return;
      }

      const newCategory = {
        id: `cat_${Date.now()}`,
        name: name,
        color: color,
        items: []
      };
      this.settings.categories.push(newCategory);
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
        const newItem = {
          id: `item_${Date.now()}`,
          name: name
        };
        category.items.push(newItem);
        this.saveSettings();
        this.renderMatrix();
        document.getElementById('additemDialog').close();
      }
    }

    resetAllData() {
      if (!confirm("本当にすべてのデータを削除してもよろしいですか？")) return;
      // localStorage.clear();
      localStorage.removeItem('habit_settings');
      localStorage.removeItem('habit_logs');
      localStorage.removeItem('habit_memos');
      location.reload();
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

    saveMemoData() {
      if (!this.editingMemoKey) return;
      const textarea = document.getElementById('memoInput');
      const updatedText = textarea.value.trim();

      if (updatedText === '') {
        delete this.memos[this.editingMemoKey];
      } else {
        this.memos[this.editingMemoKey] = updatedText;
      }

      localStorage.setItem('habit_memos', JSON.stringify(this.memos));

      this.editingMemoKey = null;
      const dialog = document.getElementById('memosCommonDialog');
      dialog.close();
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

      this.renderHeader();
      this.renderMatrix();
    }

}

// 実行
const app = new HabitTracker(initialSettings, initialLogs);