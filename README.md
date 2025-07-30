# dotenv-diff

Easily compare your `.env` and `.env.example` files in Node.js projects to detect missing, extra, empty, or mismatched environment variables.

[![npm version](https://img.shields.io/npm/v/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)
[![npm downloads](https://img.shields.io/npm/dt/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)

---

## Installation

```bash
# npm
npm install -g dotenv-diff

# yarn
yarn global add dotenv-diff

# pnpm
pnpm add -g dotenv-diff
```
## Usage

```bash
dotenv-diff
```
## Compares .env and .env.example in the current working directory and checks for:
- Missing variables in `.env.example`
- Extra variables in `.env`
- Empty variables in `.env`
- Mismatched values between `.env` and `.env.example`

## Optional: Check values too 

```bash
dotenv-diff --check-values
```

When using the `--check-values` option, the tool will also compare the actual values of the variables in `.env` and `.env.example`. It will report any mismatches found and it also compares values if .env.example defines a non-empty expected value.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or a pull request.

## License

MIT

### Created by [chrilleweb](https://github.com/chrilleweb)