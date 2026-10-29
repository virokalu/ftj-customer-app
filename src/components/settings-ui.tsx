import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { radius, spacing, useTheme } from "@/theme/theme";

// Grouped settings list (Account and its sub-screens): a caption, then rounded rows with
// hairline dividers, in the same card style as the rest of the app.

export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <Text style={[styles.caption, { color: t.textMuted }]}>{title}</Text> : null}
      <View style={[styles.group, { backgroundColor: t.background, borderColor: t.border }]}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: t.border }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={[styles.footer, { color: t.textMuted }]}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon?: SymbolViewProps["name"];
  label: string;
  value?: string | null;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const t = useTheme();
  const color = destructive ? t.danger : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {icon ? <IconTile name={icon} tint={destructive ? t.danger : t.accent} /> : null}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.value, { color: t.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress && !destructive ? (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={13}
          tintColor={t.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

export function SwitchRow({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.label, { color: t.text, flex: 0 }]}>{label}</Text>
        {detail ? <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 16 }}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: t.accent, false: t.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Two to four mutually exclusive choices in one row (Appearance, departure reminder days). */
export function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: spacing.sm }]}>
      <Text style={[styles.label, { color: t.text, flex: 0 }]}>{label}</Text>
      <View style={[styles.segmented, { backgroundColor: t.surface }]} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${o.label}`}
              style={[
                styles.segment,
                selected && {
                  backgroundColor: t.background,
                  borderColor: t.border,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? t.text : t.textMuted,
                  fontSize: 14,
                  fontWeight: selected ? "600" : "500",
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function IconTile({ name, tint }: { name: SymbolViewProps["name"]; tint: string }) {
  const t = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: t.accentSoft }]}>
      <SymbolView name={name} size={15} tintColor={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  footer: { fontSize: 12, lineHeight: 17, paddingHorizontal: 4 },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  label: { flex: 1, fontSize: 16 },
  value: { fontSize: 15, maxWidth: "50%" },
  tile: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md - 3,
  },
});
