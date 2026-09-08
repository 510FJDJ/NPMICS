// ============================================================
// 複賽報名查看頁專屬腳本（Vanilla JS）
// 職責：報名學生「查看」→ 單一共用 Modal 由 JS 帶入名單
//       （修掉舊版每列各自重複 id="supplement" 的無效寫法，
//        改為整頁一個 Modal，依所選學校／科別動態填入內容）
// 註：以下為前端示意名單，正式資料由後端帶入
// ============================================================
(function () {
    'use strict';

    var modalEl = document.getElementById('studentListModal');
    if (!modalEl || typeof bootstrap === 'undefined') { return; }

    var titleEl = document.getElementById('studentListTitle');
    var bodyEl = document.getElementById('studentListBody');
    var modal = new bootstrap.Modal(modalEl);

    var ORDINAL = ['一', '二', '三', '四', '五', '六', '七', '八'];

    // 前端示意名單（正式由後端依學校／科別回傳）
    var SAMPLE_STUDENTS = [
        { name: '王曉育', gender: '男', birth: '95/05/23', idNo: 'R123456789', meal: '葷', grade: '三年級' },
        { name: '陳品妍', gender: '女', birth: '95/08/11', idNo: 'F223456789', meal: '素', grade: '二年級' },
        { name: '林宥辰', gender: '男', birth: '96/01/09', idNo: 'A123456789', meal: '葷', grade: '一年級' },
        { name: '張書瑜', gender: '女', birth: '95/11/30', idNo: 'H223456789', meal: '葷', grade: '二年級' },
        { name: '黃鈺翔', gender: '男', birth: '95/03/17', idNo: 'N123456789', meal: '素', grade: '三年級' },
        { name: '吳芷儀', gender: '女', birth: '96/02/25', idNo: 'D223456789', meal: '葷', grade: '一年級' }
    ];

    // HTML escape：示意資料雖為靜態，仍統一走跳脫避免未來接後端字串時的注入風險
    function esc(str) {
        return String(str).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function fieldCol(label, value) {
        return '<div class="col-sm-6 mb-1"><span class="formField-note">' + label + '：</span>' + esc(value) + '</div>';
    }

    function renderStudents(students) {
        return students.map(function (stu, i) {
            var headClass = 'formSection-subheading' + (i === 0 ? ' mt-0 pt-0 border-0' : '');
            return '<section>'
                + '<h3 class="' + headClass + '">學生' + (ORDINAL[i] || (i + 1)) + '</h3>'
                + '<div class="row g-2">'
                + fieldCol('姓名', stu.name)
                + fieldCol('性別', stu.gender)
                + fieldCol('出生年月日', stu.birth)
                + fieldCol('身分證統一編號', stu.idNo)
                + fieldCol('餐食', stu.meal)
                + fieldCol('年級', stu.grade)
                + '</div>'
                + '</section>';
        }).join('');
    }

    document.querySelectorAll('.js-viewStudents').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var school = btn.getAttribute('data-school') || '';
            var subject = btn.getAttribute('data-subject') || '';
            titleEl.textContent = school + ' ' + subject + ' － 報名學生';
            bodyEl.innerHTML = renderStudents(SAMPLE_STUDENTS);
            modal.show();
        });
    });
})();
