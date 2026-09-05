/* ==========================================
   NOMANA
   v1 Markdown compatibility pass
========================================== */


/* ==========================================
   DOM
========================================== */

const visualEditor =
    document.getElementById("visualEditor");

const markdownEditor =
    document.getElementById("markdownEditor");

const splitMarkdownEditor =
    document.getElementById("splitMarkdownEditor");

const markdownPreview =
    document.getElementById("markdownPreview");

const documentTitle =
    document.getElementById("documentTitle");

const wordCount =
    document.getElementById("wordCount");

const characterCount =
    document.getElementById("characterCount");

const saveStatus =
    document.getElementById("saveStatus");

const documentList =
    document.getElementById("documentList");

const documentCount =
    document.getElementById("documentCount");

const folderCount =
    document.getElementById("folderCount");

const newDocumentButton =
    document.getElementById("newDocumentButton");

const newFolderButton =
    document.getElementById("newFolderButton");

const deleteDocumentButton =
    document.getElementById("deleteDocumentButton");

const documentFolderSelect =
    document.getElementById("documentFolderSelect");

const downloadButton =
    document.getElementById("downloadButton");

const exportMenuButton =
    document.getElementById("exportMenuButton");

const exportMenu =
    document.getElementById("exportMenu");

const exportHtmlButton =
    document.getElementById("exportHtmlButton");

const exportPdfButton =
    document.getElementById("exportPdfButton");

const importButton =
    document.getElementById("importButton");

const markdownFileInput =
    document.getElementById("markdownFileInput");

const folderButton =
    document.getElementById("folderButton");

const folderInput =
    document.getElementById("folderInput");

const projectBadge =
    document.getElementById("projectBadge");

const statusMode =
    document.getElementById("statusMode");

const visualView =
    document.getElementById("visualView");

const markdownView =
    document.getElementById("markdownView");

const splitView =
    document.getElementById("splitView");

const viewButtons =
    document.querySelectorAll(".view-button");

const documentSearch =
    document.getElementById("documentSearch");

const clearSearchButton =
    document.getElementById("clearSearchButton");

const searchResultsInfo =
    document.getElementById("searchResultsInfo");

const headingSelect =
    document.getElementById("headingSelect");


/* ==========================================
   STATE
========================================== */

const DEFAULT_MARKDOWN = `# Welcome to Nomana

A document workspace with **Markdown underneath**.

## What Nomana can do

- [x] Create multiple documents
- [x] Organise documents into folders
- [x] Drag documents between folders
- [x] Import Markdown files
- [x] Open complete project folders
- [x] Display local project images
- [x] Persist project assets
- [x] Search across documents
- [x] Use keyboard shortcuts
- [x] Render GitHub-style Markdown

## Example table

| Feature | Status |
| --- | --- |
| Visual editing | Ready |
| Markdown editing | Ready |
| Project folders | Ready |
| Search | Ready |

## Example code

\`\`\`javascript
function helloNomana() {
    console.log("Hello from Nomana");
}
\`\`\`

> Write naturally. Keep Markdown underneath.
`;


let documents = [];
let folders = [];

let activeDocumentId = null;

let currentView = "visual";

let searchQuery = "";

let saveTimer;

let database = null;

let draggedDocumentId = null;

const projectAssets =
    new Map();


/* ==========================================
   GENERAL HELPERS
========================================== */

function generateId(prefix = "id") {

    return (
        prefix +
        "-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );

}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


function escapeRegExp(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


function normalizePath(path) {

    if (!path) {
        return "";
    }


    let decoded = path;


    try {

        decoded =
            decodeURIComponent(path);

    }

    catch {

        decoded = path;

    }


    return decoded
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/^\/+/, "");

}


function canonicalPath(path) {

    const normalized =
        normalizePath(path);


    const parts =
        normalized.split("/");


    const result = [];


    for (const part of parts) {

        if (
            !part ||
            part === "."
        ) {
            continue;
        }


        if (
            part === ".."
        ) {

            result.pop();

            continue;

        }


        result.push(part);

    }


    return result.join("/");

}


/* ==========================================
   SEARCH HELPERS
========================================== */

function getPlainMarkdownText(markdown) {

    return (
        markdown ||
        ""
    )
        .replace(
            /!\[([^\]]*)\]\([^)]+\)/g,
            "$1 "
        )
        .replace(
            /\[([^\]]+)\]\([^)]+\)/g,
            "$1"
        )
        .replace(
            /```[\s\S]*?```/g,
            " "
        )
        .replace(
            /^\s*\|?/gm,
            ""
        )
        .replace(
            /[#>*_~`+\-|]/g,
            " "
        )
        .replace(
            /\[[ xX]\]/g,
            " "
        )
        .replace(
            /^\s*\d+[.)]\s+/gm,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


function getSearchMatch(
    doc,
    query
) {

    const cleanQuery =
        query.trim();


    if (!cleanQuery) {
        return "";
    }


    const title =
        doc.title || "";


    if (
        title
            .toLowerCase()
            .includes(
                cleanQuery.toLowerCase()
            )
    ) {

        return title;

    }


    const text =
        getPlainMarkdownText(
            doc.markdown
        );


    const index =
        text
            .toLowerCase()
            .indexOf(
                cleanQuery.toLowerCase()
            );


    if (
        index === -1
    ) {

        return "";

    }


    const context = 45;


    const start =
        Math.max(
            0,
            index - context
        );


    const end =
        Math.min(
            text.length,
            index +
            cleanQuery.length +
            context
        );


    let result =
        text.slice(
            start,
            end
        );


    if (start > 0) {
        result = "…" + result;
    }


    if (end < text.length) {
        result += "…";
    }


    return result;

}


function highlightSearchMatch(
    text,
    query
) {

    const safeText =
        escapeHTML(text);


    const cleanQuery =
        query.trim();


    if (!cleanQuery) {
        return safeText;
    }


    const regex =
        new RegExp(
            "(" +
            escapeRegExp(
                escapeHTML(
                    cleanQuery
                )
            ) +
            ")",
            "gi"
        );


    return safeText.replace(
        regex,
        "<mark>$1</mark>"
    );

}


/* ==========================================
   INDEXEDDB
========================================== */

function openNomanaDatabase() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    "NomanaDB",
                    1
                );


            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames
                            .contains("assets")
                    ) {

                        const store =
                            db.createObjectStore(
                                "assets",
                                {
                                    keyPath:
                                        "key"
                                }
                            );


                        store.createIndex(
                            "documentId",
                            "documentId",
                            {
                                unique:
                                    false
                            }
                        );

                    }

                };


            request.onsuccess =
                event => {

                    database =
                        event.target.result;

                    resolve(database);

                };


            request.onerror =
                event => {

                    reject(
                        event.target.error
                    );

                };

        }
    );

}


function saveAssetsToDatabase(
    documentId,
    assetFiles
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                reject(
                    new Error(
                        "Database unavailable."
                    )
                );

                return;

            }


            const transaction =
                database.transaction(
                    "assets",
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    "assets"
                );


            assetFiles.forEach(
                asset => {

                    const path =
                        canonicalPath(
                            asset.path
                        );


                    store.put({

                        key:
                            documentId +
                            "::" +
                            path,

                        documentId,

                        path,

                        blob:
                            asset.file,

                        type:
                            asset.file.type ||
                            ""

                    });

                }
            );


            transaction.oncomplete =
                () => resolve();


            transaction.onerror =
                () => reject(
                    transaction.error
                );

        }
    );

}


function getAssetsFromDatabase(
    documentId
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                resolve([]);

                return;

            }


            const transaction =
                database.transaction(
                    "assets",
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    "assets"
                );


            const index =
                store.index(
                    "documentId"
                );


            const request =
                index.getAll(
                    documentId
                );


            request.onsuccess =
                () => {

                    resolve(
                        request.result ||
                        []
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


function deleteAssetsFromDatabase(
    documentId
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                resolve();

                return;

            }


            const transaction =
                database.transaction(
                    "assets",
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    "assets"
                );


            const index =
                store.index(
                    "documentId"
                );


            const request =
                index.openCursor(
                    IDBKeyRange.only(
                        documentId
                    )
                );


            request.onsuccess =
                event => {

                    const cursor =
                        event.target.result;


                    if (cursor) {

                        store.delete(
                            cursor.primaryKey
                        );


                        cursor.continue();

                    }

                };


            transaction.oncomplete =
                () => resolve();


            transaction.onerror =
                () => reject(
                    transaction.error
                );

        }
    );

}


/* ==========================================
   PROJECT ASSETS
========================================== */

function releaseRuntimeAssets(
    documentId
) {

    const assets =
        projectAssets.get(
            documentId
        );


    if (!assets) {
        return;
    }


    for (
        const url
        of assets.values()
    ) {

        if (
            typeof url === "string" &&
            url.startsWith("blob:")
        ) {

            URL.revokeObjectURL(
                url
            );

        }

    }


    projectAssets.delete(
        documentId
    );

}


async function hydrateProjectAssets(
    documentId
) {

    if (
        projectAssets.has(
            documentId
        )
    ) {

        return;

    }


    const records =
        await getAssetsFromDatabase(
            documentId
        );


    const assetMap =
        new Map();


    records.forEach(
        record => {

            assetMap.set(
                canonicalPath(
                    record.path
                ),
                URL.createObjectURL(
                    record.blob
                )
            );

        }
    );


    projectAssets.set(
        documentId,
        assetMap
    );

}


