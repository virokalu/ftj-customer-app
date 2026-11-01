import Svg, { Path } from "react-native-svg";

import type { JourneyStage } from "@/features/vehicles/status";

// The "Places" icons for the shipping-line marker (chosen from the journey-icon previews):
// where the car is at each stage. Drawn on a 24-unit grid as `color` shapes with `cutout`
// details, so they read on a filled circle (cutout = the circle's own colour).
//   loading -> the export yard (building with a roller door)
//   sailing -> the ship
//   arrived -> a map pin with a check, at your port

export function JourneyIcon({
  stage,
  size,
  color,
  cutout,
}: {
  stage: JourneyStage;
  size: number;
  color: string;
  cutout: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {stage === "loading" ? (
        <>
          <Path d="M3 10.2 12 4.6l9 5.6V20H3z" fill={color} />
          <Path d="M7 20v-6.6h10V20" fill={cutout} />
          <Path d="M7 15.6h10M7 17.8h10" stroke={color} strokeWidth={1.1} />
        </>
      ) : stage === "sailing" ? (
        <>
          <Path d="M8.6 5.4h4.6v3.4H8.6z" fill={color} />
          <Path d="M6.4 9.2h11.2v4H6.4z" fill={color} />
          <Path d="M2 13.6h20l-2.6 4.6c-.3.6-.9.9-1.6.9H6.2c-.7 0-1.3-.3-1.6-.9z" fill={color} />
          <Path d="M8.6 11h1.6M11.2 11h1.6M13.8 11h1.6" stroke={cutout} strokeWidth={1.1} />
        </>
      ) : (
        <>
          <Path d="M12 22s-7-7.3-7-12.2A7 7 0 0 1 19 9.8C19 14.7 12 22 12 22z" fill={color} />
          <Path
            d="M9.2 9.9l2 2 3.7-3.8"
            stroke={cutout}
            strokeWidth={1.9}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  );
}
