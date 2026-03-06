document.addEventListener("DOMContentLoaded", async () => {
  const colors = {
    LOW: "var(--low)",
    SAFE: "var(--low)",
    MEDIUM: "var(--medium)",
    MODERATE: "var(--medium)",
    SUSPICIOUS: "var(--medium)",
    HIGH: "var(--high)",
    PHISHING: "var(--high)",
    CRITICAL: "var(--critical)",
    MALWARE: "var(--critical)",
    UNKNOWN: "var(--unknown)"
  };

  function getRiskColor(level) {
    if (!level) return colors.UNKNOWN;
    const upper = level.toUpperCase();
    return colors[upper] || colors.UNKNOWN;
  }
  const connDot = document.getElementById("connection-dot");
  const connText = document.getElementById("connection-text");
  const manBtn = document.getElementById("manual-scan-btn");

  fetch("http://127.0.0.1:8000/health")
    .then(res => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .then(data => {
      if (data.status === "ok") {
        connDot.style.backgroundColor = "#22c55e";
        connText.textContent = "Backend Connected";
        connText.style.color = "#22c55e";
      } else {
        throw new Error("Backend status not ok");
      }
    })
    .catch(err => {
      connDot.style.backgroundColor = "#ef4444";
      connText.textContent = "Backend Offline — Extension inactive";
      connText.style.color = "#ef4444";
      if (manBtn) {
        manBtn.disabled = true;
        manBtn.style.opacity = "0.5";
        manBtn.style.cursor = "not-allowed";
      }
    });

  const currentUrlEl = document.getElementById("current-url");
  const scanResultEl = document.getElementById("scan-result");
  const loadingEl = document.getElementById("scan-loading");
  const emptyEl = document.getElementById("scan-empty");

  const riskBadgeEl = document.getElementById("risk-badge");
  const scoreValueEl = document.getElementById("score-value");
  const scoreProgressEl = document.getElementById("score-progress");
  const confidenceValueEl = document.getElementById("confidence-value");
  const reasonsToggleBtn = document.getElementById("reasons-toggle");
  const reasonsListEl = document.getElementById("reasons-list");
  const warningBarEl = document.getElementById("warning-bar");
  const markSafeBtn = document.getElementById("mark-safe-btn");
  const markSafeMsg = document.getElementById("mark-safe-msg");

  let currentTabUrl = "";

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTabUrl = tabs[0].url;
      let displayUrl = currentTabUrl;
      if (displayUrl.length > 40) displayUrl = displayUrl.substring(0, 40) + "...";
      currentUrlEl.textContent = displayUrl;
      
      chrome.runtime.sendMessage({ type: "GET_CURRENT_SCAN", tabId: tabs[0].id }, (response) => {
        loadingEl.style.display = "none";
        if (response && response.risk_level) {
          renderResult(response, scanResultEl, {
            badge: riskBadgeEl,
            score: scoreValueEl,
            progress: scoreProgressEl,
            confidence: confidenceValueEl,
            reasonsList: reasonsListEl,
            warningBar: warningBarEl,
            markSafe: markSafeBtn
          });
        } else {
          emptyEl.style.display = "block";
        }
      });
    }
  } catch (err) {
    console.error(err);
    loadingEl.style.display = "none";
    emptyEl.style.display = "block";
  }

  reasonsToggleBtn.addEventListener("click", () => {
    reasonsListEl.classList.toggle("expanded");
  });

  const manualReasonsToggleBtn = document.getElementById("manual-reasons-toggle");
  const manualReasonsListEl = document.getElementById("manual-reasons-list");
  manualReasonsToggleBtn.addEventListener("click", () => {
    manualReasonsListEl.classList.toggle("expanded");
  });

  const historyToggleBtn = document.getElementById("history-toggle");
  const historyListEl = document.getElementById("history-list");
  historyToggleBtn.addEventListener("click", () => {
    historyListEl.classList.toggle("expanded");
  });

  markSafeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "REPORT_SAFE", url: currentTabUrl }, (res) => {
      if (res && res.success) {
        markSafeBtn.style.display = "none";
        markSafeMsg.style.display = "block";
      }
    });
  });

  const tabBtns = document.querySelectorAll(".tab-btn");
  const manualInputEl = document.getElementById("manual-input");
  const manualScanBtn = document.getElementById("manual-scan-btn");
  const manualScanResultEl = document.getElementById("manual-scan-result");
  const manualScanLoadingEl = document.getElementById("manual-scan-loading");

  const manBadge = document.getElementById("manual-risk-badge");
  const manScore = document.getElementById("manual-score-value");
  const manProgress = document.getElementById("manual-score-progress");

  let activeTab = "url";

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      
      if (activeTab === "url") manualInputEl.placeholder = "Paste URL here to scan...";
      if (activeTab === "email") manualInputEl.placeholder = "Paste EMAIL content here...";
      if (activeTab === "sms") manualInputEl.placeholder = "Paste SMS content here...";
      
      manualScanResultEl.style.display = "none";
    });
  });

  manualScanBtn.addEventListener("click", async () => {
    const text = manualInputEl.value.trim();
    if (!text) return;

    manualScanResultEl.style.display = "none";
    manualScanLoadingEl.style.display = "block";

    let payload = {};
    let endpoint = "";

    if (activeTab === "url") {
      endpoint = "http://127.0.0.1:8000/scan/url";
      payload = { url: text };
    } else {
      chrome.runtime.sendMessage({ type: "SCAN_TEXT", text: text, scanType: activeTab }, (res) => {
        manualScanLoadingEl.style.display = "none";
        if (res && res.risk_level) {
          renderResult(res, manualScanResultEl, {
            badge: manBadge,
            score: manScore,
            progress: manProgress,
            reasonsList: manualReasonsListEl
          });
        } else {
          alert(res.error || "Failed to scan text");
        }
      });
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      manualScanLoadingEl.style.display = "none";
      renderResult(data, manualScanResultEl, {
        badge: manBadge,
        score: manScore,
        progress: manProgress,
        reasonsList: manualReasonsListEl
      });
    } catch (err) {
      console.error(err);
      manualScanLoadingEl.style.display = "none";
      alert("Error reaching backend");
    }
  });

  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (history) => {
    if (history && history.length > 0) {
      historyListEl.innerHTML = "";
      history.slice(0, 5).forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        
        let displayUrl = item.url;
        if (displayUrl.length > 30) displayUrl = displayUrl.substring(0, 30) + "...";
        
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
          <div class="history-dot" style="background-color: ${getRiskColor(item.risk_level)}"></div>
          <div class="history-url">${displayUrl}</div>
          <div class="history-time">${time}</div>
        `;
        div.addEventListener("click", () => {
          chrome.tabs.create({ url: item.url });
        });
        historyListEl.appendChild(div);
      });
    } else {
      historyListEl.innerHTML = "<div style='font-size: 12px; color: var(--text-muted); padding: 8px;'>No recent scans.</div>";
    }
  });

  function renderResult(data, containerEl, els) {
    containerEl.style.display = "block";
    const riskLevelStr = (data.risk_level || "UNKNOWN").toUpperCase();
    const riskColor = getRiskColor(riskLevelStr);
    
    if (els.badge) {
      els.badge.textContent = riskLevelStr;
      els.badge.style.backgroundColor = riskColor;
    }
    
    let rawScore = data.risk_score !== undefined ? data.risk_score : 0;
    let scorePerc = rawScore <= 1 ? rawScore * 100 : rawScore;
    
    if (els.score) els.score.textContent = `${Math.round(scorePerc)}%`;
    if (els.progress) {
      els.progress.style.width = `${Math.round(scorePerc)}%`;
      els.progress.style.backgroundColor = riskColor;
    }

    if (els.confidence && data.confidence !== undefined) {
      let calcConf = data.confidence <= 1 ? data.confidence * 100 : data.confidence;
      els.confidence.textContent = `${Math.round(calcConf)}%`;
    }

    if (els.reasonsList) {
      const reasons = data.reasons || [];
      if (reasons.length > 0) {
        els.reasonsList.innerHTML = `<ul>${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`;
      } else {
        els.reasonsList.innerHTML = "<div>No specific reasons found.</div>";
      }
    }

    if (els.warningBar) {
      if (riskLevelStr === "HIGH" || riskLevelStr === "CRITICAL" || riskLevelStr === "PHISHING" || riskLevelStr === "MALWARE") {
        els.warningBar.style.display = "block";
      } else {
        els.warningBar.style.display = "none";
      }
    }

    if (els.markSafe) {
      if (riskLevelStr === "HIGH" || riskLevelStr === "CRITICAL" || riskLevelStr === "PHISHING" || riskLevelStr === "MALWARE") {
        els.markSafe.style.display = "block";
      } else {
        els.markSafe.style.display = "none";
      }
    }
  }
});