function getMarkdownBaseDirectory(
    doc
) {

    if (
        !doc ||
        !doc.sourceMarkdownPath
    ) {

        return "";

    }


    const path =
        normalizePath(
            doc.sourceMarkdownPath
        );


    const slash =
        path.lastIndexOf("/");


    if (
        slash === -1
    ) {

        return "";

    }


    return path.substring(
        0,
        slash
    );

}


function resolveAssetPath(
    documentId,
    imagePath
) {

    if (!imagePath) {
        return "";
    }


    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:") ||
        imagePath.startsWith("blob:")
    ) {

        return imagePath;

    }


    const assets =
        projectAssets.get(
            documentId
        );


    if (!assets) {
        return imagePath;
    }


    const doc =
        documents.find(
            item =>
                item.id ===
                documentId
        );


    const rawPath =
        imagePath
            .split("#")[0]
            .split("?")[0];


    const baseDirectory =
        getMarkdownBaseDirectory(
            doc
        );


    const requestedPath =
        canonicalPath(
            baseDirectory
                ? baseDirectory +
                    "/" +
                    rawPath
                : rawPath
        );


    if (
        assets.has(
            requestedPath
        )
    ) {

        return assets.get(
            requestedPath
        );

    }


    const lower =
        requestedPath
            .toLowerCase();


    for (
        const [
            assetPath,
            url
        ]
        of assets.entries()
    ) {

        if (
            assetPath
                .toLowerCase() ===
            lower
        ) {

            return url;

        }

    }


    return imagePath;

}


/* ==========================================
   STORAGE
========================================== */

function loadDocuments() {

    const savedDocuments =
        localStorage.getItem(
            "nomana-documents"
        );


    const savedFolders =
        localStorage.getItem(
            "nomana-folders"
        );


    const savedActive =
        localStorage.getItem(
            "nomana-active-document"
        );


    if (savedDocuments) {

        try {

            documents =
                JSON.parse(
                    savedDocuments
                );

        }

        catch {

            documents = [];

        }

    }


    if (savedFolders) {

        try {

            folders =
                JSON.parse(
                    savedFolders
                );

        }

        catch {

            folders = [];

        }

    }


    documents.forEach(
        doc => {

            if (
                typeof doc.folderId ===
                "undefined"
            ) {

                doc.folderId = null;

            }

        }
    );


    if (
        documents.length === 0
    ) {

        documents.push({

            id:
                generateId("doc"),

            title:
                "Welcome to Nomana",

            markdown:
                DEFAULT_MARKDOWN,

            folderId:
                null,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now(),

            project:
                false,

            projectName:
                null,

            sourceMarkdownPath:
                null

        });

    }


    const existing =
        documents.find(
            doc =>
                doc.id ===
                savedActive
        );


    activeDocumentId =
        existing
            ? existing.id
            : documents[0].id;

}


function saveEverything() {

    saveStatus.textContent =
        "Saving...";


    clearTimeout(
        saveTimer
    );


    saveTimer =
        setTimeout(
            () => {

                forceSave();

            },
            250
        );

}


function forceSave() {

    clearTimeout(
        saveTimer
    );


    localStorage.setItem(
        "nomana-documents",
        JSON.stringify(
            documents
        )
    );


    localStorage.setItem(
        "nomana-folders",
        JSON.stringify(
            folders
        )
    );


    localStorage.setItem(
        "nomana-active-document",
        activeDocumentId
    );


    saveStatus.textContent =
        "Saved";

}


function getActiveDocument() {

    return documents.find(
        doc =>
            doc.id ===
            activeDocumentId
    );

}


/* ==========================================
   FOLDER MANAGEMENT
========================================== */

function createFolder() {

    const name =
        prompt(
            "Folder name:"
        );


    if (
        !name ||
        !name.trim()
    ) {
        return;
    }


    folders.push({

        id:
            generateId(
                "folder"
            ),

        name:
            name.trim(),

        collapsed:
            false,

        createdAt:
            Date.now()

    });


    saveEverything();

    renderDocumentList();

    updateFolderSelect();

}


function renameFolder(
    folderId
) {

    const folder =
        folders.find(
            item =>
                item.id ===
                folderId
        );


    if (!folder) {
        return;
    }


    const name =
        prompt(
            "Rename folder:",
            folder.name
        );


    if (
        !name ||
        !name.trim()
    ) {
        return;
    }


    folder.name =
        name.trim();


    saveEverything();

    renderDocumentList();

    updateFolderSelect();

}


function deleteFolder(
    folderId
) {

    const folder =
        folders.find(
            item =>
                item.id ===
                folderId
        );


    if (!folder) {
        return;
    }


    const count =
        documents.filter(
            doc =>
                doc.folderId ===
                folderId
        ).length;


    const confirmed =
        confirm(
            count > 0
                ? `Delete "${folder.name}"?\n\nIts ${count} document${count === 1 ? "" : "s"} will move to Unfiled.`
                : `Delete "${folder.name}"?`
        );


    if (!confirmed) {
        return;
    }


    documents.forEach(
        doc => {

            if (
                doc.folderId ===
                folderId
            ) {

                doc.folderId =
                    null;

            }

        }
    );


    folders =
        folders.filter(
            item =>
                item.id !==
                folderId
        );


    saveEverything();

    renderDocumentList();

    updateFolderSelect();

}


function toggleFolder(
    folderId
) {

    const folder =
        folders.find(
            item =>
                item.id ===
                folderId
        );


    if (!folder) {
        return;
    }


    folder.collapsed =
        !folder.collapsed;


    saveEverything();

    renderDocumentList();

}


function moveDocumentToFolder(
    documentId,
    folderId
) {

    const doc =
        documents.find(
            item =>
                item.id ===
                documentId
        );


    if (!doc) {
        return;
    }


    const target =
        folderId ||
        null;


    if (
        doc.folderId ===
        target
    ) {
        return;
    }


    doc.folderId =
        target;


    doc.updatedAt =
        Date.now();


    if (
        doc.id ===
        activeDocumentId
    ) {

        documentFolderSelect.value =
            target ||
            "";

    }


    saveEverything();

    renderDocumentList();

}


function updateFolderSelect() {

    const doc =
        getActiveDocument();


    documentFolderSelect.innerHTML =
        "";


    const unfiled =
        document.createElement(
            "option"
        );


    unfiled.value =
        "";

    unfiled.textContent =
        "Unfiled";


    documentFolderSelect.appendChild(
        unfiled
    );


    [...folders]
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        )
        .forEach(
            folder => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    folder.id;


                option.textContent =
                    folder.name;


                documentFolderSelect.appendChild(
                    option
                );

            }
        );


    if (doc) {

        documentFolderSelect.value =
            doc.folderId ||
            "";

    }

}


/* ==========================================
   DOCUMENT CARD
========================================== */

function createDocumentCard(
    doc,
    showSearchMatch = false
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "document-card";


    card.draggable =
        true;


    card.dataset.documentId =
        doc.id;


    if (
        doc.id ===
        activeDocumentId
    ) {

        card.classList.add(
            "active"
        );

    }


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "document-card-title";


    title.textContent =
        doc.title ||
        "Untitled Document";


    const preview =
        document.createElement(
            "div"
        );


    preview.className =
        "document-card-preview";


    preview.textContent =
        getPlainMarkdownText(
            doc.markdown
        ) ||
        "Empty document";


    card.appendChild(title);

    card.appendChild(preview);


    if (
        showSearchMatch &&
        searchQuery.trim()
    ) {

        const match =
            getSearchMatch(
                doc,
                searchQuery
            );


        if (match) {

            const result =
                document.createElement(
                    "div"
                );


            result.className =
                "document-card-match";


            result.innerHTML =
                highlightSearchMatch(
                    match,
                    searchQuery
                );


            card.appendChild(
                result
            );

        }

    }


    if (doc.project) {

        const badge =
            document.createElement(
                "span"
            );


        badge.className =
            "document-card-project";


        badge.textContent =
            "PROJECT";


        card.appendChild(
            badge
        );

    }


    card.addEventListener(
        "click",
        async () => {

            await switchDocument(
                doc.id
            );

        }
    );


    card.addEventListener(
        "dragstart",
        event => {

            draggedDocumentId =
                doc.id;


            card.classList.add(
                "dragging"
            );


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                doc.id
            );

        }
    );


    card.addEventListener(
        "dragend",
        () => {

            draggedDocumentId =
                null;


            card.classList.remove(
                "dragging"
            );


            document
                .querySelectorAll(
                    ".folder-section"
                )
                .forEach(
                    section => {

                        section.classList.remove(
                            "drag-over"
                        );

                    }
                );

        }
    );


    return card;

}


/* ==========================================
   DROP HANDLING
========================================== */

function attachFolderDropEvents(
    section,
    folderId
) {

    section.addEventListener(
        "dragover",
        event => {

            if (!draggedDocumentId) {
                return;
            }


            event.preventDefault();


            event.dataTransfer.dropEffect =
                "move";


            section.classList.add(
                "drag-over"
            );

        }
    );


    section.addEventListener(
        "dragenter",
        event => {

            if (!draggedDocumentId) {
                return;
            }


            event.preventDefault();


            section.classList.add(
                "drag-over"
            );

        }
    );


    section.addEventListener(
        "dragleave",
        event => {

            const related =
                event.relatedTarget;


            if (
                related &&
                section.contains(
                    related
                )
            ) {

                return;

            }


            section.classList.remove(
                "drag-over"
            );

        }
    );


    section.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            event.stopPropagation();


            section.classList.remove(
                "drag-over"
            );


            const id =
                event.dataTransfer.getData(
                    "text/plain"
                ) ||
                draggedDocumentId;


            if (!id) {
                return;
            }


            moveDocumentToFolder(
                id,
                folderId
            );


            draggedDocumentId =
                null;

        }
    );

}


