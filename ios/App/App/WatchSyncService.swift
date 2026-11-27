import Foundation
import WatchConnectivity

/// 手表数据同步：把 App 沙盒 Documents/watch-snapshot.json 推送到已配对的 Apple Watch。
/// 不使用 App Group（免费签名被禁），走 WatchConnectivity + 同容器 JSON。
final class WatchSyncService: NSObject, WCSessionDelegate {

    static let shared = WatchSyncService()
    private var activated = false

    func activate() {
        guard WCSession.isSupported() else { return }
        if activated { return }
        activated = true
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    static func readSnapshot() -> String? {
        guard let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }
        let url = docs.appendingPathComponent("watch-snapshot.json")
        return try? String(contentsOf: url, encoding: .utf8)
    }

    /// 把当前快照推给手表。手表不在附近时 applicationContext 也会在下次可达时补发。
    func pushLatest() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        guard let json = Self.readSnapshot() else { return }
        let payload: [String: Any] = [
            "snapshot": json,
            "updatedAt": Date().timeIntervalSince1970
        ]
        do {
            try session.updateApplicationContext(payload)
        } catch {
            // 忽略：applicationContext 失败时退回 userInfo 队列
            session.transferUserInfo(payload)
        }
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        // 激活后立刻补推一次，保证手表一装上就有数据
        DispatchQueue.main.async { self.pushLatest() }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        // 切换手表后重新激活
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if message["requestSnapshot"] != nil {
            pushLatest()
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if session.isReachable { pushLatest() }
    }
}
