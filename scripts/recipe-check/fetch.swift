// Fetches every link in urls.txt (and misses.txt, the follow-up links the last score run asked for) with
// URLSession: the same network stack, TLS fingerprint and redirects as the app's fetch on iOS. Each page
// is saved as cache/<sha256 of the link>.html and .json; links already cached are skipped unless --fresh.
// Usage: swift scripts/recipe-check/fetch.swift [--fresh]   (URLS=urls-holdout.txt for another list)
import CryptoKit
import Foundation

// Keep in step with BROWSER_HEADERS in src/data/recipeImport.ts.
let headers = [
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
]

let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let cache = dir.appendingPathComponent("cache")
try? FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true)
let fresh = CommandLine.arguments.contains("--fresh")

func lines(_ name: String) -> [String] {
  ((try? String(contentsOf: dir.appendingPathComponent(name), encoding: .utf8)) ?? "")
    .split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
    .filter { !$0.isEmpty && !$0.hasPrefix("#") }
}

func key(_ link: String) -> String {
  SHA256.hash(data: Data(link.utf8)).map { String(format: "%02x", $0) }.joined()
}

let links = Array(Set(lines(ProcessInfo.processInfo.environment["URLS"] ?? "urls.txt") + lines("misses.txt")))
let config = URLSessionConfiguration.ephemeral
config.timeoutIntervalForRequest = 20
let session = URLSession(configuration: config)
let group = DispatchGroup()
let limit = DispatchSemaphore(value: 8)

for link in links {
  let base = cache.appendingPathComponent(key(link))
  if !fresh && FileManager.default.fileExists(atPath: base.appendingPathExtension("json").path) { continue }
  guard let url = URL(string: link) else { continue }
  var req = URLRequest(url: url)
  for (k, v) in headers { req.setValue(v, forHTTPHeaderField: k) }
  limit.wait()
  group.enter()
  session.dataTask(with: req) { data, res, err in
    let status = (res as? HTTPURLResponse)?.statusCode ?? 0
    try? (data ?? Data()).write(to: base.appendingPathExtension("html"))
    let meta: [String: Any] = ["url": link, "final": res?.url?.absoluteString ?? link, "status": status, "error": err?.localizedDescription ?? ""]
    try? JSONSerialization.data(withJSONObject: meta).write(to: base.appendingPathExtension("json"))
    print(status, data?.count ?? 0, link)
    limit.signal()
    group.leave()
  }.resume()
}
group.wait()