/* ==========================================
   FOLDER UI
========================================== */

function createFolderSection(
    folder,
    folderDocuments
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "folder-section";


    attachFolderDropEvents(
        section,
        folder.id
    );


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "folder-header";


    const toggle =
        document.createElement(
            "button"
        );


    toggle.className =
        "folder-toggle";


    toggle.textContent =
        folder.collapsed
            ? "▶"
            : "▼";


    toggle.onclick =
        event => {

            event.stopPropagation();


            toggleFolder(
                folder.id
            );

        };


    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "folder-icon";


    icon.textContent =
        "▱";


    const name =
        document.createElement(
            "span"
        );


    name.className =
        "folder-name";


    name.textContent =
        folder.name;


    const count =
        document.createElement(
            "span"
        );


    count.className =
        "folder-document-count";


    count.textContent =
        folderDocuments.length;


    const menu =
        document.createElement(
            "button"
        );


    menu.className =
        "folder-menu-button";


    menu.textContent =
        "•••";


    menu.onclick =
        event => {

            event.stopPropagation();


            const choice =
                prompt(
                    `Folder: ${folder.name}\n\n1 = Rename\n2 = Delete`
                );


            if (
                choice === "1"
            ) {

                renameFolder(
                    folder.id
                );

            }


            if (
                choice === "2"
            ) {

                deleteFolder(
                    folder.id
                );

            }

        };


    header.append(
        toggle,
        icon,
        name,
        count,
        menu
    );


    header.addEventListener(
        "dblclick",
        event => {

            if (
                event.target === toggle ||
                event.target === menu
            ) {

                return;

            }


            renameFolder(
                folder.id
            );

        }
    );


    section.appendChild(
        header
    );


    if (!folder.collapsed) {

        const contents =
            document.createElement(
                "div"
            );


        contents.className =
            "folder-documents";


        if (
            folderDocuments.length ===
            0
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "folder-empty";


            empty.textContent =
                "Drop documents here";


            contents.appendChild(
                empty
            );

        }

        else {

            folderDocuments.forEach(
                doc => {

                    contents.appendChild(
                        createDocumentCard(
                            doc
                        )
                    );

                }
            );

        }


        section.appendChild(
            contents
        );

    }


    return section;

}


function createUnfiledSection(
    unfiledDocuments
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "folder-section";


    attachFolderDropEvents(
        section,
        null
    );


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "folder-header";


    header.innerHTML =
        `
        <span class="folder-toggle"></span>
        <span class="folder-icon">◇</span>
        <span class="folder-name">Unfiled</span>
        <span class="folder-document-count">${unfiledDocuments.length}</span>
        `;


    section.appendChild(
        header
    );


    const contents =
        document.createElement(
            "div"
        );


    contents.className =
        "folder-documents";


    if (
        unfiledDocuments.length ===
        0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "folder-empty";


        empty.textContent =
            "Drop documents here";


        contents.appendChild(
            empty
        );

    }

    else {

        unfiledDocuments.forEach(
            doc => {

                contents.appendChild(
                    createDocumentCard(
                        doc
                    )
                );

            }
        );

    }


    section.appendChild(
        contents
    );


    return section;

}


/* ==========================================
   SIDEBAR
========================================== */

function renderDocumentList() {

    documentList.innerHTML =
        "";


    documentCount.textContent =
        `${documents.length} ${
            documents.length === 1
                ? "document"
                : "documents"
        }`;


    folderCount.textContent =
        `${folders.length} ${
            folders.length === 1
                ? "folder"
                : "folders"
        }`;


    const query =
        searchQuery
            .trim()
            .toLowerCase();


    if (query) {

        const results =
            documents
                .filter(
                    doc =>
                        (
                            doc.title ||
                            ""
                        )
                            .toLowerCase()
                            .includes(query)
                        ||
                        (
                            doc.markdown ||
                            ""
                        )
                            .toLowerCase()
                            .includes(query)
                )
                .sort(
                    (a, b) =>
                        b.updatedAt -
                        a.updatedAt
                );


        searchResultsInfo.textContent =
            `${results.length} ${
                results.length === 1
                    ? "result"
                    : "results"
            }`;


        searchResultsInfo.classList.remove(
            "hidden"
        );


        if (
            results.length === 0
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "no-search-results";


            empty.innerHTML =
                `
                <strong>No documents found</strong>
                Nothing matches “${escapeHTML(searchQuery)}”.
                `;


            documentList.appendChild(
                empty
            );


            return;

        }


        results.forEach(
            doc => {

                documentList.appendChild(
                    createDocumentCard(
                        doc,
                        true
                    )
                );

            }
        );


        return;

    }


    searchResultsInfo.classList.add(
        "hidden"
    );


    [...folders]
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        )
        .forEach(
            folder => {

                const docs =
                    documents
                        .filter(
                            doc =>
                                doc.folderId ===
                                folder.id
                        )
                        .sort(
                            (a, b) =>
                                b.updatedAt -
                                a.updatedAt
                        );


                documentList.appendChild(
                    createFolderSection(
                        folder,
                        docs
                    )
                );

            }
        );


    const unfiled =
        documents
            .filter(
                doc =>
                    !doc.folderId ||
                    !folders.some(
                        folder =>
                            folder.id ===
                            doc.folderId
                    )
            )
            .sort(
                (a, b) =>
                    b.updatedAt -
                    a.updatedAt
            );


    documentList.appendChild(
        createUnfiledSection(
            unfiled
        )
    );

}


/* ==========================================
   DOCUMENT MANAGEMENT
========================================== */

async function switchDocument(id) {

    if (
        id ===
        activeDocumentId
    ) {
        return;
    }


    activeDocumentId = id;


    localStorage.setItem(
        "nomana-active-document",
        activeDocumentId
    );


    await loadActiveDocument();

}


async function loadActiveDocument() {

    const doc =
        getActiveDocument();


    if (!doc) {
        return;
    }


    if (doc.project) {

        try {

            await hydrateProjectAssets(
                doc.id
            );

        }

        catch (error) {

            console.error(
                error
            );

        }

    }


    documentTitle.value =
        doc.title;


    markdownEditor.value =
        doc.markdown;


    splitMarkdownEditor.value =
        doc.markdown;


    const rendered =
        renderMarkdown(
            doc.markdown,
            doc.id
        );


    visualEditor.innerHTML =
        rendered;


    markdownPreview.innerHTML =
        rendered;


    if (doc.project) {

        projectBadge.classList.remove(
            "hidden"
        );


        statusMode.textContent =
            doc.projectName
                ? `Project: ${doc.projectName}`
                : "Project";

    }

    else {

        projectBadge.classList.add(
            "hidden"
        );


        statusMode.textContent =
            "Markdown";

    }


    updateStats();

    updateFolderSelect();

    renderDocumentList();

}


async function createDocument() {

    const doc = {

        id:
            generateId("doc"),

        title:
            "Untitled Document",

        markdown:
            "# Untitled Document\n\nStart writing here.",

        folderId:
            null,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now(),

        project:
            false,

        projectName:
            null,

        sourceMarkdownPath:
            null

    };


    documents.push(doc);


    activeDocumentId =
        doc.id;


    saveEverything();


    await loadActiveDocument();


    setTimeout(
        () => {

            documentTitle.focus();

            documentTitle.select();

        },
        0
    );

}


async function deleteActiveDocument() {

    const doc =
        getActiveDocument();


    if (!doc) {
        return;
    }


    if (
        !confirm(
            `Delete "${doc.title}"?`
        )
    ) {

        return;

    }


    releaseRuntimeAssets(
        doc.id
    );


    try {

        await deleteAssetsFromDatabase(
            doc.id
        );

    }

    catch (error) {

        console.error(error);

    }


    documents =
        documents.filter(
            item =>
                item.id !==
                doc.id
        );


    if (
        documents.length === 0
    ) {

        documents.push({

            id:
                generateId("doc"),

            title:
                "Untitled Document",

            markdown: "",

            folderId:
                null,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now(),

            project:
                false,

            projectName:
                null,

            sourceMarkdownPath:
                null

        });

    }


    activeDocumentId =
        documents[0].id;


    saveEverything();


    await loadActiveDocument();

}


/* ==========================================
   MARKDOWN INLINE
========================================== */

