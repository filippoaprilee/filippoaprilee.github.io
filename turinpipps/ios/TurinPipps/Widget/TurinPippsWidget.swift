import SwiftUI
import WidgetKit

// La fonte del widget è Supabase, lo stesso archivio autorevole usato dalla web app.
// L'endpoint restituisce soltanto dati pubblici aggregati: nessun token account.
private let radarURL = URL(string: "https://filippoaprilee.github.io/turinpipps/?screen=radar")!
private let feedURL = URL(string: "https://akgnxjwkrnuckgxscjdz.supabase.co/functions/v1/turinpipps-widget?budget=700")!

private struct WidgetFeed: Decodable {
    let matching_count: Int
    let to_verify_count: Int
    let scan_at: String?
    let latest: [WidgetListing]
}
private struct WidgetListing: Decodable {
    let title: String
    let zone: String
    let price: Int
}
private struct RadarEntry: TimelineEntry {
    let date: Date
    let candidates: Int
    let uncertain: Int
    let newestTitle: String
    let loaded: Bool
    let updated: Date?
}
private struct RadarProvider: TimelineProvider {
    func placeholder(in context: Context) -> RadarEntry {
        RadarEntry(date: .now, candidates: 8, uncertain: 12,
                   newestTitle: "Bilocale vicino al Politecnico", loaded: false, updated: nil)
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
            request.timeoutInterval = 12
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let feed = try JSONDecoder().decode(WidgetFeed.self, from: data)
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let timestamp = feed.scan_at.flatMap { iso.date(from: $0) }
            return RadarEntry(date: .now, candidates: max(0, feed.matching_count),
                              uncertain: max(0, feed.to_verify_count),
                              newestTitle: feed.latest.first?.title ?? "Apri il Radar per esplorare",
                              loaded: true, updated: timestamp)
        } catch {
            return RadarEntry(date: .now, candidates: 0, uncertain: 0,
                              newestTitle: "Apri TurinPipps per verificare",
                              loaded: false, updated: nil)
        }
    }
}
private struct RadarWidgetView: View {
    let entry: RadarEntry
    @Environment(\.widgetFamily) private var family
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "house.fill")
                    .foregroundStyle(.teal)
                Text("TurinPipps").font(.caption.bold())
                    .foregroundStyle(.primary)
                Spacer()
            }
            Spacer(minLength: 3)
            if entry.loaded {
                HStack(alignment: .firstTextBaseline, spacing: 7) {
                    Text("\(entry.candidates)")
                        .font(.system(size: 43, weight: .bold, design: .rounded))
                    Text("da valutare").font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Label("\(entry.uncertain) da verificare", systemImage: "checklist")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if family == .systemMedium {
                    Text(entry.newestTitle)
                        .font(.caption)
                        .lineLimit(2)
                    Text("Torino · canone fino a 700 €/mese · senza agenzie confermate")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Apri il Radar")
                    .font(.headline)
                Text("Aggiornamento temporaneamente non disponibile")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
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
        .description("Annunci pubblici da valutare, aggiornati dal database TurinPipps.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
@main
struct TurinPippsWidgets: WidgetBundle {
    var body: some Widget {
        TurinPippsWidget()
    }
}
