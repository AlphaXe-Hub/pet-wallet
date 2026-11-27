import Foundation
import WatchConnectivity

struct SnapshotAlert: Identifiable, Decodable {
    var id: String { kind + "|" + name }
    let name: String
    let kind: String        // "expire" | "low"
    let days: Int?
    let qty: Double?
    let unit: String?
    let location: String?
}

struct SnapshotCategory: Decodable {
    let name: String
    let ratio: Double
}

struct SnapshotProduct: Identifiable, Decodable {
    let id: String
    let name: String
    let qty: Double
    let unit: String
    let lastPrice: Double?
}

struct SnapshotPet: Decodable {
    let name: String
    let breed: String?
    let age: String?
}

struct WatchSnapshot: Decodable {
    let generatedAt: String?
    let today: String?
    let alerts: [SnapshotAlert]
    let monthTotal: Double
    let monthCount: Int
    let categories: [SnapshotCategory]
    let pets: [SnapshotPet]
    let products: [SnapshotProduct]?
    let streak: Int
    let level: Int
    let totalEntries: Int
}

final class WatchModel: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchModel()

    @Published var snapshot: WatchSnapshot?
    @Published var updatedAt: Date?
    @Published var reachable: Bool = false
    @Published var pendingQuick: Bool = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            let s = WCSession.default
            s.delegate = self
            s.activate()
        }
    }

    func apply(_ payload: [String: Any]) {
        guard let json = payload["snapshot"] as? String,
              let data = json.data(using: .utf8) else { return }
        do {
            let snap = try JSONDecoder().decode(WatchSnapshot.self, from: data)
            DispatchQueue.main.async {
                self.snapshot = snap
                self.updatedAt = Date()
            }
        } catch {
            // 忽略解析错误，保留上一份
        }
    }

    /// 把快捷操作发回 iPhone（出库 / 补货）。失败时退回 transferUserInfo 保证不丢。
    func send(_ action: String, productId: String, qty: Int) {
        let msg: [String: Any] = [
            "action": action, "productId": productId,
            "qty": qty, "id": UUID().uuidString
        ]
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        if s.activationState == .activated {
            s.sendMessage(msg, replyHandler: { _ in }, errorHandler: { _ in s.transferUserInfo(msg) })
        } else {
            s.transferUserInfo(msg)
        }
    }

    func requestFromPhone() {
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        if s.activationState == .activated && s.isReachable {
            s.sendMessage(["requestSnapshot": true], replyHandler: nil, errorHandler: nil)
        }
    }

    // MARK: WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if !session.receivedApplicationContext.isEmpty {
            apply(session.receivedApplicationContext)
        }
        DispatchQueue.main.async { self.reachable = session.isReachable }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        apply(userInfo)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        apply(message)
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.reachable = session.isReachable }
    }
}