function renderInline(
    text,
    documentId
) {

    let html = text;


    const codeTokens = [];


    /*
        Protect inline code before
        processing bold / italic.
    */

    html =
        html.replace(
            /`([^`]+)`/g,
            (
                match,
                content
            ) => {

                const id =
                    codeTokens.length;


                codeTokens.push(
                    `<code>${content}</code>`
                );


                return (
                    `@@INLINECODE${id}@@`
                );

            }
        );


    /*
        Images.

        Allows spaces inside paths.

        ![Example](screenshots/my image.png)
    */

    html =
        html.replace(
            /!\[([^\]]*)\]\(([^)\n]+)\)/g,
            (
                match,
                alt,
                rawSource
            ) => {

                let source =
                    rawSource.trim();


                /*
                    Remove optional title:
                    image.png "Title"
                */

                source =
                    source.replace(
                        /\s+["'][^"']*["']$/,
                        ""
                    );


                if (
                    source.startsWith("<") &&
                    source.endsWith(">")
                ) {

                    source =
                        source.slice(
                            1,
                            -1
                        );

                }


                const resolved =
                    resolveAssetPath(
                        documentId,
                        source
                    );


                return (
                    `<img ` +
                    `src="${escapeAttribute(resolved)}" ` +
                    `alt="${escapeAttribute(alt)}" ` +
                    `data-original-src="${escapeAttribute(source)}">`
                );

            }
        );


    /*
        Bold
    */

    html =
        html.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );


    html =
        html.replace(
            /__(.+?)__/g,
            "<strong>$1</strong>"
        );


    /*
        Strikethrough
    */

    html =
        html.replace(
            /~~(.+?)~~/g,
            "<del>$1</del>"
        );


    /*
        Italic
    */

    html =
        html.replace(
            /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
            "$1<em>$2</em>"
        );


    html =
        html.replace(
            /(^|[^_])_([^_\n]+)_(?!_)/g,
            "$1<em>$2</em>"
        );


    /*
        Links
    */

    html =
        html.replace(
            /\[([^\]]+)\]\(([^)\n]+)\)/g,
            (
                match,
                label,
                href
            ) => {

                return (
                    `<a href="${escapeAttribute(href.trim())}" ` +
                    `target="_blank" ` +
                    `rel="noopener noreferrer">${label}</a>`
                );

            }
        );


    /*
        Restore inline code.
    */

    codeTokens.forEach(
        (
            token,
            index
        ) => {

            html =
                html.replace(
                    `@@INLINECODE${index}@@`,
                    token
                );

        }
    );


    return html;

}


/* ==========================================
   TABLE HELPERS
========================================== */

function isTableSeparator(line) {

    const cells =
        splitTableRow(line);


    if (
        cells.length === 0
    ) {

        return false;

    }


    return cells.every(
        cell =>
            /^:?-{3,}:?$/
                .test(
                    cell.trim()
                )
    );

}


function splitTableRow(line) {

    let trimmed =
        line.trim();


    if (
        trimmed.startsWith("|")
    ) {

        trimmed =
            trimmed.slice(1);

    }


    if (
        trimmed.endsWith("|")
    ) {

        trimmed =
            trimmed.slice(
                0,
                -1
            );

    }


    return trimmed
        .split(/(?<!\\)\|/)
        .map(
            cell =>
                cell
                    .replace(
                        /\\\|/g,
                        "|"
                    )
                    .trim()
        );

}


function getTableAlignment(cell) {

    const value =
        cell.trim();


    const left =
        value.startsWith(":");


    const right =
        value.endsWith(":");


    if (
        left &&
        right
    ) {

        return "center";

    }


    if (right) {
        return "right";
    }


    if (left) {
        return "left";
    }


    return "";

}


function renderTable(
    headerLine,
    separatorLine,
    bodyLines,
    documentId
) {

    const headers =
        splitTableRow(
            headerLine
        );


    const separators =
        splitTableRow(
            separatorLine
        );


    const alignments =
        separators.map(
            getTableAlignment
        );


    let html =
        "<div class=\"markdown-table-wrap\"><table>";


    html += "<thead><tr>";


    headers.forEach(
        (
            header,
            index
        ) => {

            const alignment =
                alignments[index] ||
                "";


            html +=
                `<th${
                    alignment
                        ? ` style="text-align:${alignment}"`
                        : ""
                }>` +
                renderInline(
                    header,
                    documentId
                ) +
                "</th>";

        }
    );


    html += "</tr></thead>";


    if (
        bodyLines.length > 0
    ) {

        html += "<tbody>";


        bodyLines.forEach(
            line => {

                const cells =
                    splitTableRow(
                        line
                    );


                html += "<tr>";


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        const alignment =
                            alignments[index] ||
                            "";


                        const value =
                            cells[index] ||
                            "";


                        html +=
                            `<td${
                                alignment
                                    ? ` style="text-align:${alignment}"`
                                    : ""
                            }>` +
                            renderInline(
                                value,
                                documentId
                            ) +
                            "</td>";

                    }
                );


                html += "</tr>";

            }
        );


        html += "</tbody>";

    }


    html += "</table></div>";


    return html;

}


/* ==========================================
   LIST PARSER
========================================== */

function parseListBlock(
    lines,
    startIndex,
    documentId
) {

    const root = {

        children: []

    };


    const stack = [
        {
            indent: -1,
            node: root
        }
    ];


    let index =
        startIndex;


    while (
        index < lines.length
    ) {

        const line =
            lines[index];


        const match =
            line.match(
                /^(\s*)([-+*]|\d+[.)])\s+(.*)$/
            );


        if (!match) {
            break;
        }


        const spaces =
            match[1]
                .replace(
                    /\t/g,
                    "    "
                )
                .length;


        const marker =
            match[2];


        let content =
            match[3];


        const ordered =
            /^\d/
                .test(
                    marker
                );


        const taskMatch =
            content.match(
                /^\[([ xX])\]\s+(.*)$/
            );


        let task =
            null;


        if (taskMatch) {

            task =
                taskMatch[1]
                    .toLowerCase() ===
                "x";


            content =
                taskMatch[2];

        }


        while (
            stack.length > 1 &&
            spaces <=
            stack[
                stack.length - 1
            ].indent
        ) {

            stack.pop();

        }


        const parent =
            stack[
                stack.length - 1
            ].node;


        const node = {

            type:
                ordered
                    ? "ol"
                    : "ul",

            content,

            task,

            children: []

        };


        parent.children.push(
            node
        );


        stack.push({

            indent:
                spaces,

            node

        });


        index++;

    }


    function renderChildren(
        children
    ) {

        if (
            children.length === 0
        ) {

            return "";

        }


        let html = "";

        let i = 0;


        while (
            i < children.length
        ) {

            const type =
                children[i].type;


            html +=
                type === "ol"
                    ? "<ol>"
                    : "<ul>";


            while (
                i < children.length &&
                children[i].type ===
                type
            ) {

                const item =
                    children[i];


                let content =
                    renderInline(
                        item.content,
                        documentId
                    );


                if (
                    item.task !==
                    null
                ) {

                    content =
                        `<label class="task-list-item">` +
                        `<input type="checkbox" disabled ${
                            item.task
                                ? "checked"
                                : ""
                        }>` +
                        `<span>${content}</span>` +
                        `</label>`;

                }


                html +=
                    `<li${
                        item.task !== null
                            ? ' class="task-list-li"'
                            : ""
                    }>` +
                    content +
                    renderChildren(
                        item.children
                    ) +
                    "</li>";


                i++;

            }


            html +=
                type === "ol"
                    ? "</ol>"
                    : "</ul>";

        }


        return html;

    }


    return {

        html:
            renderChildren(
                root.children
            ),

        nextIndex:
            index

    };

}


/* ==========================================
   MARKDOWN RENDERER
========================================== */

function renderMarkdown(
    text,
    documentId =
        activeDocumentId
) {

    const source =
        String(text || "")
            .replace(/\r\n?/g, "\n");


    /*
        Prefer Marked when it is available.

        Nomana still escapes raw HTML first so a Markdown
        document cannot inject arbitrary HTML into the app.
        Markdown punctuation itself is unaffected by this.
    */

    if (
        window.marked &&
        typeof window.marked.parse === "function"
    ) {

        /*
            IMPORTANT: do not run escapeHTML() over the Markdown source.
            Doing so converts blockquote markers (>) and quotes before
            Marked sees them, which breaks Markdown parsing and can leave
            entities such as &quot; visible inside code blocks.

            We only neutralise raw HTML tag starts here. Markdown syntax
            itself is left untouched for Marked to parse normally.
        */

        const safeMarkdownSource =
            source.replace(/</g, "&lt;");

        let html =
            window.marked.parse(
                safeMarkdownSource,
                {
                    gfm: true,
                    breaks: false
                }
            );


        /*
            Post-process the generated HTML so Nomana keeps
            its project-folder image resolver and safe links.
        */

        const template =
            document.createElement("template");

        template.innerHTML = html;


        template.content
            .querySelectorAll("img")
            .forEach(
                image => {

                    const originalSource =
                        image.getAttribute("src") || "";

                    const resolvedSource =
                        resolveAssetPath(
                            documentId,
                            originalSource
                        );

                    image.setAttribute(
                        "data-original-src",
                        originalSource
                    );

                    image.setAttribute(
                        "src",
                        resolvedSource
                    );

                }
            );


        template.content
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.setAttribute(
                        "target",
                        "_blank"
                    );

                    link.setAttribute(
                        "rel",
                        "noopener noreferrer"
                    );

                }
            );


        /*
            Add Nomana's existing wrapper classes so the
            current CSS continues to style code and tables.
        */

        template.content
            .querySelectorAll("pre")
            .forEach(
                pre => {

                    if (
                        pre.parentElement &&
                        pre.parentElement.classList.contains(
                            "code-block"
                        )
                    ) {
                        return;
                    }

                    const code =
                        pre.querySelector("code");

                    let language = "";

                    if (code) {

                        const languageClass =
                            Array.from(code.classList)
                                .find(
                                    className =>
                                        className.startsWith(
                                            "language-"
                                        )
                                );

                        if (languageClass) {

                            language =
                                languageClass.slice(
                                    "language-".length
                                );

                        }

                    }

                    const wrapper =
                        document.createElement("div");

                    wrapper.className =
                        "code-block";

                    if (language) {

                        const label =
                            document.createElement("div");

                        label.className =
                            "code-language";

                        label.textContent =
                            language;

                        wrapper.appendChild(
                            label
                        );

                    }

                    pre.parentNode.insertBefore(
                        wrapper,
                        pre
                    );

                    wrapper.appendChild(
                        pre
                    );

                }
            );


        template.content
            .querySelectorAll("table")
            .forEach(
                table => {

                    if (
                        table.parentElement &&
                        table.parentElement.classList.contains(
                            "markdown-table-wrap"
                        )
                    ) {
                        return;
                    }

                    const wrapper =
                        document.createElement("div");

                    wrapper.className =
                        "markdown-table-wrap";

                    table.parentNode.insertBefore(
                        wrapper,
                        table
                    );

                    wrapper.appendChild(
                        table
                    );

                }
            );


        return template.innerHTML;

    }


    /*
        Fallback renderer.

        This keeps Nomana usable if Marked cannot be loaded,
        for example when the user is completely offline.
    */

    return renderMarkdownFallback(
        source,
        documentId
    );

}


function renderMarkdownFallback(
    text,
    documentId =
        activeDocumentId
) {

    let source =
        String(text || "")
            .replace(
                /\r\n?/g,
                "\n"
            );


    source =
        escapeHTML(
            source
        );


    const codeBlocks = [];


    source =
        source.replace(
            /^(?: {0,3})(`{3,}|~{3,})[ \t]*([^\n]*)\n([\s\S]*?)\n?\1[ \t]*$/gm,
            (
                match,
                fence,
                language,
                code
            ) => {

                const index =
                    codeBlocks.length;


                const cleanLanguage =
                    language
                        .trim()
                        .replace(
                            /[^a-zA-Z0-9_+#.-]/g,
                            ""
                        );


                const label =
                    cleanLanguage
                        ? `<div class="code-language">${escapeHTML(cleanLanguage)}</div>`
                        : "";


                codeBlocks.push(
                    `<div class="code-block">` +
                    label +
                    `<pre><code${
                        cleanLanguage
                            ? ` class="language-${escapeAttribute(cleanLanguage)}"`
                            : ""
                    }>${code}</code></pre>` +
                    `</div>`
                );


                return (
                    `\n@@NOMANACODE${index}@@\n`
                );

            }
        );


    const lines =
        source.split("\n");


    const output = [];


    let paragraph = [];


    function flushParagraph() {

        if (
            paragraph.length === 0
        ) {
            return;
        }


        const content =
            paragraph
                .join("\n")
                .trim();


        if (content) {

            output.push(
                "<p>" +
                content
                    .split("\n")
                    .map(
                        line =>
                            renderInline(
                                line,
                                documentId
                            )
                    )
                    .join("<br>") +
                "</p>"
            );

        }


        paragraph = [];

    }


    let i = 0;


    while (
        i < lines.length
    ) {

        const line =
            lines[i];


        const trimmed =
            line.trim();


        if (!trimmed) {

            flushParagraph();

            i++;

            continue;

        }


        if (
            /^@@NOMANACODE\d+@@$/
                .test(
                    trimmed
                )
        ) {

            flushParagraph();

            output.push(
                trimmed
            );

            i++;

            continue;

        }


        if (
            i + 1 <
            lines.length &&
            line.includes("|") &&
            isTableSeparator(
                lines[i + 1]
            )
        ) {

            flushParagraph();


            const bodyLines = [];


            let next =
                i + 2;


            while (
                next < lines.length &&
                lines[next].trim() &&
                lines[next].includes("|")
            ) {

                bodyLines.push(
                    lines[next]
                );


                next++;

            }


            output.push(
                renderTable(
                    line,
                    lines[i + 1],
                    bodyLines,
                    documentId
                )
            );


            i = next;

            continue;

        }


        if (
            /^(?:-{3,}|\*{3,}|_{3,})$/
                .test(
                    trimmed
                )
        ) {

            flushParagraph();

            output.push(
                "<hr>"
            );

            i++;

            continue;

        }


        const heading =
            line.match(
                /^(#{1,6})\s+(.+?)\s*#*$/
            );


        if (heading) {

            flushParagraph();


            const level =
                heading[1]
                    .length;


            output.push(
                `<h${level}>` +
                renderInline(
                    heading[2],
                    documentId
                ) +
                `</h${level}>`
            );


            i++;

            continue;

        }


        if (
            i + 1 <
            lines.length &&
            /^=+\s*$/
                .test(
                    lines[i + 1]
                ) &&
            trimmed
        ) {

            flushParagraph();


            output.push(
                "<h1>" +
                renderInline(
                    line,
                    documentId
                ) +
                "</h1>"
            );


            i += 2;

            continue;

        }


        if (
            i + 1 <
            lines.length &&
            /^-+\s*$/
                .test(
                    lines[i + 1]
                ) &&
            trimmed
        ) {

            flushParagraph();


            output.push(
                "<h2>" +
                renderInline(
                    line,
                    documentId
                ) +
                "</h2>"
            );


            i += 2;

            continue;

        }


        if (
            /^\s*&gt;/
                .test(line)
        ) {

            flushParagraph();


            const quoteLines = [];


            while (
                i < lines.length &&
                /^\s*&gt;/
                    .test(
                        lines[i]
                    )
            ) {

                quoteLines.push(
                    lines[i]
                        .replace(
                            /^\s*&gt;\s?/,
                            ""
                        )
                );


                i++;

            }


            output.push(
                "<blockquote>" +
                quoteLines
                    .map(
                        quoteLine =>
                            renderInline(
                                quoteLine,
                                documentId
                            )
                    )
                    .join("<br>") +
                "</blockquote>"
            );


            continue;

        }


        if (
            /^(\s*)([-+*]|\d+[.)])\s+/
                .test(line)
        ) {

            flushParagraph();


            const list =
                parseListBlock(
                    lines,
                    i,
                    documentId
                );


            output.push(
                list.html
            );


            i =
                list.nextIndex;


            continue;

        }


        paragraph.push(
            line
        );


        i++;

    }


    flushParagraph();


    let html =
        output.join("\n");


    codeBlocks.forEach(
        (
            block,
            index
        ) => {

            html =
                html.replace(
                    `@@NOMANACODE${index}@@`,
                    block
                );

        }
    );


    return html;

}

