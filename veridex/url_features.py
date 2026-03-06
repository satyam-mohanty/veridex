import urllib.parse
import re
import tldextract


def extract_url_features(url: str) -> dict:
    features = {}
    suspicious_flags = []

    parsed = urllib.parse.urlparse(url)
    ext = tldextract.extract(url)

    domain_full = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
    subdomain_full = ext.subdomain
    url_lower = url.lower()

    features["url_length"] = len(url)
    if features["url_length"] > 75:
        suspicious_flags.append(f"Unusually long URL ({features['url_length']} chars)")

    features["uses_https"] = 1 if parsed.scheme.lower() == "https" else 0
    if features["uses_https"] == 0:
        suspicious_flags.append(
            "URL uses HTTP instead of HTTPS - connection is not encrypted"
        )

    features["dot_count"] = url.count(".")
    if features["dot_count"] > 4:
        suspicious_flags.append("Too many dots in URL - possible subdomain abuse")

    subdomains = [s for s in subdomain_full.split(".") if s]
    features["subdomain_count"] = len(subdomains)
    if features["subdomain_count"] >= 3:
        suspicious_flags.append(
            "Multiple subdomains detected - common phishing pattern"
        )

    features["has_at_symbol"] = 1 if "@" in url else 0
    if features["has_at_symbol"] == 1:
        suspicious_flags.append(
            "@ symbol found in URL - browser ignores everything before it"
        )

    ip_pattern = r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    hostname = parsed.hostname or ""
    features["has_ip_address"] = 1 if re.match(ip_pattern, hostname) else 0
    if features["has_ip_address"] == 1:
        suspicious_flags.append(
            "IP address used as domain - strong indicator of phishing"
        )

    keywords = [
        "login",
        "signin",
        "verif",
        "update",
        "banking",
        "confirm",
        "password",
        "credential",
        "webscr",
        "ebayisapi",
        "secure",
        "security",
        "account",
        "free",
        "winner",
        "prize",
        "claim",
        "urgent",
        "suspended",
        "otp",
        "blocked",
        "bonus",
        "reward",
        "appleid",
        "paypal",
        "paypa1",
        "microsoft",
        "amazon",
        "netflix",
        "bankofamerica",
        "chase",
        "wellsfargo",
        "support",
        "billing",
        "service",
        "helpdesk",
        "auth",
        "validation",
    ]
    found_kws = []
    for kw in keywords:
        found_kws.extend([kw] * url_lower.count(kw))

    features["suspicious_keyword_count"] = len(found_kws)
    if features["suspicious_keyword_count"] > 0:
        unique_kws = list(set(found_kws))
        suspicious_flags.append(
            f"Suspicious keywords found in URL: [{', '.join(unique_kws)}]"
        )

    features["hyphen_count"] = ext.domain.count("-")
    features["total_hyphens"] = hostname.count("-") if hostname else 0
    if features["total_hyphens"] >= 2:
        suspicious_flags.append(
            "Multiple hyphens in hostname - used to fake legitimate brand names"
        )

    shorteners = [
        "bit.ly",
        "tinyurl.com",
        "t.co",
        "goo.gl",
        "lnkd.in",
        "ow.ly",
        "is.gd",
        "buff.ly",
        "adf.ly",
        "bit.do",
        "mcaf.ee",
        "su.pr",
    ]
    features["is_url_shortener"] = 1 if domain_full.lower() in shorteners else 0
    if features["is_url_shortener"] == 1:
        suspicious_flags.append("URL shortener detected - hides the real destination")

    path_and_query = parsed.path + ("?" + parsed.query if parsed.query else "")
    features["has_redirect"] = 1 if "//" in path_and_query else 0

    features["query_param_count"] = len(urllib.parse.parse_qs(parsed.query))

    features["encoded_char_count"] = url.count("%")

    features["domain_length"] = len(ext.domain)

    suspicious_tlds = ["xyz", "tk", "ml", "ga", "cf", "pw", "top", "click"]
    features["suspicious_tld"] = 1 if ext.suffix.lower() in suspicious_tlds else 0
    if features["suspicious_tld"] == 1:
        suspicious_flags.append(
            "Suspicious top-level domain detected - commonly used in phishing"
        )

    features["has_custom_port"] = 0
    if parsed.port:
        if (parsed.scheme == "http" and parsed.port != 80) or (
            parsed.scheme == "https" and parsed.port != 443
        ):
            features["has_custom_port"] = 1

    return {"features": features, "suspicious_flags": suspicious_flags}


def compute_url_risk_score(features: dict) -> int:
    f = features["features"]
    score = 0

    if f.get("has_ip_address", 0) == 1:
        score += 40
    if f.get("has_at_symbol", 0) == 1:
        score += 30
    if f.get("is_url_shortener", 0) == 1:
        score += 35
    if f.get("uses_https", 1) == 0:
        score += 15

    length = f.get("url_length", 0)
    if length > 75:
        score += 15
    elif length > 50:
        score += 5

    if f.get("suspicious_tld", 0) == 1:
        score += 25

    kws = f.get("suspicious_keyword_count", 0)
    if kws >= 3:
        score += 45
    elif kws == 2:
        score += 30
    elif kws == 1:
        score += 15

    subs = f.get("subdomain_count", 0)
    if subs >= 3:
        score += 35
    elif subs == 2:
        score += 20

    hyphens = f.get("total_hyphens", f.get("hyphen_count", 0))
    if hyphens >= 3:
        score += 40
    elif hyphens == 2:
        score += 25
    elif hyphens == 1:
        score += 10

    enc = f.get("encoded_char_count", 0)
    score += min(15, enc * 3)

    return min(100, score)


if __name__ == "__main__":
    test_urls = [
        "https://www.google.com",
        "http://192.168.1.1/login/verify?account=123&token=abc",
        "http://paypal-secure-login.xyz/signin/update/credential",
        "https://bit.ly/3xYzAbc",
    ]

    for u in test_urls:
        print(f"--- Testing URL: {u} ---")
        try:
            res = extract_url_features(u)
            score = compute_url_risk_score(res)

            print("Features extracted:", res["features"])
            print("Suspicious Flags:")
            if not res["suspicious_flags"]:
                print("  (None)")
            for flag in res["suspicious_flags"]:
                print(f"  - {flag}")
            print(f"Risk Score: {score}/100")
        except Exception as e:
            print(f"Error parsing {u}: {e}")
        print("\n")
