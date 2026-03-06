console.log("[Veridex] content.js loaded on", window.location.hostname);

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

let activeTooltip = null;

function closeActiveTooltip() {
  if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
}

document.addEventListener("click", (e) => {
  if (activeTooltip && !activeTooltip.contains(e.target)) closeActiveTooltip();
}, true);

function createBadge(scanResult, emailText) {
  const risk       = (scanResult.risk_level  || "LOW").toUpperCase();
  const confidence = Math.round((scanResult.confidence || 0) * 100);
  const reasons    = (scanResult.reasons || []).slice(0, 3);
  const label      = scanResult.label || "legitimate";

  let dotColor, pillText, pillClass;
  if (risk === "CRITICAL" || risk === "HIGH") {
    dotColor = "#ef4444"; pillText = "Suspicious"; pillClass = "ps-pill--danger";
  } else if (risk === "MEDIUM") {
    dotColor = "#f59e0b"; pillText = "Caution";    pillClass = "ps-pill--warn";
  } else {
    dotColor = "#22c55e"; pillText = "Safe";        pillClass = "ps-pill--safe";
  }

  const pill = document.createElement("button");
  pill.className = `ps-pill ${pillClass}`;
  pill.setAttribute("data-veridex-badge", "true");
  pill.title = `Veridex — ${risk}`;
  pill.innerHTML =
    `<span class="ps-dot" style="background:${dotColor}"></span>` +
    `<span class="ps-pill-text">${pillText}</span>`;

  pill.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeTooltip) { closeActiveTooltip(); return; }

    const tip = document.createElement("div");
    tip.className = "ps-tooltip";
    activeTooltip = tip;

    const hdr = document.createElement("div");
    hdr.className = "ps-tooltip-header";
    hdr.innerHTML =
      `<span class="ps-tooltip-dot" style="background:${dotColor}"></span>` +
      `<span class="ps-tooltip-risk">${risk}</span>` +
      `<span class="ps-tooltip-conf">${confidence}% confidence</span>`;
    tip.appendChild(hdr);

    if (reasons.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "ps-tooltip-reasons";
      reasons.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r;
        ul.appendChild(li);
      });
      tip.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.className = "ps-tooltip-none";
      p.textContent = label === "legitimate"
        ? "No suspicious signals detected."
        : "Phishing patterns detected.";
      tip.appendChild(p);
    }

    if (risk === "HIGH" || risk === "CRITICAL") {
      const btn = document.createElement("button");
      btn.className = "ps-mark-safe-btn";
      btn.textContent = "Mark as Safe";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!isContextAlive()) return;
        chrome.runtime.sendMessage({
          type: "REPORT_SAFE",
          url: "email:" + emailText.substring(0, 40),
          inputType: "email"
        });
        btn.textContent = "✓ Marked as Safe";
        btn.disabled = true;
        btn.style.opacity = "0.5";
      });
      tip.appendChild(btn);
    }

    const r = pill.getBoundingClientRect();
    tip.style.position = "fixed";
    tip.style.top      = (r.bottom + 6) + "px";
    tip.style.left     = r.left + "px";
    document.body.appendChild(tip);
  });

  return pill;
}

function findInjectionTarget(bodyContainer) {
  let el = bodyContainer;
  for (let i = 0; i < 20; i++) {
    if (!el || !el.parentElement) break;
    el = el.parentElement;
    if (el.classList.contains("adn") || el.classList.contains("gs")) {
      const ha = el.querySelector(".ha");
      if (ha) return ha;
    }
  }
  const haList = document.querySelectorAll(".ha");
  for (const ha of haList) {
    if (ha.offsetParent !== null) return ha;
  }
  return null;
}

function injectBadge(bodyContainer, emailText, scanResult) {
  if (bodyContainer.dataset.veridexScanned === "true") return;
  bodyContainer.dataset.veridexScanned = "true";

  const target = findInjectionTarget(bodyContainer);

  if (target && injectedHeaders.has(target)) return;
  if (target) injectedHeaders.add(target);

  const badge  = createBadge(scanResult, emailText);

  if (target) {
    badge.style.marginLeft  = "8px";
    badge.style.display     = "inline-flex";
    badge.style.verticalAlign = "middle";
    const aJ = target.querySelector(".aJ");
    if (aJ && aJ.nextSibling) {
      target.insertBefore(badge, aJ.nextSibling);
    } else {
      target.appendChild(badge);
    }
    console.log("[Veridex] Badge injected into .ha header row", scanResult.risk_level);
  } else {
    bodyContainer.parentNode.insertBefore(badge, bodyContainer);
    console.log("[Veridex] Badge injected (fallback before body)", scanResult.risk_level);
  }
}

const scannedNodes = new WeakSet();

function isContextAlive() {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch (_) {
    return false;
  }
}

function scanContainer(container) {
  if (!isContextAlive()) return;

  if (scannedNodes.has(container)) return;
  if (container.dataset.phishshieldScanned === "true" ||
      container.dataset.phishshieldScanned === "pending") return;

  if (container.closest(".M9") || container.closest("[role='dialog']")) return;

  const text = container.innerText.trim();
  if (text.length < 20) return;

  container.dataset.veridexScanned = "pending";
  scannedNodes.add(container);

  console.log("[Veridex] Scanning email, length=", text.length);

  const p = new Promise((resolve, reject) => {
    if (!isContextAlive()) { reject(new Error("Context invalidated")); return; }
    try {
      chrome.runtime.sendMessage(
        { type: "SCAN_TEXT", text: text, scanType: "email" },
        (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        }
      );
    } catch (e) {
      reject(e);
    }
    setTimeout(() => reject(new Error("Timeout")), 15000);
  });

  p.then((resp) => {
    delete container.dataset.veridexScanned;
    if (!resp || !resp.success) {
      console.warn("[Veridex] Bad response:", resp);
      scannedNodes.delete(container);
      return;
    }
    injectBadge(container, text, resp.data);
  }).catch((err) => {
    delete container.dataset.veridexScanned;
    scannedNodes.delete(container);
  });
}

const GMAIL_BODY_SELECTORS = [".a3s"];

const injectedHeaders = new WeakSet();

function sweepGmail() {
  document.querySelectorAll(".a3s").forEach((el) => {
    if (el.offsetParent !== null) scanContainer(el);
  });
}

function sweepOutlook() {
  document.querySelectorAll('[role="document"], .allowTextSelection').forEach((el) => {
    if (el.offsetParent !== null) scanContainer(el);
  });
}

function init() {
  const isGmail   = window.location.hostname === "mail.google.com";
  const isOutlook = /outlook\.(live|office)\.com/.test(window.location.hostname) ||
                    window.location.hostname === "outlook.office365.com";

  if (!isGmail && !isOutlook) return;

  const sweep = debounce(() => {
    if (isGmail)   sweepGmail();
    if (isOutlook) sweepOutlook();
  }, 500);

  const observer = new MutationObserver(sweep);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("hashchange", () => { setTimeout(sweep, 800); });

  setTimeout(sweep, 1500);
  setTimeout(sweep, 3500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
