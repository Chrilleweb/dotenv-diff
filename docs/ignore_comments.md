# Ignore Comments

dotenv-diff can skip certain lines or code sections from being flagged during scanning. This is helpful when you know a specific warning is safe in your source code.

Ignore comments work for both secret detection and environment variable usage scanning, allowing you to suppress false positives while maintaining security in the rest of your codebase.

## Table of Contents

- [Single Line Ignore](#single-line-ignore)
- [Block Ignore](#block-ignore)
- [When to Use](#when-to-use)

## Single Line Ignore

You can ignore a single line by adding an inline comment with `dotenv-diff-ignore`.

### JavaScript/TypeScript

```typescript
const apiKey = 'safe_secret_123123123'; // dotenv-diff-ignore
```

This will suppress potential secret warnings for this specific line but still allow dotenv-diff to report other issues elsewhere in the file.

### JavaScript Block Comments

```javascript
const url = 'https://safe.example.com'; /* dotenv-diff-ignore */
```

### HTML

```html
<a href="https://safe.example.com">Link</a> <!-- dotenv-diff-ignore -->
```

### JSX/TSX Files

```ts
<p>Database: {process.env.DATABASE_URL}</p> {/* <!-- dotenv-diff-ignore --> */}
```

## Block Ignore

You can ignore entire sections of code using start and end markers. All lines between the markers will be skipped during scanning.

### HTML/JSX/TSX

```html
<!-- dotenv-diff-ignore-start -->
<p>Hardcoded data, images or links that are safe to ignore</p>
<img src="https://cdn.safe-service.com/image.png" />
<a href="https://legacy-system.com/api">Legacy API</a>
<!-- dotenv-diff-ignore-end -->
```

```ts
// dotenv-diff-ignore-start
const legacyApiKey = 'legacy_secret_456456456';
const safeKey = process.env.SAFE_KEY;
// dotenv-diff-ignore-end
```

This is particularly useful for:

- Legacy code sections that can't be easily refactored
- Generated HTML or markup with safe hardcoded values
- Documentation or example code embedded in your source
- Third-party integrations with known safe URLs

Ignore markers are case-insensitive.

## Alternative Configuration

If you need to ignore entire files, folders, or key patterns globally, consider using configuration options instead:

- `--exclude-files <patterns>` - Skip entire files or directories from scanning
- `--ignore <keys>` - Ignore specific environment variable keys
- `--ignore-regex <patterns>` - Ignore keys matching regex patterns
- `--ignore-urls <list>` - Ignore specific URLs during secret detection

See the [Configuration and Flags](./configuration_and_flags.md) documentation for more details.
