interface EmotionResponseLike {
  emotionKey: string;
  valence: number;
  arousal: number;
  dominance: number;
}

export interface EmotionStats {
  emotionKey: string;
  count: number;
  valenceMean: number;
  arousalMean: number;
  dominanceMean: number;
  valenceMedian: number;
  arousalMedian: number;
  dominanceMedian: number;
  valenceStdDev: number;
  arousalStdDev: number;
  dominanceStdDev: number;
  sizeMean: number;
  sizeStdDev: number;
  speedMean: number;
  speedStdDev: number;
}

export interface AnalyticsEntry {
  emotionKey: string;
  shape: string;
  animationType: string;
  color: string;
  colorFamily: string;
  colorHue: number | null;
  colorSaturation: number | null;
  colorValue: number | null;
  size: number;
  speed: number;
  valence: number;
  arousal: number;
  dominance: number;
}

export const analyticsNumericKeys = ['valence', 'arousal', 'dominance', 'size', 'speed'] as const;
export type AnalyticsNumericKey = (typeof analyticsNumericKeys)[number];


export interface CategorySummaryItem {
  key: string;
  count: number;
  share: number;
  valenceMean: number;
  valenceStdDev: number;
  arousalMean: number;
  arousalStdDev: number;
  dominanceMean: number;
  dominanceStdDev: number;
  sizeMean: number;
  sizeStdDev: number;
  speedMean: number;
  speedStdDev: number;
}

export interface DemographicStat {
  key: string;
  count: number;
  share: number;
  valenceMean: number;
  valenceStdDev: number;
  arousalMean: number;
  arousalStdDev: number;
  dominanceMean: number;
  dominanceStdDev: number;
}

export interface CorrelationMatrixCell {
  left: string;
  right: string;
  label: string;
  value: number;
}

export interface VadEmotionMapping {
  emotionKey: string;
  centroidValence: number;
  centroidArousal: number;
  centroidDominance: number;
  nearestNeighborLabel: string;
  vadDistance: number;
}

export const mean = (values: number[]): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const round = (value: number, precision = 4): number => Number(value.toFixed(precision));

