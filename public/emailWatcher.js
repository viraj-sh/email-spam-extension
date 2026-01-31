function getOpenEmail() {
  const bodyEl = document.querySelector("div.a3s")
  const subjectEl = document.querySelector("h2.hP")

  if (!bodyEl || !subjectEl) return null

  const body = bodyEl.innerText.trim()
  const subject = subjectEl.innerText.trim()

  if (!body || !subject) return null

  return { subject, body }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_EMAIL") {
    console.log("Extract request received")

    const email = getOpenEmail()

    if (!email) {
      console.log("No email found on page")
      sendResponse({ success: false })
      return
    }

    console.log("Email extracted", email)

    chrome.runtime.sendMessage({
      type: "EMAIL_EXTRACTED",
      payload: email
    })

    sendResponse({ success: true })
  }
})
