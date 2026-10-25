import { Alert } from "react-native";

import { AppText, Button, Card, Screen, Title } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { useMe } from "@/features/vehicles/hooks";
import { spacing } from "@/theme/theme";

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { data: me } = useMe();

  return (
    <Screen>
      <Title>Account</Title>
      <Card>
        <AppText style={{ fontWeight: "600" }}>{me?.name ?? "…"}</AppText>
        {me?.companyName ? <AppText muted>{me.companyName}</AppText> : null}
        {me?.email ? <AppText muted>{me.email}</AppText> : null}
      </Card>
      <AppText muted style={{ marginVertical: spacing.md }}>
        {/* TODO: Appearance (Auto/Light/Dark), language, port, notification settings, personal details, help + FAQs */}
        More settings coming soon.
      </AppText>
      <Button
        label="Sign out"
        variant="secondary"
        onPress={() =>
          Alert.alert("Sign out?", undefined, [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", style: "destructive", onPress: () => void signOut() },
          ])
        }
      />
      {/* TODO (App Store requirement): in-app "Delete account" */}
    </Screen>
  );
}
