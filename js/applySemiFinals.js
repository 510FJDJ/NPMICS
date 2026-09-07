// ============================================================
// 填寫複賽報名頁專屬腳本（Vanilla JS）
// 職責：四步驟完成度判斷與後續步驟填寫鎖定（可瀏覽不可填寫）、
//       科別是否報名切換、學生資料整列新增／刪除／重新編號、
//       送出並產生報名表確認、下載標記、上傳與完成報名、儲存提示
// 後端：送出／儲存／檔案上傳實際寫入由後端接手，此處為前端流程示意
// ============================================================
(function () {
    'use strict';

    var form = document.getElementById('semiFinalsForm');
    if (!form || !window.npmicsWizard) { return; }

    var STEPS = ['school', 'students', 'download', 'upload'];
    var STUDENT_FIELD_ORDER = ['Name', 'Gender', 'Birth', 'IdNo', 'Meal', 'Grade', 'Phone', 'Email', 'TeacherName', 'TeacherPhone', 'TeacherEmail'];

    // 流程狀態（後端：改由報名資料判斷）
    var state = {
        submitted: false,   // 已按「送出並產生報名表」
        downloaded: {},     // 已點擊的下載連結
        completed: false    // 已上傳簽核後報名表完成報名
    };

    var btnPrev = document.getElementById('btnPrev');
    var btnNext = document.getElementById('btnNext');
    var btnSave = document.getElementById('btnSave');
    var nextStepHint = document.getElementById('nextStepHint');
    var nextStepHintText = document.getElementById('nextStepHintText');
    var saveStatusText = document.getElementById('saveStatusText');
    var rowTemplate = document.getElementById('studentRowTemplate');

    function getPanel(key) {
        return form.querySelector('[data-step-panel="' + key + '"]');
    }

    // ---- 欄位檢核：略過 disabled（含隱藏科別容器內欄位）----
    function firstInvalidControl(panel) {
        if (!panel) { return null; }
        var controls = panel.querySelectorAll('input, select, textarea');
        for (var i = 0; i < controls.length; i++) {
            if (controls[i].disabled) { continue; }
            if (!controls[i].checkValidity()) { return controls[i]; }
        }
        return null;
    }

    function labelForControl(control) {
        if (control.id) {
            var label = form.querySelector('label[for="' + control.id + '"]');
            if (label) {
                var clone = label.cloneNode(true);
                var pill = clone.querySelector('.requiredPill');
                if (pill) { pill.remove(); }
                var text = clone.textContent.trim();
                if (text) { return text; }
            }
        }
        return control.name || control.id || '此欄位';
    }

    function invalidMessage(control) {
        var label = labelForControl(control);
        if (control.validity.valueMissing) { return '請完成「' + label + '」'; }
        if (control.validity.typeMismatch && control.type === 'email') { return '「' + label + '」格式不正確，請輸入正確的電子郵件'; }
        return control.validationMessage || ('請確認「' + label + '」的填寫內容');
    }

    // ---- 各步驟完成度 ----
    function isSchoolDone() {
        return !firstInvalidControl(getPanel('school'));
    }

    function isStudentsDone() {
        if (firstInvalidControl(getPanel('students'))) { return false; }
        // 至少一科報名，且報名科別皆已有學生列
        var hasSubject = false;
        var sections = form.querySelectorAll('[data-subject]');
        for (var i = 0; i < sections.length; i++) {
            var apply = sections[i].querySelector('.js-subjectApply');
            if (apply.value === 'yes') {
                hasSubject = true;
                if (!sections[i].querySelectorAll('.js-studentRows tr').length) { return false; }
            }
        }
        return hasSubject;
    }

    function isDownloadDone() {
        return state.submitted && Object.keys(state.downloaded).length >= 2;
    }

    function isUploadDone() {
        return state.completed;
    }

    // ---- 步驟狀態供步驟列渲染（PM 需求：1、2、4 步驟顯示完成狀態）----
    function getStepState(key) {
        switch (key) {
            case 'school':
                return isSchoolDone()
                    ? { status: 'done', sub: '已完成' }
                    : { status: 'pending', sub: '尚未填寫' };
            case 'students':
                return isStudentsDone()
                    ? { status: 'done', sub: '已完成' }
                    : { status: 'pending', sub: '尚未填寫' };
            case 'download':
                return isDownloadDone()
                    ? { status: 'done', sub: '已完成' }
                    : { status: 'notstarted', sub: state.submitted ? '可下載' : '未開始' };
            case 'upload':
                return isUploadDone()
                    ? { status: 'done', sub: '已完成' }
                    : { status: 'pending', sub: '尚未上傳' };
            default:
                return { status: 'notstarted', sub: '未開始' };
        }
    }

    // ---- 後續步驟填寫鎖定：可自由切換「瀏覽」，未完成前面步驟前不可「填寫」
    // （使用者需求：前面步驟未完成時，後面步驟欄位一律 disabled）----
    function canFill(key) {
        if (state.completed) { return false; } // 完成報名後全面鎖定
        switch (key) {
            case 'school':
                return !state.submitted; // 送出後資料不可再修改
            case 'students':
                return !state.submitted && isSchoolDone(); // 步驟一未完成前不可填寫
            case 'download':
                return state.submitted;
            case 'upload':
                return state.submitted;
            default:
                return false;
        }
    }

    function renderLocks() {
        STEPS.forEach(function (key) {
            var panel = getPanel(key);
            var locked = !canFill(key);
            panel.querySelectorAll('input, select, textarea, .js-addStudent, .js-removeStudent').forEach(function (control) {
                // 科別容器隱藏中的欄位維持 disabled，交由 subject 切換邏輯管理
                if (control.closest('.js-subjectStudents') && control.closest('.js-subjectStudents').hidden) { return; }
                control.disabled = locked;
            });
            // 下載連結：未送出前不可點
            if (key === 'download') {
                panel.querySelectorAll('.js-downloadForm').forEach(function (link) {
                    link.setAttribute('aria-disabled', locked ? 'true' : 'false');
                    link.classList.toggle('btn-ghost', locked);
                    link.classList.toggle('btn-outline', !locked);
                    if (locked) { link.setAttribute('tabindex', '-1'); } else { link.removeAttribute('tabindex'); }
                });
            }
            var notice = panel.querySelector('[data-step-lock-notice]');
            if (notice) {
                var show = locked && !state.completed;
                // 步驟一、二送出後鎖定屬「不可修改」而非「未完成前置」，不顯示前置提示
                if ((key === 'school' || key === 'students') && state.submitted) { show = false; }
                notice.hidden = !show;
            }
        });
    }

    // ---- 底部操作列 ----
    function renderActionBar() {
        var key = window.npmicsWizard.current();
        var index = STEPS.indexOf(key);
        btnPrev.setAttribute('aria-disabled', index <= 0 ? 'true' : 'false');
        btnSave.hidden = state.submitted; // 送出後資料鎖定，不再提供儲存

        var nextLabel = '下一步';
        var message = '';

        if (key === 'students' && !state.submitted) {
            nextLabel = '送出並產生報名表';
            if (!isSchoolDone()) {
                message = '請先完成「學校、承辦人、領隊資料」步驟';
            } else if (!isStudentsDone()) {
                var invalid = firstInvalidControl(getPanel('students'));
                message = invalid ? invalidMessage(invalid) : '請至少選擇一科報名並填寫學生資料';
            }
        } else if (key === 'school') {
            var invalidSchool = firstInvalidControl(getPanel('school'));
            if (!state.submitted && invalidSchool) { message = invalidMessage(invalidSchool); }
        } else if (key === 'upload') {
            nextLabel = '完成報名';
            if (state.completed) {
                nextLabel = '已完成報名';
                message = '';
            } else if (!state.submitted) {
                message = '請先完成前面步驟並送出產生報名表';
            } else {
                var invalidUpload = firstInvalidControl(getPanel('upload'));
                if (invalidUpload) {
                    message = invalidUpload.type === 'checkbox' ? '請先勾選最後確認事項' : invalidMessage(invalidUpload);
                }
            }
        } else if (key === 'download') {
            if (!state.submitted) { message = '請先完成前面步驟並送出產生報名表'; }
        }

        btnNext.textContent = nextLabel;
        var disabled = !!message || (key === 'upload' && state.completed);
        btnNext.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        nextStepHint.hidden = !message;
        nextStepHintText.textContent = message;
    }

    function refreshAll() {
        window.npmicsWizard.refresh();
        renderLocks();
        renderActionBar();
    }

    // ---- 學生資料列：樣板複製、id／label 代入、重新編號 ----
    function renumberRows(section) {
        var subject = section.getAttribute('data-subject');
        var subjectName = section.getAttribute('data-subject-name');
        var rows = section.querySelectorAll('.js-studentRows tr');
        rows.forEach(function (row, rowIndex) {
            var n = rowIndex + 1;
            row.querySelectorAll('[data-tpl="input"]').forEach(function (input, fieldIndex) {
                var field = input.getAttribute('data-field') || STUDENT_FIELD_ORDER[fieldIndex];
                var id = subject + 'Student' + n + field;
                input.id = id;
                input.name = subject + 'Student' + field + '[]';
                var label = input.closest('td').querySelector('[data-tpl="label"]');
                if (label) {
                    label.setAttribute('for', id);
                    label.textContent = subjectName + ' 學生' + n + ' ' + label.getAttribute('data-field-label');
                }
            });
            var removeBtn = row.querySelector('.js-removeStudent');
            removeBtn.setAttribute('aria-label', '刪除' + subjectName + '學生' + n);
        });
        var count = section.querySelector('.js-studentCount');
        if (count) { count.textContent = '已填寫 ' + rows.length + ' 位學生'; }
    }

    function addStudentRow(section) {
        var tbody = section.querySelector('.js-studentRows');
        tbody.appendChild(rowTemplate.content.cloneNode(true));
        renumberRows(section);
        refreshAll();
    }

    // ---- 科別是否報名切換 ----
    function toggleSubject(section) {
        var apply = section.querySelector('.js-subjectApply');
        var container = section.querySelector('.js-subjectStudents');
        var enabled = apply.value === 'yes';
        container.hidden = !enabled;
        if (enabled && !container.querySelectorAll('.js-studentRows tr').length) {
            addStudentRow(section);
        }
        // 隱藏容器內欄位一律 disabled，避免影響必填檢核
        container.querySelectorAll('input, select, button').forEach(function (control) {
            control.disabled = !enabled;
        });
        refreshAll();
    }

    form.querySelectorAll('[data-subject]').forEach(function (section) {
        section.querySelector('.js-subjectApply').addEventListener('change', function () {
            toggleSubject(section);
        });
        section.querySelector('.js-addStudent').addEventListener('click', function () {
            addStudentRow(section);
        });
        // 刪除按鈕採事件代理：學生列為動態產生
        section.querySelector('.js-studentRows').addEventListener('click', function (event) {
            var btn = event.target.closest('.js-removeStudent');
            if (!btn) { return; }
            btn.closest('tr').remove();
            renumberRows(section);
            refreshAll();
        });
    });

    // ---- 檔案選擇後顯示檔名 ----
    form.querySelectorAll('.js-fileInput').forEach(function (input) {
        input.addEventListener('change', function () {
            var help = document.getElementById(input.getAttribute('data-help'));
            if (help) {
                help.textContent = input.files.length ? '已選擇：' + input.files[0].name : '尚未選擇檔案，格式限 pdf，單檔上限 10MB';
            }
        });
    });

    // ---- 下載報名表：點擊即標記完成（後端：改由下載紀錄判斷）----
    document.querySelectorAll('.js-downloadForm').forEach(function (link, index) {
        link.addEventListener('click', function (event) {
            if (link.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                return;
            }
            state.downloaded[index] = true;
            refreshAll();
        });
    });

    // ---- 底部操作列按鈕 ----
    btnPrev.addEventListener('click', function () {
        if (btnPrev.getAttribute('aria-disabled') === 'true') { return; }
        var index = STEPS.indexOf(window.npmicsWizard.current());
        if (index > 0) { window.npmicsWizard.show(STEPS[index - 1]); }
    });

    btnNext.addEventListener('click', function () {
        var key = window.npmicsWizard.current();

        if (btnNext.getAttribute('aria-disabled') === 'true') {
            // 停用時協助把焦點帶到第一個未完成欄位
            var invalid = firstInvalidControl(getPanel(key));
            if (invalid) {
                invalid.reportValidity();
                invalid.focus();
            }
            return;
        }

        if (key === 'students' && !state.submitted) {
            var modal = new bootstrap.Modal(document.getElementById('generateConfirmModal'));
            modal.show();
            return;
        }

        if (key === 'upload') {
            completeApplication();
            return;
        }

        var index = STEPS.indexOf(key);
        if (index < STEPS.length - 1) { window.npmicsWizard.show(STEPS[index + 1]); }
    });

    // ---- 送出並產生報名表：確認後鎖定步驟一、二，前往下載步驟 ----
    document.getElementById('btnGenerateConfirm').addEventListener('click', function () {
        state.submitted = true;
        bootstrap.Modal.getInstance(document.getElementById('generateConfirmModal')).hide();
        window.npmicsWizard.show('download');
        refreshAll();
    });

    // ---- 完成報名：上傳簽核後報名表＋最後確認 ----
    function completeApplication() {
        state.completed = true;
        var modal = new bootstrap.Modal(document.getElementById('submitSuccessModal'));
        modal.show();
        refreshAll();
    }

    // ---- 儲存：保留進度提示（後端：實際寫入由後端接手）----
    btnSave.addEventListener('click', function () {
        var now = new Date();
        var pad = function (num) { return num < 10 ? '0' + num : String(num); };
        saveStatusText.textContent = '已於 ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' 儲存填寫進度';
        var modal = new bootstrap.Modal(document.getElementById('saveSuccessModal'));
        modal.show();
    });

    // ---- 欄位即時輸入／變更：更新步驟狀態與按鈕啟用 ----
    form.addEventListener('input', refreshAll);
    form.addEventListener('change', refreshAll);

    // ---- 啟動精靈 ----
    window.npmicsWizard.init({
        steps: STEPS,
        getStepState: getStepState,
        onStepChange: function () {
            renderLocks();
            renderActionBar();
        }
    });
})();
