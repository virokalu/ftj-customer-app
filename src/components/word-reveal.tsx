import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

/**
 * Text that appears word by word (fade in and rise), for headlines. Screen readers get the
 * whole sentence once. Reanimated skips the entering animation when Reduce Motion is on.
 */
export function WordReveal({
  text,
  style,
  delay = 0,
  stagger = 60,
  header = false,
  animated = true,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  delay?: number;
  stagger?: number;
  header?: boolean;
  /** false shows the text at once, e.g. when the screen's intro has already played. */
  animated?: boolean;
}) {
  const words = text.split(" ");
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={text}
      accessibilityRole={header ? "header" : "text"}
    >
      {words.map((word, i) => (
        <Animated.Text
          // Words can repeat, so the index is part of the key.
          key={`${i}-${word}`}
          entering={animated ? FadeInDown.delay(delay + i * stagger).duration(400) : undefined}
          style={style}
        >
          {i < words.length - 1 ? `${word} ` : word}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
});
