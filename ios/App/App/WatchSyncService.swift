import Foundation
import WatchConnectivity

/// 手表 <-> iPhone 数据通道
/// - 下行：把 App 沙盒 Documents/watch-snapshot.json 推给手表（applicationContext + sendMessage）
/// - 上行：接收手表发来的快捷操作（出库 / 补货），暂存到 Documents/watch-inbox.json，等 App 处理
/// 不使用 App Group（免费签名被禁），见 ADR-0004。
final class WatchSyncService: NSObject, WCSessionDelegate {

    static let shared = WatchSyncService()
    private var activated = false

    /// WatchBridge 注册的回调：收到手表操作时通知 JS 层立即处理
    var onAction: (() -> Void)?

    func activate() {
        guard WCSession.isSupported() else { return }
        if activated { return }
        activated = true
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    // MARK: - 文件路径
    static func docsURL() -> URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
    }
    static func snapshotURL() -> URL? { docsURL()?.appendingPathComponent("watch-snapshot.json") }
    static func inboxURL() -> URL? { docsURL()?.appendingPathComponent("watch-inbox.json") }

    static func readSnapshot() -> String? {
        guard let url = snapshotURL() else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }

    // MARK: - 下行
    func pushLatest() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        guard let json = Self.readSnapshot() else { return }
        let payload: [String: Any] = ["snapshot": json, "updatedAt": Date().timeIntervalSince1970]
        do { try session.updateApplicationContext(payload) }
        catch { session.transferUserInfo(payload) }
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        }
    }

    // MARK: - 上行队列
    static func appendAction(_ dict: [String: Any]) {
        guard let url = inboxURL() else { return }
        var arr: [[String: Any]] = []
        if let data = try? Data(contentsOf: url),
           let obj = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            arr = obj
        }
        arr.append(dict)
        if let out = try? JSONSerialization.data(withJSONObject: arr) {
            try? out.write(to: url)
        }
    }

    /// 取出并清空收件箱（返回数组的 JSON 字符串，便于跨桥传递）
    static func drainInboxJSON() -> String {
        guard let url = inboxURL() else { return "[]" }
        guard let data = try? Data(contentsOf: url) else { return "[]" }
        let text = (String(data: data, encoding: .utf8)) ?? "[]"
        try? Data("[]".utf8).write(to: url)
        return text
    }

    // MARK: - WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.pushLatest() }
    }
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }

    /// 手表发来的快捷操作
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil) {
        if let action = message["action"] as? String {
            var dict = message
            if dict["id"] == nil { dict["id"] = UUID().uuidString }
            dict["receivedAt"] = Date().timeIntervalSince1970
            Self.appendAction(dict)
            DispatchQueue.main.async { self.onAction?() }
            replyHandler?(["ok": true])
            return
        }
        if message["requestSnapshot"] != nil { pushLatest() }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        if let action = userInfo["action"] as? String {
            var dict = userInfo
            if dict["id"] == nil { dict["id"] = UUID().uuidString }
            dict["receivedAt"] = Date().timeIntervalSince1970
            Self.appendAction(dict)
            DispatchQueue.main.async { self.onAction?() }
            return
        }
        if userInfo["requestSnapshot"] != nil { pushLatest() }
    }

    /// 无 replyHandler 的 sendMessage 也会走到这里
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let action = message["action"] as? String {
            var dict = message
            if dict["id"] == nil { dict["id"] = UUID().uuidString }
            dict["receivedAt"] = Date().timeIntervalSince1970
            Self.appendAction(dict)
            DispatchQueue.main.async { self.onAction?() }
            return
        }
        if message["requestSnapshot"] != nil { pushLatest() }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if session.isReachable { pushLatest() }
    }
}
