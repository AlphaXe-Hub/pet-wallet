import UIKit
import Capacitor

/// 自定义 BridgeViewController：在 bridge 就绪后注册 App 内本地插件并启动手表同步。
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WatchBridge())
        bridge?.registerPluginInstance(Notifier())
        WatchSyncService.shared.activate()
    }
}