export const stdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, current) => sum + (current - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

export function pearsonCorrelation(x: number[], y: number[]): number {
  if (!x.length || x.length !== y.length) return 0;
  const meanX = mean(x);
  const meanY = mean(y);
  const covariance = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const varianceX = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const varianceY = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  if (varianceX === 0 || varianceY === 0) return 0;
  return covariance / Math.sqrt(varianceX * varianceY);
}

export function summarizeCategory<T extends keyof AnalyticsEntry>(
  entries: AnalyticsEntry[],
  key: T
): CategorySummaryItem[] {
  const grouped = entries.reduce<Record<string, AnalyticsEntry[]>>((acc, row) => {
    const groupKey = String(row[key]);
    acc[groupKey] = [...(acc[groupKey] ?? []), row];
    return acc;
  }, {});

  const total = entries.length;
  return Object.entries(grouped)
    .map(([groupKey, rows]) => ({
      key: groupKey,
      count: rows.length,
      share: round(rows.length / Math.max(1, total), 3),
      valenceMean: round(mean(rows.map((row) => row.valence))),
      valenceStdDev: round(stdDev(rows.map((row) => row.valence))),
      arousalMean: round(mean(rows.map((row) => row.arousal))),
      arousalStdDev: round(stdDev(rows.map((row) => row.arousal))),
      dominanceMean: round(mean(rows.map((row) => row.dominance))),
      dominanceStdDev: round(stdDev(rows.map((row) => row.dominance))),
      sizeMean: round(mean(rows.map((row) => row.size))),
      sizeStdDev: round(stdDev(rows.map((row) => row.size))),
      speedMean: round(mean(rows.map((row) => row.speed))),
      speedStdDev: round(stdDev(rows.map((row) => row.speed)))
    }))
    .sort((a, b) => b.count - a.count);
}

export function topCategoryValues<T extends keyof AnalyticsEntry>(
  entries: AnalyticsEntry[],
  key: T,
  limit = 3
): Array<{ value: string; count: number; share: number }> {
  return summarizeCategory(entries, key)
    .slice(0, limit)
    .map((item) => ({ value: item.key, count: item.count, share: round(item.count / Math.max(1, entries.length), 3) }));
}

export function zScore(value: number, mean: number, deviation: number): number {
  if (deviation === 0) return 0;
  return (value - mean) / deviation;
}

export function classifyOutlier(response: EmotionResponseLike, all: EmotionResponseLike[], threshold: number): boolean {
  const valenceValues = all.map((entry) => entry.valence);
  const arousalValues = all.map((entry) => entry.arousal);
  const dominanceValues = all.map((entry) => entry.dominance);

  const valenceZ = Math.abs(zScore(response.valence, mean(valenceValues), stdDev(valenceValues)));
  const arousalZ = Math.abs(zScore(response.arousal, mean(arousalValues), stdDev(arousalValues)));
  const dominanceZ = Math.abs(zScore(response.dominance, mean(dominanceValues), stdDev(dominanceValues)));

  return valenceZ > threshold || arousalZ > threshold || dominanceZ > threshold;
}

export function computeEmotionStats(responses: (EmotionResponseLike & { size?: number; speed?: number })[]): EmotionStats[] {
  const grouped = responses.reduce<Record<string, (EmotionResponseLike & { size?: number; speed?: number })[]>>((acc, response) => {
    acc[response.emotionKey] = [...(acc[response.emotionKey] ?? []), response];
    return acc;
  }, {});

  return Object.entries(grouped).map(([emotionKey, entries]) => {
    const valence = entries.map((entry) => entry.valence);
    const arousal = entries.map((entry) => entry.arousal);
    const dominance = entries.map((entry) => entry.dominance);
    const sizes = entries.map((entry) => entry.size ?? 0);
    const speeds = entries.map((entry) => entry.speed ?? 0);

    return {
      emotionKey,
      count: entries.length,
      valenceMean: round(mean(valence)),
      arousalMean: round(mean(arousal)),
      dominanceMean: round(mean(dominance)),
      valenceMedian: round(median(valence)),
      arousalMedian: round(median(arousal)),
      dominanceMedian: round(median(dominance)),
      valenceStdDev: round(stdDev(valence)),
      arousalStdDev: round(stdDev(arousal)),
      dominanceStdDev: round(stdDev(dominance)),
      sizeMean: round(mean(sizes)),
      sizeStdDev: round(stdDev(sizes)),
      speedMean: round(mean(speeds)),
      speedStdDev: round(stdDev(speeds))
    };
  });
}

export function computeDemographicStats(
  entries: (AnalyticsEntry & { gender?: string; country?: string })[],
  groupKey: 'gender' | 'country'
): DemographicStat[] {
  const grouped = entries.reduce<Record<string, (AnalyticsEntry & { gender?: string; country?: string })[]>>((acc, row) => {
    const key = row[groupKey] ?? 'unknown';
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});
  const total = entries.length;

  return Object.entries(grouped)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      share: round(rows.length / Math.max(1, total), 3),
      valenceMean: round(mean(rows.map((r) => r.valence))),
      valenceStdDev: round(stdDev(rows.map((r) => r.valence))),
      arousalMean: round(mean(rows.map((r) => r.arousal))),
      arousalStdDev: round(stdDev(rows.map((r) => r.arousal))),
      dominanceMean: round(mean(rows.map((r) => r.dominance))),
      dominanceStdDev: round(stdDev(rows.map((r) => r.dominance)))
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Like computeDemographicStats but `count` and `share` reflect unique respondents
 * (sessions), while VAD means/SDs are computed over all accepted responses for that group.
 */
export function computeDemographicStatsForSessions(
  entries: (AnalyticsEntry & { gender?: string; country?: string })[],
  sessions: Array<{ id: string; gender?: string | null; country?: string | null }>,
  groupKey: 'gender' | 'country'
): DemographicStat[] {
  // Count unique sessions per group value
  const sessionCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    const key = (s[groupKey] ?? 'unknown') || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalSessions = sessions.length;

  // Group responses by the same key to compute VAD means
  const grouped = entries.reduce<Record<string, (AnalyticsEntry & { gender?: string; country?: string })[]>>((acc, row) => {
    const key = row[groupKey] ?? 'unknown';
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  // Combine both into the result — cover all keys that appear in either sessions or responses
  const allKeys = new Set([...Object.keys(sessionCounts), ...Object.keys(grouped)]);

  return [...allKeys]
    .map((key) => {
      const rows = grouped[key] ?? [];
      const respondentCount = sessionCounts[key] ?? 0;
      return {
        key,
        count: respondentCount,
        share: round(respondentCount / Math.max(1, totalSessions), 3),
        valenceMean: round(mean(rows.map((r) => r.valence))),
        valenceStdDev: round(stdDev(rows.map((r) => r.valence))),
        arousalMean: round(mean(rows.map((r) => r.arousal))),
        arousalStdDev: round(stdDev(rows.map((r) => r.arousal))),
        dominanceMean: round(mean(rows.map((r) => r.dominance))),
        dominanceStdDev: round(stdDev(rows.map((r) => r.dominance)))
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeVadEmotionMapping(emotionStats: EmotionStats[]): VadEmotionMapping[] {
  return emotionStats.map((stat) => {
    let nearest = stat.emotionKey;
    let minDist = Infinity;
    for (const other of emotionStats) {
      if (other.emotionKey === stat.emotionKey) continue;
      const dist = Math.sqrt(
        (stat.valenceMean - other.valenceMean) ** 2 +
        (stat.arousalMean - other.arousalMean) ** 2 +
        (stat.dominanceMean - other.dominanceMean) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = other.emotionKey;
      }
    }
    return {
      emotionKey: stat.emotionKey,
      centroidValence: stat.valenceMean,
      centroidArousal: stat.arousalMean,
      centroidDominance: stat.dominanceMean,
      nearestNeighborLabel: nearest,
      vadDistance: round(minDist)
    };
  });
}

export function computeFullCorrelationMatrix(
  entries: AnalyticsEntry[],
  numericKeys: readonly string[],
  categoricalKeys: readonly string[] = []
): CorrelationMatrixCell[] {
  // Build named numeric vectors
  const vectors = new Map<string, number[]>();

  for (const key of numericKeys) {
    vectors.set(key, entries.map((e) => e[key as keyof AnalyticsEntry] as number));
  }

  // One-hot encode each categorical field: one binary vector per unique value
  for (const key of categoricalKeys) {
    const vals = entries.map((e) => String(e[key as keyof AnalyticsEntry]));
    const unique = [...new Set(vals)].sort();
    for (const uval of unique) {
      vectors.set(`${key}:${uval}`, vals.map((v) => (v === uval ? 1 : 0)));
    }
  }

  const formatKey = (k: string): string => {
    if (k.startsWith('shape:')) return `Shape: ${k.slice(6)}`;
    if (k.startsWith('animationType:')) return `Animation: ${k.slice(14)}`;
    return k.charAt(0).toUpperCase() + k.slice(1);
  };

  const allKeys = [...vectors.keys()];
  const result: CorrelationMatrixCell[] = [];

  for (let i = 0; i < allKeys.length; i++) {
    for (let j = i + 1; j < allKeys.length; j++) {
      const left = allKeys[i];
      const right = allKeys[j];
      const xVals = vectors.get(left)!;
      const yVals = vectors.get(right)!;
      result.push({
        left,
        right,
        label: `${formatKey(left)} ↔ ${formatKey(right)}`,
        value: round(pearsonCorrelation(xVals, yVals))
      });
    }
  }

  return result;
}

export function computeEmotionParameterMatrix(
  entries: AnalyticsEntry[],
  emotionKeys: string[]
): Array<{
  emotionKey: string;
  color: CategorySummaryItem[];
  colorFamily: CategorySummaryItem[];
  shape: CategorySummaryItem[];
  animation: CategorySummaryItem[];
  sizeMean: number;
  sizeStdDev: number;
  speedMean: number;
  speedStdDev: number;
}> {
  return emotionKeys.map((emotionKey) => {
    const rows = entries.filter((e) => e.emotionKey === emotionKey);
    return {
      emotionKey,
      color: summarizeCategory(rows, 'color').slice(0, 5),
      colorFamily: summarizeCategory(rows, 'colorFamily').slice(0, 5),
      shape: summarizeCategory(rows, 'shape').slice(0, 5),
      animation: summarizeCategory(rows, 'animationType').slice(0, 5),
      sizeMean: round(mean(rows.map((r) => r.size))),
      sizeStdDev: round(stdDev(rows.map((r) => r.size))),
      speedMean: round(mean(rows.map((r) => r.speed))),
      speedStdDev: round(stdDev(rows.map((r) => r.speed)))
    };
  });
}
