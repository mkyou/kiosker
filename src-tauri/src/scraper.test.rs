use super::*;

// ─── sanitize_web_url ────────────────────────────────────────────────────────

#[test]
fn test_sanitize_web_url_adds_https_when_missing() {
    assert_eq!(sanitize_web_url("example.com".to_string()), "https://example.com");
    assert_eq!(sanitize_web_url("sub.example.com/path".to_string()), "https://sub.example.com/path");
}

#[test]
fn test_sanitize_web_url_preserves_existing_protocol() {
    assert_eq!(sanitize_web_url("http://example.com".to_string()), "http://example.com");
    assert_eq!(sanitize_web_url("https://example.com".to_string()), "https://example.com");
}

#[test]
fn test_sanitize_web_url_trims_whitespace() {
    assert_eq!(sanitize_web_url("  example.com  ".to_string()), "https://example.com");
    assert_eq!(sanitize_web_url("  https://example.com  ".to_string()), "https://example.com");
}

// ─── is_valid_url ────────────────────────────────────────────────────────────

#[test]
fn test_is_valid_url_accepts_http_and_https() {
    assert!(is_valid_url("http://example.com"));
    assert!(is_valid_url("https://example.com"));
    assert!(is_valid_url("http://sub.example.com/path?query=1"));
    assert!(is_valid_url("https://example.com:8080/path"));
}

#[test]
fn test_is_valid_url_rejects_empty() {
    assert!(!is_valid_url(""));
}

#[test]
fn test_is_valid_url_rejects_other_protocols() {
    assert!(!is_valid_url("ftp://example.com"));
    assert!(!is_valid_url("javascript:alert(1)"));
    assert!(!is_valid_url("data:text/plain;base64,SGVsbG8="));
    assert!(!is_valid_url("vbscript:msgbox(1)"));
}

#[test]
fn test_is_valid_url_rejects_url_without_protocol() {
    assert!(!is_valid_url("http//example.com"));
    assert!(!is_valid_url("example.com"));
}

#[test]
fn test_is_valid_url_rejects_angle_brackets_and_semicolons() {
    assert!(!is_valid_url("http://example.com/path/<with>brackets"));
    assert!(!is_valid_url("http://example.com/path;with;semicolons"));
}

#[test]
fn test_is_valid_url_accepts_url_with_special_chars() {
    assert!(is_valid_url("http://example.com/path/with/special-characters_123"));
    assert!(is_valid_url("http://example.com/path/with%20spaces"));
    assert!(is_valid_url("http://example.com/path/with+plus"));
}

#[test]
fn test_is_valid_url_rejects_control_characters() {
    assert!(!is_valid_url("http://example.com/path/with\x01control"));
    assert!(!is_valid_url("http://example.com/path/with\nnewline"));
}

#[test]
fn test_is_valid_url_rejects_over_2000_chars() {
    let long_url = format!("http://example.com/?q={}", "a".repeat(2001));
    assert!(!is_valid_url(&long_url));
}

#[test]
fn test_is_valid_url_accepts_exactly_2000_chars() {
    let prefix = "http://example.com/?q=";
    let valid_long_url = format!("{}{}", prefix, "a".repeat(2000 - prefix.len()));
    assert_eq!(valid_long_url.len(), 2000);
    assert!(is_valid_url(&valid_long_url));
}

// ─── extrapolate_title_from_url ───────────────────────────────────────────────

#[test]
fn test_extrapolate_title_from_url_capitalizes_domain() {
    assert_eq!(extrapolate_title_from_url("http://example.com"), "Example");
    assert_eq!(extrapolate_title_from_url("https://netflix.com"), "Netflix");
}

#[test]
fn test_extrapolate_title_from_url_removes_www() {
    assert_eq!(extrapolate_title_from_url("https://www.example.com"), "Example");
}

#[test]
fn test_extrapolate_title_from_url_ignores_path() {
    assert_eq!(extrapolate_title_from_url("http://youtube.com/watch?v=abc"), "Youtube");
}

#[test]
fn test_extrapolate_title_from_url_uses_subdomain_not_domain() {
    assert_eq!(extrapolate_title_from_url("http://sub.example.com"), "Sub");
}

