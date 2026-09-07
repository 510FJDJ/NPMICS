// ============================================================
// 報名確認頁專屬腳本（Vanilla JS）
// 職責：是否報名切換切結書區塊、檔案選擇顯示檔名、
//       儲存檢核與成功 Modal、選「報名」時導向四步驟報名頁
// ============================================================
(function () {
    'use strict';

    var form = document.getElementById('applyConfirmForm');
    if (!form) { return; }

    var decisionSelect = document.getElementById('applyDecision');
    var declineBlock = document.getElementById('declineBlock');
    var declineFile = document.getElementById('declineFile');
    var btnSave = document.getElementById('btnConfirmSave');
    var saveHint = document.getElementById('confirmSaveHint');
    var btnSuccessOk = document.getElementById('btnConfirmSuccessOk');

    // ---- 儲存按鈕啟用檢核：報名→直接可存；不報名→需先上傳切結書 ----
    function renderSaveState() {
        var decision = decisionSelect.value;
        var message = '';
        if (!decision) {
            message = '請先選擇是否複賽報名';
        } else if (decision === 'no' && !declineFile.files.length) {
            message = '請先上傳簽核後切結書';
        }
        btnSave.setAttribute('aria-disabled', message ? 'true' : 'false');
        saveHint.textContent = message;
        saveHint.hidden = !message;
    }

    decisionSelect.addEventListener('change', function () {
        declineBlock.hidden = decisionSelect.value !== 'no';
        renderSaveState();
    });

    // ---- 檔案選擇後顯示檔名（.js-fileInput[data-help] 指向說明文字）----
    document.querySelectorAll('.js-fileInput').forEach(function (input) {
        input.addEventListener('change', function () {
            var help = document.getElementById(input.getAttribute('data-help'));
            if (help) {
                help.textContent = input.files.length ? '已選擇：' + input.files[0].name : '尚未選擇檔案';
            }
            renderSaveState();
        });
    });

    // ---- 儲存：顯示成功 Modal（後端：實際寫入由後端接手）----
    btnSave.addEventListener('click', function () {
        if (btnSave.getAttribute('aria-disabled') === 'true') { return; }
        var modal = new bootstrap.Modal(document.getElementById('confirmSuccessModal'));
        modal.show();
    });

    // ---- 成功 Modal 確認：選「報名」時前往四步驟報名頁 ----
    btnSuccessOk.addEventListener('click', function () {
        if (decisionSelect.value === 'yes') {
            window.location.href = 'applySemiFinals.html';
        }
    });

    renderSaveState();
})();
