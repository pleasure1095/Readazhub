import { useState } from "react";
import { inputStyle } from "../styles/theme";

/**
 * Text input with the emerald focus-ring behavior from the original app.
 * Kept as a single shared component so every form across the app
 * (auth, profile, deposits, withdrawals) looks and behaves identically.
 */
export default function FormInput({ style, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...rest}
      style={{
        ...inputStyle,
        ...style,
        borderColor: focused ? "#2ECC7180" : "rgba(36,28,32,0.14)",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}
