// ============================================================
// 步驟精靈引擎（Vanilla JS，跨頁共用）
// 職責：步驟列渲染（狀態圓圈／副標／連接線）、面板切換、
//       步驟可自由點選瀏覽、步驟列捲動貼頂（is-pinned）
// 各頁面以 window.npmicsWizard.init(config) 掛載：
//   config.steps        步驟 key 順序陣列
//   config.getStepState 回傳 { status: 'done'|'pending'|'notstarted', sub: '副標文字' }
//                       （active 狀態由引擎依目前步驟自行判斷）
//   config.onStepChange 切換步驟後回呼（更新操作列等頁面邏輯）
// ============================================================
(function () {
    'use strict';

    var config = null;
    var currentStep = null;
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getPanel(key) {
        return document.querySelector('[data-step-panel="' + key + '"]');
    }

    function getItem(key) {
        return document.querySelector('.stepperLg-item[data-step-key="' + key + '"]');
    }

    // ---- 步驟列渲染：圓圈狀態＋副標＋連接線 ----
    function renderStepper() {
        config.steps.forEach(function (key, index) {
            var item = getItem(key);
            if (!item) { return; }
            var sub = item.querySelector('.stepperLg-sub');
            item.classList.remove('is-active', 'is-done', 'is-pending');
            item.removeAttribute('aria-current');

            var state = config.getStepState(key);
            if (key === currentStep) {
                item.classList.add('is-active');
                item.setAttribute('aria-current', 'step');
                sub.textContent = state.status === 'done' ? state.sub : '填寫中';
            } else {
                if (state.status === 'done') { item.classList.add('is-done'); }
                if (state.status === 'pending') { item.classList.add('is-pending'); }
                sub.textContent = state.sub;
            }

            // 連接線：該步驟完成時，其後方的線標記為完成
            var line = item.nextElementSibling;
            if (line && line.classList.contains('stepperLg-line')) {
                line.classList.toggle('is-done', state.status === 'done');
            }
        });
    }

    // 換頁後把新步驟的內容捲進可視範圍，扣除 sticky Header＋步驟列高度，尊重減少動態設定
    var SCROLL_OFFSET = 150;
    function scrollToPanel(panel) {
        if (!panel) { return; }
        var top = panel.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
        window.scrollTo({ top: top < 0 ? 0 : top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    // ---- 面板切換：步驟可自由點選瀏覽（能否「填寫」由各頁面另行鎖定）----
    function show(key) {
        if (config.steps.indexOf(key) === -1) { return; }
        currentStep = key;
        config.steps.forEach(function (stepKey) {
            var panel = getPanel(stepKey);
            if (panel) { panel.hidden = stepKey !== key; }
        });
        renderStepper();
        if (typeof config.onStepChange === 'function') { config.onStepChange(key); }
        scrollToPanel(getPanel(key));
    }

    // ---- 步驟列捲動貼頂：貼齊 Header 下緣時縮小圓圈、隱藏副標 ----
    function initStepperPin() {
        var bar = document.getElementById('wizardStepperBar');
        if (!bar) { return; }
        var stuckTop = parseFloat(window.getComputedStyle(bar).top) || 0;
        var ticking = false;
        var update = function () {
            ticking = false;
            bar.classList.toggle('is-pinned', bar.getBoundingClientRect().top <= stuckTop);
        };
        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    window.npmicsWizard = {
        init: function (options) {
            config = options;
            currentStep = options.steps[0];

            document.querySelectorAll('.stepperLg-item[data-step-key]').forEach(function (item) {
                item.addEventListener('click', function () {
                    show(item.getAttribute('data-step-key'));
                });
            });

            initStepperPin();
            renderStepper();
            if (typeof config.onStepChange === 'function') { config.onStepChange(currentStep); }
        },
        show: show,
        current: function () { return currentStep; },
        refresh: renderStepper
    };
})();
