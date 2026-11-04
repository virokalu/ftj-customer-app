import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, PopButton } from "@/components/ui";
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

/**
 * "Filter vehicles" sheet. Choices are a draft until "Apply"; "Clear" resets them and applies
 * that straight away, so closing the sheet afterwards keeps the list unfiltered.
 */
export function FilterSheet({
  visible,
  value,
  brands,
  onApply,
  onClear,
  onClose,
}: {
  visible: boolean;
  value: ListFilters;
  brands: string[];
  onApply: (f: ListFilters) => void;
  /** Applies the default filters without closing the sheet. */
  onClear: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
        {/* Grabber: shows this is a sheet that can be pulled down to close. */}
        <View style={[styles.grabber, { backgroundColor: t.textMuted }]} />
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Text style={[styles.title, { color: t.text }]}>Filter vehicles</Text>
          <PopButton onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={16}
              tintColor={t.text}
            />
          </PopButton>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: 120 }}>
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
                      tintColor={t.accentText}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Two buttons over the bottom of the list: Clear resets (and applies) the choices, Apply shows the vehicles. */}
        <View style={[styles.footer, { bottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Button label="Clear" variant="glass" onPress={() => {
                setDraft(defaultFilters);
                onClear();
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Apply" onPress={() => onApply(draft)} />
          </View>
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
    <PopButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: t.accent, borderColor: t.accent }
          : { backgroundColor: t.card, borderColor: t.border },
      ]}
    >
      <Text style={{ color: selected ? t.onAccent : t.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
    </PopButton>
  );
}

const styles = StyleSheet.create({
  grabber: { alignSelf: "center", width: 48, height: 5, borderRadius: 2.5, marginTop: spacing.sm, opacity: 0.4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "700" },
  groupLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  sortList: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  sortRow: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: spacing.md },
});