#[test]
fn test_extrapolate_title_from_url_single_char_domain() {
    assert_eq!(extrapolate_title_from_url("http://a.com"), "A");
}

#[test]
fn test_extrapolate_title_from_url_empty_input() {
    assert_eq!(extrapolate_title_from_url(""), "");
    assert_eq!(extrapolate_title_from_url("http://"), "");
}

// ─── fetch_and_parse_links ───────────────────────────────────────────────────

#[test]
fn test_fetch_and_parse_links_rejects_invalid_url() {
    assert!(fetch_and_parse_links("not-a-url".to_string()).is_err());
    assert!(fetch_and_parse_links("ftp://example.com".to_string()).is_err());
    assert!(fetch_and_parse_links("javascript:alert(1)".to_string()).is_err());
    assert!(fetch_and_parse_links("".to_string()).is_err());
}

#[test]
fn test_fetch_and_parse_links_deduplicates_consecutive() {
    let mut server = mockito::Server::new();
    let html = r#"<html><body>
        <a href="https://foo.com">Foo</a>
        <a href="https://foo.com">Foo again</a>
        <a href="https://bar.com">Bar</a>
    </body></html>"#;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_and_parse_links(server.url()).unwrap();
    assert_eq!(result.iter().filter(|l| l.url == "https://foo.com").count(), 1);
    assert_eq!(result.iter().filter(|l| l.url == "https://bar.com").count(), 1);
}

#[test]
fn test_fetch_and_parse_links_ignores_relative_and_anchor_links() {
    let mut server = mockito::Server::new();
    let html = r##"<html><body>
        <a href="/relative/path">Relative</a>
        <a href="#anchor">Anchor</a>
        <a href="https://absolute.com">Absolute</a>
    </body></html>"##;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_and_parse_links(server.url()).unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].url, "https://absolute.com");
}

// ─── fetch_site_metadata: title cleaning ─────────────────────────────────────

#[test]
fn test_fetch_site_metadata_cleans_title_pipe_separator() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>My Page | Company Name</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    assert_eq!(result.title.unwrap(), "My Page");
}

#[test]
fn test_fetch_site_metadata_cleans_title_dash_separator() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>My Page - Company Name</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    assert_eq!(result.title.unwrap(), "My Page");
}

#[test]
fn test_fetch_site_metadata_cleans_title_emdash_separator() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>My Page \u{2014} Brand</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    assert_eq!(result.title.unwrap(), "My Page");
}

#[test]
fn test_fetch_site_metadata_discards_just_a_moment_title() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>Just a moment...</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let title = result.title.unwrap();
    assert!(!title.to_lowercase().contains("just a moment"));
    assert!(!title.is_empty());
}

#[test]
fn test_fetch_site_metadata_discards_attention_required_title() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>Attention Required! | Cloudflare</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let title = result.title.unwrap();
    assert!(!title.to_lowercase().contains("attention required"));
    assert!(!title.is_empty());
}

#[test]
fn test_fetch_site_metadata_fallback_title_from_url_when_no_title() {
    let mut server = mockito::Server::new();
    let html = "<html><head></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    assert!(result.title.is_some());
    assert!(!result.title.unwrap().is_empty());
}

// ─── fetch_site_metadata: icon handling ──────────────────────────────────────

#[test]
fn test_fetch_site_metadata_uses_og_image() {
    let mut server = mockito::Server::new();
    let html = r#"<html><head>
        <meta property="og:image" content="https://example.com/og.png" />
    </head><body></body></html>"#;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    assert_eq!(result.icon_url.unwrap(), "https://example.com/og.png");
}

#[test]
fn test_fetch_site_metadata_resolves_relative_favicon() {
    let mut server = mockito::Server::new();
    let html = r#"<html><head>
        <link rel="icon" href="/favicon.png" />
    </head><body></body></html>"#;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let icon = result.icon_url.unwrap();
    assert!(icon.starts_with("http://") || icon.starts_with("https://"));
    assert!(icon.ends_with("/favicon.png"));
}

