// ============================================================
// 報名期間設定頁專屬腳本（Vanilla JS）
// 職責：儲存前檢核（起訖必填、結束須晚於開始）→ 成功 Modal
//       錯誤以具體單行文字呈現（ACCESSIBILITY.md §11，不可只用框線顏色）
// ============================================================
(function () {
    'use strict';

    var form = document.getElementById('periodForm');
    if (!form || typeof bootstrap === 'undefined') { return; }

    var start = document.getElementById('periodStart');
    var end = document.getElementById('periodEnd');
    var btnSave = document.getElementById('btnSavePeriod');
    var errBox = document.getElementById('periodEndError');
    var errText = document.getElementById('periodEndErrorText');
    var modal = new bootstrap.Modal(document.getElementById('periodSuccessModal'));

    function clearError() {
        errBox.hidden = true;
        start.removeAttribute('aria-invalid');
        end.removeAttribute('aria-invalid');
    }

    function showError(message, field) {
        errText.textContent = message;
        errBox.hidden = false;
        if (field) {
            field.setAttribute('aria-invalid', 'true');
            field.focus();
        }
    }

    // 使用者重新編輯時清除既有錯誤提示
    [start, end].forEach(function (field) {
        field.addEventListener('input', clearError);
    });

    btnSave.addEventListener('click', function () {
        clearError();

        if (!start.value) {
            showError('請填寫複賽報名開始時間', start);
            return;
        }
        if (!end.value) {
            showError('請填寫複賽報名結束時間', end);
            return;
        }
        if (new Date(end.value) <= new Date(start.value)) {
            showError('結束時間必須晚於開始時間', end);
            return;
        }

        // 後端：實際寫入由後端接手
        modal.show();
    });
})();
