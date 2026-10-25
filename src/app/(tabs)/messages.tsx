import { AppText, Screen, Title } from "@/components/ui";

// Placeholder. Messaging = conversations in the shared team inbox (see v2 change notes, section 4).
export default function MessagesScreen() {
  return (
    <Screen>
      <Title>Messages</Title>
      <AppText muted>Your conversations with the FTJ team will appear here.</AppText>
    </Screen>
  );
}