#[test]
fn test_fetch_site_metadata_resolves_protocol_relative_favicon() {
    let mut server = mockito::Server::new();
    let html = r#"<html><head>
        <link rel="icon" href="//cdn.example.com/icon.png" />
    </head><body></body></html>"#;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let icon = result.icon_url.unwrap();
    assert_eq!(icon, "https://cdn.example.com/icon.png");
}

#[test]
fn test_fetch_site_metadata_falls_back_to_google_favicon_api_when_no_icon() {
    let mut server = mockito::Server::new();
    let html = "<html><head><title>Test</title></head><body></body></html>";
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let icon = result.icon_url.unwrap();
    assert!(icon.contains("google.com/s2/favicons"));
}

#[test]
fn test_fetch_site_metadata_replaces_ico_favicon_with_google_api() {
    let mut server = mockito::Server::new();
    let html = r#"<html><head>
        <link rel="icon" href="/favicon.ico" />
    </head><body></body></html>"#;
    let _mock = server.mock("GET", "/").with_status(200).with_body(html).create();

    let result = fetch_site_metadata(server.url()).unwrap();
    let icon = result.icon_url.unwrap();
    assert!(icon.contains("google.com/s2/favicons"));
}

// ─── check_links_health ──────────────────────────────────────────────────────

#[test]
fn test_check_links_health_2xx_is_healthy() {
    let mut server = mockito::Server::new();
    let _mock = server.mock("HEAD", "/").with_status(200).create();
    let url = format!("{}/", server.url());

    let result = check_links_health(vec![url.clone()]).unwrap();
    assert!(result.contains(&url));
}

#[test]
fn test_check_links_health_3xx_is_healthy() {
    let mut server = mockito::Server::new();
    // 301 without Location → reqwest does not follow → is_redirection() branch triggered
    let _mock = server.mock("HEAD", "/").with_status(301).create();
    let url = format!("{}/", server.url());

    let result = check_links_health(vec![url.clone()]).unwrap();
    assert!(result.contains(&url));
}

#[test]
fn test_check_links_health_403_is_healthy() {
    let mut server = mockito::Server::new();
    let _mock = server.mock("HEAD", "/").with_status(403).create();
    let url = format!("{}/", server.url());

    let result = check_links_health(vec![url.clone()]).unwrap();
    assert!(result.contains(&url));
}

#[test]
fn test_check_links_health_401_is_healthy() {
    let mut server = mockito::Server::new();
    let _mock = server.mock("HEAD", "/").with_status(401).create();
    let url = format!("{}/", server.url());

    let result = check_links_health(vec![url.clone()]).unwrap();
    assert!(result.contains(&url));
}

#[test]
fn test_check_links_health_5xx_is_not_healthy() {
    let mut server = mockito::Server::new();
    let _head_mock = server.mock("HEAD", "/").with_status(500).create();
    let _get_mock = server.mock("GET", "/").with_status(500).create();
    let url = format!("{}/", server.url());

    let result = check_links_health(vec![url.clone()]).unwrap();
    assert!(!result.contains(&url));
}

#[test]
fn test_check_links_health_unreachable_is_not_healthy() {
    // Port 1 is privileged and not listening — connection refused immediately
    let unreachable = "http://127.0.0.1:1/".to_string();
    let result = check_links_health(vec![unreachable.clone()]).unwrap();
    assert!(!result.contains(&unreachable));
}

// ─── Integration tests (require network access — skipped by default) ──────────

#[test]
#[ignore]
fn test_fetch_and_parse_links_integration() {
    let result = fetch_and_parse_links("https://example.com".to_string());
    assert!(result.is_ok());
}

#[test]
#[ignore]
fn test_search_fallback_image_sanitizes_spaces_in_query() {
    // search_fallback_image is private; tested via fetch_fallback_image.
    // Spaces in query should be replaced with '+' before the Google search URL.
    let result = fetch_fallback_image("netflix logo".to_string());
    assert!(result.is_ok());
}

#[test]
#[ignore]
fn test_search_fallback_image_sanitizes_url_in_query() {
    // Protocols (https://, http://) and www. should be stripped from the query.
    let result = fetch_fallback_image("https://www.netflix.com logo".to_string());
    assert!(result.is_ok());
}
