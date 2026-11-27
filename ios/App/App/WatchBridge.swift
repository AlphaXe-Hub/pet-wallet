import Foundation
import Capacitor

/// JS -> 原生：触发一次手表同步。
/// 用法（Web）：Capacitor.Plugins.WatchBridge.sync()
@objc(WatchBridge)
public class WatchBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchBridge"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    @objc func sync(_ call: CAPPluginCall) {
        WatchSyncService.shared.pushLatest()
        call.resolve()
    }
}
