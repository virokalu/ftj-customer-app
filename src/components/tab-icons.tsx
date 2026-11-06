import Svg, { Circle, Path, Rect } from "react-native-svg";

// Tab bar icons: a plain outline when not selected (no tinted fill, so they stay crisp on the
// glass), fully solid when selected. 24-unit grid, drawn in one colour.

export type TabIconName = "home" | "vehicles" | "stock" | "updates" | "account";

export function TabIcon({
  name,
  focused,
  color,
  size = 24,
}: {
  name: TabIconName;
  focused: boolean;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {focused ? <Solid name={name} color={color} /> : <Outline name={name} color={color} />}
    </Svg>
  );
}

function Outline({ name, color }: { name: TabIconName; color: string }) {
  const line = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (name) {
    case "home":
      return (
        <>
          <Path
            d="M4 10.4 12 4l8 6.4V19a1.6 1.6 0 0 1-1.6 1.6H15v-5.2H9v5.2H5.6A1.6 1.6 0 0 1 4 19z"
            {...line}
          />
        </>
      );
    case "vehicles":
      return (
        <>
          <Path d="M5 16.5v-3.4l1.8-4.6A2 2 0 0 1 8.7 7.2h6.6a2 2 0 0 1 1.9 1.3l1.8 4.6v3.4" {...line} />
          <Rect x={3.5} y={12.8} width={17} height={4.6} rx={1.6} {...line} />
          <Path d="M6.5 17.4v1.8M17.5 17.4v1.8" {...line} />
        </>
      );
    case "stock":
      return (
        <>
          <Path d="M4.5 9.6 6 4.6h12l1.5 5" {...line} />
          <Path d="M4.5 9.6a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" {...line} />
          <Path d="M5.6 12v7.4h12.8V12" {...line} />
          <Path d="M10 19.4v-4h4v4" {...line} />
        </>
      );
    case "updates":
      return (
        <>
          <Path d="M6.2 16.4V11a5.8 5.8 0 0 1 11.6 0v5.4l1.5 1.8H4.7z" {...line} />
          <Path d="M10 20.6a2.1 2.1 0 0 0 4 0" {...line} />
        </>
      );
    case "account":
      return (
        <>
          <Circle cx={12} cy={8.2} r={3.8} {...line} />
          <Path d="M4.8 20.2c1.1-3.6 3.9-5.3 7.2-5.3s6.1 1.7 7.2 5.3" {...line} />
        </>
      );
  }
}

function Solid({ name, color }: { name: TabIconName; color: string }) {
  switch (name) {
    case "home":
      return (
        <Path
          d="M11.1 3.3a1.5 1.5 0 0 1 1.8 0l7.6 6A1.6 1.6 0 0 1 21 10.6V19a2.6 2.6 0 0 1-2.6 2.6H15.6v-5.6a1 1 0 0 0-1-1H9.4a1 1 0 0 0-1 1v5.6H5.6A2.6 2.6 0 0 1 3 19v-8.4a1.6 1.6 0 0 1 .5-1.3z"
          fill={color}
        />
      );
    case "vehicles":
      return (
        <Path
          d="M8.7 6.4h6.6a2.8 2.8 0 0 1 2.6 1.8l1.6 4A2.4 2.4 0 0 1 21.3 14.6v2.2a1.6 1.6 0 0 1-1.6 1.6h-.9v1a1 1 0 0 1-2 0v-1H7.2v1a1 1 0 0 1-2 0v-1h-.9a1.6 1.6 0 0 1-1.6-1.6v-2.2a2.4 2.4 0 0 1 1.8-2.4l1.6-4a2.8 2.8 0 0 1 2.6-1.8zM7.6 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8.8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM8.7 8.2a1 1 0 0 0-.9.6l-1.1 3h10.6l-1.1-3a1 1 0 0 0-.9-.6z"
          fill={color}
        />
      );
    case "stock":
      return (
        <Path
          d="M5.4 3.8h13.2l1.8 5.8a3.3 3.3 0 0 1-1.2 3.1v6.9a1.2 1.2 0 0 1-1.2 1.2h-3.4v-4.6a1 1 0 0 0-1-1h-3.2a1 1 0 0 0-1 1v4.6H6a1.2 1.2 0 0 1-1.2-1.2v-6.9a3.3 3.3 0 0 1-1.2-3.1z"
          fill={color}
        />
      );
    case "updates":
      return (
        <Path
          d="M12 3.2a6.6 6.6 0 0 1 6.6 6.6V16l1.6 1.9a.9.9 0 0 1-.7 1.5H4.5a.9.9 0 0 1-.7-1.5L5.4 16V9.8A6.6 6.6 0 0 1 12 3.2zm-2.6 17.2h5.2a2.7 2.7 0 0 1-5.2 0z"
          fill={color}
        />
      );
    case "account":
      return (
        <>
          <Circle cx={12} cy={8.2} r={4.4} fill={color} />
          <Path
            d="M12 14.2c3.9 0 7.1 2 8.1 5.8a1 1 0 0 1-1 1.2H4.9a1 1 0 0 1-1-1.2c1-3.8 4.2-5.8 8.1-5.8z"
            fill={color}
          />
        </>
      );
  }
}
