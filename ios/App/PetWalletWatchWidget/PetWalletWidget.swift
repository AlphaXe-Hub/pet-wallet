import WidgetKit
import SwiftUI

struct PWEntry: TimelineEntry {
    let date: Date
}

struct PWProvider: TimelineProvider {
    func placeholder(in context: Context) -> PWEntry { PWEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (PWEntry) -> Void) {
        completion(PWEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PWEntry>) -> Void) {
        completion(Timeline(entries: [PWEntry(date: Date())], policy: .never))
    }
}

/// 静态交互表盘：不读库存数据（避免 App Groups），只做为「记一笔」的一键入口。
struct PWComplicationView: View {
    @Environment(\.widgetFamily) private var family
    var body: some View {
        content
            .widgetURL(URL(string: "petwallet://quickadd"))
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryInline:
            Label("记一笔", systemImage: "pawprint.fill")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "pawprint.fill").font(.title3)
            }
        case .accessoryCorner:
            Image(systemName: "pawprint.fill")
                .widgetLabel { Text("记一笔") }
        case .accessoryRectangular:
            HStack(spacing: 6) {
                Image(systemName: "pawprint.fill").font(.title3)
                VStack(alignment: .leading, spacing: 0) {
                    Text("宠物账本").font(.headline)
                    Text("点一下记一笔").font(.caption2).foregroundStyle(.secondary)
                }
            }
        default:
            Image(systemName: "pawprint.fill")
        }
    }
}

struct PetWalletComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PetWalletQuick", provider: PWProvider()) { _ in
            PWComplicationView()
        }
        .configurationDisplayName("宠物账本")
        .description("点一下打开记账 / 出库")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryCorner, .accessoryRectangular])
    }
}

@main
struct PetWalletWidgetBundle: WidgetBundle {
    var body: some Widget {
        PetWalletComplication()
    }
}
