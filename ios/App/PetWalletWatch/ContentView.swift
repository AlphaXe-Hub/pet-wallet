import SwiftUI

struct ContentView: View {
    @EnvironmentObject var model: WatchModel
    @State private var page = 0

    var body: some View {
        TabView(selection: $page) {
            AlertsPage().tag(0)
            SpendPage().tag(1)
            PetsPage().tag(2)
        }
        .tabViewStyle(.verticalPage)
        .onAppear { model.requestFromPhone() }
    }
}

private struct EmptyHint: View {
    let text: String
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "pawprint.fill").font(.title3).foregroundStyle(.secondary)
            Text(text).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// A · 补给告警
struct AlertsPage: View {
    @EnvironmentObject var model: WatchModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("补给告警").font(.headline)
                if let snap = model.snapshot {
                    if snap.alerts.isEmpty {
                        EmptyHint(text: "暂时没有临期或断货\n辛苦啦 🐾")
                    } else {
                        ForEach(snap.alerts) { a in
                            HStack(alignment: .top, spacing: 6) {
                                Circle()
                                    .fill(a.kind == "expire" ? Color.orange : Color.green)
                                    .frame(width: 6, height: 6)
                                    .padding(.top, 6)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(a.name).font(.footnote).lineLimit(1)
                                    Text(subtitle(a)).font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                } else {
                    EmptyHint(text: "打开 iPhone 上的宠物账本\n同步一次即可")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 2)
        }
    }

    private func subtitle(_ a: SnapshotAlert) -> String {
        if a.kind == "expire" {
            if let d = a.days {
                return d < 0 ? "已过期 \(-d) 天" : (d == 0 ? "今天到期" : "\(d) 天后过期")
            }
            return "临期"
        }
        if let d = a.days { return "约剩 \(d) 天" }
        return "该补货"
    }
}

/// B · 本月支出
struct SpendPage: View {
    @EnvironmentObject var model: WatchModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                Text("本月支出").font(.headline)
                if let snap = model.snapshot {
                    Text("¥" + money(snap.monthTotal))
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .minimumScaleFactor(0.6).lineLimit(1)
                    Text("\(snap.monthCount) 笔").font(.caption2).foregroundStyle(.secondary)
                    ForEach(Array(snap.categories.prefix(3).enumerated()), id: \.offset) { _, c in
                        HStack {
                            Text(c.name).font(.caption2)
                            Spacer()
                            Text("\(Int((c.ratio * 100).rounded()))%").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                } else {
                    EmptyHint(text: "等待 iPhone 同步")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    private func money(_ v: Double) -> String {
        let n = (v * 100).rounded() / 100
        return n == n.rounded() ? String(Int(n)) : String(format: "%.2f", n)
    }
}

/// C · 宠物
struct PetsPage: View {
    @EnvironmentObject var model: WatchModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("毛孩子").font(.headline)
                if let snap = model.snapshot, !snap.pets.isEmpty {
                    ForEach(Array(snap.pets.enumerated()), id: \.offset) { _, p in
                        VStack(alignment: .leading, spacing: 1) {
                            Text(p.name).font(.footnote).bold()
                            Text([p.breed, p.age].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    Divider()
                    HStack {
                        Label("\(snap.streak) 天", systemImage: "flame.fill").font(.caption2)
                        Spacer()
                        Text("Lv \(snap.level)").font(.caption2).foregroundStyle(.secondary)
                    }
                } else {
                    EmptyHint(text: "还没有宠物数据")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
