use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ScrapedLink {
    pub url: String,
    pub title: String,
    pub icon_url: Option<String>,
    pub is_healthy: bool,
}

#[tauri::command]
pub fn sanitize_web_url(url: String) -> String {
    let mut clean_url = url.trim().to_string();
    if !clean_url.starts_with("http://") && !clean_url.starts_with("https://") {
        clean_url = format!("https://{}", clean_url);
    }
    clean_url
}

fn is_valid_url(url: &str) -> bool {
    if url.is_empty() {
        return false;
    }

    if url.len() > 2000 {
        return false; // Evitar URLs excessivamente longas
    }

    // Verificar caracteres suspeitos
    if url.contains("<") || url.contains(">") || url.contains(";") {
        return false;
    }

    // Verificar se é um protocolo permitido
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return false;
    }

    // Verificar se há caracteres de controle
    if url.chars().any(|c| c.is_control()) {
        return false;
    }

    true
}

fn extrapolate_title_from_url(url: &str) -> String {
    let clean_url = url
        .replace("https://", "")
        .replace("http://", "")
        .replace("www.", "");
    let domain = clean_url.split('/').next().unwrap_or(&clean_url);
    let stem = domain.split('.').next().unwrap_or(domain);
    let mut c = stem.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

#[tauri::command]
pub fn fetch_and_parse_links(url: String) -> Result<Vec<ScrapedLink>, String> {
    // Validar URL antes de processar
    if !is_valid_url(&url) {
        return Err("URL inválida ou malformada".to_string());
    }

    // Limitar tamanho da URL
    if url.len() > 2000 {
        return Err("URL muito longa".to_string());
    }

    let client = Client::builder()
        // Masquerade as a real browser to bypass basic anti-bot systems
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let res = client
        .get(&url)
        .send()
        .map_err(|e| format!("Network error: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Base URL failed with status: {}", res.status()));
    }

    let html_content = res.text().map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html_content);

    let link_selector = Selector::parse("a[href]")
        .map_err(|e| format!("Invalid CSS selector: {e}"))?;

    let mut results = Vec::new();

    for element in document.select(&link_selector) {
        if let Some(href) = element.value().attr("href") {
            if href.starts_with("http") && !href.contains("facebook.com") {
                // To DO: Deep fetch for title and health check in a separate thread pool
                let extracted_text = element
                    .text()
                    .collect::<Vec<_>>()
                    .join(" ")
                    .trim()
                    .to_string();
                let display_title = if extracted_text.is_empty() {
                    href.to_string()
                } else {
                    extracted_text
                };

                results.push(ScrapedLink {
                    url: href.to_string(),
                    title: display_title,
                    icon_url: None,
                    is_healthy: true, // Assuming true until health check proves otherwise
                });
            }
        }
    }

    // Basic deduplication
    results.dedup_by(|a, b| a.url == b.url);
    Ok(results)
}

#[tauri::command]
pub fn check_links_health(urls: Vec<String>) -> Result<Vec<String>, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut healthy_urls = Vec::new();

    // Since reqwest blocking client is used here, we must do it blocking.
    // Ideally this would use reqwest::Client (async) but for simplicity bridging it:
    for url in urls {
        match client.head(&url).send() {
            Ok(res) if res.status().is_success() => {
                healthy_urls.push(url);
            }
            Ok(res) if res.status().is_redirection() => {
                healthy_urls.push(url);
            }
            Ok(res) if res.status().as_u16() == 403 || res.status().as_u16() == 401 => {
                // Anti-bot protections (Cloudflare, etc.) return 403 to basic User-Agents.
                // The site exists and is up, so we consider it "healthy" for our launcher.
                healthy_urls.push(url);
            }
            Ok(_) => {
                // If the HEAD fails, try a normal GET just in case HEAD is blocked
                match client.get(&url).send() {
                    Ok(res2)
                        if res2.status().is_success()
                            || res2.status().is_redirection()
                            || res2.status().as_u16() == 403
                            || res2.status().as_u16() == 401 =>
                    {
                        healthy_urls.push(url);
                    }
                    _ => {}
                }
            }
            Err(_) => {} // Timeout or invalid domain
        }
    }

    Ok(healthy_urls)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SiteMetadata {
    pub title: Option<String>,
    pub icon_url: Option<String>,
    pub description: Option<String>,
}

