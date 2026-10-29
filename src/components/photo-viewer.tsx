import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VehicleCover } from "@/components/vehicle-bits";
import type { Photo } from "@/lib/api/schemas";
import { spacing } from "@/theme/theme";

/**
 * Full-screen photo pager. Loads `size=full` only here (lists use thumbnails). Pinch to zoom
 * uses the native ScrollView zoom on iOS. No save/download in v1 (guide open question 14).
 */
export function PhotoViewer({
  photos,
  startIndex,
  serial,
  onClose,
}: {
  photos: Photo[];
  startIndex: number | null;
  serial: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex ?? 0);

  return (
    <Modal
      visible={startIndex !== null}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={() => setIndex(startIndex ?? 0)}
    >
      <View style={styles.backdrop}>
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={styles.zoom}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Photo ${i + 1} of ${photos.length} of ${serial}`}
              >
                <VehicleCover photoId={item.id} size="full" style={{ width, height: width * 0.75 }} />
              </View>
            </ScrollView>
          )}
        />
        <View style={[styles.bar, { top: insets.top + spacing.sm }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            hitSlop={12}
            style={styles.close}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={16}
              tintColor="#FFFFFF"
            />
          </Pressable>
          <Text style={styles.counter}>
            {index + 1} of {photos.length}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
    </Modal>
  );
}

// The viewer is always dark, whatever the app theme, like the system Photos app.
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000" },
  zoom: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  bar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
