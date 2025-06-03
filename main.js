// ==UserScript==
// @name         Discord Media Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Preview images + videos in a table, select which to ZIP, and bypass CORS using GM_xmlhttpRequest. Shows status modal with success/failure counts.
// @author       DestCom
// @match        https://discord.com/channels/*
// @grant        GM_xmlhttpRequest
// @connect      cdn.discordapp.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @license      CC-BY-NC-4.0
// ==/UserScript==
 
(function() {
    'use strict';
 
    //////////////////////////////////////////////////////
    // 1. CREATE “EXPORT MEDIA” BUTTON
    //////////////////////////////////////////////////////
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥 Export Media';
    Object.assign(exportBtn.style, {
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: 1000,
        padding: '8px 12px',
        backgroundColor: '#7289DA',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(exportBtn);
 
    //////////////////////////////////////////////////////
    // 2. BUILD THE MAIN MODAL (Media Preview)
    //////////////////////////////////////////////////////
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'dme-modal-overlay';
    Object.assign(modalOverlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        overflowY: 'auto'
    });
 
    const modalContent = document.createElement('div');
    modalContent.id = 'dme-modal-content';
    Object.assign(modalContent.style, {
        backgroundColor: '#2F3136',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflowY: 'auto',
        color: '#FFFFFF',
        boxSizing: 'border-box'
    });
 
    const modalHeader = document.createElement('div');
    Object.assign(modalHeader.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    });
 
    const headerTitle = document.createElement('h2');
    headerTitle.id = 'dme-modal-title';
    headerTitle.textContent = 'Media Preview (0/0)';
    Object.assign(headerTitle.style, {
        margin: '0',
        fontSize: '18px'
    });
 
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✖';
    Object.assign(closeBtn.style, {
        background: 'none',
        border: 'none',
        color: '#CCC',
        fontSize: '20px',
        cursor: 'pointer'
    });
    closeBtn.title = 'Close';
 
    modalHeader.appendChild(headerTitle);
    modalHeader.appendChild(closeBtn);
 
    const tableContainer = document.createElement('div');
    tableContainer.id = 'dme-table-container';
    Object.assign(tableContainer.style, {
        overflowX: 'auto',
        backgroundColor: '#2F3136'
    });
 
    const table = document.createElement('table');
    table.id = 'dme-media-table';
    Object.assign(table.style, {
        width: '100%',
        borderCollapse: 'collapse',
        color: '#FFFFFF'
    });
 
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['#', 'Filename', 'Type', 'Include'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        Object.assign(th.style, {
            borderBottom: '2px solid #40444B',
            padding: '8px',
            textAlign: 'left',
            fontSize: '14px'
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
 
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);
 
    const modalFooter = document.createElement('div');
    Object.assign(modalFooter.style, {
        marginTop: '16px',
        textAlign: 'right'
    });
    const downloadSelectedBtn = document.createElement('button');
    downloadSelectedBtn.textContent = 'Download Selected Media';
    Object.assign(downloadSelectedBtn.style, {
        padding: '8px 14px',
        backgroundColor: '#43B581',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    });
    modalFooter.appendChild(downloadSelectedBtn);
 
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(tableContainer);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
 
    //////////////////////////////////////////////////////
    // 3. BUILD THE STATUS MODAL (Success/Failure)
    //////////////////////////////////////////////////////
    const statusOverlay = document.createElement('div');
    statusOverlay.id = 'dme-status-overlay';
    Object.assign(statusOverlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000,
        overflowY: 'auto'
    });
 
    const statusContent = document.createElement('div');
    statusContent.id = 'dme-status-content';
    Object.assign(statusContent.style, {
        backgroundColor: '#2F3136',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '400px',
        color: '#FFFFFF',
        boxSizing: 'border-box',
        textAlign: 'center'
    });
 
    const statusMessage = document.createElement('p');
    Object.assign(statusMessage.style, {
        margin: '0 0 12px 0',
        fontSize: '16px'
    });
 
    const statusOkBtn = document.createElement('button');
    statusOkBtn.textContent = 'OK';
    Object.assign(statusOkBtn.style, {
        padding: '8px 14px',
        backgroundColor: '#43B581',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    });
 
    statusContent.appendChild(statusMessage);
    statusContent.appendChild(statusOkBtn);
    statusOverlay.appendChild(statusContent);
    document.body.appendChild(statusOverlay);
 
    //////////////////////////////////////////////////////
    // 4. UTILITIES
    //////////////////////////////////////////////////////
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
 
    function getMessageContainer() {
        return document.querySelector('[aria-label="Messages"]');
    }
 
    async function loadAllMessages() {
        const container = getMessageContainer();
        if (!container) return;
        await sleep(500);
 
        let previousHeight = -1;
        for (let i = 0; i < 50; i++) {
            const currentHeight = container.scrollHeight;
            if (currentHeight === previousHeight) break;
            previousHeight = currentHeight;
            container.scrollTop = 0;
            await sleep(1000);
        }
        await sleep(2000);
    }
 
    function collectMediaLinks() {
        const urls = new Set();
 
        function sanitize(raw) {
            return raw.replace(/[&;]+$/,'');
        }
 
        document.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.includes('cdn.discordapp.com/attachments')) {
                const full = href.split('?')[0] + (href.includes('?') ? href.slice(href.indexOf('?')) : '');
                urls.add(sanitize(full));
            }
        });
 
        document.querySelectorAll('video').forEach(v => {
            const src = v.getAttribute('src');
            if (src && src.includes('cdn.discordapp.com/attachments')) {
                const full = src.split('?')[0] + (src.includes('?') ? src.slice(src.indexOf('?')) : '');
                urls.add(sanitize(full));
            }
        });
 
        document.querySelectorAll('source').forEach(source => {
            const src = source.getAttribute('src');
            if (src && src.includes('cdn.discordapp.com/attachments')) {
                const full = src.split('?')[0] + (src.includes('?') ? src.slice(src.indexOf('?')) : '');
                urls.add(sanitize(full));
            }
        });
 
        document.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.includes('cdn.discordapp.com/attachments')) {
                const full = src.split('?')[0] + (src.includes('?') ? src.slice(src.indexOf('?')) : '');
                urls.add(sanitize(full));
            }
        });
 
        return Array.from(urls);
    }
 
    function isImageUrl(url) {
        return /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url);
    }
 
    function isVideoUrl(url) {
        return /\.(mp4|webm|mov)(?:\?|$)/i.test(url);
    }
 
    function updateHeaderCount(selectedCount, totalCount) {
        headerTitle.textContent = `Media Preview (${selectedCount}/${totalCount})`;
    }
 
    function openModal() {
        modalOverlay.style.display = 'flex';
    }
 
    function closeModal() {
        modalOverlay.style.display = 'none';
        tbody.innerHTML = '';
    }
 
    function openStatus(messageText) {
        statusMessage.textContent = messageText;
        statusOverlay.style.display = 'flex';
    }
 
    function closeStatus() {
        statusOverlay.style.display = 'none';
    }
 
    // Promisified GM_xmlhttpRequest to fetch ArrayBuffer
    function gmFetchArrayBuffer(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: res => {
                    if (res.status >= 200 && res.status < 300 && res.response) {
                        resolve(res.response);
                    } else {
                        reject(new Error(`Status ${res.status}`));
                    }
                },
                onerror: err => reject(err),
                ontimeout: () => reject(new Error('Timeout')),
            });
        });
    }
 
    //////////////////////////////////////////////////////
    // 5. DOWNLOAD LOGIC WITH STATUS
    //////////////////////////////////////////////////////
    async function downloadCheckedMedia() {
        const checkedRows = Array.from(tbody.querySelectorAll('tr')).filter(tr => {
            const checkbox = tr.querySelector('input[type="checkbox"]');
            return checkbox && checkbox.checked;
        });
 
        if (checkedRows.length === 0) {
            openStatus('No files selected to download.');
            return;
        }
 
        const zip = new JSZip();
        let successCount = 0;
        let failureCount = 0;
 
        downloadSelectedBtn.disabled = true;
        downloadSelectedBtn.textContent = `⏳ Zipping 0/${checkedRows.length}…`;
 
        for (let i = 0; i < checkedRows.length; i++) {
            const row = checkedRows[i];
            const url = row.dataset.url;
            try {
                const arrBuf = await gmFetchArrayBuffer(url);
                const blob = new Blob([arrBuf]);
                const filename = new URL(url).pathname.split('/').pop();
                zip.file(filename, blob);
                successCount++;
            } catch (err) {
                console.warn('[DME] Failed to fetch', url, err);
                failureCount++;
            }
            downloadSelectedBtn.textContent = `⏳ Zipping ${Math.min(successCount + failureCount, checkedRows.length)}/${checkedRows.length}…`;
        }
 
        if (successCount > 0) {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, 'discord_media.zip');
            openStatus(`${successCount} file(s) downloaded successfully, ${failureCount} failed.`);
        } else {
            openStatus('No files could be downloaded. Please check your network or permissions.');
        }
 
        downloadSelectedBtn.textContent = 'Download Selected Media';
        downloadSelectedBtn.disabled = false;
        closeModal();
    }
 
    //////////////////////////////////////////////////////
    // 6. EVENT BINDINGS
    //////////////////////////////////////////////////////
    exportBtn.addEventListener('click', async () => {
        exportBtn.disabled = true;
        exportBtn.textContent = '⏳ Loading messages…';
 
        await loadAllMessages();
 
        exportBtn.textContent = '⏳ Collecting media links…';
        const mediaLinks = collectMediaLinks();
 
        if (mediaLinks.length === 0) {
            openStatus('No media found in this channel.');
            exportBtn.textContent = '📥 Export Media';
            exportBtn.disabled = false;
            return;
        }
 
        tbody.innerHTML = '';
        const totalCount = mediaLinks.length;
        let selectedCount = totalCount;
        updateHeaderCount(selectedCount, totalCount);
 
        mediaLinks.forEach((url, index) => {
            const tr = document.createElement('tr');
            tr.dataset.url = url;
 
            const tdIndex = document.createElement('td');
            tdIndex.textContent = (index + 1).toString();
            Object.assign(tdIndex.style, {
                borderBottom: '1px solid #40444B',
                padding: '6px 8px',
                fontSize: '14px',
                width: '40px'
            });
 
            const tdFilename = document.createElement('td');
            tdFilename.textContent = new URL(url).pathname.split('/').pop();
            Object.assign(tdFilename.style, {
                borderBottom: '1px solid #40444B',
                padding: '6px 8px',
                fontSize: '14px'
            });
 
            const tdType = document.createElement('td');
            tdType.textContent = isImageUrl(url) ? 'Image' : (isVideoUrl(url) ? 'Video' : 'Unknown');
            Object.assign(tdType.style, {
                borderBottom: '1px solid #40444B',
                padding: '6px 8px',
                fontSize: '14px',
                width: '80px'
            });
 
            const tdCheck = document.createElement('td');
            Object.assign(tdCheck.style, {
                borderBottom: '1px solid #40444B',
                padding: '6px 8px',
                textAlign: 'center',
                width: '60px'
            });
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.addEventListener('change', () => {
                selectedCount = Array.from(tbody.querySelectorAll('input[type="checkbox"]'))
                                    .filter(cb => cb.checked).length;
                updateHeaderCount(selectedCount, totalCount);
            });
            tdCheck.appendChild(checkbox);
 
            tr.appendChild(tdIndex);
            tr.appendChild(tdFilename);
            tr.appendChild(tdType);
            tr.appendChild(tdCheck);
            tbody.appendChild(tr);
        });
 
        openModal();
        exportBtn.textContent = '📥 Export Media';
        exportBtn.disabled = false;
 
        downloadSelectedBtn.onclick = async () => {
            await downloadCheckedMedia();
        };
    });
 
    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeModal();
    });
 
    statusOkBtn.addEventListener('click', closeStatus);
    statusOverlay.addEventListener('click', e => {
        if (e.target === statusOverlay) closeStatus();
    });
 
})();
