# Localization Guide

Friendle supports full internationalization (i18n) with easy-to-add language support.

## Currently Supported Languages

- **English** (`en`)
- **Hebrew** (`he`) - with RTL support

## How It Works

### Translation System

All translations are stored in `src/lib/i18n.ts`:

```typescript
import { useTranslation, type Language } from '@/lib/i18n';

// In your component
const [language, setLanguage] = useState<Language>('en');
const t = useTranslation(language);

// Use translations
<h1>{t.home.title}</h1>
<button>{t.room.startGame}</button>
```

### Language Persistence

- Language preference is stored in `localStorage` as `friendle_language`
- Automatically loaded on page load
- Persists across browser sessions

### RTL Support

Hebrew and other RTL languages are automatically supported:

```tsx
<main dir={language === 'he' ? 'rtl' : 'ltr'}>
  {/* Content automatically flows right-to-left */}
</main>
```

## Adding a New Language

### 1. Add Language Type

In `src/lib/i18n.ts`, update the `Language` type:

```typescript
export type Language = 'en' | 'he' | 'es'; // Add 'es' for Spanish
```

### 2. Add Translations

Add your language to the `translations` object:

```typescript
export const translations = {
  en: { /* English translations */ },
  he: { /* Hebrew translations */ },
  es: {
    home: {
      title: 'Friendle',
      username: 'Nombre de usuario',
      usernamePlaceholder: 'Ingresa tu nombre',
      createRoom: 'Crear Nueva Sala',
      or: 'O UNIRSE A EXISTENTE',
      roomCode: 'Código de Sala',
      roomCodePlaceholder: 'CÓDIGO',
      join: 'Unirse',
      adminPanel: 'Panel de Administración',
      selectLanguage: 'Idioma',
    },
    room: {
      // ... all room translations
    },
    admin: {
      // ... all admin translations
    },
    common: {
      english: 'English',
      hebrew: 'עברית',
      spanish: 'Español', // Add Spanish
      confirm: 'Confirmar',
      cancel: 'Cancelar',
    }
  }
};
```

### 3. Update Language Selector

Add your language to the selector in `src/app/page.tsx`:

```tsx
<select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)}>
  <option value="en">{t.common.english}</option>
  <option value="he">{t.common.hebrew}</option>
  <option value="es">{t.common.spanish}</option>
</select>
```

### 4. Add RTL Support (if needed)

If your language is RTL (like Arabic, Hebrew, Persian), update the direction logic:

```typescript
const isRTL = language === 'he' || language === 'ar'; // Add your RTL language
<main dir={isRTL ? 'rtl' : 'ltr'}>
```

### 5. Add Keyboard Layout (for game)

If your language needs a custom keyboard layout for the game, add it to `src/lib/gameLogic.ts`:

```typescript
export const KEYBOARD_LAYOUTS = {
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  he: [
    // Hebrew keyboard layout
  ],
  es: [
    // Spanish keyboard layout (if different from English)
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ]
};
```

### 6. Add Word Lists

Create word lists for your language in `src/lib/wordLists.ts`:

```typescript
export const WORD_LISTS = {
  en: {
    4: ['WORD', 'GAME', ...],
    5: ['APPLE', 'BEACH', ...],
    6: ['CASTLE', 'DRAGON', ...],
  },
  he: {
    // Hebrew words
  },
  es: {
    4: ['CASA', 'MESA', ...],
    5: ['PLAYA', 'MUNDO', ...],
    6: ['CASTLE', 'DRAGON', ...],
  }
};
```

## Translation Keys Structure

```typescript
{
  home: {
    // Home page strings
  },
  room: {
    // Room/game page strings
  },
  admin: {
    // Admin panel strings
  },
  common: {
    // Shared strings (language names, confirm/cancel, etc.)
  }
}
```

## Testing Your Translation

1. Change the language selector on the home page
2. Create/join a room
3. Check all UI elements are properly translated
4. Test RTL layout if applicable
5. Verify keyboard layout in game
6. Test admin panel

## Best Practices

1. **Keep keys consistent**: Use the same structure for all languages
2. **Test RTL thoroughly**: Hebrew shows common RTL issues
3. **Use placeholders**: For dynamic content like `"Playing (2/6)"`, ensure proper structure
4. **Cultural adaptation**: Not just translation, but localization (dates, formats, etc.)
5. **Default fallback**: Always fall back to English if translation missing

## Common Issues

### Missing Translations
If a key is missing, TypeScript will show an error. Always ensure all languages have all keys.

### RTL Layout Breaks
Test with Hebrew to catch RTL issues:
- Use `flex-row-reverse` for reversed layouts
- Use `start`/`end` instead of `left`/`right` in Tailwind
- Test scrolling direction

### Keyboard Layouts
Some languages may need special characters. Add them to the keyboard layout and handle Unicode input properly.

## Contributing Translations

We welcome translation contributions! To add a language:

1. Fork the repository
2. Add your language following the steps above
3. Test thoroughly
4. Submit a pull request

Please include:
- Complete translation of all keys
- Word lists (at least 20 words per length)
- Keyboard layout (if special characters needed)
- RTL specification (if applicable)
