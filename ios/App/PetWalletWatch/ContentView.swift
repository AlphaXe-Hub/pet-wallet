import SwiftUI
import WatchKit

private func tapHaptic() {
    WKInterfaceDevice.current().play(.click)
}

struct ContentView: View {
    @EnvironmentObject var model: WatchModel
    @State private var page = 0

    var body: some View {
        TabView(selection: $page) {
            AlertsPage().tag(0)
            StockPage().tag(1)
            SpendPage().tag(2)
            PetsPage().tag(3)
        }
        .tabViewStyle(.verticalPage)
        .onAppear { model.requestFromPhone() }
        .onChange(of: model.pendingQuick) { _, v in
            if v { page = 1; model.pendingQuick = false }
        }
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

/// A · 补给告警（可一键出库）
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
                            HStack(alignment: .center, spacing: 6) {
                                Circle()
                                    .fill(a.kind == "expire" ? Color.orange : Color.green)
                                    .frame(width: 6, height: 6)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(a.name).font(.footnote).lineLimit(1)
                                    Text(subtitle(a)).font(.caption2).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 2)
                                if let pid = productId(for: a.name) {
                                    actionButton("minus", active: true) {
                                        model.send("out", productId: pid, qty: 1); tapHaptic()
                                    }
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
    private func productId(for name: String) -> String? {
        model.snapshot?.products?.first(where: { $0.name == name })?.id
    }
    private func subtitle(_ a: SnapshotAlert) -> String {
        if a.kind == "expire" {
            if let d = a.days { return d < 0 ? "已过期 \(-d) 天" : (d == 0 ? "今天到期" : "\(d) 天后过期") }
            return "临期"
        }
        if let d = a.days { return "约剩 \(d) 天" }
        return "该补货"
    }
}

/// B · 库存（出库 -1 / 补货 +1）
struct StockPage: View {
    @EnvironmentObject var model: WatchModel
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("库存").font(.headline)
                if let prods = model.snapshot?.products, !prods.isEmpty {
                    ForEach(prods) { p in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(p.name).font(.footnote).lineLimit(1)
                            HStack(spacing: 8) {
                                Text("\(fmt(p.qty)) \(p.unit)").font(.caption2).foregroundStyle(.secondary)
                                Spacer(minLength: 0)
                                actionButton("minus", active: p.qty > 0) {
                                    model.send("out", productId: p.id, qty: 1); tapHaptic()
                                }
                                actionButton("plus", active: true) {
                                    model.send("in", productId: p.id, qty: 1); tapHaptic()
                                }
                            }
                        }
                        Divider()
                    }
                } else {
                    EmptyHint(text: "还没有商品\n先在 iPhone 记一笔")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 2)
        }
    }
    private func fmt(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(format: "%.1f", v)
    }
}

private func actionButton(_ symbol: String, active: Bool, action: @escaping () -> Void) -> some View {
    Button(action: { if active { action() } }) {
        Image(systemName: symbol)
            .font(.system(size: 13, weight: .bold))
            .frame(width: 30, height: 30)
    }
    .buttonStyle(.plain)
    .background(active ? Color.green.opacity(0.28) : Color.gray.opacity(0.18))
    .clipShape(Circle())
    .disabled(!active)
}

/// C · 本月支出
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

/// D · 宠物
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