/* ==========================================
   HTML TO MARKDOWN
========================================== */

function htmlToMarkdown(
    element
) {

    function convertTable(
        table
    ) {

        const rows =
            Array.from(
                table.querySelectorAll(
                    "tr"
                )
            );


        if (
            rows.length === 0
        ) {

            return "";

        }


        const headerCells =
            Array.from(
                rows[0].children
            );


        const headers =
            headerCells.map(
                cell =>
                    cell.innerText
                        .replace(
                            /\|/g,
                            "\\|"
                        )
                        .trim()
            );


        let markdown =
            "| " +
            headers.join(
                " | "
            ) +
            " |\n";


        markdown +=
            "| " +
            headers
                .map(
                    () => "---"
                )
                .join(
                    " | "
                ) +
            " |\n";


        rows
            .slice(1)
            .forEach(
                row => {

                    const cells =
                        Array.from(
                            row.children
                        )
                            .map(
                                cell =>
                                    cell.innerText
                                        .replace(
                                            /\|/g,
                                            "\\|"
                                        )
                                        .trim()
                            );


                    markdown +=
                        "| " +
                        cells.join(
                            " | "
                        ) +
                        " |\n";

                }
            );


        return (
            markdown +
            "\n"
        );

    }


    function convertList(
        node,
        depth = 0
    ) {

        const ordered =
            node.tagName ===
            "OL";


        let output = "";


        Array.from(
            node.children
        )
            .forEach(
                (
                    li,
                    index
                ) => {

                    if (
                        li.tagName !==
                        "LI"
                    ) {

                        return;

                    }


                    const prefix =
                        ordered
                            ? `${index + 1}. `
                            : "- ";


                    let text = "";


                    const nested = [];


                    Array.from(
                        li.childNodes
                    )
                        .forEach(
                            child => {

                                if (
                                    child.nodeType ===
                                    Node.ELEMENT_NODE &&
                                    (
                                        child.tagName ===
                                        "UL" ||
                                        child.tagName ===
                                        "OL"
                                    )
                                ) {

                                    nested.push(
                                        child
                                    );

                                }

                                else {

                                    text +=
                                        convert(
                                            child,
                                            depth
                                        );

                                }

                            }
                        );


                    /*
                        Task-list item
                    */

                    const checkbox =
                        li.querySelector(
                            ":scope > label.task-list-item > input[type='checkbox']"
                        );


                    if (checkbox) {

                        const label =
                            li.querySelector(
                                ":scope > label.task-list-item > span"
                            );


                        text =
                            `[${checkbox.checked ? "x" : " "}] ` +
                            (
                                label
                                    ? label.innerText
                                    : text
                            );

                    }


                    output +=
                        "    ".repeat(
                            depth
                        ) +
                        prefix +
                        text.trim() +
                        "\n";


                    nested.forEach(
                        nestedList => {

                            output +=
                                convertList(
                                    nestedList,
                                    depth + 1
                                );

                        }
                    );

                }
            );


        return output;

    }


    function convert(
        node,
        depth = 0
    ) {

        if (
            node.nodeType ===
            Node.TEXT_NODE
        ) {

            return node.textContent;

        }


        if (
            node.nodeType !==
            Node.ELEMENT_NODE
        ) {

            return "";

        }


        if (
            node.tagName ===
            "IMG"
        ) {

            const source =
                node.dataset.originalSrc ||
                node.getAttribute(
                    "src"
                ) ||
                "";


            const alt =
                node.getAttribute(
                    "alt"
                ) ||
                "";


            return (
                `![${alt}](${source})`
            );

        }


        if (
            node.tagName ===
            "TABLE"
        ) {

            return convertTable(
                node
            );

        }


        if (
            node.tagName ===
            "UL" ||
            node.tagName ===
            "OL"
        ) {

            return (
                convertList(
                    node,
                    depth
                ) +
                "\n"
            );

        }


        const content =
            Array.from(
                node.childNodes
            )
                .map(
                    child =>
                        convert(
                            child,
                            depth
                        )
                )
                .join("");


        switch (
            node.tagName
        ) {

            case "H1":
                return "# " + content + "\n\n";

            case "H2":
                return "## " + content + "\n\n";

            case "H3":
                return "### " + content + "\n\n";

            case "H4":
                return "#### " + content + "\n\n";

            case "H5":
                return "##### " + content + "\n\n";

            case "H6":
                return "###### " + content + "\n\n";

            case "P":
                return content + "\n\n";

            case "STRONG":
            case "B":
                return "**" + content + "**";

            case "EM":
            case "I":
                return "*" + content + "*";

            case "DEL":
            case "S":
                return "~~" + content + "~~";

            case "CODE":

                if (
                    node.parentElement &&
                    node.parentElement.tagName ===
                    "PRE"
                ) {

                    return content;

                }


                return "`" + content + "`";

            case "PRE": {

                const code =
                    node.querySelector(
                        "code"
                    );


                let language = "";


                if (code) {

                    const languageClass =
                        Array.from(
                            code.classList
                        )
                            .find(
                                cls =>
                                    cls.startsWith(
                                        "language-"
                                    )
                            );


                    if (languageClass) {

                        language =
                            languageClass.replace(
                                "language-",
                                ""
                            );

                    }

                }


                return (
                    "```" +
                    language +
                    "\n" +
                    node.innerText +
                    "\n```\n\n"
                );

            }

            case "BLOCKQUOTE":

                return (
                    content
                        .split("\n")
                        .filter(Boolean)
                        .map(
                            line =>
                                "> " +
                                line
                        )
                        .join("\n") +
                    "\n\n"
                );

            case "BR":
                return "\n";

            case "HR":
                return "---\n\n";

            case "A":

                return (
                    "[" +
                    content +
                    "](" +
                    (
                        node.getAttribute(
                            "href"
                        ) ||
                        ""
                    ) +
                    ")"
                );

            case "LABEL":

                if (
                    node.classList.contains(
                        "task-list-item"
                    )
                ) {

                    return content;

                }


                return content;

            case "INPUT":
                return "";

            case "DIV":

                /*
                    Code wrapper should not
                    duplicate its contents.
                */

                if (
                    node.classList.contains(
                        "code-block"
                    )
                ) {

                    const pre =
                        node.querySelector(
                            "pre"
                        );


                    if (pre) {

                        return convert(
                            pre,
                            depth
                        );

                    }

                }


                if (
                    node.classList.contains(
                        "markdown-table-wrap"
                    )
                ) {

                    const table =
                        node.querySelector(
                            "table"
                        );


                    if (table) {

                        return convertTable(
                            table
                        );

                    }

                }


                if (
                    node.classList.contains(
                        "code-language"
                    )
                ) {

                    return "";

                }


                return content;

            case "SPAN":
                return content;

            case "LI":
                return content;

            case "THEAD":
            case "TBODY":
            case "TR":
            case "TH":
            case "TD":
                return content;

            default:
                return content;

        }

    }


    return convert(
        element
    )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .trim();

}


