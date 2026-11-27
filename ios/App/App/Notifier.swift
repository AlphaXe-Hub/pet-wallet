import Foundation
import UserNotifications
import Capacitor

/// 本地通知（免费签名可用，无 entitlement）。
/// 用于「临期 / 断货」提醒；iPhone 锁屏时会镜像到 Apple Watch。
@objc(Notifier)
public class Notifier: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "Notifier"
    public let jsName = "Notifier"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise)
    ]

    private let prefix = "petalert-"

    @objc func request(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            call.resolve(["granted": granted])
        }
    }

    /// items: [{ id, title, body, at }]  at = epoch 秒
    @objc func schedule(_ call: CAPPluginCall) {
        let raw = call.getValue("items") as? [[String: Any]] ?? []
        let center = UNUserNotificationCenter.current()

        // 先清掉旧的 petalert- 通知，避免堆积重复
        center.getPendingNotificationRequests { pending in
            let ids = pending.map { $0.identifier }.filter { $0.hasPrefix(self.prefix) }
            center.removePendingNotificationRequests(withIdentifiers: ids)

            for it in raw {
                guard let id = it["id"] as? String,
                      let title = it["title"] as? String,
                      let body = it["body"] as? String,
                      let at = it["at"] as? Double else { continue }
                let fire = Date(timeIntervalSince1970: at)
                if fire <= Date() { continue }
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = .default
                let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
                let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                let req = UNNotificationRequest(identifier: self.prefix + id, content: content, trigger: trigger)
                center.add(req, withCompletionHandler: nil)
            }
            call.resolve(["scheduled": raw.count])
        }
    }
}
