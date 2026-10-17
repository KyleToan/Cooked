// The harness's stand-in for the app's hidden browser (src/components/PageReader.tsx): loads each link in
// browse.txt (written by the last score run) in an off-screen WKWebView, the engine react-native-webview
// uses on iOS, runs the same wait-for-recipe check, and saves the HTML to cache/<sha256>.browser.html.
// Usage: swift scripts/recipe-check/webview-probe.swift
import AppKit
import CryptoKit
import WebKit

let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let links = ((try? String(contentsOf: dir.appendingPathComponent("browse.txt"), encoding: .utf8)) ?? "")
  .split(separator: "\n").map(String.init).filter { !$0.isEmpty }

func key(_ link: String) -> String {
  SHA256.hash(data: Data(link.utf8)).map { String(format: "%02x", $0) }.joined()
}

final class Probe: NSObject {
  var view = WKWebView()
  var queue: [String]
  init(_ links: [String]) { queue = links; super.init(); next() }
  // A fresh view per link, as PageReader remounts its WebView for each read.
  func next() {
    guard let link = queue.first else { exit(0) }
    let config = WKWebViewConfiguration()
    config.websiteDataStore = .nonPersistent()  // As incognito in PageReader.
    view = WKWebView(frame: NSRect(x: 0, y: 0, width: 390, height: 844), configuration: config)
    view.load(URLRequest(url: URL(string: link)!))
    check(link, tries: 0)
  }
  // Same rule as SEND_PAGE: recipe data, or whatever is there after 8 seconds; PageReader gives up at 12.
  func check(_ link: String, tries: Int) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      self.view.evaluateJavaScript("document.documentElement.outerHTML") { html, _ in
        let page = html as? String ?? ""
        let found = page.range(of: #"recipeIngredient|"@type"\s*:\s*"Recipe""#, options: .regularExpression) != nil
        if found || tries >= 9 {
          try? page.write(to: dir.appendingPathComponent("cache/\(key(link)).browser.html"), atomically: true, encoding: .utf8)
          print(found ? "RECIPE" : "none", "after \(tries + 1)s", page.count, link)
          self.queue.removeFirst()
          self.next()
        } else {
          self.check(link, tries: tries + 1)
        }
      }
    }
  }
}

let app = NSApplication.shared
let probe = Probe(links)
app.run()