/* ==========================================
   CONTENT SYNC
========================================== */

function updateActiveMarkdown(
    markdown
) {

    const doc =
        getActiveDocument();


    if (!doc) {
        return;
    }


    doc.markdown =
        markdown;


    doc.updatedAt =
        Date.now();


    updateStats();

    renderDocumentList();

    saveEverything();

}


function syncVisualEditor() {

    const markdown =
        htmlToMarkdown(
            visualEditor
        );


    markdownEditor.value =
        markdown;


    splitMarkdownEditor.value =
        markdown;


    markdownPreview.innerHTML =
        renderMarkdown(
            markdown,
            activeDocumentId
        );


    updateActiveMarkdown(
        markdown
    );

}


function syncMarkdownTextarea(
    textarea
) {

    const markdown =
        textarea.value;


    markdownEditor.value =
        markdown;


    splitMarkdownEditor.value =
        markdown;


    markdownPreview.innerHTML =
        renderMarkdown(
            markdown,
            activeDocumentId
        );


    updateActiveMarkdown(
        markdown
    );

}


/* ==========================================
   STATS
========================================== */

function updateStats() {

    const doc =
        getActiveDocument();


    if (!doc) {
        return;
    }


    const plainText =
        getPlainMarkdownText(
            doc.markdown
        );


    const words =
        plainText === ""
            ? 0
            : plainText
                .split(/\s+/)
                .filter(Boolean)
                .length;


    wordCount.textContent =
        `${words} ${
            words === 1
                ? "word"
                : "words"
        }`;


    characterCount.textContent =
        `${doc.markdown.length} characters`;

}


/* ==========================================
   KEYBOARD HELPERS
========================================== */

function getActiveTextEditor() {

    if (
        currentView ===
        "markdown"
    ) {

        return markdownEditor;

    }


    if (
        currentView ===
        "split"
    ) {

        return splitMarkdownEditor;

    }


    return null;

}


function wrapMarkdownSelection(
    textarea,
    before,
    after = before
) {

    const start =
        textarea.selectionStart;


    const end =
        textarea.selectionEnd;


    const selected =
        textarea.value.substring(
            start,
            end
        );


    const replacement =
        before +
        selected +
        after;


    textarea.setRangeText(
        replacement,
        start,
        end,
        "end"
    );


    if (selected) {

        textarea.selectionStart =
            start +
            before.length;


        textarea.selectionEnd =
            start +
            before.length +
            selected.length;

    }

    else {

        textarea.selectionStart =
            start +
            before.length;


        textarea.selectionEnd =
            start +
            before.length;

    }


    textarea.focus();


    syncMarkdownTextarea(
        textarea
    );

}


function shortcutBold() {

    const textarea =
        getActiveTextEditor();


    if (textarea) {

        wrapMarkdownSelection(
            textarea,
            "**"
        );


        return;

    }


    visualEditor.focus();


    document.execCommand(
        "bold"
    );


    syncVisualEditor();

}


function shortcutItalic() {

    const textarea =
        getActiveTextEditor();


    if (textarea) {

        wrapMarkdownSelection(
            textarea,
            "*"
        );


        return;

    }


    visualEditor.focus();


    document.execCommand(
        "italic"
    );


    syncVisualEditor();

}


function shortcutLink() {

    const textarea =
        getActiveTextEditor();


    if (textarea) {

        const start =
            textarea.selectionStart;


        const end =
            textarea.selectionEnd;


        const selected =
            textarea.value.substring(
                start,
                end
            );


        const url =
            prompt(
                "Enter link URL:"
            );


        if (!url) {
            return;
        }


        textarea.setRangeText(
            `[${selected || "link text"}](${url})`,
            start,
            end,
            "end"
        );


        textarea.focus();


        syncMarkdownTextarea(
            textarea
        );


        return;

    }


    visualEditor.focus();


    const url =
        prompt(
            "Enter link URL:"
        );


    if (!url) {
        return;
    }


    document.execCommand(
        "createLink",
        false,
        url
    );


    syncVisualEditor();

}


function shortcutSwitchView(
    view
) {

    const button =
        document.querySelector(
            `.view-button[data-view="${view}"]`
        );


    if (button) {
        button.click();
    }

}


/* ==========================================
   EDITOR INPUT
========================================== */

visualEditor.addEventListener(
    "input",
    syncVisualEditor
);


markdownEditor.addEventListener(
    "input",
    () => {

        syncMarkdownTextarea(
            markdownEditor
        );

    }
);


splitMarkdownEditor.addEventListener(
    "input",
    () => {

        syncMarkdownTextarea(
            splitMarkdownEditor
        );

    }
);


/* ==========================================
   TITLE
========================================== */

documentTitle.addEventListener(
    "input",
    () => {

        const doc =
            getActiveDocument();


        if (!doc) {
            return;
        }


        doc.title =
            documentTitle.value ||
            "Untitled Document";


        doc.updatedAt =
            Date.now();


        renderDocumentList();

        saveEverything();

    }
);


/* ==========================================
   FOLDER DROPDOWN
========================================== */

documentFolderSelect.addEventListener(
    "change",
    () => {

        const doc =
            getActiveDocument();


        if (!doc) {
            return;
        }


        moveDocumentToFolder(
            doc.id,
            documentFolderSelect.value ||
            null
        );

    }
);


/* ==========================================
   SEARCH
========================================== */

