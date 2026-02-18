// ==UserScript==
// @name         Nayoh Google Search Shortcuts
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds customizable search shortcuts with dynamic tab support.
// @author       Nayoh
// @match        *://www.google.com/search?*
// @match        *://www.google.com.br/search?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const DEFAULT_CONFIG = [
        { term: " Steam", text: "Steam", tbm: null },
        { term: " MyAnimeList", text: "MyAnimeList", tbm: null },
        { term: " MyDramaList", text: "MyDramaList", tbm: null },
        { term: " site:simkl.com/movies", text: "Simkl (Movies)", tbm: null },
        { term: " site:simkl.com/tv", text: "Simkl (Shows)", tbm: null },
        { term: " GitHub", text: "GitHub", tbm: null },
        { term: " Full Gameplay No Commentary", text: "Full Gameplay (Video)", tbm: 'vid' },
        { term: " Game", text: "Game", tbm: null },
        { term: " Anime", text: "Anime", tbm: null },
        { term: " Show", text: "Show", tbm: null },
        { term: " Movie", text: "Movie", tbm: null },
        { term: " site:igg-games.cc", text: "IGG", tbm: null },
        { term: " Torrent", text: "Torrent", tbm: null }
    ];

    let BUTTON_CONFIGS;
    try {
        let savedData = GM_getValue('nayoh_btns_v3');
        BUTTON_CONFIGS = savedData ? JSON.parse(savedData) : DEFAULT_CONFIG;
    } catch (e) {
        BUTTON_CONFIGS = DEFAULT_CONFIG;
    }

    const activeBtnText = sessionStorage.getItem('nayoh_active_btn');
    sessionStorage.setItem('nayoh_active_btn', null);

    const lastTermAdded = GM_getValue('nayoh_last_term', '');

    let editingIndex = -1;

    function saveToStorage() {
        GM_setValue('nayoh_btns_v3', JSON.stringify(BUTTON_CONFIGS));
        updateMainBar();
    }

    function showConfigMenu() {
        if (document.getElementById('nayoh-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'nayoh-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #202124; color: white; padding: 25px; border-radius: 12px;
            border: 1px solid #5f6368; z-index: 10001; font-family: Segoe UI, Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6); width: 450px;
        `;
        modal.innerHTML = `
            <h3 style="margin-top:0; color:#e8eaed; border-bottom:1px solid #3c4043; padding-bottom:10px">Settings</h3>
            <div style="display:grid; gap:10px; margin-bottom:20px">
                <input type="text" id="n-name" placeholder="Label" style="padding:10px; border-radius:6px; border:1px solid #5f6368; background:#303134; color:white">
                <input type="text" id="n-term" placeholder="Search Term" style="padding:10px; border-radius:6px; border:1px solid #5f6368; background:#303134; color:white">
                <select id="n-tbm" style="padding:10px; border-radius:6px; border:1px solid #5f6368; background:#303134; color:white">
                    <option value="">Tab: All</option>
                    <option value="current">Tab: Current</option>
                    <option value="isch">Tab: Images</option>
                    <option value="vid">Tab: Videos</option>
                    <option value="nws">Tab: News</option>
                    <option value="bks">Tab: Books</option>
                    <option value="udm14">Tab: Web</option>
                    <option value="udm39">Tab: Short Videos</option>
                </select>
                <div style="display:flex; gap:10px">
                   <button id="n-add" style="flex:2; padding:10px; background:#8ab4f8; color:#202124; border:none; border-radius:6px; cursor:pointer; font-weight:bold">Add Button</button>
                   <button id="n-cancel" style="flex:1; display:none; padding:10px; background:#3c4043; color:white; border:none; border-radius:6px; cursor:pointer;">Cancel</button>
                </div>
            </div>
            <div id="n-list" style="max-height: 200px; overflow-y: auto; background:#171717; border-radius:6px; padding:10px"></div>
            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                <button id="n-reset" style="background:transparent; color:#f28b82; border:1px solid #f28b82; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px;">Reset Default</button>
                <button id="n-close" style="background:transparent; color:#8ab4f8; border:none; cursor:pointer; font-weight:bold">Close</button>
            </div>
        `;
        document.body.appendChild(modal);

        const listDiv = modal.querySelector('#n-list');
        const nameInp = document.getElementById('n-name');
        const termInp = document.getElementById('n-term');
        const tbmSel = document.getElementById('n-tbm');
        const addBtn = document.getElementById('n-add');
        const cancelBtn = document.getElementById('n-cancel');

        const renderList = () => {
            listDiv.innerHTML = '';
            BUTTON_CONFIGS.forEach((btn, index) => {
                let modeLabel = btn.tbm === 'current' ? 'Current' : (btn.tbm === 'isch' ? 'Images' : (btn.tbm === 'vid' ? 'Videos' : (btn.tbm === 'nws' ? 'News' : (btn.tbm === 'bks' ? 'Books' : (btn.tbm === 'udm14' ? 'Web' : (btn.tbm === 'udm39' ? 'Shorts' : 'All'))))));
                const item = document.createElement('div');
                item.style.cssText = `display:flex; flex-direction:column; padding:8px; border-bottom:1px solid #3c4043; font-size:12px; position:relative;`;
                if(editingIndex === index) item.style.opacity = "0.3";
                item.innerHTML = `
                    <div style="font-weight:bold; color:#8ab4f8">${btn.text} <span style="font-weight:normal; color:#9aa0a6; margin-left:8px">[${modeLabel}]</span></div>
                    <div style="color:#bdc1c6; font-style:italic; font-size:11px">${btn.term}</div>
                    <div style="position:absolute; right:5px; top:12px;">
                        <span style="color:#8ab4f8; cursor:pointer; margin-right:10px" class="n-edit-btn" data-idx="${index}">[Edit]</span>
                        <span style="color:#f28b82; cursor:pointer" class="n-del-btn" data-idx="${index}">[X]</span>
                    </div>
                `;
                listDiv.appendChild(item);
            });
        };

        addBtn.onclick = () => {
            if(!nameInp.value || !termInp.value) return;
            const newBtn = { text: nameInp.value, term: termInp.value.startsWith(' ') ? termInp.value : ' ' + termInp.value, tbm: tbmSel.value || null };
            if(editingIndex > -1) BUTTON_CONFIGS[editingIndex] = newBtn;
            else BUTTON_CONFIGS.push(newBtn);
            saveToStorage();
            resetForm();
        };

        const resetForm = () => {
            editingIndex = -1; nameInp.value = ''; termInp.value = ''; tbmSel.value = '';
            addBtn.textContent = 'Add Button'; addBtn.style.background = '#8ab4f8';
            cancelBtn.style.display = 'none'; renderList();
        };

        cancelBtn.onclick = resetForm;
        modal.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (e.target.classList.contains('n-del-btn')) { BUTTON_CONFIGS.splice(idx, 1); saveToStorage(); renderList(); }
            if (e.target.classList.contains('n-edit-btn')) {
                editingIndex = idx; const btn = BUTTON_CONFIGS[idx];
                nameInp.value = btn.text; termInp.value = btn.term.trim(); tbmSel.value = btn.tbm || "";
                addBtn.textContent = 'Update Button'; addBtn.style.background = '#f28b82';
                cancelBtn.style.display = 'block'; renderList();
            }
        });
        modal.querySelector('#n-reset').onclick = () => { if (confirm("Reset?")) { GM_deleteValue('nayoh_btns_v3'); GM_deleteValue('nayoh_last_term'); location.reload(); }};
        modal.querySelector('#n-close').onclick = () => { modal.remove(); };
        renderList();
    }

    GM_registerMenuCommand("Manage Buttons", showConfigMenu);

    function updateMainBar() {
        if (!contentWrapper) return;
        contentWrapper.innerHTML = '';

        const clearBtn = document.createElement('a');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = `color: #f28b82; font-size: 14px; font-weight: bold; margin-right: 20px; padding: 4px 8px; cursor: pointer; text-decoration: none; flex-shrink: 0;`;
        clearBtn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.setItem('nayoh_active_btn', null);
            handleButtonClick(e, '', 'keep');
        };
        contentWrapper.appendChild(clearBtn);

        BUTTON_CONFIGS.forEach(config => {
            const btn = document.createElement('a');
            btn.textContent = config.text;

            const isSelected = (activeBtnText === config.text);
            const idleColor = '#80867D';
            const activeColor = '#FFFFFF';

            btn.style.cssText = `color: ${isSelected ? activeColor : idleColor}; font-size: 14px; font-weight: bold; margin-right: 20px; padding: 4px 8px; cursor: pointer; text-decoration: none; transition: 0.1s; flex-shrink: 0;`;

            btn.onmouseover = () => { if(!isSelected) btn.style.color = '#E8E8DB'; };
            btn.onmouseout = () => { if(!isSelected) btn.style.color = idleColor; };

            btn.onclick = (e) => {
                sessionStorage.setItem('nayoh_active_btn', config.text);
                GM_setValue('nayoh_last_term', config.term);
                handleButtonClick(e, config.term, config.tbm);
            };
            contentWrapper.appendChild(btn);
        });
    }

    function handleButtonClick(event, termToAdd, modeValue) {
        event.preventDefault();
        let url = new URL(window.location.href);
        let query = (url.searchParams.get('q') || '').trim();

        if (lastTermAdded) {
            const termToMatch = lastTermAdded.trim();
            if (query.toLowerCase().endsWith(termToMatch.toLowerCase())) {
                query = query.substring(0, query.length - termToMatch.length).trimEnd();
            }
        }

        let finalQuery = query.trim().replace(/\s+/g, ' ') + termToAdd;
        let cleanUrl = new URL(url.pathname, url.origin);
        cleanUrl.searchParams.set('q', finalQuery);

        if (modeValue === 'keep' || modeValue === 'current') {
            if (url.searchParams.has('tbm')) cleanUrl.searchParams.set('tbm', url.searchParams.get('tbm'));
            if (url.searchParams.has('udm')) cleanUrl.searchParams.set('udm', url.searchParams.get('udm'));
        } else if (modeValue === 'udm14') {
            cleanUrl.searchParams.set('udm', '14');
        } else if (modeValue === 'udm39') {
            cleanUrl.searchParams.set('udm', '39');
        } else if (modeValue) {
            cleanUrl.searchParams.set('tbm', modeValue);
        }

        if (termToAdd === '') GM_setValue('nayoh_last_term', '');
        window.location.href = cleanUrl.toString();
    }

    let customContainer, contentWrapper, filterBar, placeholder;
    function applyPositioning() {
        if (!customContainer || !filterBar) return;
        const rect = filterBar.getBoundingClientRect();
        customContainer.style.top = `${rect.bottom + window.scrollY + 5}px`;
        customContainer.style.width = `100%`;
        contentWrapper.style.paddingLeft = `${rect.left + 15}px`;
        if (placeholder) placeholder.style.height = `${customContainer.offsetHeight + 5}px`;
    }

    function createCustomBar() {
        filterBar = document.querySelector('div[role="navigation"]');
        if (!filterBar || document.getElementById('custom-filters-container')) return;
        placeholder = document.createElement('div'); placeholder.id = 'custom-bar-placeholder';
        filterBar.insertAdjacentElement('afterend', placeholder);
        customContainer = document.createElement('div');
        customContainer.id = 'custom-filters-container';
        customContainer.style.cssText = `position:absolute; left:0; border-bottom:1px solid #313335; z-index:126; visibility:hidden; background: transparent; width: 100%; overflow-x: auto;`;
        contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `padding:8px 15px 8px 0; display:flex; align-items:center; white-space:nowrap; min-width: max-content; box-sizing:border-box;`;
        customContainer.appendChild(contentWrapper);
        document.body.appendChild(customContainer);
        updateMainBar();
        applyPositioning();
        customContainer.style.visibility = 'visible';
    }

    window.addEventListener('resize', applyPositioning);
    window.addEventListener('scroll', applyPositioning);
    new MutationObserver(() => {
        if (!document.getElementById('custom-filters-container')) createCustomBar();
        else applyPositioning();
    }).observe(document.body, { childList: true, subtree: true });
    createCustomBar();
})();