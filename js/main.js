// ============================================================
// NPMICS 全站共用腳本（Vanilla JS）
// 職責：layout include、目前頁面標示、回到頂部、
//       密碼顯示切換、圖形驗證碼重新產生／語音播放
// ============================================================
(function () {
    'use strict';

    // ---- 共用 layout 載入（<div data-layout="layout/xxx.html"> 插槽）----
    function loadLayouts() {
        var slots = document.querySelectorAll('[data-layout]');
        if (!slots.length) {
            document.dispatchEvent(new CustomEvent('layout:loaded'));
            return;
        }
        var pending = slots.length;
        slots.forEach(function (slot) {
            fetch(slot.getAttribute('data-layout'))
                .then(function (res) { return res.text(); })
                .then(function (html) { slot.innerHTML = html; })
                .catch(function () { /* 離線或路徑錯誤時保留空插槽 */ })
                .finally(function () {
                    pending -= 1;
                    if (pending === 0) {
                        document.dispatchEvent(new CustomEvent('layout:loaded'));
                    }
                });
        });
    }

    // ---- 主選單目前頁面標示（aria-current="page"）----
    function markCurrentNav() {
        var file = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.header-nav a, .header-offcanvas .offcanvas-nav-link').forEach(function (link) {
            if (link.getAttribute('href') === file) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    // ---- 回到頂部：純 JS 座標計算平滑捲動（CLAUDE.md §4），尊重 reduced-motion ----
    function smoothScrollToTop() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo(0, 0);
            return;
        }
        var start = window.scrollY;
        var startTime = null;
        var DURATION = 420;
        var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
        var tick = function (now) {
            if (startTime === null) { startTime = now; }
            var progress = Math.min((now - startTime) / DURATION, 1);
            window.scrollTo(0, Math.round(start * (1 - easeOut(progress))));
            if (progress < 1) { window.requestAnimationFrame(tick); }
        };
        window.requestAnimationFrame(tick);
    }

    function initScrollTop() {
        var btn = document.querySelector('.scroll-top-btn');
        if (!btn) { return; }

        var toggle = function () {
            btn.classList.toggle('is-visible', window.scrollY > 320);
        };
        window.addEventListener('scroll', toggle, { passive: true });
        toggle();

        btn.addEventListener('click', function () {
            smoothScrollToTop();
            var main = document.getElementById('goCenter');
            if (main) { main.focus({ preventScroll: true }); }
        });
    }

    // ---- 密碼欄位顯示切換（.inputPasswordToggle[data-target]）----
    function initPasswordToggles() {
        document.querySelectorAll('.inputPasswordToggle[data-target]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = document.getElementById(btn.getAttribute('data-target'));
                if (!input) { return; }
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼');
                var icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye', show);
                    icon.classList.toggle('bi-eye-slash', !show);
                }
            });
        });
    }

    // ---- 圖形驗證碼：重新產生／語音播放（前端示意，正式由後端產生）----
    function randomCaptcha() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var out = [];
        for (var i = 0; i < 4; i++) {
            out.push(chars.charAt(Math.floor(Math.random() * chars.length)));
        }
        return out;
    }

    function renderCaptcha(box) {
        box.innerHTML = '';
        randomCaptcha().forEach(function (ch) {
            var span = document.createElement('span');
            span.textContent = ch;
            box.appendChild(span);
        });
    }

    function initCaptcha() {
        document.querySelectorAll('.js-captchaText').forEach(renderCaptcha);

        document.querySelectorAll('.js-captchaRefresh').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var field = btn.closest('.formField') || document;
                var box = field.querySelector('.js-captchaText');
                if (box) { renderCaptcha(box); }
            });
        });

        // 語音播放：以 SpeechSynthesis 逐字唸出目前驗證碼（正式環境改為後端語音檔）
        document.querySelectorAll('.js-captchaVoice').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var field = btn.closest('.formField') || document;
                var box = field.querySelector('.js-captchaText');
                if (!box || !('speechSynthesis' in window)) { return; }
                var text = box.textContent.trim().split('').join('，');
                var utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'zh-TW';
                utterance.rate = 0.8;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        loadLayouts();
        initScrollTop();
        initPasswordToggles();
        initCaptcha();
    });

    document.addEventListener('layout:loaded', function () {
        markCurrentNav();
    });
})();