documentSearch.addEventListener(
    "input",
    () => {

        searchQuery =
            documentSearch.value;


        clearSearchButton
            .classList
            .toggle(
                "hidden",
                !searchQuery.trim()
            );


        renderDocumentList();

    }
);


clearSearchButton.addEventListener(
    "click",
    () => {

        documentSearch.value =
            "";


        searchQuery =
            "";


        clearSearchButton.classList.add(
            "hidden"
        );


        renderDocumentList();


        documentSearch.focus();

    }
);


/* ==========================================
   KEYBOARD SHORTCUTS
========================================== */

document.addEventListener(
    "keydown",
    async event => {

        const modifier =
            event.metaKey ||
            event.ctrlKey;


        if (modifier) {

            const key =
                event.key.toLowerCase();


            if (key === "f") {

                event.preventDefault();

                documentSearch.focus();

                documentSearch.select();

                return;

            }


            if (key === "b") {

                event.preventDefault();

                shortcutBold();

                return;

            }


            if (key === "i") {

                event.preventDefault();

                shortcutItalic();

                return;

            }


            if (key === "k") {

                event.preventDefault();

                shortcutLink();

                return;

            }


            if (key === "n") {

                event.preventDefault();

                await createDocument();

                return;

            }


            if (key === "s") {

                event.preventDefault();

                forceSave();

                return;

            }


            if (key === "1") {

                event.preventDefault();

                shortcutSwitchView(
                    "visual"
                );

                return;

            }


            if (key === "2") {

                event.preventDefault();

                shortcutSwitchView(
                    "markdown"
                );

                return;

            }


            if (key === "3") {

                event.preventDefault();

                shortcutSwitchView(
                    "split"
                );

                return;

            }

        }


        if (
            event.key === "Escape" &&
            document.activeElement ===
            documentSearch
        ) {

            if (
                documentSearch.value
            ) {

                documentSearch.value =
                    "";


                searchQuery =
                    "";


                clearSearchButton.classList.add(
                    "hidden"
                );


                renderDocumentList();

            }

            else {

                documentSearch.blur();

            }

        }

    }
);


/* ==========================================
   VIEW SWITCHING
========================================== */

viewButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            async () => {

                const view =
                    button.dataset.view;


                currentView =
                    view;


                viewButtons.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                visualView.classList.add(
                    "hidden"
                );


                markdownView.classList.add(
                    "hidden"
                );


                splitView.classList.add(
                    "hidden"
                );


                const doc =
                    getActiveDocument();


                if (!doc) {
                    return;
                }


                if (
                    doc.project
                ) {

                    await hydrateProjectAssets(
                        doc.id
                    );

                }


                if (
                    view === "visual"
                ) {

                    visualEditor.innerHTML =
                        renderMarkdown(
                            doc.markdown,
                            doc.id
                        );


                    visualView.classList.remove(
                        "hidden"
                    );

                }


                if (
                    view === "markdown"
                ) {

                    markdownEditor.value =
                        doc.markdown;


                    markdownView.classList.remove(
                        "hidden"
                    );

                }


                if (
                    view === "split"
                ) {

                    splitMarkdownEditor.value =
                        doc.markdown;


                    markdownPreview.innerHTML =
                        renderMarkdown(
                            doc.markdown,
                            doc.id
                        );


                    splitView.classList.remove(
                        "hidden"
                    );

                }

            }
        );

    }
);


/* ==========================================
   TOOLBAR
========================================== */

document
    .querySelectorAll(
        "[data-format]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const action =
                        button.dataset.format;


                    /*
                        Markdown/Split toolbar
                        formatting.
                    */

                    const textarea =
                        getActiveTextEditor();


                    if (textarea) {

                        if (
                            action === "bold"
                        ) {

                            wrapMarkdownSelection(
                                textarea,
                                "**"
                            );

                            return;

                        }


                        if (
                            action === "italic"
                        ) {

                            wrapMarkdownSelection(
                                textarea,
                                "*"
                            );

                            return;

                        }


                        if (
                            action === "strike"
                        ) {

                            wrapMarkdownSelection(
                                textarea,
                                "~~"
                            );

                            return;

                        }


                        if (
                            action === "code"
                        ) {

                            wrapMarkdownSelection(
                                textarea,
                                "`"
                            );

                            return;

                        }


                        if (
                            action === "codeblock"
                        ) {

                            wrapMarkdownSelection(
                                textarea,
                                "```\n",
                                "\n```"
                            );

                            return;

                        }


                        if (
                            action === "link"
                        ) {

                            shortcutLink();

                            return;

                        }

                    }


                    /*
                        Visual formatting.
                    */

                    visualEditor.focus();


                    switch (action) {

                        case "bold":

                            document.execCommand(
                                "bold"
                            );

                            break;


                        case "italic":

                            document.execCommand(
                                "italic"
                            );

                            break;


                        case "strike":

                            document.execCommand(
                                "strikeThrough"
                            );

                            break;


                        case "bullet":

                            document.execCommand(
                                "insertUnorderedList"
                            );

                            break;


                        case "number":

                            document.execCommand(
                                "insertOrderedList"
                            );

                            break;


                        case "quote":

                            document.execCommand(
                                "formatBlock",
                                false,
                                "blockquote"
                            );

                            break;


                        case "link": {

                            shortcutLink();

                            return;

                        }


                        case "code":

                            document.execCommand(
                                "formatBlock",
                                false,
                                "code"
                            );

                            break;


                        case "codeblock":

                            document.execCommand(
                                "formatBlock",
                                false,
                                "pre"
                            );

                            break;

                    }


                    syncVisualEditor();

                }
            );

        }
    );


/* ==========================================
   HEADINGS
========================================== */

headingSelect.addEventListener(
    "change",
    () => {

        visualEditor.focus();


        let tag = "p";


        if (
            headingSelect.value ===
            "# "
        ) {
            tag = "h1";
        }


        if (
            headingSelect.value ===
            "## "
        ) {
            tag = "h2";
        }


        if (
            headingSelect.value ===
            "### "
        ) {
            tag = "h3";
        }


        document.execCommand(
            "formatBlock",
            false,
            tag
        );


        syncVisualEditor();


        headingSelect.value =
            "";

    }
);


/* ==========================================
   UNDO / REDO
========================================== */

document
    .querySelector(
        '[data-action="undo"]'
    )
    .addEventListener(
        "click",
        () => {

            visualEditor.focus();


            document.execCommand(
                "undo"
            );


            syncVisualEditor();

        }
    );


document
    .querySelector(
        '[data-action="redo"]'
    )
    .addEventListener(
        "click",
        () => {

            visualEditor.focus();


            document.execCommand(
                "redo"
            );


            syncVisualEditor();

        }
    );


/* ==========================================
   NEW / DELETE
========================================== */

newFolderButton.addEventListener(
    "click",
    createFolder
);


newDocumentButton.addEventListener(
    "click",
    async () => {

        await createDocument();

    }
);


deleteDocumentButton.addEventListener(
    "click",
    async () => {

        await deleteActiveDocument();

    }
);


/* ==========================================
   IMPORT MARKDOWN
========================================== */

importButton.addEventListener(
    "click",
    () => {

        markdownFileInput.click();

    }
);


markdownFileInput.addEventListener(
    "change",
    async () => {

        const file =
            markdownFileInput.files[0];


        if (!file) {
            return;
        }


        try {

            const markdown =
                await file.text();


            let title =
                file.name.replace(
                    /\.(md|markdown)$/i,
                    ""
                );


            if (!title.trim()) {

                title =
                    "Imported Document";

            }


            const doc = {

                id:
                    generateId("doc"),

                title,

                markdown,

                folderId:
                    null,

                createdAt:
                    Date.now(),

                updatedAt:
                    Date.now(),

                project:
                    false,

                projectName:
                    null,

                sourceMarkdownPath:
                    null

            };


            documents.push(doc);


            activeDocumentId =
                doc.id;


            saveEverything();


            await loadActiveDocument();


            saveStatus.textContent =
                "Imported";


            setTimeout(
                () => {

                    saveStatus.textContent =
                        "Saved";

                },
                1200
            );

        }

        catch (error) {

            console.error(error);


            alert(
                "Nomana could not import that Markdown file."
            );

        }


        markdownFileInput.value =
            "";

    }
);


/* ==========================================
   OPEN PROJECT
========================================== */

folderButton.addEventListener(
    "click",
    () => {

        folderInput.click();

    }
);


