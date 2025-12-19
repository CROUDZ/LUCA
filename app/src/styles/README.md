# Theme system (dark / light)

This folder contains the small theming system used by LUCA.

- `AppThemeProvider` — React Provider that resolves the effective theme.
  - Detects system preference via `useColorScheme()` (runtime).
  - Persists user's choice (`'dark' | 'light' | 'system'`) to AsyncStorage under `@luca_theme_preference` when available.
  - Falls back safely to system preference when AsyncStorage is unavailable (tests / environments).
- `useAppTheme()` — Hook that returns `{ theme, preference, setPreference, toggle }`.

Usage example:

```tsx
import { useAppTheme } from '../styles/theme';

const MyComponent = () => {
  const { theme, toggle } = useAppTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello</Text>
      <Button title="Toggle" onPress={() => toggle()} />
    </View>
  );
};
```

Notes:

- For quick integration, use the provided `ThemeToggle` component in `src/components` as an example UI.
- The goal is to keep the API tiny and easy to use: read `theme.colors` for styling, call `toggle()` or `setPreference()` to change.
