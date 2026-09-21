// ============================================================
// 填寫複賽報名頁專屬腳本（Vanilla JS）
// 職責：三步驟完成度判斷與後續步驟填寫鎖定（可瀏覽不可填寫）、
//       科別是否報名切換、學生資料整列新增／刪除／重新編號、
//       送出並產生報名表確認、下載與上傳簽核後報名表、完成報名、儲存提示
// 後端：送出／儲存／檔案上傳實際寫入由後端接手，此處為前端流程示意
// ============================================================
(function () {
    'use strict';

    var form = document.getElementById('semiFinalsForm');
    if (!form || !window.npmicsWizard) { return; }

    var STEPS = ['school', 'students', 'download'];
    var STUDENT_FIELD_ORDER = ['Name', 'Gender', 'Birth', 'IdNo', 'Meal', 'Grade', 'Phone', 'Email', 'TeacherName', 'TeacherPhone', 'TeacherEmail'];

    // 流程狀態（後端：改由報名資料判斷）
    var state = {
        submitted: false,   // 已按「送出並產生報名表」
        completed: false,   // 已上傳簽核後報名表完成報名
        uploaded: { signedFormGroupA: false, signedFormGroupB: false } // 各上傳欄位是否已按「儲存」
    };

    var btnPrev = document.getElementById('btnPrev');
    var btnNext = document.getElementById('btnNext');
    var btnSave = document.getElementById('btnSave');
    var saveStatus = document.getElementById('saveStatus');
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
        return state.completed;
    }

    // ---- 步驟狀態供步驟列渲染（PM 需求：1、2、3 步驟顯示完成狀態）----
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
                if (isDownloadDone()) { return { status: 'done', sub: '已完成' }; }
                if (!state.submitted) { return { status: 'notstarted', sub: '未開始' }; }
                var downloadSub = (state.uploaded.signedFormGroupA && state.uploaded.signedFormGroupB)
                    ? '已上傳未確認'
                    : '尚未上傳';
                // 此步驟以上傳檔案為主，非填寫表單，即使目前為進行中步驟也顯示實際上傳狀態
                return { status: 'pending', sub: downloadSub, activeSub: downloadSub };
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
            default:
                return false;
        }
    }

    function renderLocks() {
        STEPS.forEach(function (key) {
            var panel = getPanel(key);
            var locked = !canFill(key);
            panel.querySelectorAll('input, select, textarea, .js-addStudent, .js-removeStudent, .js-editStudent, .js-saveStudent').forEach(function (control) {
                // 科別容器隱藏中的欄位維持 disabled，交由 subject 切換邏輯管理
                if (control.closest('.js-subjectStudents') && control.closest('.js-subjectStudents').hidden) { return; }
                // 已按「儲存」鎖定的學生列欄位：即使本步驟目前可填寫，仍維持鎖定，須按「編輯」才能再次修改
                control.disabled = locked || isSavedRowField(control);
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

        // 步驟三：上傳欄位改由各自的「儲存」按鈕負責保存，底部通用儲存提示與按鈕不再重複顯示
        saveStatus.hidden = state.submitted;

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
        } else if (key === 'download') {
            nextLabel = '完成報名';
            if (state.completed) {
                nextLabel = '已完成報名';
                message = '';
            } else if (!state.submitted) {
                message = '請先完成前面步驟並送出產生報名表';
            } else {
                var invalidUpload = firstInvalidControl(getPanel('download'));
                if (invalidUpload) {
                    message = invalidUpload.type === 'checkbox' ? '請先勾選最後確認事項' : invalidMessage(invalidUpload);
                }
            }
        }

        btnNext.textContent = nextLabel;
        var disabled = !!message || (key === 'download' && state.completed);
        btnNext.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        nextStepHint.hidden = !message;
        nextStepHintText.textContent = message;
    }

    function refreshAll() {
        window.npmicsWizard.refresh();
        renderLocks();
        renderActionBar();
    }

    // ---- 學生資料列：已儲存鎖定判斷 ----
    function isSavedRowField(control) {
        if (!control.matches('input, select, textarea')) { return false; }
        var row = control.closest('tr');
        return !!(row && row.dataset.saved === 'true');
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
            row.querySelectorAll('.js-removeStudent').forEach(function (removeBtn) {
                removeBtn.setAttribute('aria-label', '刪除' + subjectName + '學生' + n);
            });
            var editBtn = row.querySelector('.js-editStudent');
            editBtn.setAttribute('aria-label', '編輯' + subjectName + '學生' + n);
        });
        var count = section.querySelector('.js-studentCount');
        if (count) { count.textContent = '已填寫 ' + rows.length + ' 位學生'; }
    }

    // ---- 每科選派人數上限：資優班每科 6 人；普通科依班級數 51 班以上 4 人、50 班以下 2 人 ----
    function getStudentQuota() {
        var gifted = document.getElementById('schoolGifted');
        if (gifted && gifted.value === 'yes') { return 6; }
        var classRegular = document.getElementById('schoolClassRegular');
        var classCount = classRegular ? parseInt(classRegular.value, 10) : 0;
        return classCount >= 51 ? 4 : 2;
    }

    function showQuotaLimitModal(section, quota) {
        var subjectName = section.getAttribute('data-subject-name');
        document.getElementById('quotaLimitDesc').textContent =
            '依複賽名額規定，貴校' + subjectName + '最多可選派 ' + quota + ' 人參加，已達上限，無法再新增學生。';
        var modal = new bootstrap.Modal(document.getElementById('quotaLimitModal'));
        modal.show();
    }

    function addStudentRow(section) {
        var tbody = section.querySelector('.js-studentRows');
        var quota = getStudentQuota();
        if (tbody.querySelectorAll('tr').length >= quota) {
            showQuotaLimitModal(section, quota);
            return;
        }
        tbody.appendChild(rowTemplate.content.cloneNode(true));
        renumberRows(section);
        refreshAll();
    }

    // ---- 學生列欄位：取得列內輸入元件、檢核第一個未通過驗證的欄位 ----
    function rowFields(row) {
        return row.querySelectorAll('[data-tpl="input"]');
    }

    function firstInvalidInRow(row) {
        var fields = rowFields(row);
        for (var i = 0; i < fields.length; i++) {
            if (!fields[i].checkValidity()) { return fields[i]; }
        }
        return null;
    }

    // ---- 學生列「儲存」：驗證通過後鎖定欄位，改顯示「編輯」「刪除」----
    function saveStudentRow(row) {
        var invalid = firstInvalidInRow(row);
        if (invalid) {
            invalid.reportValidity();
            invalid.focus();
            return;
        }
        row.dataset.saved = 'true';
        rowFields(row).forEach(function (field) {
            if (field.tagName === 'SELECT') {
                field.disabled = true;
            } else {
                field.readOnly = true;
            }
        });
        row.querySelector('.js-unsavedActions').hidden = true;
        row.querySelector('.js-savedActions').hidden = false;
        refreshAll();
    }

    // ---- 學生列「編輯」：解除鎖定，改回只顯示「儲存」----
    function editStudentRow(row) {
        delete row.dataset.saved;
        rowFields(row).forEach(function (field) {
            field.disabled = false;
            field.readOnly = false;
        });
        row.querySelector('.js-savedActions').hidden = true;
        row.querySelector('.js-unsavedActions').hidden = false;
        refreshAll();
        var firstField = rowFields(row)[0];
        if (firstField) { firstField.focus(); }
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
        // 隱藏容器內欄位一律 disabled，避免影響必填檢核；已儲存鎖定的欄位維持鎖定
        container.querySelectorAll('input, select, button').forEach(function (control) {
            control.disabled = !enabled || isSavedRowField(control);
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
        // 儲存／編輯／刪除按鈕採事件代理：學生列為動態產生
        section.querySelector('.js-studentRows').addEventListener('click', function (event) {
            var saveBtn = event.target.closest('.js-saveStudent');
            if (saveBtn) {
                saveStudentRow(saveBtn.closest('tr'));
                return;
            }
            var editBtn = event.target.closest('.js-editStudent');
            if (editBtn) {
                editStudentRow(editBtn.closest('tr'));
                return;
            }
            var removeBtn = event.target.closest('.js-removeStudent');
            if (removeBtn) {
                removeBtn.closest('tr').remove();
                renumberRows(section);
                refreshAll();
            }
        });
    });

    // ---- 檔案選擇後顯示檔名，並顯示／隱藏該欄位對應的「儲存」按鈕 ----
    form.querySelectorAll('.js-fileInput').forEach(function (input) {
        input.addEventListener('change', function () {
            var help = document.getElementById(input.getAttribute('data-help'));
            if (help) {
                help.textContent = input.files.length ? '已選擇：' + input.files[0].name : '尚未選擇檔案，格式限 pdf，單檔上限 10MB';
            }
            var uploadSaveBtn = form.querySelector('.js-uploadSave[data-upload-save="' + input.id + '"]');
            if (uploadSaveBtn) { uploadSaveBtn.hidden = !input.files.length; }
            // 重新選擇檔案後須重新按「儲存」才算已上傳
            if (state.uploaded.hasOwnProperty(input.id)) { state.uploaded[input.id] = false; }
        });
    });

    // ---- 上傳欄位「儲存」：與底部通用儲存共用「儲存成功」提示（後端：實際寫入由後端接手）----
    form.querySelectorAll('.js-uploadSave').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var fieldId = btn.getAttribute('data-upload-save');
            if (state.uploaded.hasOwnProperty(fieldId)) { state.uploaded[fieldId] = true; }
            var modal = new bootstrap.Modal(document.getElementById('saveSuccessModal'));
            modal.show();
            refreshAll();
        });
    });

    // ---- 下載報名表：未送出前不可點擊 ----
    document.querySelectorAll('.js-downloadForm').forEach(function (link) {
        link.addEventListener('click', function (event) {
            if (link.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
            }
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

        if (key === 'download') {
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
