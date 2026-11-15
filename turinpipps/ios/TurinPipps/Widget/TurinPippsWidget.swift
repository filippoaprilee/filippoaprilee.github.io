import SwiftUI
import WidgetKit

private let radarURL = URL(string: "https://filippoaprilee.github.io/turinpipps/?screen=radar")!
private let feedURL = URL(string: "https://filippoaprilee.github.io/turinpipps/data/listings.json")!

private struct ListingFeed: Decodable {
    let listings: [Listing]
}
private struct Listing: Decodable {
    let title: String?
    let price: Double?
    let zone: String?
}
private struct RadarEntry: TimelineEntry {
    let date: Date
    let count: Int
    let title: String
    let loaded: Bool
}
private struct RadarProvider: TimelineProvider {
    func placeholder(in context: Context) -> RadarEntry {
        RadarEntry(date: .now, count: 5, title: "Annunci da valutare", loaded: false)
    }
    func getSnapshot(in context: Context, completion: @escaping (RadarEntry) -> Void) {
        completion(placeholder(in: context))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<RadarEntry>) -> Void) {
        Task {
            let entry = await fetch()
            completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
        }
    }
    private func fetch() async -> RadarEntry {
        do {
            var request = URLRequest(url: feedURL)
            request.timeoutInterval = 10
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let feed = try JSONDecoder().decode(ListingFeed.self, from: data)
            let areas = ["crocetta", "cenisia", "san paolo", "borgo san paolo",
                         "cit turin", "santa rita", "pozzo strada"]
            let candidates = feed.listings.filter { listing in
                guard let price = listing.price, price > 0, price <= 700 else { return false }
                let text = (listing.title ?? "").lowercased()
                if ["stanza", "camera singola", "posto letto", "box", "garage"].contains(where: text.contains) {
                    return false
                }
                let zone = (listing.zone ?? "").lowercased()
                return areas.contains(where: zone.contains)
            }
            return RadarEntry(date: .now, count: candidates.count,
                              title: "Da valutare · archivio pubblico", loaded: true)
        } catch {
            return RadarEntry(date: .now, count: 0,
                              title: "Apri TurinPipps per aggiornare", loaded: false)
        }
    }
}
private struct RadarWidgetView: View {
    let entry: RadarEntry
    @Environment(\.widgetFamily) private var family
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("TurinPipps", systemImage: "house.fill")
                .font(.caption.bold())
                .foregroundStyle(.teal)
            Spacer(minLength: 2)
            if entry.loaded {
                Text("\(entry.count)").font(.system(size: 39, weight: .bold, design: .rounded))
                Text(entry.title).font(.caption2).foregroundStyle(.secondary)
            } else {
                Text("Apri il Radar").font(.headline)
                Text("Aggiornamento non disponibile").font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if family == .systemMedium {
                Text("Torino · appartamenti interi · fino a 700 €")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(radarURL)
        .containerBackground(.background, for: .widget)
    }
}
struct TurinPippsWidget: Widget {
    let kind = "TurinPippsRadarWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RadarProvider()) { entry in
            RadarWidgetView(entry: entry)
        }
        .configurationDisplayName("Radar TurinPipps")
        .description("Annunci pubblici e accesso rapido alla ricerca.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
@main
struct TurinPippsWidgets: WidgetBundle {
    var body: some Widget {
        TurinPippsWidget()
    }
}