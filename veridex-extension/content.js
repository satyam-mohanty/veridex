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

/* ── Global Link Scanner ── */
let scanQueue = [];
let scanQueueTimer = null;

function processScanQueue() {
  if (scanQueue.length === 0) {
    scanQueueTimer = null;
    return;
  }
  const batch = scanQueue.splice(0, 3);
  batch.forEach(job => job());
  if (scanQueue.length > 0) {
    scanQueueTimer = setTimeout(processScanQueue, 400);
  } else {
    scanQueueTimer = null;
  }
}

function enqueueScan(job) {
  scanQueue.push(job);
  if (!scanQueueTimer) {
    scanQueueTimer = setTimeout(processScanQueue, 400);
  }
}

const globalScannedUrls = new Set();
const urlResultCache = {};

function injectLinkIcon(a, result) {
  const risk = (result.risk_level || "LOW").toUpperCase();
  const confidence = Math.round((result.confidence || 0) * 100);
  const reasons = (result.reasons || []).slice(0, 2);

  let iconText, iconClass, titleText, color;
  if (risk === "CRITICAL" || risk === "HIGH" || risk === "PHISHING" || risk === "MALWARE") {
    iconText = "✗"; iconClass = "veridex-link-danger"; titleText = "Veridex: Dangerous link \u2014 do not click"; color="#ef4444";
  } else if (risk === "MEDIUM" || risk === "MODERATE" || risk === "SUSPICIOUS") {
    iconText = "⚠"; iconClass = "veridex-link-caution"; titleText = "Veridex: Proceed with caution"; color="#f59e0b";
  } else {
    iconText = "✓"; iconClass = "veridex-link-safe"; titleText = "Veridex: Safe link"; color="#22c55e";
  }

  const span = document.createElement("span");
  span.className = `veridex-link-icon ${iconClass}`;
  span.textContent = iconText;
  span.title = titleText;

  span.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTooltip) closeActiveTooltip();

    const tip = document.createElement("div");
    tip.className = "veridex-link-tooltip";
    activeTooltip = tip;

    const hdr = document.createElement("div");
    hdr.className = "veridex-link-tooltip-header";
    hdr.innerHTML = `<span style="color:${color}">${risk}</span><span style="font-weight:normal;color:#9ca3af">${confidence}% confidence</span>`;
    tip.appendChild(hdr);

    if (reasons.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "veridex-link-tooltip-reasons";
      reasons.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r;
        ul.appendChild(li);
      });
      tip.appendChild(ul);
    } else {
      const p = document.createElement("div");
      p.style.fontSize = "11px";
      p.style.color = "#9ca3af";
      p.textContent = "No specific reasons provided.";
      tip.appendChild(p);
    }

    const r = span.getBoundingClientRect();
    tip.style.top = (r.bottom + 4) + "px";
    tip.style.left = r.left + "px";
    document.body.appendChild(tip);
  });

  if (a.nextSibling) {
    a.parentNode.insertBefore(span, a.nextSibling);
  } else {
    a.parentNode.appendChild(span);
  }
}

function scanGlobalLinks() {
  const links = Array.from(document.querySelectorAll("a[href]")).filter(a => {
    if (a.dataset.veridexScanned) return false;
    const href = a.href;
    try {
      const url = new URL(href);
      if (['mailto:', 'tel:', 'javascript:', 'chrome:', 'chrome-extension:', 'about:', 'file:', 'data:'].includes(url.protocol)) return false;
      if (['localhost', '127.0.0.1'].includes(url.hostname)) return false;
      if (url.hostname === window.location.hostname) return false;
      if (href.startsWith('#')) return false;
      return true;
    } catch { return false; }
  });

  if (links.length === 0) return;

  const linkNodesByUrl = {};
  const newUrlsThisSweep = new Set();

  for (const a of links) {
    const url = a.href;
    if (!linkNodesByUrl[url]) linkNodesByUrl[url] = [];
    linkNodesByUrl[url].push(a);

    // If we already have a cached result, apply it immediately
    if (urlResultCache[url]) {
      a.dataset.veridexScanned = "true";
      injectLinkIcon(a, urlResultCache[url]);
      continue;
    }

    // Collect unique URLs to scan (cap at 50 new per sweep)
    if (!globalScannedUrls.has(url) && newUrlsThisSweep.size < 50) {
      newUrlsThisSweep.add(url);
      globalScannedUrls.add(url);
    } else if (globalScannedUrls.has(url) && !newUrlsThisSweep.has(url)) {
      // URL is in-flight from a previous sweep — don't re-enqueue, just wait
      a.dataset.veridexScanned = "pending";
    }
    // If cap hit and URL is brand new — leave it unmarked so next sweep picks it up
  }

  newUrlsThisSweep.forEach(url => {
    // Mark all <a> nodes for this URL as pending now that we're actually enqueuing
    if (linkNodesByUrl[url]) {
      linkNodesByUrl[url].forEach(a => {
        if (a.dataset.veridexScanned !== "true") {
          a.dataset.veridexScanned = "pending";
        }
      });
    }

    enqueueScan(() => {
      if (!isContextAlive()) return;
      chrome.runtime.sendMessage({ type: "SCAN_URL_SILENT", url: url }, (result) => {
        if (!result) return;
        urlResultCache[url] = result;
        // Apply to all <a> tags with this URL on the page
        document.querySelectorAll('a[href]').forEach(a => {
          if (a.href === url && a.dataset.veridexScanned !== "true") {
            a.dataset.veridexScanned = "true";
            injectLinkIcon(a, result);
          }
        });
      });
    });
  });
}

