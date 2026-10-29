import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip, FilterSheet, defaultFilters, sortOptions, type ListFilters } from "@/components/filter-sheet";
import { AppText, Button } from "@/components/ui";
import { VehicleRow } from "@/components/vehicle-row";
import {
  activeStatuses,
  usePurchaseHistory,
  useStatusCounts,
  useVehicleList,
} from "@/features/vehicles/hooks";
import { statusLabel } from "@/features/vehicles/status";
import type { VehicleSummary } from "@/lib/api/schemas";
import { radius, spacing, useTheme } from "@/theme/theme";

type Tab = "active" | "history";

// My vehicles (sheet 2): "On the way" with status chips, search and the filter sheet, and
// "Purchase history" (delivered cars, a count and "customer since"; never any amounts).
export default function VehiclesScreen() {
  const t = useTheme();
  // The selected tab lives in the URL (?tab=history), so Home's "History" shortcut can open it.
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === "history" ? "history" : "active";
  const setTab = (next: Tab) => router.setParams({ tab: next === "history" ? "history" : undefined });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ListFilters>(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sort = sortOptions.find((o) => o.key === filters.sort) ?? sortOptions[0];
  const active = useVehicleList({
    status: filters.status ?? undefined,
    brand: filters.brand ?? undefined,
    sort: sort.sort,
    dir: sort.dir,
  });
  const history = useVehicleList({ status: "DELIVERED", sort: "purchaseDate", dir: "desc" });
  const counts = useStatusCounts();
  const purchase = usePurchaseHistory();

  const list = tab === "active" ? active : history;
  // "On the way" = not delivered. With no status filter the API returns every status, so the
  // delivered ones are dropped here.
  const rows = useMemo(() => {
    const all = (list.data ?? []).filter((v) => tab === "history" || v.status !== "DELIVERED");
    return matchSearch(all, search);
  }, [list.data, tab, search]);

  // The API has no brand list: offer the brands of the vehicles loaded so far.
  const brands = useMemo(
    () => [...new Set((active.data ?? []).map((v) => v.brand).filter((b): b is string => !!b))].sort(),
    [active.data],
  );

  const activeTotal = counts ? activeStatuses.reduce((n, s) => n + (counts[s] ?? 0), 0) : null;
  const filtered = filters.status !== null || filters.brand !== null || filters.sort !== defaultFilters.sort;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.canvas }}>
      <FlatList
        data={rows}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleRow vehicle={item} />}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            tintColor={t.accent}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: t.text }]}>My vehicles</Text>
              <Pressable
                onPress={() => router.push("/link-vehicle")}
                accessibilityRole="button"
                accessibilityLabel="Link a vehicle"
                hitSlop={8}
                style={[styles.circle, { borderColor: t.border }]}
              >
                <SymbolView name={{ ios: "plus", android: "add", web: "add" }} size={16} tintColor={t.text} />
              </Pressable>
            </View>

            <View style={[styles.segmented, { backgroundColor: t.control }]} accessibilityRole="tablist">
              <SegmentButton
                label={`On the way${activeTotal !== null ? ` (${activeTotal})` : ""}`}
                selected={tab === "active"}
                onPress={() => setTab("active")}
              />
              <SegmentButton
                label={`Purchase history${purchase.data ? ` (${purchase.data.deliveredCount})` : ""}`}
                selected={tab === "history"}
                onPress={() => setTab("history")}
              />
            </View>

            <View style={styles.searchRow}>
              <View style={[styles.search, { backgroundColor: t.control }]}>
                <SymbolView
                  name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                  size={15}
                  tintColor={t.textMuted}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Serial, chassis or model"
                  placeholderTextColor={t.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  accessibilityLabel="Search vehicles"
                  style={[styles.searchInput, { color: t.text }]}
                />
              </View>
              {tab === "active" ? (
                <Pressable
                  onPress={() => setSheetOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={filtered ? "Filters, active" : "Filters"}
                  hitSlop={6}
                  style={[styles.filterButton, { backgroundColor: filtered ? t.accentSoft : t.control }]}
                >
                  <SymbolView
                    name={{
                      ios: "line.3.horizontal.decrease",
                      android: "filter_list",
                      web: "filter_list",
                    }}
                    size={16}
                    tintColor={filtered ? t.accent : t.text}
                  />
                </Pressable>
              ) : null}
            </View>

            {tab === "active" ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <Chip
                  label={`All${activeTotal !== null ? ` ${activeTotal}` : ""}`}
                  selected={filters.status === null}
                  onPress={() => setFilters({ ...filters, status: null })}
                />
                {activeStatuses
                  .filter((s) => !counts || (counts[s] ?? 0) > 0)
                  .map((s) => (
                    <Chip
                      key={s}
                      label={`${statusLabel[s]}${counts ? ` ${counts[s] ?? 0}` : ""}`}
                      selected={filters.status === s}
                      onPress={() => setFilters({ ...filters, status: s })}
                    />
                  ))}
              </ScrollView>
            ) : purchase.data ? (
              <View style={styles.stats}>
                <Stat value={String(purchase.data.deliveredCount)} label="Vehicles delivered" />
                <Stat
                  value={String(new Date(purchase.data.customerSince).getFullYear())}
                  label="Customer since"
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={t.accent} style={{ marginTop: spacing.lg }} />
          ) : list.isError ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <AppText muted>Couldn&apos;t load your vehicles.</AppText>
              <Button label="Try again" variant="secondary" onPress={() => void list.refetch()} />
            </View>
          ) : (
            <EmptyState
              text={
                search
                  ? "No vehicles match your search."
                  : tab === "history"
                    ? "Delivered vehicles will appear here."
                    : filtered
                      ? "No vehicles match these filters."
                      : "No vehicles on the way."
              }
              action={
                filtered && tab === "active"
                  ? { label: "Clear filters", onPress: () => setFilters(defaultFilters) }
                  : !search && tab === "active"
                    ? { label: "Link a vehicle", onPress: () => router.push("/link-vehicle") }
                    : undefined
              }
            />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={t.accent} /> : undefined}
      />

      <FilterSheet
        visible={sheetOpen}
        value={filters}
        brands={brands}
        onApply={(f) => {
          setFilters(f);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// The API has no text search, so this filters what is loaded: serial, chassis, brand, model, grade.
function matchSearch(rows: VehicleSummary[], search: string): VehicleSummary[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((v) =>
    [v.serial, v.chassisNo, v.brand, v.model, v.grade].some((f) => f?.toLowerCase().includes(q)),
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={[
        styles.segment,
        selected && {
          backgroundColor: t.controlSelected,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text
        style={{
          color: t.text,
          fontSize: 14,
          fontWeight: selected ? "700" : "500",
          opacity: selected ? 1 : 0.75,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, styles.raised, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={{ color: t.text, fontSize: 26, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
      <AppText muted style={{ textAlign: "center" }}>
        {text}
      </AppText>
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "700" },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md - 3,
  },
  searchRow: { flexDirection: "row", gap: spacing.sm },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: 42,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { gap: spacing.sm },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  // Same lift as the vehicle cards, so everything on the tinted page reads as one set of cards.
  raised: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
