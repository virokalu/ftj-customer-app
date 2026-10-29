import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui";
import { activeStatuses } from "@/features/vehicles/hooks";
import { statusLabel } from "@/features/vehicles/status";
import type { VehicleFilters } from "@/lib/api/endpoints";
import { radius, spacing, useTheme } from "@/theme/theme";

export type ActiveStatus = (typeof activeStatuses)[number];

// Sort choices (sheet 2). There is no price sort anywhere: the API rejects it.
export const sortOptions = [
  { key: "arrival", label: "Arriving soonest", sort: "arrival", dir: "asc" },
  { key: "recent", label: "Recently bought", sort: "purchaseDate", dir: "desc" },
  { key: "oldest", label: "Oldest purchase", sort: "purchaseDate", dir: "asc" },
] as const satisfies readonly {
  key: string;
  label: string;
  sort: VehicleFilters["sort"];
  dir: VehicleFilters["dir"];
}[];
export type SortKey = (typeof sortOptions)[number]["key"];

export type ListFilters = { status: ActiveStatus | null; brand: string | null; sort: SortKey };
export const defaultFilters: ListFilters = { status: null, brand: null, sort: "arrival" };

/** "Filter vehicles on the way" sheet. Edits a draft; nothing changes until "Show vehicles". */
export function FilterSheet({
  visible,
  value,
  brands,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: ListFilters;
  brands: string[];
  onApply: (f: ListFilters) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState(value);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={() => setDraft(value)}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Pressable onPress={() => setDraft(defaultFilters)} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: t.accent, fontSize: 16, fontWeight: "600" }}>Reset</Text>
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>Filter vehicles on the way</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={16}
              tintColor={t.accent}
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
          <Group label="Status">
            <Chip
              label="Any"
              selected={draft.status === null}
              onPress={() => setDraft({ ...draft, status: null })}
            />
            {activeStatuses.map((s) => (
              <Chip
                key={s}
                label={statusLabel[s]}
                selected={draft.status === s}
                onPress={() => setDraft({ ...draft, status: s })}
              />
            ))}
          </Group>

          {/* No brand-list endpoint exists, so the choices are the brands of the vehicles loaded
              so far (guide §6, open question 10). */}
          {brands.length > 1 ? (
            <Group label="Brand">
              <Chip
                label="Any"
                selected={draft.brand === null}
                onPress={() => setDraft({ ...draft, brand: null })}
              />
              {brands.map((b) => (
                <Chip
                  key={b}
                  label={b}
                  selected={draft.brand === b}
                  onPress={() => setDraft({ ...draft, brand: b })}
                />
              ))}
            </Group>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.groupLabel, { color: t.textMuted }]}>Sort by</Text>
            <View style={[styles.sortList, { borderColor: t.border }]}>
              {sortOptions.map((o, i) => (
                <Pressable
                  key={o.key}
                  onPress={() => setDraft({ ...draft, sort: o.key })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: draft.sort === o.key }}
                  style={[
                    styles.sortRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
                  ]}
                >
                  <Text style={{ flex: 1, color: t.text, fontSize: 15 }}>{o.label}</Text>
                  {draft.sort === o.key ? (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check", web: "check" }}
                      size={15}
                      tintColor={t.accent}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={{ padding: spacing.md, paddingBottom: spacing.xl }}>
          <Button label="Show vehicles" onPress={() => onApply(draft)} />
        </View>
      </View>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.groupLabel, { color: t.textMuted }]}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export function Chip({
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
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: t.accent, borderColor: t.accent }
          : { backgroundColor: t.background, borderColor: t.border },
      ]}
    >
      <Text style={{ color: selected ? t.onAccent : t.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: "700" },
  groupLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  sortList: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  sortRow: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: spacing.md },
});
