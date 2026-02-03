function getInboxEmailTexts() {
  const rows = document.querySelectorAll("tr.zA")
  const results = []

  rows.forEach((row) => {
    const subjectEl = row.querySelector("span.bog")
    const snippetEl = row.querySelector("span.y2")

    if (!subjectEl || !snippetEl) return

    const subject = subjectEl.innerText.trim()
    const snippet = snippetEl.innerText.replace("-", "").trim()

    if (!subject || !snippet) return

    const combined = `${subject}\n${snippet}`
    results.push(combined)
  })

  return results
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_INBOX") {
    const emails = getInboxEmailTexts()

    if (!emails.length) {
      sendResponse({ success: false })
      return
    }

    chrome.runtime.sendMessage({
      type: "INBOX_EMAILS_EXTRACTED",
      payload: emails
    })

    sendResponse({ success: true, count: emails.length })
  }
})
