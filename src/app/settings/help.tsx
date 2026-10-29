import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppText, Button, Centered } from "@/components/ui";
import { useFaqs } from "@/features/account/hooks";
import { radius, spacing, useTheme } from "@/theme/theme";

// Help & FAQs (contract §7.3). Questions and answers are staff-entered plain text.
export default function HelpScreen() {
  const t = useTheme();
  const { data, isPending, isError, refetch } = useFaqs();
  const [open, setOpen] = useState<string | null>(null);

  if (isPending) {
    return (
      <Centered>
        <ActivityIndicator color={t.accent} />
      </Centered>
    );
  }
  if (isError) {
    return (
      <Centered>
        <AppText muted>Couldn&apos;t load the FAQs.</AppText>
        <Button label="Try again" variant="secondary" onPress={() => void refetch()} />
      </Centered>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
    >
      {data.length === 0 ? (
        <AppText muted>No FAQs yet.</AppText>
      ) : (
        <View style={[styles.group, { borderColor: t.border }]}>
          {data.map((faq, i) => {
            const expanded = open === faq.id;
            return (
              <View
                key={faq.id}
                style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }}
              >
                <Pressable
                  onPress={() => setOpen(expanded ? null : faq.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={styles.question}
                >
                  <Text style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: "600" }}>
                    {faq.question}
                  </Text>
                  <SymbolView
                    name={
                      expanded
                        ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
                        : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
                    }
                    size={13}
                    tintColor={t.textMuted}
                  />
                </Pressable>
                {expanded ? (
                  <Text style={[styles.answer, { color: t.textMuted }]} selectable>
                    {faq.answer}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.contact, { backgroundColor: t.surface }]}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "700" }}>Still have a question?</Text>
        <AppText muted style={{ fontSize: 14 }}>
          Message the team and we&apos;ll get back to you.
        </AppText>
        <Button label="Message the team" onPress={() => router.push("/messages")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  question: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 52,
  },
  answer: { fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  contact: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
});