#[tauri::command]
pub fn fetch_site_metadata(url: String) -> Result<SiteMetadata, String> {
    let clean_url = sanitize_web_url(url.clone());

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(&clean_url).send().map_err(|e| e.to_string())?;
    let html_content = res.text().unwrap_or_default();
    let document = Html::parse_document(&html_content);

    let title_selector = Selector::parse("title")
        .map_err(|e| format!("Invalid CSS selector: {e}"))?;
    let mut scraped_title = document
        .select(&title_selector)
        .next()
        .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
        .filter(|t| !t.is_empty());

    // Discard titles that are clearly anti-bot verification pages
    if let Some(ref t) = scraped_title {
        let lower_t = t.to_lowercase();
        if lower_t.contains("just a moment")
            || lower_t.contains("cloudflare")
            || lower_t.contains("attention required")
        {
            scraped_title = None;
        }
    }

    let mut title = scraped_title.or_else(|| Some(extrapolate_title_from_url(&url)));

    // Clean up title (remove SEO junk after separators)
    if let Some(t) = title.take() {
        let clean_t = t
            .split(|c| c == '|' || c == '-' || c == '—' || c == '–')
            .next()
            .unwrap_or(&t)
            .trim()
            .to_string();
        title = Some(clean_t);
    }

    let mut icon_url = None;
    let mut description = None;

    let meta_selector = Selector::parse("meta")
        .map_err(|e| format!("Invalid CSS selector: {e}"))?;
    for element in document.select(&meta_selector) {
        let prop = element
            .value()
            .attr("property")
            .or(element.value().attr("name"))
            .unwrap_or("");
        let content = element.value().attr("content").unwrap_or("");

        if prop == "og:image" && icon_url.is_none() {
            icon_url = Some(content.to_string());
        }
        if (prop == "description" || prop == "og:description") && description.is_none() {
            description = Some(content.to_string());
        }
    }

    if icon_url.is_none() {
        let link_selector = Selector::parse("link[rel='icon'], link[rel='shortcut icon']")
            .map_err(|e| format!("Invalid CSS selector: {e}"))?;
        if let Some(el) = document.select(&link_selector).next() {
            if let Some(href) = el.value().attr("href") {
                let mut resolved_url = href.to_string();
                if resolved_url.starts_with('/') && !resolved_url.starts_with("//") {
                    if let Ok(parsed) = reqwest::Url::parse(&url) {
                        resolved_url = format!(
                            "{}://{}{}",
                            parsed.scheme(),
                            parsed.host_str().unwrap_or(""),
                            href
                        );
                    }
                } else if resolved_url.starts_with("//") {
                    resolved_url = format!("https:{}", resolved_url);
                }
                icon_url = Some(resolved_url);
            }
        }
    }

    // Primary Fallback: Google Favicon API (Very robust for large sites, even those behind Cloudflare)
    if icon_url.is_none() || icon_url.as_ref().unwrap().ends_with(".ico") {
        if let Ok(parsed_url) = reqwest::Url::parse(&clean_url) {
            if let Some(host) = parsed_url.host_str() {
                icon_url = Some(format!(
                    "https://www.google.com/s2/favicons?domain={}&sz=256",
                    host
                ));
            }
        }
    }

    // Advanced Fallback: Google Images if absolutely nothing was found (or if favicon API failed to generate a URL)
    if icon_url.is_none() {
        let fallback_query = format!(
            "{} logo",
            title.clone().unwrap_or_else(|| clean_url.clone())
        );
        if let Some(scraped_img) = search_fallback_image(&fallback_query, &client) {
            icon_url = Some(scraped_img);
        }
    }

    Ok(SiteMetadata {
        title,
        icon_url,
        description,
    })
}

#[tauri::command]
pub fn fetch_fallback_image(query: String) -> Result<Option<String>, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    Ok(search_fallback_image(&query, &client))
}

// Helper function to scrape Google Images as a fallback
fn search_fallback_image(query: &str, client: &Client) -> Option<String> {
    let sanitized_query = query
        .replace(" ", "+")
        .replace("https://", "")
        .replace("http://", "")
        .replace("www.", "");
    let search_url = format!(
        "https://www.google.com/search?q={}&tbm=isch",
        sanitized_query
    );

    if let Ok(res) = client.get(&search_url).send() {
        if let Ok(html_content) = res.text() {
            let document = Html::parse_document(&html_content);
            let img_selector = match Selector::parse("img") {
                Ok(s) => s,
                Err(_) => return None,
            };

            for element in document.select(&img_selector) {
                if let Some(src) = element.value().attr("src") {
                    // Ignore google's tracking pixels and branding logos
                    if (src.starts_with("http") || src.starts_with("data:image"))
                        && !src.contains("branding")
                        && !src.contains("cleardot")
                        && !src.contains("loading")
                        && !src.contains("textinput")
                    {
                        println!("Fallback found image: {}", src);
                        return Some(src.to_string());
                    }
                }
            }
        }
    }
    None
}
#[cfg(test)]
#[path = "scraper.test.rs"]
mod tests;
