// Trusted root domains that should always be marked safe
const TRUSTED_DOMAINS = new Set([
  "google.com", "google.co.in", "google.co.uk", "google.com.au",
  "github.com", "githubusercontent.com",
  "microsoft.com", "live.com", "outlook.com", "office.com", "office365.com", "azure.com",
  "apple.com", "icloud.com",
  "amazon.com", "amazon.in", "amazonaws.com",
  "flipkart.com", "netflix.com",
  "youtube.com", "youtu.be",
  "facebook.com", "fb.com", "instagram.com",
  "twitter.com", "x.com", "linkedin.com",
  "wikipedia.org", "stackoverflow.com", "reddit.com",
  "twitch.tv", "spotify.com", "dropbox.com",
  "paypal.com", "ebay.com", "walmart.com",
  "adobe.com", "cloudflare.com",
  "npmjs.com", "pypi.org", "mozilla.org",
  "whatsapp.com", "discord.com", "slack.com",
  "zoom.us", "notion.so", "figma.com",
  "vercel.com", "netlify.com",
  "satyammohanty.com", "claude.ai", "anthropic.com",
  "hindustantimes.com", "indiatimes.com", "ndtv.com",
  "indianexpress.com", "thehindu.com", "news18.com", "firstpost.com",
]);

function extractRootDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      // Handle two-part TLDs like .co.in, .co.uk, .com.au
      const twoPartTLDs = ["co.in", "co.uk", "com.au", "co.jp", "co.kr", "org.in"];
      const lastTwo = parts.slice(-2).join(".");
      const lastThree = parts.length >= 3 ? parts.slice(-3).join(".") : null;
      for (const tld of twoPartTLDs) {
        if (lastTwo === tld && parts.length >= 3) {
          return parts.slice(-3).join(".");
        }
      }
      return lastTwo;
    }
    return hostname;
  } catch { return ""; }
}

function isTrustedUrl(url) {
  return TRUSTED_DOMAINS.has(extractRootDomain(url));
}

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("file://") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  ) {
    return;
  }

  // Skip backend scan for trusted domains — mark as safe immediately
  if (isTrustedUrl(url)) {
    const trustedResult = {
      risk_level: "LOW",
      risk_score: 5,
      label: "legitimate",
      confidence: 0.99,
      reasons: [],
      redirect_count: 0,
      redirect_chain: [url],
      final_url: url,
      final_url_safe: true,
    };
    await chrome.storage.session.set({ [details.tabId]: trustedResult });
    chrome.action.setBadgeText({ text: "✓", tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: details.tabId });
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8000/scan/url/chain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) throw new Error("Backend reachable but returned error");

    const result = await response.json();
    
    await chrome.storage.session.set({ [details.tabId]: result });

    let badgeText = "?";
    let badgeColor = "#6b7280";

    switch (result.risk_level) {
      case "LOW":
      case "SAFE":
        badgeText = "✓";
        badgeColor = "#22c55e";
        break;
      case "MEDIUM":
      case "MODERATE":
      case "SUSPICIOUS":
        badgeText = "!";
        badgeColor = "#f59e0b";
        break;
      case "HIGH":
      case "PHISHING":
        badgeText = "!!";
        badgeColor = "#f97316";
        break;
      case "CRITICAL":
      case "MALWARE":
        badgeText = "!!!";
        badgeColor = "#ef4444";
        break;
    }

    chrome.action.setBadgeText({ text: badgeText, tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: details.tabId });

    if (result.risk_level === "HIGH" || result.risk_level === "CRITICAL" || result.risk_level === "PHISHING" || result.risk_level === "MALWARE") {
      const reasonsText = (result.reasons || []).slice(0, 2).join("\n") || "Suspicious elements found.";
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png", 
        title: "⚠ Veridex: Suspicious Site Detected",
        message: `Risk Level: ${result.risk_level}\n${reasonsText}`,
        requireInteraction: false
      });
    }

    const local = await chrome.storage.local.get(["scan_history"]);
    let history = local.scan_history || [];
    
    history.unshift({
      url: url,
      risk_level: result.risk_level,
      timestamp: Date.now()
    });

    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    await chrome.storage.local.set({ scan_history: history });

  } catch (error) {
    console.error("Veridex Scan Error:", error);
    chrome.action.setBadgeText({ text: "?", tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280", tabId: details.tabId });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CURRENT_SCAN") {
    (async () => {
      let tabId = message.tabId;
      if (!tabId) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) tabId = tabs[0].id;
      }
      
      if (tabId) {
        const data = await chrome.storage.session.get(tabId.toString());
        sendResponse(data[tabId.toString()] || null);
      } else {
        sendResponse(null);
      }
    })();
    return true;
  }

  if (message.type === "GET_HISTORY") {
    chrome.storage.local.get(["scan_history"]).then(data => {
      sendResponse(data.scan_history || []);
    });
    return true;
  }

  if (message.type === "REPORT_SAFE") {
    (async () => {
      const local = await chrome.storage.local.get(["user_safe_list"]);
      const safeList = local.user_safe_list || [];
      if (!safeList.includes(message.url)) {
        safeList.push(message.url);
        await chrome.storage.local.set({ user_safe_list: safeList });
      }

      let synced = false;
      try {
        const response = await fetch("http://127.0.0.1:8000/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: message.url || message.text,
            correct_label: "legitimate",
            input_type: message.inputType || "url"
          })
        });
        if (response.ok) {
          synced = true;
        }
      } catch (err) {
        console.warn("Backend offline, could not sync feedback:", err);
      }

      sendResponse({ success: true, synced: synced });
    })();
    return true;
  }

  if (message.type === "SCAN_URL_SILENT") {
    (async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/scan/url/chain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: message.url })
        });
        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const result = await response.json();
        
        // Update history
        const local = await chrome.storage.local.get(["scan_history"]);
        let history = local.scan_history || [];
        history.unshift({
          url: message.url,
          risk_level: result.risk_level,
          timestamp: Date.now()
        });
        if (history.length > 20) history = history.slice(0, 20);
        await chrome.storage.local.set({ scan_history: history });
        
        sendResponse(result);
      } catch (err) {
        console.warn("Veridex SCAN_URL_SILENT error:", err.message);
        sendResponse(null);
      }
    })();
    return true;
  }

  if (message.type === "SCAN_TEXT") {
    (async () => {
      try {
        let endpoint = "/scan/email";
        if (message.scanType === "sms") endpoint = "/scan/sms";
        if (message.scanType === "review") endpoint = "/scan/review";

        const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.text })
        });
        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const result = await response.json();
        sendResponse({ success: true, data: result });
      } catch (err) {
        console.warn("Veridex SCAN_TEXT error:", err.message);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["scan_history", "user_safe_list"], (data) => {
    if (!data.scan_history) chrome.storage.local.set({ scan_history: [] });
    if (!data.user_safe_list) chrome.storage.local.set({ user_safe_list: [] });
  });
});
