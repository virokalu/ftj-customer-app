import { View } from "react-native";

import { AppText } from "@/components/ui";
import { spacing, useTheme } from "@/theme/theme";

// Placeholder. Messaging = conversations in the shared team inbox (see v2 change notes, section 4).
// Opened from the message icon in the Home header (and "Message the team" buttons); the
// navigation header shows the title and the back button.
export default function MessagesScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas, padding: spacing.md }}>
      <AppText muted>Your conversations with the FTJ team will appear here.</AppText>
    </View>
  );
}