/* ── WhatsApp Feature ── */
function injectWABadge(msgContainer, result, fullText) {
  const risk = (result.risk_level || "LOW").toUpperCase();
  const confidence = Math.round((result.confidence || 0) * 100);
  const reasons = (result.reasons || []).slice(0, 3);
  
  let dotColor, pillText, pillClass;
  if (risk === "CRITICAL" || risk === "HIGH" || risk === "MALWARE" || risk === "PHISHING") {
    pillText = "✗"; pillClass = "veridex-wa-danger"; dotColor = "#ef4444";
  } else if (risk === "MEDIUM" || risk === "MODERATE" || risk === "SUSPICIOUS") {
    pillText = "⚠"; pillClass = "veridex-wa-caution"; dotColor = "#f59e0b";
  } else {
    pillText = "✓"; pillClass = "veridex-wa-safe"; dotColor = "#22c55e";
  }
  
  const badge = document.createElement("div");
  badge.className = `veridex-wa-badge ${pillClass}`;
  badge.textContent = pillText;
  
  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeTooltip) closeActiveTooltip();

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
      p.textContent = "No specific suspicious signals.";
      tip.appendChild(p);
    }

    if (risk === "HIGH" || risk === "CRITICAL" || risk === "PHISHING" || risk === "MALWARE") {
      const btn = document.createElement("button");
      btn.className = "ps-mark-safe-btn";
      btn.textContent = "Mark as Safe";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!isContextAlive()) return;
        chrome.runtime.sendMessage({
          type: "REPORT_SAFE",
          url: "sms:" + fullText.substring(0, 40),
          inputType: "sms"
        });
        btn.textContent = "✓ Marked as Safe";
        btn.disabled = true;
        btn.style.opacity = "0.5";
      });
      tip.appendChild(btn);
    }

    const r = badge.getBoundingClientRect();
    tip.style.position = "fixed";
    tip.style.top      = (r.bottom + 6) + "px";
    tip.style.left     = r.left + "px";
    document.body.appendChild(tip);
  });

  const copyable = msgContainer.querySelector('.selectable-text.copyable-text') || msgContainer.querySelector('.copyable-text');
  if (copyable) {
    let target = copyable;
    if (target.parentNode) {
      target.parentNode.insertBefore(badge, target.nextSibling);
    } else {
      msgContainer.appendChild(badge);
    }
  } else {
    msgContainer.appendChild(badge);
  }
}

function scanWhatsApp() {
  const messages = document.querySelectorAll('div.message-in');
  for (const msg of messages) {
    if (msg.dataset.veridexScanned) continue;
    
    const textEl = msg.querySelector('span.selectable-text.copyable-text, .copyable-text');
    let text = "";
    if (textEl) {
      text = textEl.innerText || textEl.textContent;
    } else {
      text = msg.innerText;
    }
    
    text = text.trim();

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];

    if (text.length < 10 || urls.length === 0) {
      msg.dataset.veridexScanned = "true";
      continue;
    }

    msg.dataset.veridexScanned = "pending";
    
    if (!isContextAlive()) return;
    chrome.runtime.sendMessage({ type: "SCAN_TEXT", text: text, scanType: "sms" }, (resp) => {
      msg.dataset.veridexScanned = "true";
      if (resp && resp.success) {
        injectWABadge(msg, resp.data, text);
      }
    });
    const uniqueWUrls = [...new Set(urls)];
    uniqueWUrls.forEach(url => {
      enqueueScan(() => {
        if (!isContextAlive()) return;
        chrome.runtime.sendMessage({ type: "SCAN_URL_SILENT", url: url }, (result) => {
          if (!result) return;
          const aTags = Array.from(msg.querySelectorAll('a')).filter(a => a.href === url || a.href + '/' === url || url.startsWith(a.href));
          if (aTags.length > 0) {
            aTags.forEach(a => {
              if (a.dataset.veridexRegexScanned) return;
              a.dataset.veridexRegexScanned = "true";
              a.dataset.veridexScanned = "true";
              injectLinkIcon(a, result);
            });
          }
        });
      });
    });
  }
}

function init() {
  const isGmail   = window.location.hostname === "mail.google.com";
  const isOutlook = /outlook\.(live|office)\.com/.test(window.location.hostname) ||
                    window.location.hostname === "outlook.office365.com";
  const isWhatsApp = window.location.hostname === "web.whatsapp.com";

  const sweep = debounce(() => {
    if (isGmail)   sweepGmail();
    if (isOutlook) sweepOutlook();
    if (isWhatsApp) scanWhatsApp();
    
    scanGlobalLinks();
  }, 800);

  const observer = new MutationObserver(sweep);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden", "aria-expanded", "open"] });

  window.addEventListener("hashchange", () => { setTimeout(sweep, 800); });

  // Scroll listener — catches links revealed by scrolling (lazy-loaded content, infinite scroll)
  const scrollSweep = debounce(scanGlobalLinks, 600);
  window.addEventListener("scroll", scrollSweep, { passive: true });

  setTimeout(sweep, 1500);
  setTimeout(sweep, 3500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
