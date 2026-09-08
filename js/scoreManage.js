// ============================================================
// 成績處理頁專屬腳本（Vanilla JS）
// 職責：名次登打逐列「自動存檔＋該列儲存按鈕」
//   - 選好名次後 → 標示「未儲存」並顯示該列儲存按鈕 → 短暫延遲後自動存檔
//   - 亦可點該列「儲存」按鈕立即存檔
//   - 儲存狀態欄：未評（灰）／未儲存（橘）／已儲存（綠）
//   （實際寫入由後端接手；此處僅前端示意，延遲模擬背景寫入）
// ============================================================
(function () {
    'use strict';

    var AUTO_SAVE_DELAY = 700; // ms，模擬選定後自動送出

    var STATES = {
        empty: { cls: 'statusTag--muted', icon: '', text: '未評' },
        dirty: { cls: 'statusTag--warn', icon: 'bi-exclamation-circle-fill', text: '未儲存' },
        saved: { cls: 'statusTag--success', icon: 'bi-check-circle-fill', text: '已儲存' }
    };

    function renderStatus(statusEl, state) {
        var s = STATES[state];
        statusEl.className = 'statusTag js-saveStatus ' + s.cls;
        var iconHtml = s.icon
            ? '<i class="bi ' + s.icon + '" aria-hidden="true"></i>'
            : '';
        statusEl.innerHTML = iconHtml + s.text;
    }

    var rows = document.querySelectorAll('#scoreForm tbody tr');

    Array.prototype.forEach.call(rows, function (row) {
        var select = row.querySelector('select[name^="rank"]');
        var statusEl = row.querySelector('.js-saveStatus');
        var saveBtn = row.querySelector('.js-saveRow');
        if (!select || !statusEl || !saveBtn) { return; }

        var timer = null;

        function commit() {
            if (timer) { window.clearTimeout(timer); timer = null; }
            // 後端：此處送出該列名次；成功後標示已儲存
            renderStatus(statusEl, 'saved');
        }

        select.addEventListener('change', function () {
            if (timer) { window.clearTimeout(timer); timer = null; }

            if (!select.value) {
                // 清為未評：不需儲存，收起按鈕
                renderStatus(statusEl, 'empty');
                saveBtn.hidden = true;
                return;
            }

            renderStatus(statusEl, 'dirty');
            saveBtn.hidden = false;
            timer = window.setTimeout(commit, AUTO_SAVE_DELAY);
        });

        saveBtn.addEventListener('click', commit);
    });
})();
