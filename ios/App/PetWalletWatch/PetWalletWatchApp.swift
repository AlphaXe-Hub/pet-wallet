import SwiftUI

@main
struct PetWalletWatchApp: App {
    @StateObject private var model = WatchModel.shared
    var body: some Scene {
        WindowGroup {
            ContentView().environmentObject(model)
        }
    }
}
