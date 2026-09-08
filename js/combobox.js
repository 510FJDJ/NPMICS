// ============================================================
// 可搜尋下拉（WAI-ARIA 1.2 combobox + listbox）共用元件（原生 JS）
// 結構：
//   <div class="combobox" data-combobox>
//     <input role="combobox" aria-expanded aria-controls aria-autocomplete="list">
//     <ul role="listbox"><li role="option">…</li></ul>
//   </div>
// 行為：點選/聚焦欄位展開清單；輸入即時過濾（不分大小寫子字串）；
//       ↑↓ 移動、Enter 選取、Esc 收合、點外部收合；
//       以 aria-activedescendant 標示目前高亮選項（螢幕閱讀器可讀）。
// ============================================================
(function () {
    'use strict';

    function initCombobox(root) {
        var input = root.querySelector('.combobox-input');
        var list = root.querySelector('.combobox-list');
        if (!input || !list) { return; }

        var options = Array.prototype.slice.call(list.querySelectorAll('.combobox-option'));

        // 查無結果提示（動態建立，非可選 option，僅供視覺與朗讀）
        var emptyNote = document.createElement('li');
        emptyNote.className = 'combobox-empty';
        emptyNote.setAttribute('role', 'status');
        emptyNote.textContent = '查無符合的項目';
        emptyNote.hidden = true;
        list.appendChild(emptyNote);

        var activeIndex = -1; // 目前高亮選項在「可見選項」中的索引

        function isOpen() {
            return input.getAttribute('aria-expanded') === 'true';
        }

        function visibleOptions() {
            return options.filter(function (opt) { return !opt.hidden; });
        }

        function filter() {
            var keyword = input.value.trim().toLowerCase();
            var anyVisible = false;
            options.forEach(function (opt) {
                var match = opt.textContent.toLowerCase().indexOf(keyword) !== -1;
                opt.hidden = !match;
                if (match) { anyVisible = true; }
            });
            emptyNote.hidden = anyVisible;
        }

        function clearActive() {
            options.forEach(function (opt) {
                opt.classList.remove('is-active');
                opt.removeAttribute('aria-selected');
            });
            input.removeAttribute('aria-activedescendant');
            activeIndex = -1;
        }

        function setActive(index) {
            var vis = visibleOptions();
            if (!vis.length) { clearActive(); return; }
            if (index < 0) { index = vis.length - 1; }
            if (index >= vis.length) { index = 0; }
            options.forEach(function (opt) {
                opt.classList.remove('is-active');
                opt.removeAttribute('aria-selected');
            });
            var opt = vis[index];
            opt.classList.add('is-active');
            opt.setAttribute('aria-selected', 'true');
            input.setAttribute('aria-activedescendant', opt.id);
            activeIndex = index;
            // 讓高亮選項保持在可視範圍
            var top = opt.offsetTop;
            var bottom = top + opt.offsetHeight;
            if (top < list.scrollTop) {
                list.scrollTop = top;
            } else if (bottom > list.scrollTop + list.clientHeight) {
                list.scrollTop = bottom - list.clientHeight;
            }
        }

        function open() {
            if (isOpen()) { return; }
            filter();
            list.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        }

        function close() {
            if (!isOpen()) { return; }
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            clearActive();
        }

        function selectOption(opt) {
            input.value = opt.textContent;
            close();
            input.focus();
        }

        input.addEventListener('focus', open);
        input.addEventListener('click', open);

        input.addEventListener('input', function () {
            open();
            filter();
            clearActive();
        });

        input.addEventListener('keydown', function (e) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (!isOpen()) { open(); setActive(0); }
                    else { setActive(activeIndex + 1); }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!isOpen()) { open(); setActive(visibleOptions().length - 1); }
                    else { setActive(activeIndex - 1); }
                    break;
                case 'Enter':
                    if (isOpen() && activeIndex > -1) {
                        e.preventDefault(); // 選取時不送出表單
                        selectOption(visibleOptions()[activeIndex]);
                    }
                    break;
                case 'Escape':
                    if (isOpen()) { e.preventDefault(); close(); }
                    break;
                default:
                    break;
            }
        });

        // 以 mousedown 處理選取：先於 input 的 blur，避免點擊落空
        list.addEventListener('mousedown', function (e) {
            var opt = e.target.closest('.combobox-option');
            if (!opt) { return; }
            e.preventDefault();
            selectOption(opt);
        });

        // 點擊元件外部即收合
        document.addEventListener('click', function (e) {
            if (!root.contains(e.target)) { close(); }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        Array.prototype.forEach.call(
            document.querySelectorAll('[data-combobox]'),
            initCombobox
        );
    });
})();