folderInput.addEventListener(
    "change",
    async () => {

        const files =
            Array.from(
                folderInput.files
            );


        if (
            files.length === 0
        ) {
            return;
        }


        saveStatus.textContent =
            "Opening project...";


        try {

            const firstPath =
                files[0]
                    .webkitRelativePath ||
                files[0].name;


            const rootFolder =
                firstPath.includes("/")
                    ? firstPath.split("/")[0]
                    : "Project";


            const projectFiles =
                files.map(
                    file => {

                        let relativePath =
                            file.webkitRelativePath ||
                            file.name;


                        if (
                            relativePath.startsWith(
                                rootFolder +
                                "/"
                            )
                        ) {

                            relativePath =
                                relativePath.substring(
                                    rootFolder.length +
                                    1
                                );

                        }


                        return {

                            file,

                            path:
                                canonicalPath(
                                    relativePath
                                )

                        };

                    }
                );


            let markdownFile =
                projectFiles.find(
                    item =>
                        item.path
                            .toLowerCase() ===
                        "readme.md"
                );


            if (!markdownFile) {

                markdownFile =
                    projectFiles.find(
                        item =>
                            item.path
                                .toLowerCase() ===
                            "readme.markdown"
                    );

            }


            if (!markdownFile) {

                markdownFile =
                    projectFiles.find(
                        item =>
                            /\.(md|markdown)$/i
                                .test(
                                    item.path
                                )
                    );

            }


            if (!markdownFile) {

                alert(
                    "Nomana couldn't find README.md or another Markdown file in that folder."
                );


                folderInput.value =
                    "";


                saveStatus.textContent =
                    "Saved";


                return;

            }


            const markdown =
                await markdownFile
                    .file
                    .text();


            const id =
                generateId("doc");


            const imageExtensions =
                /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i;


            const imageFiles =
                projectFiles.filter(
                    item =>
                        imageExtensions
                            .test(
                                item.path
                            )
                );


            await saveAssetsToDatabase(
                id,
                imageFiles
            );


            await hydrateProjectAssets(
                id
            );


            let title;


            if (
                markdownFile.path
                    .toLowerCase() ===
                "readme.md"
            ) {

                title =
                    rootFolder;

            }

            else {

                title =
                    markdownFile.path
                        .split("/")
                        .pop()
                        .replace(
                            /\.(md|markdown)$/i,
                            ""
                        );

            }


            const doc = {

                id,

                title,

                markdown,

                folderId:
                    null,

                createdAt:
                    Date.now(),

                updatedAt:
                    Date.now(),

                project:
                    true,

                projectName:
                    rootFolder,

                sourceMarkdownPath:
                    markdownFile.path,

                assetCount:
                    imageFiles.length

            };


            documents.push(doc);


            activeDocumentId =
                id;


            saveEverything();


            await loadActiveDocument();


            saveStatus.textContent =
                `Opened ${rootFolder}`;


            setTimeout(
                () => {

                    saveStatus.textContent =
                        "Saved";

                },
                1500
            );

        }

        catch (error) {

            console.error(error);


            alert(
                "Nomana couldn't open that project folder."
            );


            saveStatus.textContent =
                "Saved";

        }


        folderInput.value =
            "";

    }
);


/* ==========================================
   EXPORT — MARKDOWN / HTML / PDF
========================================== */

function exportFilename(doc, extension) {
    let filename = String(doc?.title || "")
        .trim()
        .replace(/[^a-z0-9-_]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    if (!filename) filename = "nomana-document";
    return `${filename}.${extension}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 250);
}

function closeExportMenu() {
    exportMenu.classList.add("hidden");
    exportMenuButton.setAttribute("aria-expanded", "false");
}

function toggleExportMenu() {
    const opening = exportMenu.classList.contains("hidden");
    exportMenu.classList.toggle("hidden", !opening);
    exportMenuButton.setAttribute("aria-expanded", String(opening));
}

async function imageSourceToDataUrl(src) {
    if (!src || src.startsWith("data:")) return src;

    try {
        const response = await fetch(src);
        if (!response.ok) return src;
        const blob = await response.blob();

        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Nomana could not embed an export image:", src, error);
        return src;
    }
}

async function buildPortableRenderedHtml(doc) {
    const template = document.createElement("template");
    template.innerHTML = renderMarkdown(doc.markdown, doc.id);

    const images = Array.from(template.content.querySelectorAll("img"));
    await Promise.all(images.map(async image => {
        const src = image.getAttribute("src") || "";
        const portableSrc = await imageSourceToDataUrl(src);
        image.setAttribute("src", portableSrc);
        image.removeAttribute("data-original-src");
    }));

    template.content.querySelectorAll("a").forEach(link => {
        link.removeAttribute("target");
        link.removeAttribute("rel");
    });

    return template.innerHTML;
}

function escapeExportTitle(value) {
    return String(value || "Nomana document")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function standaloneDocument(title, renderedHtml, printMode = false) {
    const safeTitle = escapeExportTitle(title);
    const autoPrint = printMode
        ? `<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),150));<\/script>`
        : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
:root{--ink:#25272b;--muted:#59615d;--accent:#51c894;--paper:#f7f3eb;--line:rgba(37,39,43,.12)}
*{box-sizing:border-box}html{background:#111a22}body{margin:0;color:var(--ink);font-family:Georgia,"Times New Roman",serif;line-height:1.7;background:#111a22}
.nomana-export{width:min(900px,calc(100% - 40px));margin:48px auto;padding:72px 76px;background:var(--paper);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.24)}
h1,h2,h3,h4,h5,h6{line-height:1.2;margin:1.45em 0 .55em}h1{font-size:2.25em}h2{font-size:1.65em}h3{font-size:1.3em}p{margin:.8em 0}a{color:#277957;text-underline-offset:3px}img{display:block;max-width:100%;height:auto;margin:28px auto;border-radius:10px}
blockquote{margin:28px 0;padding:18px 22px;border-left:4px solid var(--accent);background:rgba(81,200,148,.075);color:var(--muted)}
pre{margin:28px 0;padding:22px 24px;overflow:auto;border:1px solid var(--line);border-radius:12px;background:linear-gradient(145deg,rgba(33,49,43,.075),rgba(33,49,43,.035));color:#29463b;font:14px/1.7 "SFMono-Regular",Consolas,monospace;white-space:pre;box-shadow:inset 3px 0 0 rgba(87,201,148,.48)}pre code{padding:0;background:transparent;color:inherit;font:inherit}code{padding:2px 6px;border-radius:6px;background:#e5e1d9;color:#315144;font-family:"SFMono-Regular",Consolas,monospace}
.code-language{margin:0 0 -18px 24px;padding-top:10px;color:#718078;font:700 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase}.code-block{margin:28px 0}.code-block pre{margin:0}
.markdown-table-wrap{max-width:100%;overflow-x:auto;margin:28px 0}table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:.94em}th,td{padding:11px 15px;text-align:left;border-bottom:1px solid rgba(37,39,43,.075)}th{background:rgba(87,201,148,.09);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.82em}th+th,td+td{border-left:1px solid rgba(37,39,43,.065)}tr:last-child td{border-bottom:0}hr{height:1px;margin:34px 0;border:0;background:linear-gradient(90deg,transparent,rgba(37,39,43,.22),transparent)}input[type=checkbox]{accent-color:#3ba878}
@media(max-width:700px){.nomana-export{width:100%;margin:0;padding:36px 24px;border-radius:0}}
@page{size:auto;margin:18mm}
@media print{html,body{background:#fff}.nomana-export{width:auto;margin:0;padding:0;background:#fff;border-radius:0;box-shadow:none}a{color:inherit}pre,blockquote,table,img{break-inside:avoid}.code-language{margin-left:0}}
</style>
</head>
<body>
<main class="nomana-export">${renderedHtml}</main>
${autoPrint}
</body>
</html>`;
}

exportMenuButton.addEventListener("click", event => {
    event.stopPropagation();
    toggleExportMenu();
});

document.addEventListener("click", event => {
    if (!event.target.closest(".export-menu-wrap")) closeExportMenu();
});

downloadButton.addEventListener("click", () => {
    const doc = getActiveDocument();
    if (!doc) return;
    closeExportMenu();
    downloadBlob(
        new Blob([doc.markdown], {type:"text/markdown;charset=utf-8"}),
        exportFilename(doc, "md")
    );
});

exportHtmlButton.addEventListener("click", async () => {
    const doc = getActiveDocument();
    if (!doc) return;
    closeExportMenu();
    saveStatus.textContent = "Exporting...";

    try {
        const rendered = await buildPortableRenderedHtml(doc);
        const html = standaloneDocument(doc.title, rendered, false);
        downloadBlob(
            new Blob([html], {type:"text/html;charset=utf-8"}),
            exportFilename(doc, "html")
        );
    } catch (error) {
        console.error(error);
        alert("Nomana couldn't export this document as HTML.");
    } finally {
        saveStatus.textContent = "Saved";
    }
});

exportPdfButton.addEventListener("click", async () => {
    const doc = getActiveDocument();
    if (!doc) return;
    closeExportMenu();

    // Open synchronously so browsers do not block the popup after async image work.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("Please allow pop-ups for Nomana so the PDF print view can open.");
        return;
    }

    printWindow.document.write("<!doctype html><title>Preparing Nomana PDF…</title><p style='font-family:sans-serif;padding:24px'>Preparing document…</p>");
    printWindow.document.close();
    saveStatus.textContent = "Preparing PDF...";

    try {
        const rendered = await buildPortableRenderedHtml(doc);
        const html = standaloneDocument(doc.title, rendered, true);
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    } catch (error) {
        console.error(error);
        printWindow.close();
        alert("Nomana couldn't prepare this document for PDF export.");
    } finally {
        saveStatus.textContent = "Saved";
    }
});


/* ==========================================
   CLEANUP
========================================== */

window.addEventListener(
    "beforeunload",
    () => {

        for (
            const documentId
            of projectAssets.keys()
        ) {

            releaseRuntimeAssets(
                documentId
            );

        }

    }
);


/* ==========================================
   INITIALISE
========================================== */

async function initialiseNomana() {

    saveStatus.textContent =
        "Loading...";


    try {

        await openNomanaDatabase();

    }

    catch (error) {

        console.error(
            "IndexedDB unavailable:",
            error
        );

    }


    loadDocuments();


    await loadActiveDocument();


    saveStatus.textContent =
        "Saved";

}


initialiseNomana();