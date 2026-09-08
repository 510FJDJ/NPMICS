// ============================================================
// 學校管理頁專屬腳本（Vanilla JS）
// 職責：匯入檔案選擇後顯示檔名、「匯入」→ 成功 Modal
//       （實際解析與寫入由後端接手；此處僅前端示意）
// ============================================================
(function () {
    'use strict';

    var fileInput = document.getElementById('importFile');
    var btnImport = document.getElementById('btnImport');
    if (!fileInput || !btnImport || typeof bootstrap === 'undefined') { return; }

    var help = document.getElementById(fileInput.getAttribute('data-help'));
    var DEFAULT_HELP = help ? help.textContent : '';
    var modal = new bootstrap.Modal(document.getElementById('importSuccessModal'));

    // ---- 檔案選擇後顯示檔名（沿用全站 .js-fileInput[data-help] 慣例）----
    fileInput.addEventListener('change', function () {
        if (!help) { return; }
        help.textContent = fileInput.files.length
            ? '已選擇：' + fileInput.files[0].name
            : DEFAULT_HELP;
    });

    // ---- 匯入：未選檔先提示，選檔後顯示成功 Modal ----
    btnImport.addEventListener('click', function () {
        if (!fileInput.files.length) {
            if (help) { help.textContent = '請先選擇匯入檔案（格式限 Excel，.xlsx）'; }
            fileInput.focus();
            return;
        }
        modal.show();
    });
})();
