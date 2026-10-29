import { Link, router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertRow, useOpenAlert } from "@/components/alert-row";
import { OnTheWayCarousel } from "@/components/on-the-way";
import { AppText, Button, raised } from "@/components/ui";
import { useAlerts, useHome, useOnTheWay } from "@/features/vehicles/hooks";
import { formatDate } from "@/features/vehicles/status";
import { greeting, initials } from "@/lib/format";
import { radius, spacing, useTheme } from "@/theme/theme";

// Home (sheet 2): greeting with the alerts bell, swipeable "On the way" cards, the latest
// updates, and a way to reach the team. Data: GET /home, GET /vehicles, GET /alerts.
export default function HomeScreen() {
  const t = useTheme();
  const home = useHome();
  const onTheWay = useOnTheWay();
  const alerts = useAlerts();
  const openAlert = useOpenAlert();

  const refreshing = home.isRefetching || onTheWay.isRefetching || alerts.isRefetching;
  const refresh = () => {
    void home.refetch();
    void onTheWay.refetch();
    void alerts.refetch();
  };

  const latestAlerts = alerts.data?.days.flatMap((d) => d.alerts).slice(0, 3) ?? [];
  const isNewCustomer = home.data && home.data.activeCount === 0 && home.data.deliveredCount === 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
      >
        <Header name={home.data?.name ?? null} unread={alerts.data?.unreadCount ?? 0} />

        {home.isPending ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: spacing.xl }} />
        ) : home.isError ? (
          <Padded>
            <RetryCard message="Couldn't load your dashboard." onRetry={refresh} />
          </Padded>
        ) : isNewCustomer ? (
          <Padded>
            <WelcomeCard />
          </Padded>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title={`On the way${home.data.activeCount ? ` (${home.data.activeCount})` : ""}`}
                action={{ label: "See all", href: "/vehicles" }}
              />
              {onTheWay.isPending ? (
                <ActivityIndicator color={t.accent} />
              ) : onTheWay.isError ? (
                <Padded>
                  <RetryCard message="Couldn't load your vehicles." onRetry={() => void onTheWay.refetch()} />
                </Padded>
              ) : onTheWay.data.length === 0 ? (
                <Padded>
                  <QuietCard
                    text={`Nothing on the way right now. ${home.data.deliveredCount} delivered so far.`}
                  />
                </Padded>
              ) : (
                <OnTheWayCarousel vehicles={onTheWay.data} />
              )}
              {home.data.nextDeparture ? (
                <Padded>
                  <AppText muted style={{ fontSize: 13 }}>
                    Next departure: {home.data.nextDeparture.serial} on{" "}
                    {formatDate(home.data.nextDeparture.etd)}
                  </AppText>
                </Padded>
              ) : null}
            </View>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="New for you" action={{ label: "All updates", href: "/alerts" }} />
              <Padded>
                {alerts.isPending ? (
                  <ActivityIndicator color={t.accent} />
                ) : latestAlerts.length === 0 ? (
                  <QuietCard text="No updates yet. We'll let you know when something changes." />
                ) : (
                  <View style={[styles.panel, raised, { backgroundColor: t.card, borderColor: t.border }]}>
                    {latestAlerts.map((a, i) => (
                      <View
                        key={a.id}
                        style={
                          i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border } : null
                        }
                      >
                        <AlertRow alert={a} onPress={() => openAlert(a, "home")} />
                      </View>
                    ))}
                  </View>
                )}
              </Padded>
            </View>
          </>
        )}

        <Padded>
          <Shortcuts />
        </Padded>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="New in stock" action={{ label: "Browse", href: "/stock" }} />
          <Padded>
            <StockTeaser />
          </Padded>
        </View>

        <Padded>
          <TeamCard />
        </Padded>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ name, unread }: { name: string | null; unread: number }) {
  const t = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textMuted, fontSize: 14 }}>{greeting()},</Text>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {name ?? " "}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/alerts")}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
        hitSlop={8}
        style={[styles.circle, raised, { backgroundColor: t.card, borderColor: t.border }]}
      >
        <SymbolView
          name={{ ios: "bell", android: "notifications", web: "notifications" }}
          size={20}
          tintColor={t.text}
        />
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: t.accent, borderColor: t.background }]}>
            <Text style={[styles.badgeText, { color: t.onAccent }]}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => router.push("/account")}
        accessibilityRole="button"
        accessibilityLabel="Account"
        hitSlop={8}
        style={[styles.circle, { backgroundColor: t.accent, borderColor: t.accent }]}
      >
        <Text style={{ color: t.onAccent, fontWeight: "700", fontSize: 14 }}>
          {name ? initials(name) : ""}
        </Text>
      </Pressable>
    </View>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: "/vehicles" | "/alerts" | "/stock" };
}) {
  const t = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
      {action ? (
        <Link href={action.href} asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={{ color: t.accentText, fontSize: 14, fontWeight: "600" }}>{action.label}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

// The four shortcuts under "New for you" (sheet 2). The design's "Saved" is replaced by
// "Updates": saved vehicles are not built in the API and must not be offered (guide §1).
const shortcuts: { label: string; icon: SymbolViewProps["name"]; go: () => void }[] = [
  {
    label: "History",
    icon: { ios: "list.bullet", android: "list", web: "list" },
    go: () => router.push({ pathname: "/vehicles", params: { tab: "history" } }),
  },
  {
    label: "Updates",
    icon: { ios: "bell", android: "notifications", web: "notifications" },
    go: () => router.push("/alerts"),
  },
  {
    label: "Link a car",
    icon: { ios: "link", android: "link", web: "link" },
    go: () => router.push("/link-vehicle"),
  },
  {
    label: "Help",
    icon: { ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" },
    go: () => router.push("/settings/help"),
  },
];

function Shortcuts() {
  const t = useTheme();
  return (
    <View style={styles.shortcuts}>
      {shortcuts.map((s) => (
        <Pressable
          key={s.label}
          onPress={s.go}
          accessibilityRole="button"
          accessibilityLabel={s.label}
          style={({ pressed }) => [styles.shortcut, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={[styles.shortcutIcon, raised, { backgroundColor: t.card, borderColor: t.border }]}>
            <SymbolView name={s.icon} size={20} tintColor={t.accent} />
          </View>
          <Text style={{ color: t.text, fontSize: 12, fontWeight: "500" }} numberOfLines={1}>
            {s.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Stock is not built in the customer API yet (contract §11): no vehicles, no prices are
// invented here. Replace with the stock cards (sheet 4) once the API serves them.
function StockTeaser() {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/stock")}
      accessibilityRole="button"
      accessibilityLabel="New in stock, coming soon"
      style={({ pressed }) => [
        styles.panel,
        styles.teaser,
        raised,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.circle, { backgroundColor: t.accentSoft, borderColor: t.accentSoft }]}>
        <SymbolView
          name={{ ios: "car.2", android: "garage", web: "garage" }}
          size={18}
          tintColor={t.accent}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>Stock is coming soon</Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          Browse vehicles available from Japan, right here in the app.
        </Text>
      </View>
    </Pressable>
  );
}

function TeamCard() {
  const t = useTheme();
  return (
    <View style={[styles.panel, styles.team, raised, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[styles.circle, { backgroundColor: t.hero, borderColor: t.hero }]}>
        <SymbolView
          name={{ ios: "person.2.fill", android: "group", web: "group" }}
          size={18}
          tintColor={t.onHero}
        />
      </View>
      <View style={{ flex: 1 }}>
        {/* The API has no agent field yet, so this is the team, not a named person (guide §12). */}
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>CargoDev team</Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>Questions about a vehicle? Message us.</Text>
      </View>
      <Pressable
        onPress={() => router.push("/messages")}
        accessibilityRole="button"
        accessibilityLabel="Message the team"
        hitSlop={8}
        style={[styles.circle, { backgroundColor: t.control, borderColor: t.control }]}
      >
        <SymbolView
          name={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
          size={18}
          tintColor={t.text}
        />
      </Pressable>
    </View>
  );
}

function WelcomeCard() {
  const t = useTheme();
  return (
    <View
      style={[
        styles.panel,
        raised,
        { backgroundColor: t.card, borderColor: t.border, padding: spacing.lg, gap: spacing.sm },
      ]}
    >
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>Welcome to FTJ Exports</Text>
      <AppText muted style={{ fontSize: 14, lineHeight: 20 }}>
        Your vehicles will appear here once our team links them to your account. Questions in the meantime?
        Send us a message.
      </AppText>
      <Button label="Message the team" onPress={() => router.push("/messages")} />
    </View>
  );
}

function QuietCard({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View
      style={[styles.panel, raised, { backgroundColor: t.card, borderColor: t.border, padding: spacing.md }]}
    >
      <AppText muted style={{ fontSize: 14 }}>
        {text}
      </AppText>
    </View>
  );
}

function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.panel,
        raised,
        { backgroundColor: t.card, borderColor: t.border, padding: spacing.md, gap: spacing.sm },
      ]}
    >
      <AppText style={{ fontSize: 14 }}>{message}</AppText>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

function Padded({ children }: { children: ReactNode }) {
  return <View style={{ paddingHorizontal: spacing.md }}>{children}</View>;
}

const CIRCLE = 40;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  name: { fontSize: 26, fontWeight: "700" },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  panel: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  shortcuts: { flexDirection: "row", justifyContent: "space-between" },
  shortcut: { flex: 1, alignItems: "center", gap: 6 },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  teaser: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  team: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
});
