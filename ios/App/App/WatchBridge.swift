import Foundation
import Capacitor

/// JS <-> 原生 桥：
/// - sync()        触发一次「推送快照到手表」
/// - drainInbox()  取出手表发来的快捷操作（并清空队列），返回 JSON 字符串
/// - 当手表发来操作时，通过 notifyListeners("watchAction") 通知 JS 立即处理
@objc(WatchBridge)
public class WatchBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchBridge"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainInbox", returnType: CAPPluginReturnPromise)
    ]

    @objc override public func load() {
        WatchSyncService.shared.onAction = { [weak self] in
            self?.notifyListeners("watchAction", data: [:])
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        WatchSyncService.shared.pushLatest()
        call.resolve()
    }

    @objc func drainInbox(_ call: CAPPluginCall) {
        let json = WatchSyncService.drainInboxJSON()
        call.resolve(["actions": json])
    }
}
