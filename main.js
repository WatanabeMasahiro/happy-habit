// 1. 初期データ定義 (本来は外部JSONから取得する想定)
const initialSettings = {
  year: 2026,
  month: 5,
  categories: [
    {
      id: "cat_morning", name: "朝", color: "#fff9c4",
      items: [
        { id: "m1", name: "早起き：定時に起きれた" },
        { id: "m2", name: "朝ごはんを食べられた" }
      ]
    },
    {
      id: "cat_noon", name: "昼", color: "#c8e6c9",
      items: [
        { id: "n1", name: "散歩に行けた" },
        { id: "n2", name: "昼ごはんを食べられた" },
      ]
    }
  ]
};

class HabitTracker {
  constructor(initialSettings) {
    this.settings = JSON.parse(localStorage.getItem('habit_settings')) || initialSettings;
    this.logs = JSON.parse(localStorage.getItem('habit_logs')) || {};
    this.currentEditingItemId = null;
    this.currentEditingCatId = null;
    this.init();
  }

  saveSettings() {
    localStorage.setItem('habit_settings', JSON.stringify(this.settings));
  }

  init() {
    this.renderHeader();
    this.renderMatrix();
    this.bindEvents();
    this.closeDialog();
  }

  // カレンダーの列（1日〜末日）を生成
  renderHeader() {
    const headerRow = document.getElementById('dateHeader');
    const daysInMonth = new Date(this.settings.year, this.settings.month, 0).getDate();
    const today = new Date();
    
    let html = `<th class="sticky-col">${this.settings.month}月</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (
        this.settings.year === today.getFullYear() && 
        this.settings.month === (today.getMonth() + 1) && 
        d === today.getDate()
      );
      html += `<th class="${isToday ? 'is-today' : ''}">${d}</th>`;
    }
    headerRow.innerHTML = html;
  }

  // マトリックス本体の生成
  renderMatrix() {
    const body = document.getElementById('trackerBody');
    const daysInMonth = new Date(this.settings.year, this.settings.month, 0).getDate();
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
          const dateKey = `${this.settings.year}-${String(this.settings.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const logEntry = this.logs[dateKey]?.[item.id];
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
    const addCatBtn = document.querySelector('.add-category-item-btn button');
    if (addCatBtn) {
      addCatBtn.onclick = () => {
        const dialog = document.getElementById('addCategoryDialog');
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryColor').value = '#c8e6c9'; 
        dialog.showModal();
      };
    }
    const saveCatBtn = document.getElementById('saveCategory');
    if (saveCatBtn) {
      saveCatBtn.onclick = () => {
        this.handleCreateCategory();
      };
    }

    // セルクリックでダイアログ表示（イベント委譲）
    document.getElementById('trackerBody').addEventListener('click', (e) => {
      // 各日付マス用のダイアログ表示
      if (e.target.classList.contains('cell-btn')) {
        this.openEditDialog(e.target);
      }
      // カテゴリの編集用ダイアログ表示
      if (e.target.classList.contains('sticky-col') && e.target.parentElement.classList.contains('category-row')) {
        this.openCategoryEditDialog(e.target); // 名前編集用
      }
      // カテゴリ内項目の名称変更用ダイアログ表示
      if (e.target.classList.contains('sticky-col') && !e.target.parentElement.classList.contains('category-row')) {
        this.openItemEditDialog(e.target); // 名前編集用
      }
      // 各カテゴリ内項目の新規追加用ダイアログ表示
      if (e.target.classList.contains('add-item-btn')) {
        this.openAddItemDialog(e.target.dataset.catId);
      }
    });

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

    openEditDialog(target) {
      const { date, item } = target.dataset;
      const dialog = document.getElementById('statusDialog');

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

      dialog.showModal();

      // --- カテゴリ名の保存 ---
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
      document.getElementById('categoryMoveUpBtn').onclick = () => this.moveCategory(catId, 'catUp');
      document.getElementById('categoryMoveDownBtn').onclick = () => this.moveCategory(catId, 'catDown');

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

      moveCategory(catId, direction) {
        // const cat = this.settings.categories.find(c => c.id === this.currentEditingCatId);
        const idx = this.settings.categories.findIndex(c => c.id === catId);
        const targetIdx = direction === 'catUp' ? idx - 1 : idx + 1;

        if (targetIdx >= 0 && targetIdx < this.settings.categories.length) {
          [this.settings.categories[idx], this.settings.categories[targetIdx]] = [this.settings.categories[targetIdx], this.settings.categories[idx]];
          this.saveSettings();
          this.renderMatrix();
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
      document.getElementById('moveUpBtn').onclick = () => this.moveItem(this.currentEditingItemId, 'up');
      document.getElementById('moveDownBtn').onclick = () => this.moveItem(this.currentEditingItemId, 'down');

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

      moveItem(itemId, direction) {
        const cat = this.settings.categories.find(c => c.id === this.currentEditingCatId);
        const idx = cat.items.findIndex(i => i.id === itemId);
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

        if (targetIdx >= 0 && targetIdx < cat.items.length) {
          [cat.items[idx], cat.items[targetIdx]] = [cat.items[targetIdx], cat.items[idx]];
          this.saveSettings();
          this.renderMatrix();
        }
      }

      deleteItem(catId, itemId) {
        const cat = this.settings.categories.find(c => c.id === catId);
        cat.items = cat.items.filter(i => i.id !== itemId);
        this.saveSettings();
        this.renderMatrix();
      }

    openAddItemDialog(catId) {
      const newName = prompt("新しいTODO項目の名前を入力してください");
      if (!newName) return;

      // カテゴリを特定
      const category = this.settings.categories.find(c => c.id === catId);
      
      // 新しい項目を作成
      const newItem = {
          id: `item_${Date.now()}`, // 重複しないIDを生成
          name: newName
      };

      category.items.push(newItem); // 配列の末尾に追加
      this.saveSettings();
      this.renderMatrix();
    }

  /**
   * モーダルを閉じる処理：
   * モーダルカード内の「右上×印ボタン・モーダルカード外の黒背景部分・最下部の閉じるボタン」の押下でモーダルが閉じる。
  */
  closeDialog = () => {
    const modals = document.querySelectorAll('dialog');
    const bodyContent = document.querySelector('body');
    if (!modals || !bodyContent) return;

    modals.forEach(modal => {
      // モーダルを閉じた時の処理
      modal.addEventListener('close', () => {
        bodyContent.style.overflow = 'visible';
      });
      // 黒背景部分の押下でモーダルを閉じる処理
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
      });
      // ×印ボタンの押下でモーダルを閉じる処理
      const closeBtn = modal.querySelector('.modal-close-icon-button');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
      }
    });
  };
}

// 実行
const app = new HabitTracker(initialSettings);