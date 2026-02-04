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

    results.push(`${subject}\n${snippet}`)
  })

  return results
}

function removeOldBadges() {
  document.querySelectorAll(".spam-ham-badge").forEach(el => el.remove())
}

function createPopup(prediction) {
  const existing = document.getElementById("spam-detail-popup")
  if (existing) existing.remove()

  const popup = document.createElement("div")
  popup.id = "spam-detail-popup"
  popup.style.position = "fixed"
  popup.style.top = "20px"
  popup.style.right = "20px"
  popup.style.zIndex = "999999"
  popup.style.background = "white"
  popup.style.border = "1px solid #ccc"
  popup.style.borderRadius = "8px"
  popup.style.padding = "12px"
  popup.style.width = "260px"
  popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
  popup.style.fontSize = "12px"

  const closeBtn = document.createElement("button")
  closeBtn.innerText = "×"
  closeBtn.style.position = "absolute"
  closeBtn.style.top = "4px"
  closeBtn.style.right = "8px"
  closeBtn.style.border = "none"
  closeBtn.style.background = "transparent"
  closeBtn.style.cursor = "pointer"
  closeBtn.onclick = () => popup.remove()

  const title = document.createElement("div")
  title.style.fontWeight = "bold"
  title.style.marginBottom = "6px"
  title.innerText = `Prediction: ${prediction.label.toUpperCase()}`

  const fields = [
    ["Decision Score", prediction.decision_score],
    ["Inference Time (ms)", prediction.model_inference_ms],
    ["Model Version", prediction.model_version],
    ["Text Length", prediction.text_length],
    ["Low Confidence", prediction.flag_low_confidence ? "Yes" : "No"]
  ]

  popup.appendChild(closeBtn)
  popup.appendChild(title)

  fields.forEach(([label, value]) => {
    const row = document.createElement("div")
    row.style.marginBottom = "4px"
    row.innerText = `${label}: ${value}`
    popup.appendChild(row)
  })

  document.body.appendChild(popup)
}

function applyPredictions(predictions) {
  removeOldBadges()

  const rows = document.querySelectorAll("tr.zA")

  rows.forEach((row, index) => {
    const subjectEl = row.querySelector("span.bog")
    if (!subjectEl || !predictions[index]) return

    const prediction = predictions[index]

    const badge = document.createElement("span")
    badge.className = "spam-ham-badge"
    badge.innerText = prediction.label.toUpperCase()
    badge.style.marginLeft = "8px"
    badge.style.padding = "2px 6px"
    badge.style.borderRadius = "10px"
    badge.style.fontSize = "10px"
    badge.style.fontWeight = "bold"
    badge.style.cursor = "pointer"
    badge.style.color = "white"
    badge.style.backgroundColor = prediction.label === "spam" ? "#dc2626" : "#16a34a"

    badge.onclick = (e) => {
      e.stopPropagation()
      createPopup(prediction)
    }

    subjectEl.parentElement.appendChild(badge)
  })
}
function removeOldBadges() {
  document.querySelectorAll(".spam-ham-badge").forEach(el => el.remove())
}

function removePopup() {
  const popup = document.getElementById("spam-detail-popup")
  if (popup) popup.remove()
}
function syncWithStorage() {
  chrome.storage.local.get(["prediction"], (result) => {
    if (!result.prediction) {
      removeOldBadges()
      removePopup()
    }
  })
}

syncWithStorage()


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

  if (msg.type === "APPLY_PREDICTIONS") {
    applyPredictions(msg.payload)
  }

  // ⭐ NEW — CLEAR UI
  if (msg.type === "CLEAR_PREDICTIONS_UI") {
    removeOldBadges()
    removePopup()
  }
})
