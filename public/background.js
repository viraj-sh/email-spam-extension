let backendHealthy = false
let onEmailPage = false
let apiBase = "http://localhost:8000"

const ICON_PATHS = {
    red: {
        16: "icons/red/icon-red-16.png",
        32: "icons/red/icon-red-32.png",
        48: "icons/red/icon-red-48.png",
        128: "icons/red/icon-red-128.png"
    },
    yellow: {
        16: "icons/yellow/icon-yellow-16.png",
        32: "icons/yellow/icon-yellow-32.png",
        48: "icons/yellow/icon-yellow-48.png",
        128: "icons/yellow/icon-yellow-128.png"
    },
    green: {
        16: "icons/green/icon-green-16.png",
        32: "icons/green/icon-green-32.png",
        48: "icons/green/icon-green-48.png",
        128: "icons/green/icon-green-128.png"
    }
}

function updateIcon() {
    let state = "red"

    if (backendHealthy && onEmailPage) state = "green"
    else if (backendHealthy && !onEmailPage) state = "yellow"

    chrome.action.setIcon({ path: ICON_PATHS[state] })
}

async function checkBackendHealth() {
    if (!apiBase) return

    try {
        const res = await fetch(`${apiBase}/api/v1/health`)
        const data = await res.json()
        backendHealthy = res.ok && data.success && data.data?.status === "OK"
    } catch {
        backendHealthy = false
    }

    updateIcon()
}

function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        if (!tab || !tab.url) return

        onEmailPage = tab.url.includes("mail.google.com")
        updateIcon()
    })
}

function loadApiBaseFromStorage() {
    chrome.storage.local.get(["apiBase"], (result) => {
        if (result.apiBase) {
            apiBase = result.apiBase
        }
        checkBackendHealth()
    })
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.apiBase) {
        apiBase = changes.apiBase.newValue
        checkBackendHealth()
    }
})

chrome.runtime.onInstalled.addListener(() => {
    loadApiBaseFromStorage()
    checkActiveTab()
})

chrome.runtime.onStartup.addListener(() => {
    loadApiBaseFromStorage()
    checkActiveTab()
})

chrome.tabs.onActivated.addListener(checkActiveTab)

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) checkActiveTab()
})

setInterval(checkBackendHealth, 30)
